import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildClientContext } from './dto/client-context.dto';
import * as crypto from 'crypto';
import {
  Client,
  ClientFilters,
  CreateClientDto,
  UpdateClientDto,
  ClientProfile,
  CreateClientProfileDto,
  UpdateClientProfileDto,
} from './interfaces/client.interface';
import type { ClientContext } from './dto/client-context.dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const portfolioCode = createClientDto.portfolioCode ?? 1;
    const id = createClientDto.id || await this.generateClientIdentifier(portfolioCode);

    const created = await (this.prisma as any).client.create({
      data: {
        ...createClientDto,
        id,
        status: createClientDto.status || 'ACTIVE',
        mtdVatEnabled: createClientDto.mtdVatEnabled ?? false,
        mtdItsaEnabled: createClientDto.mtdItsaEnabled ?? false,
        tasksDueCount: createClientDto.tasksDueCount ?? 0,
      },
    });

    this.logger.log(`Created client: ${created.id}`);
    return created;
  }

  async enrollDirector(
    clientId: string,
    payload: { name: string; email?: string; phone?: string },
  ): Promise<{ id: string; identifier: string; name: string; created: boolean }> {
    const baseClient = await this.findByIdentifier(clientId);
    if (!baseClient) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const name = (payload?.name || '').trim();
    if (!name) {
      throw new BadRequestException('Director name is required');
    }

    const existing = await (this.prisma as any).client.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        type: 'INDIVIDUAL',
        portfolioCode: baseClient.portfolioCode,
      },
    });

    if (existing) {
      return {
        id: existing.id,
        identifier: existing.registeredNumber || existing.id,
        name: existing.name,
        created: false,
      };
    }

    const newClientId = await this.generateClientIdentifier(baseClient.portfolioCode);
    const created = await this.create({
      id: newClientId,
      name,
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      portfolioCode: baseClient.portfolioCode,
      mainEmail: payload.email,
      mainPhone: payload.phone,
      source: 'director_enroll',
    });

    return {
      id: created.id,
      identifier: created.registeredNumber || created.id,
      name: created.name,
      created: true,
    };
  }

  private async generateClientIdentifier(portfolioCode: number): Promise<string> {
    const code = Number.isFinite(Number(portfolioCode)) ? Number(portfolioCode) : 1;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    return this.prisma.$transaction(async (tx) => {
      const buckets = await (tx as any).refBucket.findMany({
        where: { portfolioCode: code },
        orderBy: { alpha: 'asc' },
      });

      let bucket = buckets.find((b: any) => b.nextIndex <= 999);
      if (!bucket) {
        const lastAlpha = buckets.length ? buckets[buckets.length - 1].alpha : 'A';
        const lastIndex = alphabet.indexOf(lastAlpha || 'A');
        const nextAlpha = alphabet[Math.min(lastIndex + 1, alphabet.length - 1)] || 'A';
        bucket = await (tx as any).refBucket.create({
          data: {
            portfolioCode: code,
            alpha: nextAlpha,
            nextIndex: 1,
          },
        });
      }

      let nextIndex = bucket.nextIndex || 1;
      for (let attempts = 0; attempts < 2000; attempts++) {
        if (nextIndex > 999) {
          const currentIdx = alphabet.indexOf(bucket.alpha || 'A');
          const nextAlpha = alphabet[Math.min(currentIdx + 1, alphabet.length - 1)] || 'A';
          bucket = await (tx as any).refBucket.upsert({
            where: { portfolioCode_alpha: { portfolioCode: code, alpha: nextAlpha } },
            update: {},
            create: { portfolioCode: code, alpha: nextAlpha, nextIndex: 1 },
          });
          nextIndex = bucket.nextIndex || 1;
        }

        const candidate = `${code}${bucket.alpha}${String(nextIndex).padStart(3, '0')}`;
        const exists = await (tx as any).client.findUnique({ where: { id: candidate } });
        if (!exists) {
          await (tx as any).refBucket.update({
            where: { id: bucket.id },
            data: { nextIndex: nextIndex + 1 },
          });
          return candidate;
        }
        nextIndex += 1;
      }

      throw new BadRequestException('Unable to generate client identifier');
    });
  }

  async findAll(filters: ClientFilters = {}): Promise<Client[]> {
    const where: any = {};
    if (filters.portfolioCode) where.portfolioCode = filters.portfolioCode;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { registeredNumber: { contains: filters.search, mode: 'insensitive' } },
        { mainEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const skip = filters.offset !== undefined ? Number(filters.offset) : 0;
    const take = filters.limit !== undefined ? Number(filters.limit) : 100;

    return (this.prisma as any).client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: Number.isFinite(skip) ? skip : 0,
      take: Number.isFinite(take) ? take : 100,
    });
  }

  async findAllContexts(filters: ClientFilters = {}): Promise<ClientContext[]> {
    const where: any = {};
    if (filters.portfolioCode) where.portfolioCode = filters.portfolioCode;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { registeredNumber: { contains: filters.search, mode: 'insensitive' } },
        { mainEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const skip = filters.offset !== undefined ? Number(filters.offset) : 0;
    const take = filters.limit !== undefined ? Number(filters.limit) : 100;

    const clients = await (this.prisma as any).client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: Number.isFinite(skip) ? skip : 0,
      take: Number.isFinite(take) ? take : 100,
      include: { clientProfile: true },
    });

    return clients.map((client: any) => buildClientContext(client, client.clientProfile || undefined));
  }

  async findOne(id: string): Promise<Client | null> {
    return (this.prisma as any).client.findUnique({ where: { id } });
  }

  async findByIdentifier(identifier: string): Promise<Client | null> {
    if (!identifier) return null;
    const byId = await this.findOne(identifier);
    if (byId) return byId;
    return (this.prisma as any).client.findFirst({
      where: { registeredNumber: identifier },
    });
  }

  async findByPortfolio(portfolioCode: number): Promise<Client[]> {
    return this.findAll({ portfolioCode });
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    const updated = await (this.prisma as any).client.update({
      where: { id },
      data: updateClientDto,
    });

    this.logger.log(`Updated client: ${updated.id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) return false;
    await (this.prisma as any).client.delete({ where: { id } });
    this.logger.log(`Deleted client: ${id}`);
    return true;
  }

  async getClientWithParties(clientId: string): Promise<any> {
    const client = await (this.prisma as any).client.findUnique({
      where: { id: clientId },
      include: {
        parties: {
          include: { person: true },
        },
      },
    });
    if (!client) return null;
    return {
      ...client,
      partiesDetails: client.parties || [],
    };
  }

  async getContextWithParties(clientId: string): Promise<any> {
    const client = await (this.prisma as any).client.findUnique({
      where: { id: clientId },
      include: {
        address: true,
        parties: {
          include: { person: true },
        },
      },
    });
    if (!client) return null;

    const profile = await (this.prisma as any).clientProfile.findUnique({ where: { clientId } });
    const context = buildClientContext(client, profile || undefined);
    return {
      ...context,
      partiesDetails: client.parties || [],
    };
  }

  async getProfile(clientId: string): Promise<ClientProfile | null> {
    return (this.prisma as any).clientProfile.findUnique({ where: { clientId } });
  }

  async createProfile(payload: CreateClientProfileDto): Promise<ClientProfile> {
    const client = await this.findOne(payload.clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${payload.clientId} not found`);
    }

    const existing = await this.getProfile(payload.clientId);
    if (existing) {
      throw new BadRequestException(`Client profile already exists for client ${payload.clientId}`);
    }

    return (this.prisma as any).clientProfile.create({
      data: {
        ...payload,
        lifecycleStatus: payload.lifecycleStatus || 'PROSPECT',
        engagementLetterSigned: payload.engagementLetterSigned ?? false,
        cisRegistered: payload.cisRegistered ?? false,
        payrollRtiRequired: payload.payrollRtiRequired ?? false,
        amlCompleted: payload.amlCompleted ?? false,
        selfAssessmentRequired: payload.selfAssessmentRequired ?? false,
        selfAssessmentFiled: payload.selfAssessmentFiled ?? false,
        directDebitInPlace: payload.directDebitInPlace ?? false,
        accountsOverdue: payload.accountsOverdue ?? false,
        confirmationStatementOverdue: payload.confirmationStatementOverdue ?? false,
        seasonalBusiness: payload.seasonalBusiness ?? false,
        dormant: payload.dormant ?? false,
        doNotContact: payload.doNotContact ?? false,
        vatStagger: payload.vatStagger || 'NONE',
      },
    });
  }

  async updateProfile(clientId: string, payload: UpdateClientProfileDto): Promise<ClientProfile> {
    const existing = await this.getProfile(clientId);
    if (!existing) {
      throw new NotFoundException(`Client profile not found for client ${clientId}`);
    }

    return (this.prisma as any).clientProfile.update({
      where: { clientId },
      data: payload,
    });
  }
}
