import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildClientContext } from './dto/client-context.dto';
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
import {
  isValidClientRef,
  normalizeCompanyInitial,
  parseClientRef,
  surnameInitial,
} from './utils/client-reference-validators';

const CLIENT_TYPE_VALUES = ['COMPANY', 'INDIVIDUAL', 'SOLE_TRADER', 'PARTNERSHIP', 'LLP'] as const;
const CLIENT_STATUS_VALUES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
const LIFECYCLE_STATUS_VALUES = ['PROSPECT', 'ONBOARDING', 'ACTIVE', 'DORMANT', 'CEASED'] as const;
const VAT_STAGGER_VALUES = ['A', 'B', 'C', 'NONE'] as const;
const HMRC_STATUS_VALUES = [
  'NOT_REGISTERED',
  'NOT_APPLICABLE',
  'APPLIED_FOR',
  'REGISTERED',
  'DEREGISTERED',
  'MISSING_DATA',
] as const;
const HMRC_STATUS_FIELDS = [
  'hmrcCtStatus',
  'hmrcSaStatus',
  'hmrcVatStatus',
  'hmrcPayeStatus',
  'hmrcCisStatus',
  'hmrcMtdVatStatus',
  'hmrcMtdItsaStatus',
  'hmrcEoriStatus',
] as const;
const CLIENT_DATE_FIELDS = [
  'incorporationDate',
  'yearEnd',
  'accountsNextDue',
  'accountsLastMadeUpTo',
  'confirmationNextDue',
  'confirmationLastMadeUpTo',
  'lastSyncedAt',
] as const;
const CLIENT_PROFILE_DATE_FIELDS = [
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
  'dateOfBirth',
  'lastChRefresh',
  'nextAccountsMadeUpTo',
  'nextAccountsDueBy',
  'lastAccountsMadeUpTo',
  'nextConfirmationStatementDate',
  'confirmationStatementDueBy',
  'lastConfirmationStatementDate',
] as const;
const CLIENT_WRITE_FIELDS = [
  'id',
  'clientRef',
  'baseClientRef',
  'name',
  'type',
  'status',
  'practiceId',
  'isConnectedParty',
  'connectedOrder',
  'connectedPrincipalId',
  'portfolioCode',
  'mainEmail',
  'mainPhone',
  'addressId',
  'registeredNumber',
  'utrNumber',
  'vatNumber',
  'payeReference',
  'accountsOfficeReference',
  'cisUtr',
  'eoriNumber',
  'mtdVatEnabled',
  'mtdItsaEnabled',
  'hmrcCtStatus',
  'hmrcSaStatus',
  'hmrcVatStatus',
  'hmrcPayeStatus',
  'hmrcCisStatus',
  'hmrcMtdVatStatus',
  'hmrcMtdItsaStatus',
  'hmrcEoriStatus',
  'incorporationDate',
  'yearEnd',
  'accountsNextDue',
  'accountsLastMadeUpTo',
  'confirmationNextDue',
  'confirmationLastMadeUpTo',
  'accountsAccountingReferenceDay',
  'accountsAccountingReferenceMonth',
  'annualFees',
  'tasksDueCount',
  'source',
  'lastSyncedAt',
] as const;
const CLIENT_PROFILE_WRITE_FIELDS = [
  'clientId',
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
  'cisRegistered',
  'cisUtr',
  'personalUtr',
  'payrollRtiRequired',
  'amlCompleted',
  'clientRiskRating',
  'annualFee',
  'monthlyFee',
  'selfAssessmentRequired',
  'selfAssessmentFiled',
  'tradingName',
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
  'nationalInsuranceNumber',
  'dateOfBirth',
  'personalAddress',
  'personalTaxYear',
  'selfAssessmentTaxYear',
  'linkedCompanyNumber',
  'directorRole',
  'companyStatusDetail',
  'jurisdiction',
  'sicCodes',
  'sicDescriptions',
  'registeredOfficeFull',
  'directorCount',
  'pscCount',
  'currentDirectors',
  'currentPscs',
  'lastChRefresh',
  'accountsOverdue',
  'confirmationStatementOverdue',
  'nextAccountsMadeUpTo',
  'nextAccountsDueBy',
  'lastAccountsMadeUpTo',
  'nextConfirmationStatementDate',
  'confirmationStatementDueBy',
  'lastConfirmationStatementDate',
  'notes',
  'specialCircumstances',
  'seasonalBusiness',
  'dormant',
  'doNotContact',
] as const;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const normalizedCreateDto = this.normalizeClientPayload(createClientDto, true);
    const portfolioCode = normalizedCreateDto.portfolioCode ?? 1;
    const requestedPracticeId = typeof (normalizedCreateDto as any).practiceId === 'string'
      ? (normalizedCreateDto as any).practiceId.trim()
      : '';
    const practiceId = requestedPracticeId || 'default';
    const providedId = normalizedCreateDto.id?.trim().toUpperCase();
    if (providedId) {
      const parsedProvidedId = parseClientRef(providedId);
      if (!parsedProvidedId) {
        throw new BadRequestException(
          'Client ID must match format <portfolio><letter><3 digits> with optional suffix letter',
        );
      }
      if (parsedProvidedId.portfolio !== portfolioCode) {
        throw new BadRequestException(
          `Client ID portfolio prefix ${parsedProvidedId.portfolio} must match portfolioCode ${portfolioCode}`,
        );
      }
    }
    const id = providedId || await this.generateClientIdentifier(
      portfolioCode,
      normalizedCreateDto.name,
      normalizedCreateDto.type,
      practiceId,
    );
    const requestedClientRef = typeof (normalizedCreateDto as any).clientRef === 'string'
      ? (normalizedCreateDto as any).clientRef.trim().toUpperCase()
      : '';
    if (requestedClientRef && !isValidClientRef(requestedClientRef)) {
      throw new BadRequestException(
        'clientRef must match format <portfolio><letter><3 digits> with optional suffix letter',
      );
    }
    const clientRef = requestedClientRef || id.toUpperCase();
    const parsedClientRef = parseClientRef(clientRef);
    if (!parsedClientRef) {
      throw new BadRequestException('Generated client reference is invalid');
    }
    if (parsedClientRef.portfolio !== portfolioCode) {
      throw new BadRequestException(
        `clientRef portfolio prefix ${parsedClientRef.portfolio} must match portfolioCode ${portfolioCode}`,
      );
    }
    const requestedBaseClientRef = typeof (normalizedCreateDto as any).baseClientRef === 'string'
      ? (normalizedCreateDto as any).baseClientRef.trim().toUpperCase()
      : '';
    if (requestedBaseClientRef && !isValidClientRef(requestedBaseClientRef)) {
      throw new BadRequestException(
        'baseClientRef must match format <portfolio><letter><3 digits> with optional suffix letter',
      );
    }
    const baseClientRef = requestedBaseClientRef || parsedClientRef.base;
    const parsedBaseClientRef = parseClientRef(baseClientRef);
    if (!parsedBaseClientRef || parsedBaseClientRef.suffix) {
      throw new BadRequestException('baseClientRef must be a base reference in format <portfolio><letter><3 digits>');
    }
    if (parsedBaseClientRef.portfolio !== portfolioCode) {
      throw new BadRequestException(
        `baseClientRef portfolio prefix ${parsedBaseClientRef.portfolio} must match portfolioCode ${portfolioCode}`,
      );
    }
    const created = await (this.prisma as any).client.create({
      data: {
        ...normalizedCreateDto,
        id,
        clientRef,
        baseClientRef,
        practiceId,
        status: normalizedCreateDto.status || 'ACTIVE',
        mtdVatEnabled: normalizedCreateDto.mtdVatEnabled ?? false,
        mtdItsaEnabled: normalizedCreateDto.mtdItsaEnabled ?? false,
        tasksDueCount: normalizedCreateDto.tasksDueCount ?? 0,
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
        identifier: existing.clientRef || existing.registeredNumber || existing.id,
        name: existing.name,
        created: false,
      };
    }

    const newClientId = await this.generateClientIdentifier(
      baseClient.portfolioCode,
      name,
      'INDIVIDUAL',
      (baseClient as any).practiceId || 'default',
    );
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
      identifier: created.clientRef || created.registeredNumber || created.id,
      name: created.name,
      created: true,
    };
  }

  private async generateClientIdentifier(
    portfolioCode: number,
    clientName?: string,
    clientType?: Client['type'],
    practiceId?: string,
  ): Promise<string> {
    const code = Number.isFinite(Number(portfolioCode)) ? Number(portfolioCode) : 1;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const preferredAlpha = this.derivePreferredAlpha(clientName, clientType);
    const scopedPracticeId = typeof practiceId === 'string' && practiceId.trim()
      ? practiceId.trim()
      : 'default';

    return this.prisma.$transaction(async (tx) => {
      const findBucketByAlpha = async (alpha: string): Promise<any | null> => {
        return (tx as any).refBucket.findFirst({
          where: { practiceId: scopedPracticeId, portfolioCode: code, alpha },
          orderBy: { createdAt: 'asc' },
        });
      };

      const createBucket = async (alpha: string, nextIndex: number): Promise<any> => {
        try {
          return await (tx as any).refBucket.create({
            data: {
              practiceId: scopedPracticeId,
              portfolioCode: code,
              alpha,
              nextIndex,
            },
          });
        } catch (error: any) {
          const message = String(error?.message || '').toLowerCase();
          const isUniqueCollision = error?.code === 'P2002'
            || message.includes('unique constraint')
            || message.includes('duplicate key');
          if (isUniqueCollision) {
            const existing = await findBucketByAlpha(alpha);
            if (existing) return existing;
          }
          throw error;
        }
      };

      const buckets = await (tx as any).refBucket.findMany({
        where: { practiceId: scopedPracticeId, portfolioCode: code },
        orderBy: { alpha: 'asc' },
      });

      const validBuckets = buckets
        .map((b: any) => {
          const alpha = this.normalizeBucketAlpha(b.alpha);
          if (!alpha) return null;
          return { ...b, alpha };
        })
        .filter((b: any) => !!b);

      const invalidBucketMaxIndex = buckets.reduce((max: number, b: any) => {
        if (this.normalizeBucketAlpha(b.alpha)) return max;
        const idx = Number(b.nextIndex);
        return Number.isFinite(idx) && idx > max ? idx : max;
      }, 1);

      let bucket = validBuckets.find((b: any) => b.alpha === preferredAlpha);
      if (!bucket) {
        const existingPreferredBucket = await findBucketByAlpha(preferredAlpha);
        if (existingPreferredBucket) {
          bucket = existingPreferredBucket;
        } else {
          bucket = await createBucket(preferredAlpha, invalidBucketMaxIndex);
        }
      } else if ((Number(bucket.nextIndex) || 1) < invalidBucketMaxIndex) {
        bucket = await (tx as any).refBucket.update({
          where: { id: bucket.id },
          data: { nextIndex: invalidBucketMaxIndex },
        });
      }

      let bucketAlpha = this.normalizeBucketAlpha(bucket.alpha) || preferredAlpha;
      if (bucketAlpha !== bucket.alpha) {
        bucket = await (tx as any).refBucket.update({
          where: { id: bucket.id },
          data: { alpha: bucketAlpha },
        });
      }

      let nextIndex = Number(bucket.nextIndex) || 1;
      for (let attempts = 0; attempts < 2000; attempts++) {
        if (nextIndex > 999) {
          let switched = false;
          const startIdx = Math.max(0, alphabet.indexOf(bucketAlpha));
          for (let shift = 1; shift <= alphabet.length; shift++) {
            const idx = (startIdx + shift) % alphabet.length;
            const nextAlpha = alphabet[idx];
            const candidateBucket = (await findBucketByAlpha(nextAlpha)) || (await createBucket(nextAlpha, 1));
            const candidateNext = Number(candidateBucket.nextIndex) || 1;
            if (candidateNext <= 999) {
              bucket = candidateBucket;
              bucketAlpha = nextAlpha;
              nextIndex = candidateNext;
              switched = true;
              break;
            }
          }
          if (!switched) {
            throw new BadRequestException('Unable to generate client identifier: all reference buckets are exhausted');
          }
        }

        const candidate = `${code}${bucketAlpha}${String(nextIndex).padStart(3, '0')}`;
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
    try {
      const normalizedFilters = this.normalizeClientFilters(filters);
      const where: any = {};
      if (normalizedFilters.portfolioCode) where.portfolioCode = normalizedFilters.portfolioCode;
      if (normalizedFilters.status) where.status = normalizedFilters.status;
      if (normalizedFilters.type) where.type = normalizedFilters.type;
      if (normalizedFilters.search) {
        where.OR = [
          { name: { contains: normalizedFilters.search, mode: 'insensitive' } },
          { registeredNumber: { contains: normalizedFilters.search, mode: 'insensitive' } },
          { mainEmail: { contains: normalizedFilters.search, mode: 'insensitive' } },
        ];
      }

      const skip = normalizedFilters.offset !== undefined ? Number(normalizedFilters.offset) : 0;
      const take = normalizedFilters.limit !== undefined ? Number(normalizedFilters.limit) : 100;

      return await (this.prisma as any).client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Number.isFinite(skip) ? skip : 0,
        take: Number.isFinite(take) ? take : 100,
      });
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn('Database unavailable while loading clients; returning empty list');
        return [];
      }
      throw error;
    }
  }

  async search(query: string, filters: ClientFilters = {}): Promise<Client[]> {
    const search = (query || '').trim();
    if (!search) {
      return [];
    }

    return this.findAll({
      ...filters,
      search,
    });
  }

  async findAllContexts(filters: ClientFilters = {}): Promise<ClientContext[]> {
    try {
      const normalizedFilters = this.normalizeClientFilters(filters);
      const where: any = {};
      if (normalizedFilters.portfolioCode) where.portfolioCode = normalizedFilters.portfolioCode;
      if (normalizedFilters.status) where.status = normalizedFilters.status;
      if (normalizedFilters.type) where.type = normalizedFilters.type;
      if (normalizedFilters.search) {
        where.OR = [
          { name: { contains: normalizedFilters.search, mode: 'insensitive' } },
          { registeredNumber: { contains: normalizedFilters.search, mode: 'insensitive' } },
          { mainEmail: { contains: normalizedFilters.search, mode: 'insensitive' } },
        ];
      }

      const skip = normalizedFilters.offset !== undefined ? Number(normalizedFilters.offset) : 0;
      const take = normalizedFilters.limit !== undefined ? Number(normalizedFilters.limit) : 100;

      this.logger.debug(`Fetching clients with filters: ${JSON.stringify(normalizedFilters)}`);

      const clients = await (this.prisma as any).client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Number.isFinite(skip) ? skip : 0,
        take: Number.isFinite(take) ? take : 100,
        include: { clientProfile: true },
      });

      this.logger.debug(`Found ${clients.length} clients, building contexts...`);

      const contexts = clients.map((client: any) => {
        try {
          return buildClientContext(client, client.clientProfile || undefined);
        } catch (err) {
          this.logger.error(`Error building context for client ${client.id}: ${err.message}`, err.stack);
          throw err;
        }
      });

      this.logger.debug(`Successfully built ${contexts.length} contexts`);
      return contexts;
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn('Database unavailable while loading client contexts; returning empty list');
        return [];
      }
      this.logger.error(`Error in findAllContexts: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Client | null> {
    try {
      return await (this.prisma as any).client.findUnique({ where: { id } });
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading client ${id}`);
        return null;
      }
      throw error;
    }
  }

  async findByIdentifier(identifier: string): Promise<Client | null> {
    if (!identifier) return null;
    const normalizedIdentifier = String(identifier).trim();
    try {
      const byId = await this.findOne(normalizedIdentifier);
      if (byId) return byId;
      return await (this.prisma as any).client.findFirst({
        where: {
          OR: [
            { registeredNumber: normalizedIdentifier },
            { clientRef: normalizedIdentifier.toUpperCase() },
            { baseClientRef: normalizedIdentifier.toUpperCase() },
          ],
        },
      });
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while resolving client identifier ${normalizedIdentifier}`);
        return null;
      }
      throw error;
    }
  }

  async resolveClientId(identifier?: string): Promise<string | undefined> {
    if (!identifier) return undefined;
    const client = await this.findByIdentifier(identifier);
    return client?.id;
  }

  async findByPortfolio(portfolioCode: number): Promise<Client[]> {
    return this.findAll({ portfolioCode });
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    const normalizedUpdateDto = this.normalizeClientPayload(updateClientDto, false);
    const targetPortfolioCode = normalizedUpdateDto.portfolioCode ?? existing.portfolioCode;

    if ((normalizedUpdateDto as any).practiceId !== undefined) {
      const nextPracticeId = String((normalizedUpdateDto as any).practiceId || '').trim();
      if (!nextPracticeId) {
        throw new BadRequestException('practiceId cannot be empty');
      }
      (normalizedUpdateDto as any).practiceId = nextPracticeId;
    }

    if ((normalizedUpdateDto as any).clientRef !== undefined) {
      if (typeof (normalizedUpdateDto as any).clientRef !== 'string') {
        throw new BadRequestException('clientRef must be a string');
      }
      const clientRef = String((normalizedUpdateDto as any).clientRef).trim().toUpperCase();
      if (!clientRef || !isValidClientRef(clientRef)) {
        throw new BadRequestException(
          'clientRef must match format <portfolio><letter><3 digits> with optional suffix letter',
        );
      }
      const parsedClientRef = parseClientRef(clientRef);
      if (!parsedClientRef) {
        throw new BadRequestException('clientRef is invalid');
      }
      if (parsedClientRef.portfolio !== targetPortfolioCode) {
        throw new BadRequestException(
          `clientRef portfolio prefix ${parsedClientRef.portfolio} must match portfolioCode ${targetPortfolioCode}`,
        );
      }
      (normalizedUpdateDto as any).clientRef = clientRef;
      if ((normalizedUpdateDto as any).baseClientRef === undefined) {
        (normalizedUpdateDto as any).baseClientRef = parsedClientRef.base;
      }
    }

    if ((normalizedUpdateDto as any).baseClientRef !== undefined) {
      if (typeof (normalizedUpdateDto as any).baseClientRef !== 'string') {
        throw new BadRequestException('baseClientRef must be a string');
      }
      const baseClientRef = String((normalizedUpdateDto as any).baseClientRef).trim().toUpperCase();
      const parsedBaseClientRef = parseClientRef(baseClientRef);
      if (!parsedBaseClientRef || parsedBaseClientRef.suffix) {
        throw new BadRequestException(
          'baseClientRef must be a base reference in format <portfolio><letter><3 digits>',
        );
      }
      if (parsedBaseClientRef.portfolio !== targetPortfolioCode) {
        throw new BadRequestException(
          `baseClientRef portfolio prefix ${parsedBaseClientRef.portfolio} must match portfolioCode ${targetPortfolioCode}`,
        );
      }
      (normalizedUpdateDto as any).baseClientRef = baseClientRef;
    }

    if ((normalizedUpdateDto as any).clientRef && (normalizedUpdateDto as any).baseClientRef) {
      const parsedClientRef = parseClientRef((normalizedUpdateDto as any).clientRef);
      if (!parsedClientRef || parsedClientRef.base !== (normalizedUpdateDto as any).baseClientRef) {
        throw new BadRequestException('baseClientRef must match the base portion of clientRef');
      }
    }

    const updated = await (this.prisma as any).client.update({
      where: { id },
      data: normalizedUpdateDto,
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
    try {
      const resolvedClient = await this.findByIdentifier(clientId);
      if (!resolvedClient) return null;
      const client = await (this.prisma as any).client.findUnique({
        where: { id: resolvedClient.id },
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
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading client parties for ${clientId}`);
        return null;
      }
      throw error;
    }
  }

  async getContextWithParties(clientId: string): Promise<any> {
    try {
      const resolvedClient = await this.findByIdentifier(clientId);
      if (!resolvedClient) return null;
      const client = await (this.prisma as any).client.findUnique({
        where: { id: resolvedClient.id },
        include: {
          address: true,
          parties: {
            include: { person: true },
          },
        },
      });
      if (!client) return null;

      const profile = await (this.prisma as any).clientProfile.findUnique({ where: { clientId: client.id } });
      const context = buildClientContext(client, profile || undefined);
      return {
        ...context,
        partiesDetails: client.parties || [],
      };
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading client context for ${clientId}`);
        return null;
      }
      throw error;
    }
  }

  async getProfile(clientId: string): Promise<ClientProfile | null> {
    try {
      const resolvedId = await this.resolveClientId(clientId);
      if (!resolvedId) return null;
      return await (this.prisma as any).clientProfile.findUnique({ where: { clientId: resolvedId } });
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading profile for client ${clientId}`);
        return null;
      }
      throw error;
    }
  }

  async createProfile(payload: CreateClientProfileDto): Promise<ClientProfile> {
    const resolvedId = await this.resolveClientId(payload.clientId);
    if (!resolvedId) {
      throw new NotFoundException(`Client with ID ${payload.clientId} not found`);
    }
    const client = await this.findOne(resolvedId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${payload.clientId} not found`);
    }

    const existing = await this.getProfile(resolvedId);
    if (existing) {
      throw new BadRequestException(`Client profile already exists for client ${resolvedId}`);
    }
    const normalizedPayload = this.normalizeClientProfilePayload({ ...payload, clientId: resolvedId });

    return (this.prisma as any).clientProfile.create({
      data: {
        ...normalizedPayload,
        lifecycleStatus: normalizedPayload.lifecycleStatus || 'PROSPECT',
        engagementLetterSigned: normalizedPayload.engagementLetterSigned ?? false,
        cisRegistered: normalizedPayload.cisRegistered ?? false,
        payrollRtiRequired: normalizedPayload.payrollRtiRequired ?? false,
        amlCompleted: normalizedPayload.amlCompleted ?? false,
        selfAssessmentRequired: normalizedPayload.selfAssessmentRequired ?? false,
        selfAssessmentFiled: normalizedPayload.selfAssessmentFiled ?? false,
        directDebitInPlace: normalizedPayload.directDebitInPlace ?? false,
        accountsOverdue: normalizedPayload.accountsOverdue ?? false,
        confirmationStatementOverdue: normalizedPayload.confirmationStatementOverdue ?? false,
        seasonalBusiness: normalizedPayload.seasonalBusiness ?? false,
        dormant: normalizedPayload.dormant ?? false,
        doNotContact: normalizedPayload.doNotContact ?? false,
        vatStagger: normalizedPayload.vatStagger || 'NONE',
      },
    });
  }

  async updateProfile(clientId: string, payload: UpdateClientProfileDto): Promise<ClientProfile> {
    const resolvedId = await this.resolveClientId(clientId);
    if (!resolvedId) {
      throw new NotFoundException(`Client profile not found for client ${clientId}`);
    }
    const existing = await this.getProfile(resolvedId);
    if (!existing) {
      throw new NotFoundException(`Client profile not found for client ${resolvedId}`);
    }
    const normalizedPayload = this.normalizeClientProfilePayload(payload);

    return (this.prisma as any).clientProfile.update({
      where: { clientId: resolvedId },
      data: normalizedPayload,
    });
  }

  private normalizeClientFilters(filters: ClientFilters): ClientFilters {
    const normalized: ClientFilters = {
      ...filters,
    };
    if (normalized.portfolioCode !== undefined) {
      const code = Number(normalized.portfolioCode);
      if (!Number.isFinite(code)) {
        throw new BadRequestException('portfolioCode must be a number');
      }
      normalized.portfolioCode = code;
    }
    if (normalized.status !== undefined) {
      const status = this.normalizeEnumField(
        normalized.status,
        'status',
        CLIENT_STATUS_VALUES,
      );
      normalized.status = status === null ? undefined : (status as ClientFilters['status']);
    }
    if (normalized.type !== undefined) {
      const type = this.normalizeEnumField(
        normalized.type,
        'type',
        CLIENT_TYPE_VALUES,
      );
      normalized.type = type === null ? undefined : (type as ClientFilters['type']);
    }
    return normalized;
  }

  private normalizeClientPayload(payload: CreateClientDto | UpdateClientDto, requireType: boolean): any {
    const normalizedWithDates = this.normalizeDateFields(payload, CLIENT_DATE_FIELDS);
    const normalized = this.pickWritableFields(normalizedWithDates, CLIENT_WRITE_FIELDS);

    if ((normalized as any).type !== undefined || requireType) {
      const type = this.normalizeEnumField((normalized as any).type, 'type', CLIENT_TYPE_VALUES);
      if (type === null || (type === undefined && requireType)) {
        throw new BadRequestException('type is required');
      }
      if (type !== undefined) {
        (normalized as any).type = type;
      }
    }

    if ((normalized as any).status !== undefined) {
      const status = this.normalizeEnumField(
        (normalized as any).status,
        'status',
        CLIENT_STATUS_VALUES,
      );
      if (status === null) {
        throw new BadRequestException('status is required');
      }
      (normalized as any).status = status;
    }

    for (const field of HMRC_STATUS_FIELDS) {
      if ((normalized as any)[field] !== undefined) {
        (normalized as any)[field] = this.normalizeEnumField(
          (normalized as any)[field],
          field,
          HMRC_STATUS_VALUES,
        );
      }
    }

    return normalized;
  }

  private normalizeClientProfilePayload(payload: CreateClientProfileDto | UpdateClientProfileDto): any {
    const normalizedWithDates = this.normalizeDateFields(payload, CLIENT_PROFILE_DATE_FIELDS);
    const normalized = this.pickWritableFields(normalizedWithDates, CLIENT_PROFILE_WRITE_FIELDS);

    if ((normalized as any).lifecycleStatus !== undefined) {
      const lifecycleStatus = this.normalizeEnumField(
        (normalized as any).lifecycleStatus,
        'lifecycleStatus',
        LIFECYCLE_STATUS_VALUES,
      );
      if (lifecycleStatus === null) {
        throw new BadRequestException('lifecycleStatus cannot be empty');
      }
      (normalized as any).lifecycleStatus = lifecycleStatus;
    }

    if ((normalized as any).vatStagger !== undefined) {
      const vatStagger = this.normalizeEnumField(
        (normalized as any).vatStagger,
        'vatStagger',
        VAT_STAGGER_VALUES,
      );
      if (vatStagger === null) {
        throw new BadRequestException('vatStagger cannot be empty');
      }
      (normalized as any).vatStagger = vatStagger;
    }

    return normalized;
  }

  private normalizeDateFields<T extends Record<string, any>>(payload: T, fields: readonly string[]): T {
    const normalized: Record<string, any> = { ...payload };
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(normalized, field)) {
        normalized[field] = this.parseOptionalDate(normalized[field], field);
      }
    }
    return normalized as T;
  }

  private pickWritableFields<T extends Record<string, any>>(
    payload: T,
    allowed: readonly string[],
  ): Record<string, any> {
    const picked: Record<string, any> = {};
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        picked[field] = payload[field as keyof T];
      }
    }
    return picked;
  }

  private normalizeEnumField(
    value: unknown,
    fieldName: string,
    allowedValues: readonly string[],
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
    const normalized = value.trim().toUpperCase();
    if (!normalized) return null;
    if (!allowedValues.includes(normalized)) {
      throw new BadRequestException(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      );
    }
    return normalized;
  }

  private parseOptionalDate(value: unknown, fieldName: string): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(`Invalid date for ${fieldName}`);
      }
      return value;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a valid date string`);
    }
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date for ${fieldName}`);
    }
    return parsed;
  }

  private normalizeBucketAlpha(alpha: unknown): string | null {
    if (typeof alpha !== 'string') return null;
    const trimmed = alpha.trim().toUpperCase();
    if (!trimmed) return null;
    const letter = trimmed[0];
    return letter >= 'A' && letter <= 'Z' ? letter : null;
  }

  private derivePreferredAlpha(name?: string, type?: Client['type']): string {
    const normalizedType = String(type || '').toUpperCase();
    const source = String(name || '');
    const preferred = normalizedType === 'INDIVIDUAL' || normalizedType === 'SOLE_TRADER'
      ? surnameInitial(source)
      : normalizeCompanyInitial(source);
    return this.normalizeBucketAlpha(preferred) || 'X';
  }

  private isDatabaseUnavailableError(error: unknown): boolean {
    if (!error) return false;
    const message = error instanceof Error ? error.message : String(error);
    const lowered = message.toLowerCase();
    return (
      lowered.includes("can't reach database server") ||
      lowered.includes('failed to connect to database') ||
      lowered.includes('connection refused') ||
      lowered.includes('database is unavailable') ||
      lowered.includes('prismaclientinitializationerror') ||
      lowered.includes('timeout')
    );
  }
}
