import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { 
  Client, 
  ClientFilters, 
  CreateClientDto, 
  UpdateClientDto,
  ClientParty,
  CreateFullClientDto,
  CreateFullClientServiceDto,
  CreateFullClientDirectorDto,
  Address,
} from './interfaces/client.interface';
import { ReferenceGeneratorService } from './services/reference-generator.service';
import { PersonService } from './services/person.service';
import { ClientPartyService } from './services/client-party.service';
import { ServicesService } from '../services/services.service';
import { TasksService } from '../tasks/tasks.service';
import { ComplianceService } from '../filings/compliance.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
  private fileStorage: FileStorageService,
  private referenceGenerator: ReferenceGeneratorService,
  private personService: PersonService,
  @Inject(forwardRef(() => ClientPartyService))
  private clientPartyService: ClientPartyService,
  @Inject(forwardRef(() => ServicesService))
  private servicesService: ServicesService,
  @Inject(forwardRef(() => TasksService))
  private tasksService: TasksService,
  @Inject(forwardRef(() => ComplianceService))
  private complianceService: ComplianceService,
) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    // Validate portfolio code
    if (createClientDto.portfolioCode < 1 || createClientDto.portfolioCode > 10) {
      throw new BadRequestException('Portfolio code must be between 1 and 10');
    }

    const id = this.generateId();
    
    let ref: string;
    
    // If a ref was provided, use it (after checking it doesn't exist)
    if (createClientDto.ref) {
      const existing = await this.findByRef(createClientDto.ref);
      if (existing) {
        this.logger.warn(`Client with reference ${createClientDto.ref} already exists, generating new ref`);
        // Generate a new ref instead of throwing error
        ref = await this.referenceGenerator.generateClientRef(
          createClientDto.portfolioCode, 
          createClientDto.name
        );
      } else {
        ref = createClientDto.ref;
      }
    } else {
      // Generate a new ref
      ref = await this.referenceGenerator.generateClientRef(
        createClientDto.portfolioCode, 
        createClientDto.name
      );
    }
    
    const now = new Date();

    const client: Client = {
      id,
      ref,
      name: createClientDto.name,
      type: createClientDto.type,
      portfolioCode: createClientDto.portfolioCode,
      status: createClientDto.status || 'ACTIVE',
      mainEmail: createClientDto.mainEmail,
      mainPhone: createClientDto.mainPhone,
      registeredNumber: createClientDto.registeredNumber,
      accountsAccountingReferenceDay: createClientDto.accountsAccountingReferenceDay,
      accountsAccountingReferenceMonth: createClientDto.accountsAccountingReferenceMonth,
      address: createClientDto.address,
      parties: [],
      services: [],
      tasks: [],
      documents: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('clients', ref, client, createClientDto.portfolioCode);
    this.logger.log(`Created client: ${client.name} (${client.ref})`);

    return client;
  }

  /**
   * Unified creation: client + optional directors + services + auto tasks
   */
  async createFull(payload: CreateFullClientDto): Promise<{ client: Client; services: string[]; directors: string[]; tasksGenerated?: number }>{
    if (!payload || !payload.client) {
      throw new BadRequestException('Missing client payload');
    }

    // 1) Create client record
    const client = await this.create(payload.client);

    const createdServiceIds: string[] = [];
    const createdDirectorIds: string[] = [];

    // 2) Optionally add directors/main contact
    if (Array.isArray(payload.directors) && payload.directors.length > 0) {
      for (const [idx, d] of payload.directors.entries()) {
        const person = await this.personService.create({
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          phone: d.phone,
          dateOfBirth: d.dateOfBirth,
          nationality: d.nationality,
          address: d.address,
        });

        const party = await this.clientPartyService.create({
          clientId: client.id,
          personId: person.id,
          role: d.role || 'CONTACT',
          ownershipPercent: d.ownershipPercent,
          appointedAt: d.appointedAt,
          primaryContact: d.primaryContact || (idx === 0),
        });
        createdDirectorIds.push(party.id);
      }
    }

    // 3) Determine services to create
    let servicesToCreate: CreateFullClientServiceDto[] = payload.services || [];
    if (payload.defaultServices) {
      const defaults: CreateFullClientServiceDto[] = [
        { kind: 'Annual Accounts', frequency: 'ANNUAL', fee: 600, status: 'ACTIVE' },
        { kind: 'Corporation Tax Return', frequency: 'ANNUAL', fee: 250, status: 'ACTIVE' },
        { kind: 'Company Secretarial', frequency: 'ANNUAL', fee: 60, status: 'ACTIVE' },
        { kind: 'Payroll Services', frequency: 'MONTHLY', fee: 100, status: 'ACTIVE' },
        { kind: 'VAT Returns', frequency: 'QUARTERLY', fee: 120, status: 'ACTIVE' },
        { kind: 'Self Assessment', frequency: 'ANNUAL', fee: 350, status: 'ACTIVE' },
      ];
      servicesToCreate = [...defaults, ...servicesToCreate];
      // Deduplicate by kind+frequency, prefer explicit payload entries (placed last)
      const map = new Map<string, CreateFullClientServiceDto>();
      for (const s of servicesToCreate) {
        map.set(`${s.kind}::${s.frequency}`, s);
      }
      servicesToCreate = Array.from(map.values());
    }

    // 4) Create services
    const createdServices: any[] = [];
    for (const s of servicesToCreate) {
      const created = await this.servicesService.create({
        clientId: client.id,
        kind: s.kind,
        frequency: s.frequency,
        fee: s.fee,
        status: s.status || 'ACTIVE',
        nextDue: s.nextDue,
        description: s.description,
      });
      createdServiceIds.push(created.id);
      createdServices.push(created);
      try {
        await this.complianceService.ensureComplianceForService(client, created);
      } catch (e) {
        this.logger.warn(`Compliance generation failed for service ${created.id}: ${e?.message || e}`);
      }
    }

    // 5) Optionally generate tasks (uses system task window)
    let tasksGenerated = 0;
    if (payload.generateTasks) {
      try {
        const results = await this.tasksService.generateTasksForClient(client.id);
        tasksGenerated = results.reduce((sum, r) => sum + (r.tasksGenerated || 0), 0);
      } catch (e) {
        this.logger.warn('Task generation failed during create-full; continuing');
      }
    }

    return {
      client,
      services: createdServiceIds,
      directors: createdDirectorIds,
      tasksGenerated,
    };
  }

  async findAll(filters?: ClientFilters): Promise<Client[]> {
    let clients: Client[];

    if (filters?.portfolioCode) {
      clients = await this.fileStorage.searchFiles<Client>('clients', () => true, filters.portfolioCode);
    } else {
      clients = await this.fileStorage.searchFiles<Client>('clients', () => true);
    }

    // Apply filters
    if (filters) {
      clients = this.applyFilters(clients, filters);
    }

    // Apply pagination
    if (filters?.offset !== undefined || filters?.limit !== undefined) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      clients = clients.slice(offset, offset + limit);
    }

    const normalized = await Promise.all(
      clients.map(async (client) => {
        const { updatedClient, changed } = this.applyAccountingReferenceDefaults(client);
        if (changed) {
          await this.fileStorage.writeJson('clients', updatedClient.ref, updatedClient, updatedClient.portfolioCode);
        }
        return updatedClient;
      })
    );

    return normalized;
  }

  async findOne(id: string): Promise<Client | null> {
    // Try to find by reference first (more efficient with file storage)
    if (this.referenceGenerator.validateClientRef(id)) {
      const portfolioCode = this.referenceGenerator.extractPortfolioCode(id);
      if (portfolioCode) {
        const client = await this.fileStorage.readJson<Client>('clients', id, portfolioCode);
        if (client) {
          const { updatedClient, changed } = this.applyAccountingReferenceDefaults(client);
          if (changed) {
            await this.fileStorage.writeJson('clients', updatedClient.ref, updatedClient, updatedClient.portfolioCode);
          }
          return updatedClient;
        }
        return null;
      }
    }

    // Fallback to search by ID across all portfolios
    const clients = await this.fileStorage.searchFiles<Client>('clients', 
      (client) => client.id === id || client.ref === id
    );
    const client = clients[0] || null;
    if (!client) return null;
    const { updatedClient, changed } = this.applyAccountingReferenceDefaults(client);
    if (changed) {
      await this.fileStorage.writeJson('clients', updatedClient.ref, updatedClient, updatedClient.portfolioCode);
    }
    return updatedClient;
  }

  async findByRef(ref: string): Promise<Client | null> {
    const portfolioCode = this.referenceGenerator.extractPortfolioCode(ref);
    if (!portfolioCode) {
      return null;
    }

    return this.fileStorage.readJson<Client>('clients', ref, portfolioCode);
  }

  async findByPortfolio(portfolioCode: number): Promise<Client[]> {
    if (portfolioCode < 1 || portfolioCode > 10) {
      throw new BadRequestException('Portfolio code must be between 1 and 10');
    }

    const clients = await this.fileStorage.searchFiles<Client>('clients', () => true, portfolioCode);
    return Promise.all(
      clients.map(async (client) => {
        const { updatedClient, changed } = this.applyAccountingReferenceDefaults(client);
        if (changed) {
          await this.fileStorage.writeJson('clients', updatedClient.ref, updatedClient, updatedClient.portfolioCode);
        }
        return updatedClient;
      })
    );
  }

  async search(query: string, portfolioCode?: number): Promise<Client[]> {
    const searchPredicate = (client: Client) => {
      const searchText = `${client.name} ${client.ref} ${client.mainEmail || ''} ${client.registeredNumber || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    };

    const results = portfolioCode
      ? await this.fileStorage.searchFiles<Client>('clients', searchPredicate, portfolioCode)
      : await this.fileStorage.searchFiles<Client>('clients', searchPredicate);

    return Promise.all(
      results.map(async (client) => {
        const { updatedClient, changed } = this.applyAccountingReferenceDefaults(client);
        if (changed) {
          await this.fileStorage.writeJson('clients', updatedClient.ref, updatedClient, updatedClient.portfolioCode);
        }
        return updatedClient;
      })
    );
  }

  private applyAccountingReferenceDefaults(client: Client): { updatedClient: Client; changed: boolean } {
    if (client.type !== 'COMPANY') {
      return { updatedClient: client, changed: false };
    }

    const hasDay = Number.isFinite(client.accountsAccountingReferenceDay);
    const hasMonth = Number.isFinite(client.accountsAccountingReferenceMonth);
    if (hasDay && hasMonth) {
      return { updatedClient: client, changed: false };
    }

    let day = client.accountsAccountingReferenceDay;
    let month = client.accountsAccountingReferenceMonth;

    if ((!hasDay || !hasMonth) && client.accountsLastMadeUpTo) {
      const last = new Date(client.accountsLastMadeUpTo);
      if (!Number.isNaN(last.getTime())) {
        day = last.getDate();
        month = last.getMonth() + 1;
      }
    }

    if (!Number.isFinite(day) || !Number.isFinite(month)) {
      day = 31;
      month = 3;
    }

    const updatedClient: Client = {
      ...client,
      accountsAccountingReferenceDay: day,
      accountsAccountingReferenceMonth: month,
    };

    return { updatedClient, changed: true };
  }

  async importMany(rows: CreateClientDto[]): Promise<{ created: number; errors: Array<{ row: any; error: string }> }> {
    const errors: Array<{ row: any; error: string }> = [];
    let created = 0;
    for (const row of rows || []) {
      try {
        // minimal validation
        if (!row || !row.name || !row.type || !row.portfolioCode) {
          throw new BadRequestException('Missing name/type/portfolioCode');
        }
        await this.create(row);
        created++;
      } catch (e: any) {
        errors.push({ row, error: e?.message || 'Failed to create' });
      }
    }
    return { created, errors };
  }

  async exportCsv(filters?: ClientFilters): Promise<string> {
    const items = await this.findAll(filters);
    const headers = [
      'ref',
      'name',
      'type',
      'portfolioCode',
      'status',
      'mainEmail',
      'mainPhone',
      'registeredNumber',
      'utrNumber',
      'incorporationDate',
      'accountsAccountingReferenceDay',
      'accountsAccountingReferenceMonth',
      'accountsLastMadeUpTo',
      'accountsNextDue',
      'confirmationLastMadeUpTo',
      'confirmationNextDue',
      'address.line1',
      'address.line2',
      'address.city',
      'address.county',
      'address.postcode',
      'address.country',
    ];

    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : String(v);
      const needsQuotes = /[",\n]/.test(s);
      const t = s.replace(/"/g, '""');
      return needsQuotes ? `"${t}"` : t;
    };

    const rows = [headers.join(',')];
    for (const c of items) {
      const line = [
        c.ref,
        c.name,
        c.type,
        c.portfolioCode,
        c.status,
        c.mainEmail || '',
        c.mainPhone || '',
        c.registeredNumber || '',
        (c as any).utrNumber || '',
        c.incorporationDate ? new Date(c.incorporationDate).toISOString().slice(0, 10) : '',
        c.accountsAccountingReferenceDay ?? '',
        c.accountsAccountingReferenceMonth ?? '',
        c.accountsLastMadeUpTo ? new Date(c.accountsLastMadeUpTo).toISOString().slice(0, 10) : '',
        c.accountsNextDue ? new Date(c.accountsNextDue).toISOString().slice(0, 10) : '',
        c.confirmationLastMadeUpTo ? new Date(c.confirmationLastMadeUpTo).toISOString().slice(0, 10) : '',
        c.confirmationNextDue ? new Date(c.confirmationNextDue).toISOString().slice(0, 10) : '',
        c.address?.line1 || '',
        c.address?.line2 || '',
        c.address?.city || '',
        c.address?.county || '',
        c.address?.postcode || '',
        c.address?.country || '',
      ].map(esc);
      rows.push(line.join(','));
    }
    return rows.join('\n');
  }

  /**
   * Import clients from a CSV string. Columns supported (case-insensitive):
   * - Name / Company Name
   * - Type (COMPANY|INDIVIDUAL|SOLE_TRADER|PARTNERSHIP|LLP) [default COMPANY]
   * - Portfolio Code / Portfolio [default 1]
   * - Status (ACTIVE|INACTIVE|ARCHIVED) [default ACTIVE]
   * - Registered Number / Company Number
   * - Email / Main Email
   * - Phone / Main Phone
   * - Address Line 1/2, City, County, Postcode, Country
   */
  async importFromCsv(csv: string): Promise<{ created: number; errors: Array<{ row: any; error: string }> }> {
    const rows = this.parseCsv(csv);
    const records = this.toRecords(rows);
    const errors: Array<{ row: any; error: string }> = [];
    let created = 0;
    for (const r of records) {
      try {
        const get = (k: string) => r[k] || r[k.toLowerCase()] || '';
        const pick = (...names: string[]) => {
          for (const n of names) {
            const v = r[n] ?? r[n.toLowerCase()];
            if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
          }
          return '';
        };
        const name = pick('Company Name', 'Name');
        if (!name) throw new BadRequestException('Name is required');
        const type = (pick('Type') || 'COMPANY').toUpperCase() as any;
        const portfolioCode = parseInt(pick('Portfolio Code', 'Portfolio') || '1', 10) || 1;
        const status = (pick('Status') || 'ACTIVE').toUpperCase() as any;
        const registeredNumber = pick('Company Number', 'Registered Number') || undefined;
        const mainEmail = pick('Email', 'Main Email') || undefined;
        const mainPhone = pick('Phone', 'Main Phone') || undefined;
        const accountsAccountingReferenceDay = parseInt(pick('Accounting Reference Day', 'Accounts Accounting Reference Day', 'ARD Day') || '', 10);
        const accountsAccountingReferenceMonth = parseInt(pick('Accounting Reference Month', 'Accounts Accounting Reference Month', 'ARD Month') || '', 10);
        const address = {
          line1: pick('Address Line 1', 'Line1', 'Address') || undefined,
          line2: pick('Address Line 2', 'Line2') || undefined,
          city: pick('City') || undefined,
          county: pick('County') || undefined,
          postcode: pick('Postcode') || undefined,
          country: pick('Country') || undefined,
        } as any;

        const dto: CreateClientDto = {
          name,
          type,
          portfolioCode,
          status,
          mainEmail,
          mainPhone,
          registeredNumber,
          accountsAccountingReferenceDay: Number.isFinite(accountsAccountingReferenceDay) ? accountsAccountingReferenceDay : undefined,
          accountsAccountingReferenceMonth: Number.isFinite(accountsAccountingReferenceMonth) ? accountsAccountingReferenceMonth : undefined,
          address,
        } as CreateClientDto;

        await this.create(dto);
        created++;
      } catch (e: any) {
        errors.push({ row: r, error: e?.message || 'Failed to import row' });
      }
    }
    return { created, errors };
  }

  /**
   * Preview CSV import and compute suggested refs using the same rules.
   * Does not write any data.
   */
  async previewImportCsv(csv: string): Promise<{ total: number; valid: number; rows: Array<{ name: string; portfolioCode: number; suggestedRef?: string; error?: string }> }> {
    const rows = this.toRecords(this.parseCsv(csv));
    const out: Array<{ name: string; portfolioCode: number; suggestedRef?: string; error?: string }> = [];

    // Build used map and counters from storage (like regenerateAllRefs)
    const used = new Set<string>();
    const counters = new Map<string, number>();
    for (let port = 1; port <= 10; port++) {
      const files = await this.fileStorage.listFiles('clients', port);
      for (const ref of files) {
        used.add(ref);
        const m = ref.match(/^(\d+)([A-Z])(\d{3})$/);
        if (m) {
          const p = parseInt(m[1], 10);
          const a = m[2];
          const n = parseInt(m[3], 10);
          const key = `${p}-${a}`;
          const prev = counters.get(key) || 0;
          if (n > prev) counters.set(key, n);
        }
      }
    }

    for (const r of rows) {
      const name = (r['Company Name'] || r['Name'] || '').trim();
      if (!name) { out.push({ name: '', portfolioCode: 1, error: 'Missing name' }); continue; }
      const port = parseInt((r['Portfolio Code'] || r['Portfolio'] || '1').trim() || '1', 10) || 1;

      // derive alpha
      const alpha = this.referenceGenerator.deriveAlphaFromName(name);
      const key = `${port}-${alpha}`;
      let next = (counters.get(key) || 0) + 1;
      let candidate = `${port}${alpha}${next.toString().padStart(3, '0')}`;
      while (used.has(candidate)) {
        next++;
        candidate = `${port}${alpha}${next.toString().padStart(3, '0')}`;
      }
      // Reserve for this preview session
      used.add(candidate);
      counters.set(key, next);
      out.push({ name, portfolioCode: port, suggestedRef: candidate });
    }

    const valid = out.filter(r => !r.error).length;
    return { total: out.length, valid, rows: out };
  }

  /** Basic CSV parser (compatible with the importer script) */
  private parseCsv(content: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let value = '';
    let inQuotes = false;
    const pushValue = () => { current.push(value); value = ''; };
    const pushRow = () => { if (current.length > 0) rows.push(current); current = []; };
    const text = (content || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        const next = text[i + 1];
        if (inQuotes && next === '"') { value += '"'; i++; }
        else { inQuotes = !inQuotes; }
        continue;
      }
      if (ch === ',' && !inQuotes) { pushValue(); continue; }
      if ((ch === '\n' || ch === '\r') && !inQuotes) { pushValue(); pushRow(); while (text[i + 1] === '\n' || text[i + 1] === '\r') i++; continue; }
      value += ch;
    }
    if (value.length > 0 || current.length > 0) { pushValue(); pushRow(); }
    return rows;
  }

  private toRecords(rows: string[][]): any[] {
    if (!rows || rows.length === 0) return [];
    const headers = rows[0].map(h => (h || '').trim());
    return rows.slice(1).map(row => {
      const rec: any = {};
      headers.forEach((h, idx) => { rec[h] = (row[idx] || '').trim(); rec[h.toLowerCase()] = rec[h]; });
      return rec;
    });
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    const updatedClient: Client = {
      ...existing,
      ...updateClientDto,
      id: existing.id, // Ensure ID cannot be changed
      ref: existing.ref, // Ensure reference cannot be changed
      portfolioCode: existing.portfolioCode, // Ensure portfolio cannot be changed
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('clients', existing.ref, updatedClient, existing.portfolioCode);
    this.logger.log(`Updated client: ${updatedClient.name} (${updatedClient.ref})`);

    return updatedClient;
  }

  /**
   * Update the client reference (ref). Moves the underlying file and preserves portfolio code.
   */
  async updateRef(id: string, newRef: string): Promise<Client> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    if (!this.referenceGenerator.validateClientRef(newRef)) {
      throw new BadRequestException('Invalid client reference format');
    }

    const newPortfolio = this.referenceGenerator.extractPortfolioCode(newRef);
    if (newPortfolio === null || newPortfolio !== existing.portfolioCode) {
      throw new BadRequestException('Client reference portfolio must match existing portfolio');
    }

    if (newRef === existing.ref) return existing;

    // Ensure target doesn't already exist
    const clash = await this.fileStorage.readJson<Client>('clients', newRef, existing.portfolioCode);
    if (clash) {
      throw new BadRequestException(`Client reference ${newRef} already exists`);
    }

    const updated: Client = { ...existing, ref: newRef, updatedAt: new Date() };

    // Write new file first, then delete old
    await this.fileStorage.writeJson('clients', newRef, updated, existing.portfolioCode);
    await this.fileStorage.deleteJson('clients', existing.ref, existing.portfolioCode);
    this.logger.log(`Updated client ref from ${existing.ref} to ${newRef}`);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) {
      return false;
    }

    // Check for associated parties, services, tasks, documents
    if (existing.parties.length > 0) {
      throw new BadRequestException(`Cannot delete client ${existing.name} - has associated parties`);
    }
    if (existing.services.length > 0) {
      throw new BadRequestException(`Cannot delete client ${existing.name} - has associated services`);
    }
    if (existing.tasks.length > 0) {
      throw new BadRequestException(`Cannot delete client ${existing.name} - has associated tasks`);
    }
    if (existing.documents.length > 0) {
      throw new BadRequestException(`Cannot delete client ${existing.name} - has associated documents`);
    }

    await this.fileStorage.deleteJson('clients', existing.ref, existing.portfolioCode);
    this.logger.log(`Deleted client: ${existing.name} (${existing.ref})`);

    return true;
  }

  /**
   * Force delete a client and remove related records (client-parties, services, tasks, documents, compliance).
   * Use with care; this is irreversible.
   */
  async deleteCascade(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) return false;

    // 1) Delete client-parties for this client
    const parties = await this.fileStorage.searchFiles<any>('client-parties', (p) => p?.clientId === existing.id);
    for (const p of parties) {
      try { await this.fileStorage.deleteJson('client-parties', p.id); } catch {}
    }

    // 2) Delete services for this client
    const services = await this.fileStorage.searchFiles<any>('services', (s) => s?.clientId === existing.id);
    for (const s of services) {
      try { await this.fileStorage.deleteJson('services', s.id); } catch {}
    }

    // 3) Delete tasks for this client
    const tasks = await this.fileStorage.searchFiles<any>('tasks', (t) => t?.clientId === existing.id);
    for (const t of tasks) {
      try { await this.fileStorage.deleteJson('tasks', t.id); } catch {}
    }

    // 4) Delete documents for this client
    const documents = await this.fileStorage.searchFiles<any>('documents', (d) => d?.clientId === existing.id);
    for (const d of documents) {
      try { await this.fileStorage.deleteJson('documents', d.id); } catch {}
    }

    // 5) Delete compliance items
    const compliance = await this.fileStorage.searchFiles<any>('compliance', (c) => c?.clientId === existing.id);
    for (const c of compliance) {
      try { await this.fileStorage.deleteJson('compliance', c.id); } catch {}
    }

    // 6) Finally, delete the client record
    await this.fileStorage.deleteJson('clients', existing.ref, existing.portfolioCode);
    this.logger.log(`Cascade-deleted client: ${existing.name} (${existing.ref}) and related records`);
    return true;
  }

  /**
   * Move a client to a new portfolio and regenerate its reference automatically.
   * Keeps the same client id and all relations (services/tasks/documents) intact.
   */
  async movePortfolio(id: string, newPortfolioCode: number): Promise<Client> {
    if (newPortfolioCode < 1 || newPortfolioCode > 10) {
      throw new BadRequestException('Portfolio code must be between 1 and 10');
    }

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    if (existing.portfolioCode === newPortfolioCode) return existing;

    // Generate a new reference for the new portfolio
    const newRef = await this.referenceGenerator.generateClientRef(newPortfolioCode, existing.name);

    const updated: Client = {
      ...existing,
      ref: newRef,
      portfolioCode: newPortfolioCode,
      updatedAt: new Date(),
    };

    // Write to new portfolio bucket first
    await this.fileStorage.writeJson('clients', newRef, updated, newPortfolioCode);
    // Remove old file
    await this.fileStorage.deleteJson('clients', existing.ref, existing.portfolioCode);

    this.logger.log(`Moved client ${existing.ref} -> ${newRef} (portfolio ${existing.portfolioCode} -> ${newPortfolioCode})`);
    return updated;
  }
  async addParty(clientId: string, partyId: string): Promise<Client> {
    const client = await this.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    if (!client.parties.includes(partyId)) {
      client.parties.push(partyId);
      client.updatedAt = new Date();
      
      await this.fileStorage.writeJson('clients', client.ref, client, client.portfolioCode);
      this.logger.log(`Added party ${partyId} to client ${client.ref}`);
    }

    return client;
  }

  async removeParty(clientId: string, partyId: string): Promise<Client> {
    const client = await this.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const index = client.parties.indexOf(partyId);
    if (index > -1) {
      client.parties.splice(index, 1);
      client.updatedAt = new Date();
      
      await this.fileStorage.writeJson('clients', client.ref, client, client.portfolioCode);
      this.logger.log(`Removed party ${partyId} from client ${client.ref}`);
    }

    return client;
  }

  async getClientWithParties(clientId: string): Promise<Client & { partiesDetails: ClientParty[] }> {
    const client = await this.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const partiesDetailsRaw = await this.clientPartyService.findByClient(client.id);
    // Attach composite party reference: client.ref + suffixLetter (e.g., 1P003A)
    const partiesDetails = (partiesDetailsRaw as any[]).map((p) => ({
      ...p,
      partyRef: `${client.ref}${p.suffixLetter || ''}`,
    })) as any as ClientParty[];

    return {
      ...client,
      partiesDetails,
    };
  }

  async getPortfolioStats(): Promise<Record<number, { count: number; active: number; inactive: number }>> {
    const stats: Record<number, { count: number; active: number; inactive: number }> = {};

    for (let portfolioCode = 1; portfolioCode <= 10; portfolioCode++) {
      const clients = await this.findByPortfolio(portfolioCode);
      const active = clients.filter(c => c.status === 'ACTIVE').length;
      const inactive = clients.filter(c => c.status !== 'ACTIVE').length;

      stats[portfolioCode] = {
        count: clients.length,
        active,
        inactive,
      };
    }

    return stats;
  }

  private applyFilters(clients: Client[], filters: ClientFilters): Client[] {
    let filtered = clients;

    if (filters.status) {
      filtered = filtered.filter(client => client.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter(client => client.type === filters.type);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(client => {
        const searchText = `${client.name} ${client.ref} ${client.mainEmail || ''} ${client.registeredNumber || ''}`.toLowerCase();
        return searchText.includes(searchLower);
      });
    }

    return filtered;
  }

  private generateId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client data formatted for template placeholder resolution
   * Requirements: 2.2
   */
  async getClientPlaceholderData(clientId: string): Promise<Record<string, any>> {
    const client = await this.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Get primary contact if available
    let primaryContact: any = null;
    if (client.parties.length > 0) {
      try {
        const parties = await this.clientPartyService.findByClient(client.id);
        const primaryParty = parties.find(p => p.primaryContact);
        if (primaryParty) {
          const person = await this.personService.findOne(primaryParty.personId);
          if (person) {
            primaryContact = {
              firstName: person.firstName,
              lastName: person.lastName,
              fullName: person.fullName,
              email: person.email,
              phone: person.phone,
              role: primaryParty.role
            };
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch primary contact for client ${clientId}:`, error);
      }
    }

    // Format address as multi-line string
    const formatAddress = (addr?: Address): string => {
      if (!addr) return '';
      const parts = [
        addr.line1,
        addr.line2,
        addr.city,
        addr.county,
        addr.postcode,
        addr.country
      ].filter(Boolean);
      return parts.join('\n');
    };

    // Format date as DD/MM/YYYY
    const formatDate = (date?: Date): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return {
      // Basic client information
      clientId: client.id,
      clientRef: client.ref,
      clientName: client.name,
      clientType: client.type,
      portfolioCode: client.portfolioCode,
      status: client.status,
      
      // Contact information
      mainEmail: client.mainEmail || '',
      mainPhone: client.mainPhone || '',
      
      // Company information
      registeredNumber: client.registeredNumber || '',
      companyNumber: client.registeredNumber || '', // Alias
      utrNumber: (client as any).utrNumber || '',
      
      // Dates
      incorporationDate: client.incorporationDate ? formatDate(client.incorporationDate) : '',
      accountsLastMadeUpTo: client.accountsLastMadeUpTo ? formatDate(client.accountsLastMadeUpTo) : '',
      accountsNextDue: client.accountsNextDue ? formatDate(client.accountsNextDue) : '',
      confirmationLastMadeUpTo: client.confirmationLastMadeUpTo ? formatDate(client.confirmationLastMadeUpTo) : '',
      confirmationNextDue: client.confirmationNextDue ? formatDate(client.confirmationNextDue) : '',
      
      // Address
      address: formatAddress(client.address),
      addressLine1: client.address?.line1 || '',
      addressLine2: client.address?.line2 || '',
      addressCity: client.address?.city || '',
      addressCounty: client.address?.county || '',
      addressPostcode: client.address?.postcode || '',
      addressCountry: client.address?.country || '',
      
      // Primary contact
      contactFirstName: primaryContact?.firstName || '',
      contactLastName: primaryContact?.lastName || '',
      contactFullName: primaryContact?.fullName || '',
      contactEmail: primaryContact?.email || '',
      contactPhone: primaryContact?.phone || '',
      contactRole: primaryContact?.role || '',
      
      // System data
      currentDate: formatDate(new Date()),
      currentYear: new Date().getFullYear().toString()
    };
  }

  /**
   * Regenerate client references to match rule: {portfolio}{alpha-from-name}{seq}.
   * If a client's ref already matches its derived alpha and portfolio, it is left unchanged.
   * Returns a summary of changes. When dryRun is true, no writes are performed.
   */
  async regenerateAllRefs(dryRun = true): Promise<{ total: number; changed: Array<{ id: string; name: string; portfolioCode: number; from: string; to: string }> }> {
    const result: Array<{ id: string; name: string; portfolioCode: number; from: string; to: string }> = [];
    // Load all clients across portfolios
    const all = await this.findAll({});

    // Build existing refs map per portfolio+alpha to compute next numbers deterministically
    const used = new Set<string>();
    const counters = new Map<string, number>(); // key: `${port}-${alpha}` -> max index

    // Seed with existing stored refs
    for (let port = 1; port <= 10; port++) {
      const files = await this.fileStorage.listFiles('clients', port);
      for (const ref of files) {
        used.add(ref);
        const m = ref.match(/^(\d+)([A-Z])(\d{3})$/);
        if (m) {
          const p = parseInt(m[1], 10);
          const a = m[2];
          const n = parseInt(m[3], 10);
          const key = `${p}-${a}`;
          const prev = counters.get(key) || 0;
          if (n > prev) counters.set(key, n);
        }
      }
    }

    // Sort clients to get stable numbering per alpha group
    const ordered = [...all].sort((a, b) => {
      if (a.portfolioCode !== b.portfolioCode) return a.portfolioCode - b.portfolioCode;
      const aa = this.referenceGenerator.deriveAlphaFromName(a.name);
      const ab = this.referenceGenerator.deriveAlphaFromName(b.name);
      if (aa !== ab) return aa.localeCompare(ab);
      return a.name.localeCompare(b.name);
    });

    for (const c of ordered) {
      const current = c.ref;
      const port = c.portfolioCode;
      const alpha = this.referenceGenerator.deriveAlphaFromName(c.name);
      const currentMatch = current.match(/^(\d+)([A-Z])(\d{3})$/);

      // If already matches desired letter and portfolio, keep it (unique by assumption of storage)
      if (currentMatch && parseInt(currentMatch[1], 10) === port && currentMatch[2] === alpha) {
        continue;
      }

      // Compute next unique number for this portfolio+alpha, considering existing and planned refs
      const key = `${port}-${alpha}`;
      let next = (counters.get(key) || 0) + 1;
      let candidate = `${port}${alpha}${next.toString().padStart(3, '0')}`;
      while (used.has(candidate)) {
        next += 1;
        candidate = `${port}${alpha}${next.toString().padStart(3, '0')}`;
      }

      // Record and optionally apply
      if (candidate !== current) {
        result.push({ id: c.id, name: c.name, portfolioCode: port, from: current, to: candidate });
        used.add(candidate);
        counters.set(key, next);
        if (!dryRun) {
          await this.updateRef(c.id, candidate);
        }
      }
    }

    return { total: all.length, changed: result };
  }
}
