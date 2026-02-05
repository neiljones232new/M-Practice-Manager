import { Inject, Injectable, forwardRef, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { TasksService } from '../tasks/tasks.service';
import { ServiceComplianceIntegrationService } from './service-compliance-integration.service';
import {
  Service,
  ServiceFilters,
  CreateServiceDto,
  UpdateServiceDto,
  ServiceSummary,
} from './interfaces/service.interface';

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
    const client = await this.clientsService.findOne(createServiceDto.clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${createServiceDto.clientId} not found`);
    }

    const annualized = this.calculateAnnualizedFee(createServiceDto.fee, createServiceDto.frequency);

    const service = await (this.prisma as any).service.create({
      data: {
        clientId: createServiceDto.clientId,
        kind: createServiceDto.kind,
        frequency: createServiceDto.frequency,
        fee: createServiceDto.fee,
        annualized,
        status: createServiceDto.status || 'ACTIVE',
        nextDue: createServiceDto.nextDue,
        description: createServiceDto.description,
      },
    });

    this.logger.log(`Created service: ${service.kind} for client ${client.id} (${service.id})`);
    return service;
  }

  async findAll(filters: ServiceFilters = {}): Promise<Service[]> {
    const where: any = {};

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.kind) where.kind = { contains: filters.kind, mode: 'insensitive' };
    if (filters.frequency) where.frequency = filters.frequency;
    if (filters.status) where.status = filters.status;

    if (filters.portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(filters.portfolioCode);
      const ids = clients.map((c) => c.id);
      where.clientId = { in: ids };
    }

    if (filters.search) {
      where.OR = [
        { kind: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const rows = await (this.prisma as any).service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.offset || 0,
      take: filters.limit || 100,
    });

    return rows.map((service: any) => this.normalizeService(service));
  }

  async findOne(id: string): Promise<Service | null> {
    return (this.prisma as any).service.findUnique({ where: { id } });
  }

  async findByClient(clientId: string): Promise<Array<Service & { eligibility?: { status: 'active' | 'blocked' | 'warning'; reasons: string[]; eligible: boolean } }>> {
    const services = await (this.prisma as any).service.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((service: any) => this.normalizeService(service));
  }

  async getServicesByClient(clientId: string): Promise<Service[]> {
    return this.findByClient(clientId);
  }

  async findByKind(kind: string): Promise<Service[]> {
    const rows = await (this.prisma as any).service.findMany({
      where: { kind: { contains: kind, mode: 'insensitive' } },
    });
    return rows.map((service: any) => this.normalizeService(service));
  }

  async search(query: string, filters?: ServiceFilters): Promise<Service[]> {
    return this.findAll({ ...filters, search: query });
  }

  async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    let annualized = existing.annualized;
    if (updateServiceDto.fee !== undefined || updateServiceDto.frequency !== undefined) {
      const fee = updateServiceDto.fee ?? existing.fee;
      const frequency = updateServiceDto.frequency ?? existing.frequency;
      annualized = this.calculateAnnualizedFee(fee, frequency);
    }

    const updated = await (this.prisma as any).service.update({
      where: { id },
      data: {
        ...updateServiceDto,
        annualized,
      },
    });

    this.logger.log(`Updated service: ${updated.kind} (${updated.id})`);

    if (updateServiceDto.nextDue && updateServiceDto.nextDue !== existing.nextDue) {
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
      servicesByFrequency[service.frequency] = (servicesByFrequency[service.frequency] || 0) + 1;
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
          clientIdentifier: client.id,
          portfolioCode: client.portfolioCode,
        });
      }
    }

    return result;
  }

  async updateNextDueDate(id: string, nextDue: Date): Promise<Service> {
    return this.update(id, { nextDue });
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<Service> {
    return this.update(id, { status });
  }

  private calculateAnnualizedFee(fee: number, frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY'): number {
    switch (frequency) {
      case 'ANNUAL':
        return fee;
      case 'QUARTERLY':
        return fee * 4;
      case 'MONTHLY':
        return fee * 12;
      case 'WEEKLY':
        return fee * 52;
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

    const getFrequencyDescription = (frequency: string): string => {
      const descriptions: Record<string, string> = {
        ANNUAL: 'annually',
        QUARTERLY: 'quarterly',
        MONTHLY: 'monthly',
        WEEKLY: 'weekly',
      };
      return descriptions[frequency] || frequency.toLowerCase();
    };

    return {
      serviceId: service.id,
      serviceName: service.kind,
      serviceKind: service.kind,
      serviceType: service.kind,
      frequency: service.frequency,
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
}
