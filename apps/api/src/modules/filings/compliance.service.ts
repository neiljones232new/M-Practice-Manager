import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { ComplianceItem, CreateComplianceItemDto } from '../companies-house/interfaces/companies-house.interface';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ClientsService))
    private readonly clientsService: ClientsService,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
  ) {}

  async createComplianceItem(createDto: CreateComplianceItemDto): Promise<ComplianceItem> {
    const item = await (this.prisma as any).complianceItem.create({
      data: {
        ...createDto,
        status: createDto.status || 'PENDING',
      },
    });

    this.logger.log(`Created compliance item ${item.id} for client ${createDto.clientId}`);
    return item;
  }

  async getComplianceItem(id: string): Promise<ComplianceItem> {
    const item = await (this.prisma as any).complianceItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Compliance item ${id} not found`);
    }
    return item;
  }

  async updateComplianceItem(id: string, updateData: Partial<ComplianceItem>): Promise<ComplianceItem> {
    await this.getComplianceItem(id);
    const updated = await (this.prisma as any).complianceItem.update({
      where: { id },
      data: {
        ...updateData,
      },
    });
    this.logger.log(`Updated compliance item ${id}`);
    return updated;
  }

  async deleteComplianceItem(id: string): Promise<void> {
    await this.getComplianceItem(id);
    await (this.prisma as any).complianceItem.delete({ where: { id } });
    this.logger.log(`Deleted compliance item ${id}`);
  }

  async getComplianceItemsByClient(clientId: string): Promise<ComplianceItem[]> {
    return (this.prisma as any).complianceItem.findMany({
      where: { clientId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getAllComplianceItems(): Promise<ComplianceItem[]> {
    return (this.prisma as any).complianceItem.findMany({ orderBy: { dueDate: 'asc' } });
  }

  async findAll(filters: {
    portfolioCode?: number;
    clientId?: string;
    serviceId?: string;
    status?: string | string[];
    dueDateFrom?: Date;
    dueDateTo?: Date;
  } = {}): Promise<ComplianceItem[]> {
    const where: any = {};

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      where.status = { in: statuses };
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) where.dueDate.gte = filters.dueDateFrom;
      if (filters.dueDateTo) where.dueDate.lte = filters.dueDateTo;
    }

    if (filters.portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(filters.portfolioCode);
      const ids = clients.map((c) => c.id);
      where.clientId = { in: ids };
    }

    return (this.prisma as any).complianceItem.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });
  }

  async findByService(serviceId: string): Promise<ComplianceItem[]> {
    return (this.prisma as any).complianceItem.findMany({
      where: { serviceId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOverdueComplianceItems(): Promise<ComplianceItem[]> {
    const now = new Date();
    return (this.prisma as any).complianceItem.findMany({
      where: {
        dueDate: { lt: now },
        status: 'PENDING',
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getUpcomingComplianceItems(daysAhead: number = 30): Promise<ComplianceItem[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);
    return (this.prisma as any).complianceItem.findMany({
      where: {
        dueDate: { gte: now, lte: futureDate },
        status: 'PENDING',
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async markComplianceItemFiled(id: string, filedDate?: Date): Promise<ComplianceItem> {
    return this.updateComplianceItem(id, {
      status: 'FILED',
      updatedAt: filedDate || new Date(),
    } as any);
  }

  async markComplianceItemOverdue(id: string): Promise<ComplianceItem> {
    return this.updateComplianceItem(id, { status: 'OVERDUE' } as any);
  }

  async createManualComplianceItem(createDto: CreateComplianceItemDto): Promise<ComplianceItem> {
    return this.createComplianceItem({ ...createDto, source: 'MANUAL' });
  }

  async getComplianceItemsByType(type: string): Promise<ComplianceItem[]> {
    return (this.prisma as any).complianceItem.findMany({
      where: { type },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getComplianceItemsBySource(source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL'): Promise<ComplianceItem[]> {
    return (this.prisma as any).complianceItem.findMany({
      where: { source },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getComplianceItemsByDateRange(startDate: Date, endDate: Date): Promise<ComplianceItem[]> {
    return (this.prisma as any).complianceItem.findMany({
      where: { dueDate: { gte: startDate, lte: endDate } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async bulkUpdateComplianceStatus(ids: string[], status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT'): Promise<ComplianceItem[]> {
    const updated: ComplianceItem[] = [];
    for (const id of ids) {
      try {
        const item = await this.updateComplianceItem(id, { status } as any);
        updated.push(item);
      } catch (error) {
        this.logger.error(`Error updating compliance item ${id}: ${error.message}`);
      }
    }
    return updated;
  }

  async getComplianceStatistics(portfolioCode?: number): Promise<{
    total: number;
    pending: number;
    overdue: number;
    dueThisMonth: number;
    filed: number;
    totalItems: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    overdueCount: number;
    upcomingCount: number;
  }> {
    let allItems = await this.getAllComplianceItems();
    if (portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(portfolioCode);
      const clientIds = clients.map((c) => c.id);
      allItems = allItems.filter((item) => item.clientId && clientIds.includes(item.clientId));
    }

    const overdueItems = allItems.filter(
      (item) => item.dueDate && new Date(item.dueDate) < new Date() && item.status === 'PENDING'
    );

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dueThisMonth = allItems.filter(
      (item) =>
        item.dueDate &&
        new Date(item.dueDate) >= now &&
        new Date(item.dueDate) <= endOfMonth &&
        item.status === 'PENDING'
    );

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    allItems.forEach((item) => {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      byType[item.type] = (byType[item.type] || 0) + 1;
      bySource[item.source] = (bySource[item.source] || 0) + 1;
    });

    const pending = byStatus['PENDING'] || 0;
    const filed = byStatus['FILED'] || 0;

    return {
      total: allItems.length,
      pending,
      overdue: overdueItems.length,
      dueThisMonth: dueThisMonth.length,
      filed,
      totalItems: allItems.length,
      byStatus,
      byType,
      bySource,
      overdueCount: overdueItems.length,
      upcomingCount: dueThisMonth.length,
    };
  }

  async createTaskFromComplianceItem(complianceItemId: string, assigneeId?: string): Promise<string> {
    const complianceItem = await this.getComplianceItem(complianceItemId);

    const task = await (this.prisma as any).task.create({
      data: {
        clientId: complianceItem.clientId,
        title: `${complianceItem.type.replace(/_/g, ' ')} - ${complianceItem.description}`,
        description: `Compliance task for ${complianceItem.description}${complianceItem.period ? ` (Period: ${complianceItem.period})` : ''}`,
        dueDate: complianceItem.dueDate ? new Date(complianceItem.dueDate) : undefined,
        assigneeId,
        priority: this.getTaskPriorityFromComplianceStatus(complianceItem.status, complianceItem.dueDate),
        status: 'TODO',
        tags: ['compliance', `compliance:${complianceItem.id}`, complianceItem.type.toLowerCase(), complianceItem.source.toLowerCase()],
      },
    });

    this.logger.log(`Created task ${task.id} from compliance item ${complianceItemId}`);
    return task.id;
  }

  async createTasksForOverdueCompliance(assigneeId?: string): Promise<string[]> {
    const overdueItems = await this.getOverdueComplianceItems();
    const taskIds: string[] = [];

    for (const item of overdueItems) {
      const existingTasks = await this.findTasksForComplianceItem(item.id);
      if (existingTasks.length === 0) {
        const taskId = await this.createTaskFromComplianceItem(item.id, assigneeId);
        taskIds.push(taskId);
      }
    }

    this.logger.log(`Created ${taskIds.length} tasks for overdue compliance items`);
    return taskIds;
  }

  async createTasksForUpcomingCompliance(daysAhead: number = 30, assigneeId?: string): Promise<string[]> {
    const upcomingItems = await this.getUpcomingComplianceItems(daysAhead);
    const taskIds: string[] = [];

    for (const item of upcomingItems) {
      const existingTasks = await this.findTasksForComplianceItem(item.id);
      if (existingTasks.length === 0) {
        const taskId = await this.createTaskFromComplianceItem(item.id, assigneeId);
        taskIds.push(taskId);
      }
    }

    this.logger.log(`Created ${taskIds.length} tasks for upcoming compliance items`);
    return taskIds;
  }

  async findTasksForComplianceItem(complianceItemId: string): Promise<any[]> {
    return (this.prisma as any).task.findMany({
      where: { tags: { has: `compliance:${complianceItemId}` } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async escalateOverdueCompliance(): Promise<{ escalated: number; tasksCreated: number }> {
    const overdueItems = await this.getOverdueComplianceItems();
    let escalated = 0;
    let tasksCreated = 0;

    for (const item of overdueItems) {
      if (item.status !== 'OVERDUE') {
        await this.markComplianceItemOverdue(item.id);
        escalated++;
      }

      const existingTasks = await this.findTasksForComplianceItem(item.id);
      if (existingTasks.length === 0) {
        await this.createTaskFromComplianceItem(item.id);
        tasksCreated++;
      } else {
        for (const task of existingTasks) {
          if (task.priority !== 'URGENT' && (task.status === 'TODO' || task.status === 'IN_PROGRESS')) {
            await (this.prisma as any).task.update({
              where: { id: task.id },
              data: { priority: 'URGENT' },
            });
          }
        }
      }
    }

    this.logger.log(`Escalated ${escalated} compliance items and created ${tasksCreated} tasks`);
    return { escalated, tasksCreated };
  }

  async getComplianceTaskRelationships(): Promise<{
    complianceId: string;
    complianceType: string;
    complianceDescription: string;
    dueDate?: string;
    status: string;
    relatedTasks: any[];
  }[]> {
    const allItems = await this.getAllComplianceItems();
    const relationships: any[] = [];

    for (const item of allItems) {
      const relatedTasks = await this.findTasksForComplianceItem(item.id);
      relationships.push({
        complianceId: item.id,
        complianceType: item.type,
        complianceDescription: item.description,
        dueDate: item.dueDate,
        status: item.status,
        relatedTasks: relatedTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
          dueDate: task.dueDate,
        })),
      });
    }

    return relationships;
  }

  private getTaskPriorityFromComplianceStatus(status: string, dueDate?: Date): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (status === 'OVERDUE') {
      return 'URGENT';
    }

    if (dueDate) {
      const now = new Date();
      const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 0) {
        return 'URGENT';
      } else if (daysUntilDue <= 7) {
        return 'HIGH';
      } else if (daysUntilDue <= 30) {
        return 'MEDIUM';
      }
    }

    return 'LOW';
  }

  async autoGenerateFromServices(): Promise<{
    generated: number;
    skipped: number;
    errors: string[];
    debug: {
      totalServices: number;
      activeServices: number;
      clientsWithServices: number;
      servicesProcessed: number;
      clientsNotFound: number;
    };
  }> {
    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];
    let clientsNotFound = 0;
    let servicesProcessed = 0;

    const allServices = await this.servicesService.findAll();
    const activeServices = allServices.filter((s) => s.status === 'ACTIVE');

    const servicesByClient = new Map<string, any[]>();
    for (const service of activeServices) {
      if (!servicesByClient.has(service.clientId)) {
        servicesByClient.set(service.clientId, []);
      }
      servicesByClient.get(service.clientId)!.push(service);
    }

    for (const [clientId, services] of servicesByClient) {
      try {
        const client = await this.clientsService.findOne(clientId);
        if (!client) {
          clientsNotFound++;
          continue;
        }

        if (client.status !== 'ACTIVE') {
          continue;
        }

        for (const service of services) {
          servicesProcessed++;
          const complianceTypes = this.getComplianceTypesForService(service.kind);
          if (complianceTypes.length === 0) continue;

          for (const complianceType of complianceTypes) {
            const existingItems = await this.findExistingComplianceItem(client.id, service.id, complianceType.type);
            if (existingItems.length > 0) {
              skipped++;
              continue;
            }

            try {
              const dueDate = this.calculateDueDateForService(service, complianceType.type);
              await this.createComplianceItem({
                clientId: client.id,
                serviceId: service.id,
                type: complianceType.type,
                description: `${client.name} - ${complianceType.description}`,
                dueDate,
                source: complianceType.source,
                status: 'PENDING',
                reference: client.registeredNumber || undefined,
              });
              generated++;
            } catch (error) {
              errors.push(`Failed to create ${complianceType.type} for ${client.name}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        errors.push(`Failed to process client ${clientId}: ${error.message}`);
      }
    }

    return {
      generated,
      skipped,
      errors,
      debug: {
        totalServices: allServices.length,
        activeServices: activeServices.length,
        clientsWithServices: servicesByClient.size,
        servicesProcessed,
        clientsNotFound,
      },
    };
  }

  async ensureComplianceForService(
    client: { id: string; name: string; registeredNumber?: string },
    service: { id: string; kind: string; nextDue?: string | Date },
  ): Promise<number> {
    if (!client?.id || !service?.id || !service?.kind) return 0;

    let created = 0;
    const complianceTypes = this.getComplianceTypesForService(service.kind);
    if (complianceTypes.length === 0) return 0;

    for (const complianceType of complianceTypes) {
      const existingItems = await this.findExistingComplianceItem(client.id, service.id, complianceType.type);
      if (existingItems.length > 0) continue;

      const dueDate = this.calculateDueDateForService(service, complianceType.type);
      await this.createComplianceItem({
        clientId: client.id,
        serviceId: service.id,
        type: complianceType.type,
        description: `${client.name} - ${complianceType.description}`,
        dueDate,
        source: complianceType.source,
        status: 'PENDING',
        reference: client.registeredNumber || undefined,
      });
      created += 1;
    }

    return created;
  }

  private getComplianceTypesForService(serviceKind: string): Array<{
    type: string;
    description: string;
    source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  }> {
    const mappings: Record<string, Array<{ type: string; description: string; source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL' }>> = {
      'Annual Accounts': [{ type: 'ANNUAL_ACCOUNTS', description: 'Annual Accounts Filing', source: 'COMPANIES_HOUSE' }],
      'Accounts Preparation': [{ type: 'ANNUAL_ACCOUNTS', description: 'Annual Accounts Filing', source: 'COMPANIES_HOUSE' }],
      'Statutory Accounts': [{ type: 'ANNUAL_ACCOUNTS', description: 'Annual Accounts Filing', source: 'COMPANIES_HOUSE' }],
      'Company Secretarial': [{ type: 'CONFIRMATION_STATEMENT', description: 'Confirmation Statement Filing', source: 'COMPANIES_HOUSE' }],
      'Confirmation Statement': [{ type: 'CONFIRMATION_STATEMENT', description: 'Confirmation Statement Filing', source: 'COMPANIES_HOUSE' }],
      'Corporation Tax': [{ type: 'CT600', description: 'Corporation Tax Return', source: 'HMRC' }],
      'VAT Returns': [{ type: 'VAT_RETURN', description: 'VAT Return', source: 'HMRC' }],
      'Self Assessment': [{ type: 'SA100', description: 'Self Assessment Tax Return', source: 'HMRC' }],
      Payroll: [{ type: 'RTI_SUBMISSION', description: 'Real Time Information Submission', source: 'HMRC' }],
    };

    const exactMatch = mappings[serviceKind];
    if (exactMatch) return exactMatch;

    const lower = serviceKind.toLowerCase();
    const partialMatches: Array<{ type: string; description: string; source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL' }> = [];

    if (lower.includes('account')) {
      partialMatches.push({ type: 'ANNUAL_ACCOUNTS', description: 'Annual Accounts Filing', source: 'COMPANIES_HOUSE' });
    }
    if (lower.includes('confirmation') || lower.includes('secretarial')) {
      partialMatches.push({ type: 'CONFIRMATION_STATEMENT', description: 'Confirmation Statement Filing', source: 'COMPANIES_HOUSE' });
    }
    if (lower.includes('corporation') || lower.includes('ct600')) {
      partialMatches.push({ type: 'CT600', description: 'Corporation Tax Return', source: 'HMRC' });
    }
    if (lower.includes('vat')) {
      partialMatches.push({ type: 'VAT_RETURN', description: 'VAT Return', source: 'HMRC' });
    }

    return partialMatches;
  }

  private async findExistingComplianceItem(clientId: string, serviceId: string, type: string): Promise<ComplianceItem[]> {
    return (this.prisma as any).complianceItem.findMany({
      where: {
        clientId,
        serviceId,
        type,
        status: { not: 'FILED' },
      },
      take: 5,
    });
  }

  private calculateDueDateForService(service: any, complianceType: string): Date | undefined {
    if (service.nextDue) {
      return new Date(service.nextDue);
    }

    const now = new Date();
    const currentYear = now.getFullYear();

    switch (complianceType) {
      case 'ANNUAL_ACCOUNTS':
        return new Date(currentYear + 1, 11, 31);
      case 'CONFIRMATION_STATEMENT':
        return new Date(currentYear, 11, 31);
      case 'CT600':
        return new Date(currentYear + 1, 11, 31);
      case 'VAT_RETURN':
        const currentMonth = now.getMonth();
        const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3;
        return new Date(currentYear, nextQuarterMonth, 0);
      default:
        return new Date(currentYear, 11, 31);
    }
  }

  async cleanupInvalidClients(): Promise<{
    totalItems: number;
    invalidItems: number;
    removedItems: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalItems = 0;
    let invalidItems = 0;
    let removedItems = 0;

    try {
      const allItems = await this.getAllComplianceItems();
      totalItems = allItems.length;

      const validClients = await this.clientsService.findAll({});
      const validClientIds = new Set(validClients.map((c) => c.id));

      for (const item of allItems) {
        if (!validClientIds.has(item.clientId)) {
          invalidItems++;
          try {
            await this.deleteComplianceItem(item.id);
            removedItems++;
          } catch (deleteError) {
            errors.push(`Failed to delete ${item.id}: ${deleteError.message}`);
          }
        }
      }

      return { totalItems, invalidItems, removedItems, errors };
    } catch (error) {
      errors.push(`Cleanup failed: ${error.message}`);
      return { totalItems, invalidItems, removedItems, errors };
    }
  }
}
