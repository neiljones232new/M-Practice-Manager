import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildClientContext, ClientContext } from './dto/client-context.dto';
import { Client as DbClient } from '../database/interfaces/database.interface';
import { 
  Client, 
  ClientFilters, 
  CreateClientDto, 
  UpdateClientDto,
  ClientParty,
  CreateFullClientDto,
  CreateFullClientServiceDto,
  Address,
} from './interfaces/client.interface';
import { ReferenceGeneratorService } from './services/reference-generator.service';
import { PersonService } from './services/person.service';
import { ClientPartyService } from './services/client-party.service';
import { ServicesService } from '../services/services.service';
import { TasksService } from '../tasks/tasks.service';
import { ComplianceService } from '../filings/compliance.service';
import { PORTFOLIO_CONFIG, isValidPortfolioCode, getPortfolioValidationError, getValidPortfolioCodes } from '../../common/constants/portfolio.constants';
import { CLIENT_DEFAULTS, DEFAULT_SERVICES } from '../../common/constants/client.constants';
import { parseCsv, csvToRecords, escapeCsvValue, pickCsvField } from '../../common/utils/csv.util';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);
  private readonly clientTypes: Client['type'][] = ['COMPANY', 'INDIVIDUAL', 'SOLE_TRADER', 'PARTNERSHIP', 'LLP'];
  private readonly clientStatuses: Client['status'][] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

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
  private databaseService: DatabaseService,
  private prisma: PrismaService,
) {}

  private async generateConnectedClientRef(companyRef: string, portfolioCode: number): Promise<string> {
    const existingClients = await this.fileStorage.listFiles('clients', portfolioCode);
    const used = new Set(
      (existingClients || [])
        .map((id) => String(id || ''))
        .filter((id) => id.startsWith(`${companyRef}`))
        .map((id) => id.slice(companyRef.length))
        .filter((suffix) => /^[A-Z]+$/.test(suffix))
    );

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alphabet.length; i++) {
      const letter = alphabet[i];
      if (!used.has(letter)) {
        return `${companyRef}${letter}`;
      }
    }

    return `${companyRef}AA`;
  }

  async enrollDirectorAsClient(companyRef: string, payload: { name: string }): Promise<{ ref: string; created: boolean }> {
    const company = await this.findOne(companyRef);
    if (!company) {
      throw new NotFoundException(`Client ${companyRef} not found`);
    }

    const portfolioCode = company.portfolioCode;
    const newRef = await this.generateConnectedClientRef(company.ref, portfolioCode);

    const existing = await (this.prisma as any).client.findFirst({ where: { ref: newRef } });
    if (existing) {
      return { ref: newRef, created: false };
    }

    const trimmedName = String(payload?.name || '').trim();
    if (!trimmedName) {
      throw new BadRequestException('Director name is required');
    }

    // Ensure a corresponding Person record does not collide.
    // Person identity is kept separate from Staff and Client.
    try {
      const existingPerson = await (this.prisma as any).person.findFirst({ where: { ref: newRef } });
      if (!existingPerson) {
        const parts = trimmedName.split(/\s+/).filter(Boolean);
        const firstName = parts.shift() || trimmedName;
        const lastName = parts.join(' ') || ' ';
        await (this.prisma as any).person.create({
          data: {
            ref: newRef,
            firstName,
            lastName,
          },
        });
      }
    } catch (e) {
      // If prisma isn't available or person model not generated yet, continue with client creation.
    }

    await (this.prisma as any).client.create({
      data: {
        ref: newRef,
        name: trimmedName,
        type: 'INDIVIDUAL',
        portfolioCode,
        status: 'ACTIVE',
      },
    });

    const now = new Date();
    const jsonClient: Client = {
      id: newRef,
      ref: newRef,
      name: trimmedName,
      type: 'INDIVIDUAL',
      portfolioCode,
      status: 'ACTIVE',
      parties: [],
      services: [],
      tasks: [],
      documents: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('clients', newRef, jsonClient, portfolioCode);

    return { ref: newRef, created: true };
  }

  private parseClientType(value?: string): Client['type'] {
    const normalized = (value || CLIENT_DEFAULTS.TYPE).toUpperCase().trim().replace(/\s+/g, '_');
    if (this.clientTypes.includes(normalized as Client['type'])) {
      return normalized as Client['type'];
    }
    return CLIENT_DEFAULTS.TYPE;
  }

  private parseClientStatus(value?: string): Client['status'] {
    const normalized = (value || CLIENT_DEFAULTS.STATUS).toUpperCase().trim();
    if (this.clientStatuses.includes(normalized as Client['status'])) {
      return normalized as Client['status'];
    }
    return CLIENT_DEFAULTS.STATUS;
  }

  private normalizeName(value?: string): string | null {
    const normalized = (value || '').trim().toLowerCase();
    return normalized ? normalized : null;
  }

  private async resolveDbClientForClient(client: Client): Promise<DbClient | null> {
    try {
      if (client.registeredNumber) {
        const byNumber = await this.databaseService.getClientByNumber(client.registeredNumber);
        if (byNumber) return byNumber;
      }

      const name = this.normalizeName(client.name);
      let matches: DbClient[] = [];
      let exact: DbClient[] = [];

      if (name) {
        matches = await this.databaseService.searchClientsByName(client.name, 5);
        exact = matches.filter((candidate) => {
          const companyName = this.normalizeName(candidate.companyName);
          const tradingName = this.normalizeName(candidate.tradingName);
          return companyName === name || tradingName === name;
        });
      }

      let resolved: DbClient | null = null;
      if (exact.length === 1) {
        resolved = exact[0];
      } else if (matches.length === 1) {
        resolved = matches[0];
      }

      if (!resolved) {
        const all = await this.databaseService.getClientList();
        if (all.length === 1) {
          const full = all[0]?.companyNumber
            ? await this.databaseService.getClientByNumber(all[0].companyNumber)
            : null;
          resolved = full || all[0];
        }
      }

      return resolved;
    } catch (e: any) {
      this.logger.warn(`DB client resolution unavailable; returning null: ${e?.message || e}`);
      return null;
    }
  }

  private buildAddressFromCsv(record: Record<string, string>): Address | undefined {
    const line1 = pickCsvField(record, 'Address Line 1', 'Line1', 'Address') || '';
    const line2 = pickCsvField(record, 'Address Line 2', 'Line2') || undefined;
    const city = pickCsvField(record, 'City') || '';
    const county = pickCsvField(record, 'County') || undefined;
    const postcode = pickCsvField(record, 'Postcode') || '';
    const country = pickCsvField(record, 'Country') || '';

    if (!line1 && !line2 && !city && !county && !postcode && !country) {
      return undefined;
    }

    return {
      line1,
      line2,
      city,
      county,
      postcode,
      country,
    };
  }

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
          createClientDto.name,
          { clientType: createClientDto.type }
        );
      } else {
        ref = createClientDto.ref;
      }
    } else {
      // Generate a new ref
      ref = await this.referenceGenerator.generateClientRef(
        createClientDto.portfolioCode,
        createClientDto.name,
        { clientType: createClientDto.type }
      );
    }
    
    const now = new Date();

    const client: Client = {
      id,
      ref,
      name: createClientDto.name,
      type: createClientDto.type,
      portfolioCode: createClientDto.portfolioCode,
      status: createClientDto.status || CLIENT_DEFAULTS.STATUS,
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
        const person = await this.personService.create(client.ref, {
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
      const defaults: CreateFullClientServiceDto[] = DEFAULT_SERVICES.map(s => ({ ...s }));
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

  async findAllWithContext(filters?: ClientFilters): Promise<ClientContext[]> {
    const clients = await this.findAll(filters);

    let dbClients: any[] = [];
    try {
      dbClients = await this.databaseService.getClientList({}, [
        'companyNumber',
        'companyName',
        'tradingName',
        'mainContactName',
        'partnerResponsible',
        'clientManager',
        'lifecycleStatus',
        'engagementType',
        'engagementLetterSigned',
        'onboardingDate',
        'disengagementDate',
        'onboardingStartedAt',
        'wentLiveAt',
        'ceasedAt',
        'dormantSince',
        'accountingPeriodEnd',
        'nextAccountsDueDate',
        'nextCorporationTaxDueDate',
        'statutoryYearEnd',
        'vatRegistrationDate',
        'vatPeriodStart',
        'vatPeriodEnd',
        'vatStagger',
        'payrollPayDay',
        'payrollPeriodEndDay',
        'corporationTaxUtr',
        'vatNumber',
        'vatScheme',
        'vatReturnFrequency',
        'vatQuarter',
        'payeReference',
        'payeAccountsOfficeReference',
        'accountsOfficeReference',
        'cisRegistered',
        'cisUtr',
        'payrollRtiRequired',
        'amlCompleted',
        'clientRiskRating',
        'annualFee',
        'monthlyFee',
        'personalUtr',
        'selfAssessmentRequired',
        'selfAssessmentFiled',
        'companyType',
        'registeredAddress',
        'authenticationCode',
        'employeeCount',
        'payrollFrequency',
        'contactPosition',
        'telephone',
        'mobile',
        'email',
        'preferredContactMethod',
        'correspondenceAddress',
        'feeArrangement',
        'businessBankName',
        'accountLastFour',
        'directDebitInPlace',
        'paymentIssues',
        'notes',
        'specialCircumstances',
        'seasonalBusiness',
        'dormant',
        'doNotContact',
        'nationalInsuranceNumber',
        'dateOfBirth',
        'personalAddress',
        'personalTaxYear',
        'selfAssessmentTaxYear',
        'linkedCompanyNumber',
        'directorRole',
        'clientType',
        'companyStatusDetail',
        'jurisdiction',
        'registeredOfficeFull',
        'sicCodes',
        'sicDescriptions',
        'accountsOverdue',
        'confirmationStatementOverdue',
        'nextAccountsMadeUpTo',
        'nextAccountsDueBy',
        'lastAccountsMadeUpTo',
        'nextConfirmationStatementDate',
        'confirmationStatementDueBy',
        'lastConfirmationStatementDate',
        'directorCount',
        'pscCount',
        'currentDirectors',
        'currentPscs',
        'lastChRefresh',
      ]);
    } catch (e: any) {
      this.logger.warn(`Database client list unavailable; falling back to file-only client contexts: ${e?.message || e}`);
      dbClients = [];
    }

    const dbMap = new Map(dbClients.map((dbClient) => [dbClient.companyNumber, dbClient]));
    const nameCounts = new Map<string, number>();
    const nameMap = new Map<string, DbClient>();

    for (const dbClient of dbClients) {
      const nameKey = this.normalizeName(dbClient.companyName);
      if (!nameKey) continue;
      nameCounts.set(nameKey, (nameCounts.get(nameKey) || 0) + 1);
      if (!nameMap.has(nameKey)) {
        nameMap.set(nameKey, dbClient);
      }
    }

    return clients.map((client) => {
      let dbClient = client.registeredNumber ? dbMap.get(client.registeredNumber) || null : null;
      if (!dbClient) {
        const nameKey = this.normalizeName(client.name);
        if (nameKey && nameCounts.get(nameKey) === 1) {
          dbClient = nameMap.get(nameKey) || null;
        }
      }
      return buildClientContext(client, dbClient);
    });
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
    if (!isValidPortfolioCode(portfolioCode)) {
      throw new BadRequestException(getPortfolioValidationError());
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
      day = CLIENT_DEFAULTS.ACCOUNTING_REFERENCE_DAY;
      month = CLIENT_DEFAULTS.ACCOUNTING_REFERENCE_MONTH;
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
        c.utrNumber || '',
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
      ].map(escapeCsvValue);
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
    const rows = parseCsv(csv);
    const records = csvToRecords(rows);
    const errors: Array<{ row: any; error: string }> = [];
    let created = 0;
    for (const r of records) {
      try {
        const name = pickCsvField(r, 'Company Name', 'Name');
        if (!name) throw new BadRequestException('Name is required');
        const type = this.parseClientType(pickCsvField(r, 'Type'));
        const portfolioCode = parseInt(pickCsvField(r, 'Portfolio Code', 'Portfolio') || String(PORTFOLIO_CONFIG.DEFAULT_CODE), 10) || PORTFOLIO_CONFIG.DEFAULT_CODE;
        const status = this.parseClientStatus(pickCsvField(r, 'Status'));
        const registeredNumber = pickCsvField(r, 'Company Number', 'Registered Number') || undefined;
        const mainEmail = pickCsvField(r, 'Email', 'Main Email') || undefined;
        const mainPhone = pickCsvField(r, 'Phone', 'Main Phone') || undefined;
        const accountsAccountingReferenceDay = parseInt(pickCsvField(r, 'Accounting Reference Day', 'Accounts Accounting Reference Day', 'ARD Day') || '', 10);
        const accountsAccountingReferenceMonth = parseInt(pickCsvField(r, 'Accounting Reference Month', 'Accounts Accounting Reference Month', 'ARD Month') || '', 10);
        const address = this.buildAddressFromCsv(r);

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
        };

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
    const rows = csvToRecords(parseCsv(csv));
    const out: Array<{ name: string; portfolioCode: number; suggestedRef?: string; error?: string }> = [];

    // Build used map and counters from storage (like regenerateAllRefs)
    const used = new Set<string>();
    const counters = new Map<string, number>();
    const portfolioCodes = getValidPortfolioCodes();
    for (const port of portfolioCodes) {
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
      const name = pickCsvField(r, 'Company Name', 'Name');
      if (!name) { out.push({ name: '', portfolioCode: PORTFOLIO_CONFIG.DEFAULT_CODE, error: 'Missing name' }); continue; }
      const port = parseInt(pickCsvField(r, 'Portfolio Code', 'Portfolio') || String(PORTFOLIO_CONFIG.DEFAULT_CODE)) || PORTFOLIO_CONFIG.DEFAULT_CODE;

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

  private buildDbUpdate(updateClientDto: UpdateClientDto): Partial<DbClient> {
    return Object.fromEntries(
      Object.entries({
        mainContactName: updateClientDto.mainContactName,
        partnerResponsible: updateClientDto.partnerResponsible,
        clientManager: updateClientDto.clientManager,
        lifecycleStatus: updateClientDto.lifecycleStatus,
        engagementType: updateClientDto.engagementType,
        engagementLetterSigned: updateClientDto.engagementLetterSigned,
        onboardingDate: updateClientDto.onboardingDate,
        disengagementDate: updateClientDto.disengagementDate,
        onboardingStartedAt: updateClientDto.onboardingStartedAt,
        wentLiveAt: updateClientDto.wentLiveAt,
        ceasedAt: updateClientDto.ceasedAt,
        dormantSince: updateClientDto.dormantSince,
        accountingPeriodEnd: updateClientDto.accountingPeriodEnd,
        nextAccountsDueDate: updateClientDto.nextAccountsDueDate,
        nextCorporationTaxDueDate: updateClientDto.nextCorporationTaxDueDate,
        statutoryYearEnd: updateClientDto.statutoryYearEnd,
        vatRegistrationDate: updateClientDto.vatRegistrationDate,
        vatPeriodStart: updateClientDto.vatPeriodStart,
        vatPeriodEnd: updateClientDto.vatPeriodEnd,
        vatStagger: updateClientDto.vatStagger,
        payrollPayDay: updateClientDto.payrollPayDay,
        payrollPeriodEndDay: updateClientDto.payrollPeriodEndDay,
        corporationTaxUtr: updateClientDto.corporationTaxUtr,
        vatNumber: updateClientDto.vatNumber,
        vatScheme: updateClientDto.vatScheme,
        vatReturnFrequency: updateClientDto.vatReturnFrequency,
        vatQuarter: updateClientDto.vatQuarter,
        payeReference: updateClientDto.payeReference,
        payeAccountsOfficeReference: updateClientDto.payeAccountsOfficeReference,
        accountsOfficeReference: updateClientDto.accountsOfficeReference,
        cisRegistered: updateClientDto.cisRegistered,
        cisUtr: updateClientDto.cisUtr,
        payrollRtiRequired: updateClientDto.payrollRtiRequired,
        amlCompleted: updateClientDto.amlCompleted,
        clientRiskRating: updateClientDto.clientRiskRating,
        annualFee: updateClientDto.annualFee,
        monthlyFee: updateClientDto.monthlyFee,
        personalUtr: updateClientDto.personalUtr,
        selfAssessmentRequired: updateClientDto.selfAssessmentRequired,
        selfAssessmentFiled: updateClientDto.selfAssessmentFiled,
        tradingName: updateClientDto.tradingName,
        registeredAddress: updateClientDto.registeredAddress,
        authenticationCode: updateClientDto.authenticationCode,
        employeeCount: updateClientDto.employeeCount,
        payrollFrequency: updateClientDto.payrollFrequency,
        contactPosition: updateClientDto.contactPosition,
        telephone: updateClientDto.telephone,
        mobile: updateClientDto.mobile,
        email: updateClientDto.email,
        preferredContactMethod: updateClientDto.preferredContactMethod,
        correspondenceAddress: updateClientDto.correspondenceAddress,
        feeArrangement: updateClientDto.feeArrangement,
        businessBankName: updateClientDto.businessBankName,
        accountLastFour: updateClientDto.accountLastFour,
        directDebitInPlace: updateClientDto.directDebitInPlace,
        paymentIssues: updateClientDto.paymentIssues,
        notes: updateClientDto.notes,
        specialCircumstances: updateClientDto.specialCircumstances,
        seasonalBusiness: updateClientDto.seasonalBusiness,
        dormant: updateClientDto.dormant,
        doNotContact: updateClientDto.doNotContact,
        nationalInsuranceNumber: updateClientDto.nationalInsuranceNumber,
        dateOfBirth: updateClientDto.dateOfBirth,
        personalAddress: updateClientDto.personalAddress,
        personalTaxYear: updateClientDto.personalTaxYear,
        selfAssessmentTaxYear: updateClientDto.selfAssessmentTaxYear,
        linkedCompanyNumber: updateClientDto.linkedCompanyNumber,
        directorRole: updateClientDto.directorRole,
        clientType: updateClientDto.clientType,
      }).filter(([, value]) => value !== undefined)
    );
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    const clientUpdate: Partial<Client> = Object.fromEntries(
      Object.entries({
      name: updateClientDto.name,
      type: updateClientDto.type,
      status: updateClientDto.status,
      mainEmail: updateClientDto.mainEmail,
      mainPhone: updateClientDto.mainPhone,
      registeredNumber: updateClientDto.registeredNumber,
      utrNumber: updateClientDto.utrNumber,
      incorporationDate: updateClientDto.incorporationDate,
      accountsAccountingReferenceDay: updateClientDto.accountsAccountingReferenceDay,
      accountsAccountingReferenceMonth: updateClientDto.accountsAccountingReferenceMonth,
      accountsLastMadeUpTo: updateClientDto.accountsLastMadeUpTo,
      accountsNextDue: updateClientDto.accountsNextDue,
      confirmationLastMadeUpTo: updateClientDto.confirmationLastMadeUpTo,
      confirmationNextDue: updateClientDto.confirmationNextDue,
      address: updateClientDto.address,
      mainContactName: updateClientDto.mainContactName,
      partnerResponsible: updateClientDto.partnerResponsible,
      clientManager: updateClientDto.clientManager,
      lifecycleStatus: updateClientDto.lifecycleStatus,
      engagementType: updateClientDto.engagementType,
      engagementLetterSigned: updateClientDto.engagementLetterSigned,
      onboardingDate: updateClientDto.onboardingDate,
      disengagementDate: updateClientDto.disengagementDate,
      onboardingStartedAt: updateClientDto.onboardingStartedAt,
      wentLiveAt: updateClientDto.wentLiveAt,
      ceasedAt: updateClientDto.ceasedAt,
      dormantSince: updateClientDto.dormantSince,
      accountingPeriodEnd: updateClientDto.accountingPeriodEnd,
      nextAccountsDueDate: updateClientDto.nextAccountsDueDate,
      nextCorporationTaxDueDate: updateClientDto.nextCorporationTaxDueDate,
      statutoryYearEnd: updateClientDto.statutoryYearEnd,
      vatRegistrationDate: updateClientDto.vatRegistrationDate,
      vatPeriodStart: updateClientDto.vatPeriodStart,
      vatPeriodEnd: updateClientDto.vatPeriodEnd,
      vatStagger: updateClientDto.vatStagger,
      payrollPayDay: updateClientDto.payrollPayDay,
      payrollPeriodEndDay: updateClientDto.payrollPeriodEndDay,
      corporationTaxUtr: updateClientDto.corporationTaxUtr,
      vatNumber: updateClientDto.vatNumber,
      vatScheme: updateClientDto.vatScheme,
      vatReturnFrequency: updateClientDto.vatReturnFrequency,
      vatQuarter: updateClientDto.vatQuarter,
      payeReference: updateClientDto.payeReference,
      payeAccountsOfficeReference: updateClientDto.payeAccountsOfficeReference,
      accountsOfficeReference: updateClientDto.accountsOfficeReference,
      cisRegistered: updateClientDto.cisRegistered,
      cisUtr: updateClientDto.cisUtr,
      payrollRtiRequired: updateClientDto.payrollRtiRequired,
      amlCompleted: updateClientDto.amlCompleted,
      clientRiskRating: updateClientDto.clientRiskRating,
      annualFee: updateClientDto.annualFee,
      monthlyFee: updateClientDto.monthlyFee,
      personalUtr: updateClientDto.personalUtr,
      selfAssessmentRequired: updateClientDto.selfAssessmentRequired,
      selfAssessmentFiled: updateClientDto.selfAssessmentFiled,
      tradingName: updateClientDto.tradingName,
      registeredAddress: updateClientDto.registeredAddress,
      authenticationCode: updateClientDto.authenticationCode,
      employeeCount: updateClientDto.employeeCount,
      payrollFrequency: updateClientDto.payrollFrequency,
      contactPosition: updateClientDto.contactPosition,
      telephone: updateClientDto.telephone,
      mobile: updateClientDto.mobile,
      email: updateClientDto.email,
      preferredContactMethod: updateClientDto.preferredContactMethod,
      correspondenceAddress: updateClientDto.correspondenceAddress,
      feeArrangement: updateClientDto.feeArrangement,
      businessBankName: updateClientDto.businessBankName,
      accountLastFour: updateClientDto.accountLastFour,
      directDebitInPlace: updateClientDto.directDebitInPlace,
      paymentIssues: updateClientDto.paymentIssues,
      notes: updateClientDto.notes,
      specialCircumstances: updateClientDto.specialCircumstances,
      seasonalBusiness: updateClientDto.seasonalBusiness,
      dormant: updateClientDto.dormant,
      doNotContact: updateClientDto.doNotContact,
      nationalInsuranceNumber: updateClientDto.nationalInsuranceNumber,
      dateOfBirth: updateClientDto.dateOfBirth,
      personalAddress: updateClientDto.personalAddress,
      personalTaxYear: updateClientDto.personalTaxYear,
      selfAssessmentTaxYear: updateClientDto.selfAssessmentTaxYear,
      linkedCompanyNumber: updateClientDto.linkedCompanyNumber,
      directorRole: updateClientDto.directorRole,
      clientType: updateClientDto.clientType,
      }).filter(([, value]) => value !== undefined)
    );

    const updatedClient: Client = {
      ...existing,
      ...clientUpdate,
      id: existing.id, // Ensure ID cannot be changed
      ref: existing.ref, // Ensure reference cannot be changed
      portfolioCode: existing.portfolioCode, // Ensure portfolio cannot be changed
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('clients', existing.ref, updatedClient, existing.portfolioCode);
    this.logger.log(`Updated client: ${updatedClient.name} (${updatedClient.ref})`);

    const dbUpdate = this.buildDbUpdate(updateClientDto);

    if (Object.keys(dbUpdate).length > 0) {
      try {
        let dbClient = await this.resolveDbClientForClient(updatedClient);
        if (!dbClient && (updatedClient.registeredNumber || updatedClient.id)) {
          const companyNumber = updatedClient.registeredNumber || updatedClient.id;
          const addResult = await this.databaseService.addClient({
            companyNumber,
            companyName: updatedClient.name,
            status: updatedClient.status,
            ...dbUpdate,
          });
          if (addResult.success) {
            dbClient = await this.databaseService.getClientByNumber(companyNumber);
          }
        }

        if (dbClient) {
          await this.databaseService.updateClient(dbClient.companyNumber, dbUpdate);
        }
      } catch (e: any) {
        this.logger.warn(`DB update failed during client update; file update succeeded: ${e?.message || e}`);
      }
    }

    return updatedClient;
  }

  async updateProfile(
    id: string,
    updateClientDto: UpdateClientDto
  ): Promise<ClientContext & { partiesDetails: Array<ClientParty & { partyRef: string }> }> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    const dbUpdate = this.buildDbUpdate(updateClientDto);

    if (Object.keys(dbUpdate).length > 0) {
      try {
        let dbClient = await this.resolveDbClientForClient(existing);
        if (!dbClient && (existing.registeredNumber || existing.id)) {
          const companyNumber = existing.registeredNumber || existing.id;
          const addResult = await this.databaseService.addClient({
            companyNumber,
            companyName: existing.name,
            status: existing.status,
            ...dbUpdate,
          });
          if (addResult.success) {
            dbClient = await this.databaseService.getClientByNumber(companyNumber);
          }
        }

        if (dbClient) {
          await this.databaseService.updateClient(dbClient.companyNumber, dbUpdate);
        }
      } catch (e: any) {
        this.logger.warn(`DB update failed during client profile update; continuing: ${e?.message || e}`);
      }
    }

    return this.getClientWithParties(existing.id);
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
    if (!isValidPortfolioCode(newPortfolioCode)) {
      throw new BadRequestException(getPortfolioValidationError());
    }

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    if (existing.portfolioCode === newPortfolioCode) return existing;

    // Generate a new reference for the new portfolio
    const newRef = await this.referenceGenerator.generateClientRef(newPortfolioCode, existing.name, { clientType: existing.type });

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

  async getClientWithParties(
    clientId: string
  ): Promise<
    ClientContext & {
      partiesDetails: Array<ClientParty & { partyRef: string }>;
      companiesHouse?: { companyNumber?: string; officers?: any[]; lastFetched?: Date };
    }
  > {
    const client = await this.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const partiesDetailsRaw = await this.clientPartyService.findByClient(client.id);
    // Attach composite party reference: client.ref + suffixLetter (e.g., 1P003A)
    const partiesDetails = partiesDetailsRaw.map((p) => ({
      ...p,
      partyRef: `${client.ref}${p.suffixLetter || ''}`,
    }));

    const dbClient = await this.resolveDbClientForClient(client);

    const context = buildClientContext(client, dbClient);

    let companiesHouse: { companyNumber?: string; officers?: any[]; lastFetched?: Date } | undefined;
    try {
      const snapshot = await (this.prisma as any).companiesHouseData.findFirst({
        where: { companyNumber: client.registeredNumber || undefined },
      });
      if (snapshot) {
        companiesHouse = {
          companyNumber: snapshot.companyNumber,
          officers: Array.isArray(snapshot.officers) ? snapshot.officers : (snapshot.officers?.items || []),
          lastFetched: snapshot.lastFetched,
        };
      }
    } catch (e) {
      companiesHouse = undefined;
    }

    return {
      ...context,
      partiesDetails,
      companiesHouse,
    };
  }

  async getClientWithContext(clientId: string): Promise<ClientContext> {
    const client = await this.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const dbClient = await this.resolveDbClientForClient(client);
    return buildClientContext(client, dbClient);
  }

  async getPortfolioStats(): Promise<Record<number, { count: number; active: number; inactive: number }>> {
    const stats: Record<number, { count: number; active: number; inactive: number }> = {};

    const portfolioCodes = getValidPortfolioCodes();
    for (const portfolioCode of portfolioCodes) {
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
      utrNumber: client.utrNumber || '',
      
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
    const portfolioCodes = getValidPortfolioCodes();
    for (const port of portfolioCodes) {
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
