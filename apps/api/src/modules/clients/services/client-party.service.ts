import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { ClientParty, CreateClientPartyDto, UpdateClientPartyDto, CreatePersonDto, Address } from '../interfaces/client.interface';
import { ReferenceGeneratorService } from './reference-generator.service';
import { PersonService } from './person.service';
import { ClientsService } from '../clients.service';

@Injectable()
export class ClientPartyService {
  private readonly logger = new Logger(ClientPartyService.name);
  private readonly allowedRoles: ClientParty['role'][] = ['DIRECTOR', 'SHAREHOLDER', 'PARTNER', 'MEMBER', 'OWNER', 'UBO', 'SECRETARY', 'CONTACT'];

  private parsePartyRole(role?: ClientParty['role'] | string): ClientParty['role'] {
    const normalized = (role || 'CONTACT').toString().toUpperCase().trim();
    if (this.allowedRoles.includes(normalized as ClientParty['role'])) {
      return normalized as ClientParty['role'];
    }
    return 'CONTACT';
  }

  private parseOptionalDate(value?: Date | string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  constructor(
    private fileStorage: FileStorageService,
    private referenceGenerator: ReferenceGeneratorService,
    private personService: PersonService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
  ) {}

  // --- Helpers for idempotent imports from external sources (e.g. Companies House) ---

  private normalizeName(name?: string) {
    return (name || '').replace(/[^\w\s]/g, '').trim().toLowerCase();
  }

  /**
   * Find a client-party by an external source mapping stored on the party (metadata.__sources)
   */
  async findByClientAndSourceId(clientId: string, source: string, sourceId: string): Promise<ClientParty | null> {
    type ClientPartyRecord = ClientParty & { metadata?: { __sources?: Record<string, string> } };
    const parties = await this.fileStorage.searchFiles<ClientPartyRecord>('client-parties', (party) => {
      if (!party || party.clientId !== clientId) return false;
      const md = party.metadata;
      return md && md.__sources && md.__sources[source] === sourceId;
    });
    return parties[0] || null;
  }

  /**
   * Best-effort fallback: find party by matching the linked person's name (normalized)
   */
  async findByClientAndName(clientId: string, name?: string): Promise<ClientParty | null> {
    if (!name) return null;
    const normalized = this.normalizeName(name);
    const parties = await this.fileStorage.searchFiles<ClientParty>('client-parties', (p) => p.clientId === clientId);

    for (const p of parties) {
      try {
        const person = await this.personService.findOne(p.personId);
        if (!person) continue;
        if (this.normalizeName(person.fullName) === normalized) return p;
      } catch (err) {
        // ignore and continue
      }
    }
    return null;
  }

  /**
   * Upsert a client-party from an external source (Companies House).
   * - Ensures we do not create duplicate parties for the same external officer id
   * - If the linked person doesn't exist, attempts to find by email or create a new person
   */
  async upsertFromExternal({
    clientId,
    source,
    sourceId,
    payload,
  }: {
    clientId: string;
    source: string;
    sourceId: string;
    payload: Partial<{
      name?: string;
      role?: ClientParty['role'] | string;
      mainEmail?: string;
      mainPhone?: string;
      address?: Address;
      appointedAt?: Date | string;
      ownershipPercent?: number;
      personId?: string;
    }>;
  }): Promise<{ party: ClientParty; created: boolean }> {
    // 1) try explicit source id mapping on party
    let existing = await this.findByClientAndSourceId(clientId, source, sourceId);

    // 2) fallback: match by person name
    if (!existing && payload.name) {
      existing = await this.findByClientAndName(clientId, payload.name);
    }

    if (existing) {
      // merge sensible fields and update
      const updateData: UpdateClientPartyDto = {
        role: payload.role ? this.parsePartyRole(payload.role) : existing.role,
        ownershipPercent: payload.ownershipPercent ?? existing.ownershipPercent,
        appointedAt: this.parseOptionalDate(payload.appointedAt) || existing.appointedAt,
        primaryContact: payload.mainEmail || payload.mainPhone ? existing.primaryContact : existing.primaryContact,
      };

      const updated = await this.update(existing.id, updateData);

      // ensure metadata mapping exists
      const refreshed: ClientParty & { metadata?: { __sources?: Record<string, string> } } = { ...updated };
      refreshed.metadata = refreshed.metadata || {};
      refreshed.metadata.__sources = refreshed.metadata.__sources || {};
      refreshed.metadata.__sources[source] = sourceId;
      await this.fileStorage.writeJson('client-parties', refreshed.id, refreshed);

      return { party: refreshed as ClientParty, created: false };
    }

    // Need to create person (or find existing one)
    let personId = payload.personId;
    if (!personId) {
      // try by email
      if (payload.mainEmail) {
        const byEmail = await this.personService.findByEmail(payload.mainEmail);
        if (byEmail) personId = byEmail.id;
      }
    }

    if (!personId) {
      // create a new person from payload.name if available
      if (!payload.name) {
        throw new BadRequestException('Cannot create client party without a person name or personId');
      }

      const parts = payload.name.trim().split(/\s+/);
      const firstName = parts.shift() || payload.name;
      const lastName = parts.join(' ') || '';

      const createPersonDto: CreatePersonDto = {
        firstName,
        lastName: lastName || ' ',
        email: payload.mainEmail,
        phone: payload.mainPhone,
        address: payload.address,
      };

      const createdPerson = await this.personService.create(createPersonDto);
      personId = createdPerson.id;
    }

    // Build create DTO for client-party
    const createClientPartyDto: CreateClientPartyDto = {
      clientId,
      personId,
      role: this.parsePartyRole(payload.role),
      ownershipPercent: payload.ownershipPercent,
      appointedAt: this.parseOptionalDate(payload.appointedAt),
      primaryContact: false,
    };

    const createdParty = await this.create(createClientPartyDto);

    // write metadata mapping into created party
    const createdRecord: ClientParty & { metadata?: { __sources?: Record<string, string> } } = { ...createdParty };
    createdRecord.metadata = createdRecord.metadata || {};
    createdRecord.metadata.__sources = createdRecord.metadata.__sources || {};
    createdRecord.metadata.__sources[source] = sourceId;
    await this.fileStorage.writeJson('client-parties', createdRecord.id, createdRecord);

    return { party: createdRecord, created: true };
  }

  async create(createClientPartyDto: CreateClientPartyDto): Promise<ClientParty> {
    // Validate that client and person exist
    await this.validateClientExists(createClientPartyDto.clientId);
    await this.validatePersonExists(createClientPartyDto.personId);

    // Check for existing relationship
    const existingRelationship = await this.findByClientAndPerson(
      createClientPartyDto.clientId,
      createClientPartyDto.personId,
      createClientPartyDto.role
    );

    if (existingRelationship) {
      throw new BadRequestException(
        `Person is already associated with this client in the role of ${createClientPartyDto.role}`
      );
    }

    const id = this.generateId();
    const suffixLetter = await this.referenceGenerator.generateSuffixLetter(
      createClientPartyDto.clientId,
      createClientPartyDto.personId
    );

    const clientParty: ClientParty = {
      id,
      clientId: createClientPartyDto.clientId,
      personId: createClientPartyDto.personId,
      role: createClientPartyDto.role,
      ownershipPercent: createClientPartyDto.ownershipPercent,
      appointedAt: createClientPartyDto.appointedAt || new Date(),
      primaryContact: createClientPartyDto.primaryContact || false,
      suffixLetter,
    };

    // Store the client-party relationship
    await this.fileStorage.writeJson('client-parties', id, clientParty);
    
    // Update client's parties array
    await this.updateClientParties(createClientPartyDto.clientId, id, 'add');

    this.logger.log(`Created client-party relationship: ${id} (${createClientPartyDto.role})`);

    return clientParty;
  }

  async findAll(): Promise<ClientParty[]> {
    return this.fileStorage.searchFiles<ClientParty>('client-parties', () => true);
  }

  async findOne(id: string): Promise<ClientParty | null> {
    return this.fileStorage.readJson<ClientParty>('client-parties', id);
  }

  async findByClient(clientId: string): Promise<ClientParty[]> {
    return this.fileStorage.searchFiles<ClientParty>('client-parties', 
      (party) => party.clientId === clientId
    );
  }

  async findByPerson(personId: string): Promise<ClientParty[]> {
    return this.fileStorage.searchFiles<ClientParty>('client-parties', 
      (party) => party.personId === personId
    );
  }

  async findByClientAndPerson(clientId: string, personId: string, role?: string): Promise<ClientParty | null> {
    const parties = await this.fileStorage.searchFiles<ClientParty>('client-parties', 
      (party) => party.clientId === clientId && 
                 party.personId === personId && 
                 (!role || party.role === role)
    );
    return parties[0] || null;
  }

  async findPrimaryContact(clientId: string): Promise<ClientParty | null> {
    const parties = await this.fileStorage.searchFiles<ClientParty>('client-parties', 
      (party) => party.clientId === clientId && party.primaryContact === true
    );
    return parties[0] || null;
  }

  async update(id: string, updateClientPartyDto: UpdateClientPartyDto): Promise<ClientParty> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client-party relationship with ID ${id} not found`);
    }

    // If changing primary contact status, ensure only one primary contact per client
    if (updateClientPartyDto.primaryContact === true) {
      await this.clearPrimaryContact(existing.clientId, id);
    }

    const updatedClientParty: ClientParty = {
      ...existing,
      ...updateClientPartyDto,
      id: existing.id, // Ensure ID cannot be changed
      clientId: existing.clientId, // Ensure client ID cannot be changed
      personId: existing.personId, // Ensure person ID cannot be changed
    };

    await this.fileStorage.writeJson('client-parties', id, updatedClientParty);
    this.logger.log(`Updated client-party relationship: ${id}`);

    return updatedClientParty;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) {
      return false;
    }

    await this.fileStorage.deleteJson('client-parties', id);
    
    // Update client's parties array
    await this.updateClientParties(existing.clientId, id, 'remove');

    this.logger.log(`Deleted client-party relationship: ${id}`);

    return true;
  }

  async resign(id: string, resignationDate?: Date): Promise<ClientParty> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client-party relationship with ID ${id} not found`);
    }

    const updatedClientParty: ClientParty = {
      ...existing,
      resignedAt: resignationDate || new Date(),
    };

    await this.fileStorage.writeJson('client-parties', id, updatedClientParty);
    this.logger.log(`Resigned client-party relationship: ${id}`);

    return updatedClientParty;
  }

  async getOwnershipSummary(clientId: string): Promise<{
    totalOwnership: number;
    parties: Array<{ personId: string; role: string; ownershipPercent: number; suffixLetter: string }>;
  }> {
    const parties = await this.findByClient(clientId);
    const ownershipParties = parties.filter(party => party.ownershipPercent !== undefined && party.ownershipPercent !== null);
    
    const totalOwnership = ownershipParties.reduce((sum, party) => sum + (party.ownershipPercent || 0), 0);
    
    return {
      totalOwnership,
      parties: ownershipParties.map(party => ({
        personId: party.personId,
        role: party.role,
        ownershipPercent: party.ownershipPercent || 0,
        suffixLetter: party.suffixLetter,
      })),
    };
  }

  private async validateClientExists(clientId: string): Promise<void> {
    // Check if the client exists using ClientsService
    const client = await this.clientsService.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }
  }

  private async validatePersonExists(personId: string): Promise<void> {
    const person = await this.personService.findOne(personId);
    if (!person) {
      throw new NotFoundException(`Person with ID ${personId} not found`);
    }
  }

  private async clearPrimaryContact(clientId: string, excludeId: string): Promise<void> {
    const existingPrimaryContacts = await this.fileStorage.searchFiles<ClientParty>('client-parties', 
      (party) => party.clientId === clientId && party.primaryContact === true && party.id !== excludeId
    );

    for (const contact of existingPrimaryContacts) {
      const updated = { ...contact, primaryContact: false };
      await this.fileStorage.writeJson('client-parties', contact.id, updated);
    }
  }

  private async updateClientParties(clientId: string, partyId: string, action: 'add' | 'remove'): Promise<void> {
    // Use ClientsService to keep a single source of truth for client.party arrays
    try {
      if (action === 'add') {
        await this.clientsService.addParty(clientId, partyId);
      } else {
        await this.clientsService.removeParty(clientId, partyId);
      }
    } catch (err) {
      // Log and rethrow unexpected errors; callers will handle NotFoundException where appropriate
      this.logger.warn(`Failed to ${action} party ${partyId} for client ${clientId}: ${err?.message || err}`);
      throw err;
    }
  }

  private generateId(): string {
    return `client_party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
