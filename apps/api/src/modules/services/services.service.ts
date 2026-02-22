import { Inject, Injectable, forwardRef, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { TasksService } from '../tasks/tasks.service';
import { ServiceComplianceIntegrationService } from './service-compliance-integration.service';
import {
  Service,
  ServiceFrequency,
  ServiceStatus,
  ServiceFilters,
  CreateServiceDto,
  UpdateServiceDto,
  ServiceSummary,
} from './interfaces/service.interface';

const SERVICE_FREQUENCY_VALUES = ['ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'ONE_OFF'] as const;
const SERVICE_STATUS_VALUES = [
  'DRAFT',
  'ACTIVE',
  'AWAITING_FILING',
  'READY_TO_CLOSE',
  'COMPLETE',
  'ARCHIVED',
] as const;

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
    @Inject(forwardRef(() => ServiceComplianceIntegrationService))
    private serviceComplianceIntegration: ServiceComplianceIntegrationService,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const normalizedCreateDto = this.normalizeServicePayload(createServiceDto, true);
    const resolvedClient = await this.clientsService.findByIdentifier(normalizedCreateDto.clientId);
    const client = resolvedClient;
    if (!client) {
      throw new NotFoundException(`Client with ID ${normalizedCreateDto.clientId} not found`);
    }

    const { periodStart, periodEnd } = this.resolveServicePeriod(
      normalizedCreateDto.frequency,
      normalizedCreateDto.periodStart,
      normalizedCreateDto.periodEnd,
    );
    const annualized = this.calculateAnnualizedFee(normalizedCreateDto.fee, normalizedCreateDto.frequency);
    const cycleNumber = await this.resolveCycleNumber(client.id, normalizedCreateDto.templateId);
    const requestedStatus = normalizedCreateDto.status || 'DRAFT';

    const service = await (this.prisma as any).service.create({
      data: {
        clientId: client.id,
        templateId: normalizedCreateDto.templateId,
        periodStart,
        periodEnd,
        cycleNumber,
        kind: normalizedCreateDto.kind,
        frequency: normalizedCreateDto.frequency,
        fee: normalizedCreateDto.fee,
        annualized,
        status: requestedStatus,
        nextDue: normalizedCreateDto.nextDue,
        description: normalizedCreateDto.description,
      },
    });

    this.logger.log(`Created service: ${service.kind} for client ${client.id} (${service.id})`);
    if (requestedStatus === 'ACTIVE') {
      return this.activateService(service.id);
    }
    return this.normalizeService(service);
  }

  async findAll(filters: ServiceFilters = {}): Promise<Service[]> {
    try {
      const normalizedFilters = this.normalizeServiceFilters(filters);
      const where: any = {};

      if (normalizedFilters.clientId) {
        const resolvedClientId = await this.clientsService.resolveClientId(normalizedFilters.clientId);
        where.clientId = resolvedClientId || normalizedFilters.clientId;
      }
      if (normalizedFilters.kind) where.kind = { contains: normalizedFilters.kind, mode: 'insensitive' };
      if (normalizedFilters.frequency) where.frequency = normalizedFilters.frequency;
      if (normalizedFilters.status) where.status = normalizedFilters.status;

      if (normalizedFilters.portfolioCode) {
        const clients = await this.clientsService.findByPortfolio(normalizedFilters.portfolioCode);
        const ids = clients.map((c) => c.id);
        where.clientId = { in: ids };
      }

      if (normalizedFilters.search) {
        where.OR = [
          { kind: { contains: normalizedFilters.search, mode: 'insensitive' } },
          { description: { contains: normalizedFilters.search, mode: 'insensitive' } },
        ];
      }

      const skip = normalizedFilters.offset !== undefined ? Number(normalizedFilters.offset) : 0;
      const take = normalizedFilters.limit !== undefined ? Number(normalizedFilters.limit) : 100;

      const rows = await (this.prisma as any).service.findMany({
        where,
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
        skip: Number.isFinite(skip) ? skip : 0,
        take: Number.isFinite(take) ? take : 100,
      });

      return rows.map((service: any) => this.normalizeService(service));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn('Database unavailable while loading services; returning empty list');
        return [];
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<Service | null> {
    try {
      const service = await (this.prisma as any).service.findUnique({ where: { id } });
      return service ? this.normalizeService(service) : null;
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading service ${id}`);
        return null;
      }
      throw error;
    }
  }

  async findByClient(clientId: string): Promise<Array<Service & { eligibility?: { status: 'active' | 'blocked' | 'warning'; reasons: string[]; eligible: boolean } }>> {
    try {
      const resolvedClientId = await this.clientsService.resolveClientId(clientId);
      const services = await (this.prisma as any).service.findMany({
        where: { clientId: resolvedClientId || clientId },
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
      });

      return services.map((service: any) => this.normalizeService(service));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading services for client ${clientId}`);
        return [];
      }
      throw error;
    }
  }

  async getServicesByClient(clientId: string): Promise<Service[]> {
    return this.findByClient(clientId);
  }

  async findByKind(kind: string): Promise<Service[]> {
    try {
      const rows = await (this.prisma as any).service.findMany({
        where: { kind: { contains: kind, mode: 'insensitive' } },
      });
      return rows.map((service: any) => this.normalizeService(service));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading services by kind ${kind}`);
        return [];
      }
      throw error;
    }
  }

  async search(query: string, filters?: ServiceFilters): Promise<Service[]> {
    return this.findAll({ ...filters, search: query });
  }

  async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    const normalizedUpdateDto = this.normalizeServicePayload(updateServiceDto, false);

    let annualized = existing.annualized;
    if (normalizedUpdateDto.fee !== undefined || normalizedUpdateDto.frequency !== undefined) {
      const fee = normalizedUpdateDto.fee ?? existing.fee;
      const frequency = normalizedUpdateDto.frequency ?? existing.frequency;
      annualized = this.calculateAnnualizedFee(fee, frequency);
    }

    const updated = await (this.prisma as any).service.update({
      where: { id },
      data: {
        ...normalizedUpdateDto,
        annualized,
      },
    });

    this.logger.log(`Updated service: ${updated.kind} (${updated.id})`);

    if (normalizedUpdateDto.nextDue && normalizedUpdateDto.nextDue !== existing.nextDue) {
      try {
        await this.serviceComplianceIntegration.syncServiceAndComplianceDates(id);
        this.logger.log(`Synced compliance dates for service ${id}`);
      } catch (error) {
        this.logger.error(
          `Failed to sync compliance dates for service ${id}: ${error.message}`,
          error.stack
        );
      }
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) return false;

    try {
      const relatedTasks = await this.tasksService.findByService(id);
      for (const task of relatedTasks) {
        await this.tasksService.delete(task.id);
      }
    } catch (error) {
      this.logger.error(`Failed to cascade delete tasks for service ${id}: ${error.message}`, error.stack);
    }

    await (this.prisma as any).service.delete({ where: { id } });
    this.logger.log(`Deleted service: ${existing.kind} (${existing.id})`);

    return true;
  }

  async getServiceSummary(portfolioCode?: number): Promise<ServiceSummary> {
    const services = await this.findAll({ portfolioCode });

    const activeServices = services.filter((s) => s.status === 'ACTIVE');
    const totalAnnualFees = activeServices.reduce((sum, s) => sum + (Number(s.annualized) || 0), 0);

    const servicesByKind: Record<string, number> = {};
    const servicesByFrequency: Record<string, number> = {};

    services.forEach((service) => {
      servicesByKind[service.kind] = (servicesByKind[service.kind] || 0) + 1;
      const frequencyKey = service.frequency || 'UNSPECIFIED';
      servicesByFrequency[frequencyKey] = (servicesByFrequency[frequencyKey] || 0) + 1;
    });

    return {
      totalServices: services.length,
      activeServices: activeServices.length,
      totalAnnualFees,
      servicesByKind,
      servicesByFrequency,
    };
  }

  async getServicesWithClientDetails(
    filters?: ServiceFilters
  ): Promise<Array<Service & { clientName: string; clientId: string; clientIdentifier: string; portfolioCode: number }>> {
    const services = await this.findAll(filters);
    const result = [] as Array<Service & { clientName: string; clientId: string; clientIdentifier: string; portfolioCode: number }>;

    for (const service of services) {
      const client = await this.clientsService.findOne(service.clientId);
      if (client) {
        result.push({
          ...service,
          clientName: client.name,
          clientId: client.id,
          clientIdentifier: client.clientRef || client.registeredNumber || client.id,
          portfolioCode: client.portfolioCode,
        });
      }
    }

    return result;
  }

  async updateNextDueDate(id: string, nextDue: Date): Promise<Service> {
    const normalizedDate = this.parseOptionalDate(nextDue, 'nextDue');
    if (!normalizedDate) {
      throw new BadRequestException('nextDue is required');
    }
    return this.update(id, { nextDue: normalizedDate });
  }

  async updateStatus(id: string, status: ServiceStatus): Promise<Service> {
    if (status === 'ACTIVE') {
      return this.activateService(id);
    }
    if (status === 'COMPLETE') {
      return this.completeService(id);
    }
    return this.update(id, { status });
  }

  async activateService(id: string): Promise<Service> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const updated =
      existing.status === 'ACTIVE'
        ? existing
        : this.normalizeService(
            await (this.prisma as any).service.update({
              where: { id },
              data: { status: 'ACTIVE' },
            }),
          );

    // Operational work is generated only when a service becomes ACTIVE.
    try {
      await this.tasksService.generateTasksFromService(updated.id);
    } catch (error) {
      this.logger.warn(
        `Task generation failed while activating service ${updated.id}: ${error?.message || error}`,
      );
    }

    try {
      await this.serviceComplianceIntegration.createComplianceItemsForService(updated.id);
    } catch (error) {
      this.logger.warn(
        `Compliance generation failed while activating service ${updated.id}: ${error?.message || error}`,
      );
    }

    return updated;
  }

  async completeService(id: string): Promise<Service> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const completed =
      existing.status === 'COMPLETE'
        ? existing
        : this.normalizeService(
            await (this.prisma as any).service.update({
              where: { id },
              data: { status: 'COMPLETE' },
            }),
          );

    await this.createNextDraftServiceFromCompletedService(completed);
    return completed;
  }

  private calculateAnnualizedFee(fee: number, frequency?: ServiceFrequency): number {
    switch (frequency) {
      case 'ANNUAL':
        return fee;
      case 'QUARTERLY':
        return fee * 4;
      case 'MONTHLY':
        return fee * 12;
      case 'WEEKLY':
        return fee * 52;
      case 'ONE_OFF':
        return fee;
      default:
        return fee;
    }
  }

  async getServicePlaceholderData(serviceId: string): Promise<Record<string, any>> {
    const service = await this.findOne(serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    let clientName = '';
    let clientId = '';
    try {
      const client = await this.clientsService.findOne(service.clientId);
      if (client) {
        clientName = client.name;
        clientId = client.id;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch client for service ${serviceId}:`, error);
    }

    const formatDate = (date?: Date): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatCurrency = (amount: number): string => {
      return `£${amount.toFixed(2)}`;
    };

    const getFrequencyDescription = (frequency?: string): string => {
      const descriptions: Record<string, string> = {
        ANNUAL: 'annually',
        QUARTERLY: 'quarterly',
        MONTHLY: 'monthly',
        WEEKLY: 'weekly',
      };
      if (!frequency) return 'unspecified';
      return descriptions[frequency] || frequency.toLowerCase();
    };

    return {
      serviceId: service.id,
      serviceName: service.kind,
      serviceKind: service.kind,
      serviceType: service.kind,
      frequency: service.frequency || '',
      frequencyDescription: getFrequencyDescription(service.frequency),
      nextDue: service.nextDue ? formatDate(service.nextDue) : '',
      nextDueDate: service.nextDue ? formatDate(service.nextDue) : '',
      fee: formatCurrency(service.fee),
      feeAmount: service.fee.toString(),
      annualizedFee: formatCurrency(service.annualized),
      annualizedFeeAmount: service.annualized.toString(),
      status: service.status,
      isActive: service.status === 'ACTIVE',
      description: service.description || '',
      clientName,
      clientId,
      createdAt: formatDate(service.createdAt),
      updatedAt: formatDate(service.updatedAt),
      currentDate: formatDate(new Date()),
      currentYear: new Date().getFullYear().toString(),
    };
  }

  private normalizeService(service: any): Service {
    return {
      ...service,
      fee: service?.fee !== null && service?.fee !== undefined ? Number(service.fee) : 0,
      annualized: service?.annualized !== null && service?.annualized !== undefined ? Number(service.annualized) : 0,
    };
  }

  private normalizeServiceFilters(filters: ServiceFilters): ServiceFilters {
    const normalized: ServiceFilters = {
      ...filters,
    };
    if (normalized.frequency !== undefined) {
      normalized.frequency = this.normalizeEnumField(
        normalized.frequency,
        'frequency',
        SERVICE_FREQUENCY_VALUES,
      ) as ServiceFilters['frequency'];
    }
    if (normalized.status !== undefined) {
      normalized.status = this.normalizeEnumField(
        normalized.status,
        'status',
        SERVICE_STATUS_VALUES,
      ) as ServiceFilters['status'];
    }
    if (normalized.portfolioCode !== undefined) {
      const code = Number(normalized.portfolioCode);
      if (!Number.isFinite(code)) {
        throw new BadRequestException('portfolioCode must be a number');
      }
      normalized.portfolioCode = code;
    }
    return normalized;
  }

  private normalizeServicePayload(
    payload: CreateServiceDto | UpdateServiceDto,
    requireFrequency: boolean,
  ): any {
    const normalized: Record<string, any> = { ...payload };

    if (normalized.frequency !== undefined || requireFrequency) {
      const frequency = this.normalizeEnumField(
        normalized.frequency,
        'frequency',
        SERVICE_FREQUENCY_VALUES,
      );
      if (!frequency && requireFrequency) {
        throw new BadRequestException('frequency is required');
      }
      normalized.frequency = frequency;
    }

    if (normalized.status !== undefined) {
      const status = this.normalizeEnumField(
        normalized.status,
        'status',
        SERVICE_STATUS_VALUES,
      );
      if (!status) {
        throw new BadRequestException('status cannot be empty');
      }
      normalized.status = status;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'periodStart')) {
      normalized.periodStart = this.parseOptionalDate(normalized.periodStart, 'periodStart');
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'periodEnd')) {
      normalized.periodEnd = this.parseOptionalDate(normalized.periodEnd, 'periodEnd');
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'templateId')) {
      if (normalized.templateId === null || normalized.templateId === undefined) {
        normalized.templateId = undefined;
      } else if (typeof normalized.templateId !== 'string') {
        throw new BadRequestException('templateId must be a string');
      } else {
        const trimmed = normalized.templateId.trim();
        normalized.templateId = trimmed || undefined;
      }
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'cycleNumber')) {
      if (normalized.cycleNumber === null || normalized.cycleNumber === undefined || normalized.cycleNumber === '') {
        normalized.cycleNumber = undefined;
      } else {
        const cycleNumber = Number(normalized.cycleNumber);
        if (!Number.isFinite(cycleNumber) || cycleNumber < 1) {
          throw new BadRequestException('cycleNumber must be a positive number');
        }
        normalized.cycleNumber = Math.floor(cycleNumber);
      }
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'nextDue')) {
      normalized.nextDue = this.parseOptionalDate(normalized.nextDue, 'nextDue');
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'fee')) {
      const fee = Number(normalized.fee);
      if (!Number.isFinite(fee)) {
        throw new BadRequestException('fee must be a valid number');
      }
      normalized.fee = fee;
    }

    return normalized;
  }

  private resolveServicePeriod(
    frequency: ServiceFrequency | undefined,
    requestedStart?: Date | null,
    requestedEnd?: Date | null,
  ): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodStart = requestedStart || now;
    if (!frequency) {
      return {
        periodStart,
        periodEnd: requestedEnd || periodStart,
      };
    }

    if (requestedEnd) {
      return { periodStart, periodEnd: requestedEnd };
    }

    return {
      periodStart,
      periodEnd: this.incrementPeriodEnd(periodStart, frequency),
    };
  }

  private incrementPeriodEnd(periodStart: Date, frequency: ServiceFrequency): Date {
    const end = new Date(periodStart);
    switch (frequency) {
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'WEEKLY':
        end.setDate(end.getDate() + 7);
        break;
      case 'ONE_OFF':
        end.setDate(end.getDate() + 1);
        break;
      case 'ANNUAL':
      default:
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }

  private async resolveCycleNumber(clientId: string, templateId?: string): Promise<number | undefined> {
    if (!templateId) return undefined;
    try {
      const count = await (this.prisma as any).service.count({
        where: {
          clientId,
          templateId,
        },
      });
      return count + 1;
    } catch {
      return undefined;
    }
  }

  private async createNextDraftServiceFromCompletedService(service: Service): Promise<void> {
    if (!service.templateId) return;
    if (service.status === 'ARCHIVED') return;

    const client = await this.clientsService.findOne(service.clientId);
    if (!client || client.status !== 'ACTIVE') return;

    const template = await (this.prisma as any).serviceTemplate.findUnique({
      where: { id: service.templateId },
    });
    if (!template) return;
    if (template.autoGenerateNext === false) return;
    if (String(template.recurrenceType || 'STANDARD').toUpperCase() === 'NONE') return;

    const currentStart = new Date((service as any).periodStart || service.nextDue || new Date());
    const currentEndRaw = (service as any).periodEnd ? new Date((service as any).periodEnd) : null;
    const nextPeriodStart = currentEndRaw && !Number.isNaN(currentEndRaw.getTime())
      ? currentEndRaw
      : this.incrementPeriodEnd(currentStart, (service.frequency || 'ANNUAL') as ServiceFrequency);
    const nextPeriodEnd = this.incrementPeriodEnd(nextPeriodStart, (service.frequency || 'ANNUAL') as ServiceFrequency);

    const existingNext = await (this.prisma as any).service.findFirst({
      where: {
        clientId: service.clientId,
        templateId: service.templateId,
        periodStart: nextPeriodStart,
      },
    });
    if (existingNext) return;

    await (this.prisma as any).service.create({
      data: {
        clientId: service.clientId,
        templateId: service.templateId,
        kind: service.kind,
        frequency: service.frequency,
        fee: service.fee,
        annualized: service.annualized,
        periodStart: nextPeriodStart,
        periodEnd: nextPeriodEnd,
        cycleNumber: ((service as any).cycleNumber || 0) + 1,
        status: 'DRAFT',
        description: service.description,
      },
    });

    this.logger.log(
      `Created next draft service for client ${service.clientId} template ${service.templateId}`,
    );
  }

  private normalizeEnumField(
    value: unknown,
    fieldName: string,
    allowedValues: readonly string[],
  ): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
    const normalized = value.trim().toUpperCase();
    if (!normalized) return undefined;
    if (!allowedValues.includes(normalized)) {
      throw new BadRequestException(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
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
