import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientParty, CreateClientPartyDto, UpdateClientPartyDto, CreatePersonDto, Address } from '../interfaces/client.interface';
import { PersonService } from './person.service';
import { ClientsService } from '../clients.service';

@Injectable()
export class ClientPartyService {
  private readonly logger = new Logger(ClientPartyService.name);
  private readonly allowedRoles: string[] = ['DIRECTOR', 'SHAREHOLDER', 'PARTNER', 'MEMBER', 'OWNER', 'UBO', 'SECRETARY', 'CONTACT'];

  private parsePartyRole(role?: string): string | undefined {
    if (!role) return undefined;
    const normalized = role.toString().toUpperCase().trim();
    if (this.allowedRoles.includes(normalized)) return normalized;
    return role;
  }

  private parseOptionalDate(value?: Date | string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  constructor(
    private prisma: PrismaService,
    private personService: PersonService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
  ) {}

  private normalizeName(name?: string) {
    return (name || '').replace(/[\W_]+/g, ' ').trim().toLowerCase();
  }

  async findByClientAndSourceId(clientId: string, source: string, sourceId: string): Promise<ClientParty | null> {
    const partyRef = `${source}:${sourceId}`;
    return (this.prisma as any).clientParty.findFirst({ where: { clientId, partyRef } });
  }

  async findByClientAndName(clientId: string, name?: string): Promise<ClientParty | null> {
    if (!name) return null;
    const normalized = this.normalizeName(name);
    const parties = await (this.prisma as any).clientParty.findMany({
      where: { clientId },
      include: { person: true },
    });
    return parties.find((p: any) => this.normalizeName(p.person?.fullName) === normalized) || null;
  }

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
      role?: string;
      mainEmail?: string;
      mainPhone?: string;
      address?: Address;
      appointedAt?: Date | string;
      ownershipPercent?: number;
      personId?: string;
    }>;
  }): Promise<{ party: ClientParty; created: boolean }> {
    let existing = await this.findByClientAndSourceId(clientId, source, sourceId);

    if (!existing && payload.name) {
      existing = await this.findByClientAndName(clientId, payload.name);
    }

    if (existing) {
      const updateData: UpdateClientPartyDto = {
        role: payload.role ? this.parsePartyRole(payload.role) : existing.role,
        ownershipPercent: payload.ownershipPercent ?? existing.ownershipPercent,
        appointedAt: this.parseOptionalDate(payload.appointedAt) || existing.appointedAt,
        primaryContact: existing.primaryContact,
        partyRef: existing.partyRef || `${source}:${sourceId}`,
      };

      const updated = await this.update(existing.id, updateData);
      return { party: updated as ClientParty, created: false };
    }

    let personId = payload.personId;
    if (!personId && payload.mainEmail) {
      const byEmail = await this.personService.findByEmail(payload.mainEmail);
      if (byEmail) personId = byEmail.id;
    }

    if (!personId) {
      if (!payload.name) {
        throw new BadRequestException('Cannot create client party without a person name or personId');
      }

      const createPersonDto: CreatePersonDto = {
        fullName: payload.name,
        email: payload.mainEmail,
        phone: payload.mainPhone,
      };

      const createdPerson = await this.personService.create(createPersonDto);
      personId = createdPerson.id;
    }

    const createClientPartyDto: CreateClientPartyDto = {
      clientId,
      personId,
      role: this.parsePartyRole(payload.role),
      ownershipPercent: payload.ownershipPercent,
      appointedAt: this.parseOptionalDate(payload.appointedAt),
      primaryContact: false,
      partyRef: `${source}:${sourceId}`,
    };

    const createdParty = await this.create(createClientPartyDto);
    return { party: createdParty, created: true };
  }

  async create(createClientPartyDto: CreateClientPartyDto): Promise<ClientParty> {
    await this.validateClientExists(createClientPartyDto.clientId);
    if (createClientPartyDto.personId) {
      await this.validatePersonExists(createClientPartyDto.personId);
    }

    if (createClientPartyDto.personId) {
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
    }

    const suffixLetter = createClientPartyDto.suffixLetter || (await this.generateSuffixLetter(createClientPartyDto.clientId));

    const created = await (this.prisma as any).clientParty.create({
      data: {
        clientId: createClientPartyDto.clientId,
        personId: createClientPartyDto.personId,
        role: createClientPartyDto.role ? this.parsePartyRole(createClientPartyDto.role) : undefined,
        ownershipPercent: createClientPartyDto.ownershipPercent,
        appointedAt: createClientPartyDto.appointedAt,
        resignedAt: createClientPartyDto.resignedAt,
        primaryContact: createClientPartyDto.primaryContact ?? false,
        suffixLetter,
        partyRef: createClientPartyDto.partyRef,
      },
    });

    this.logger.log(`Created client-party: ${created.id}`);
    return created;
  }

  async findAll(): Promise<ClientParty[]> {
    return (this.prisma as any).clientParty.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<ClientParty | null> {
    return (this.prisma as any).clientParty.findUnique({ where: { id } });
  }

  async findByClientAndPerson(clientId: string, personId: string, role?: string): Promise<ClientParty | null> {
    return (this.prisma as any).clientParty.findFirst({
      where: {
        clientId,
        personId,
        ...(role ? { role } : {}),
      },
    });
  }

  async findByClient(clientId: string): Promise<ClientParty[]> {
    return (this.prisma as any).clientParty.findMany({ where: { clientId } });
  }

  async update(id: string, updateClientPartyDto: UpdateClientPartyDto): Promise<ClientParty> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client-party relationship with ID ${id} not found`);
    }

    const updated = await (this.prisma as any).clientParty.update({
      where: { id },
      data: {
        role: updateClientPartyDto.role ? this.parsePartyRole(updateClientPartyDto.role) : undefined,
        ownershipPercent: updateClientPartyDto.ownershipPercent,
        appointedAt: updateClientPartyDto.appointedAt,
        resignedAt: updateClientPartyDto.resignedAt,
        primaryContact: updateClientPartyDto.primaryContact,
        suffixLetter: updateClientPartyDto.suffixLetter,
        partyRef: updateClientPartyDto.partyRef,
      },
    });

    this.logger.log(`Updated client-party: ${updated.id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) return false;
    await (this.prisma as any).clientParty.delete({ where: { id } });
    this.logger.log(`Deleted client-party: ${existing.id}`);
    return true;
  }

  private async validateClientExists(clientId: string): Promise<void> {
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

  private async generateSuffixLetter(clientId: string): Promise<string> {
    const existing = await (this.prisma as any).clientParty.findMany({
      where: { clientId },
      select: { suffixLetter: true },
    });
    const used = new Set((existing || []).map((p: any) => p.suffixLetter).filter(Boolean));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alphabet.length; i++) {
      const letter = alphabet[i];
      if (!used.has(letter)) return letter;
    }
    return 'AA';
  }
}
