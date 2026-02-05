import { Injectable, Logger, NotFoundException, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { IntegrationConfigService } from '../integrations/services/integration-config.service';
import {
  Task,
  TaskFilters,
  CreateTaskDto,
  UpdateTaskDto,
  ServiceTemplate,
  TaskTemplate,
  CreateServiceTemplateDto,
  UpdateServiceTemplateDto,
} from './interfaces/task.interface';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly defaultTaskGenerationWindowDays = 60;

  constructor(
    private prisma: PrismaService,
    private fileStorage: FileStorageService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    @Inject(forwardRef(() => ServicesService))
    private servicesService: ServicesService,
    @Optional() private integrationConfig?: IntegrationConfigService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    if (createTaskDto.clientId) {
      const client = await this.clientsService.findOne(createTaskDto.clientId);
      if (!client) {
        throw new NotFoundException(`Client with ID ${createTaskDto.clientId} not found`);
      }
    }

    if (createTaskDto.serviceId) {
      const service = await this.servicesService.findOne(createTaskDto.serviceId);
      if (!service) {
        throw new NotFoundException(`Service with ID ${createTaskDto.serviceId} not found`);
      }
    }

    const task = await (this.prisma as any).task.create({
      data: {
        title: createTaskDto.title,
        clientId: createTaskDto.clientId,
        serviceId: createTaskDto.serviceId,
        description: createTaskDto.description,
        dueDate: createTaskDto.dueDate,
        assigneeId: createTaskDto.assigneeId,
        creatorId: createTaskDto.creatorId,
        status: createTaskDto.status || 'TODO',
        priority: createTaskDto.priority || 'MEDIUM',
        tags: createTaskDto.tags || [],
      },
    });

    this.logger.log(`Created task: ${task.title} (${task.id})`);
    return task;
  }

  async findAll(filters: TaskFilters = {}): Promise<Task[]> {
    const where: any = {};

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;

    if (filters.dueBefore || filters.dueAfter) {
      where.dueDate = {};
      if (filters.dueBefore) where.dueDate.lte = filters.dueBefore;
      if (filters.dueAfter) where.dueDate.gte = filters.dueAfter;
    }

    if (filters.portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(filters.portfolioCode);
      const ids = clients.map((c) => c.id);
      where.clientId = { in: ids };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return (this.prisma as any).task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.offset || 0,
      take: filters.limit || 100,
    });
  }

  async findAllWithClientDetails(
    filters: TaskFilters = {}
  ): Promise<Array<Task & { clientName?: string; clientIdentifier?: string; portfolioCode?: number; assignee?: string; serviceName?: string }>> {
    const tasks = await this.findAll(filters);
    const result: Array<Task & { clientName?: string; clientIdentifier?: string; portfolioCode?: number; assignee?: string; serviceName?: string }> = [];
    for (const task of tasks) {
      let clientName: string | undefined;
      let clientIdentifier: string | undefined;
      let portfolioCode: number | undefined;
      let serviceName: string | undefined;
      if (task.clientId) {
        const client = await this.clientsService.findOne(task.clientId);
        clientName = client?.name;
        clientIdentifier = client?.registeredNumber || client?.id;
        portfolioCode = client?.portfolioCode;
      }
      if (task.serviceId) {
        const service = await this.servicesService.findOne(task.serviceId);
        serviceName = service?.kind;
      }
      result.push({ ...task, assignee: task.assigneeId, clientName, clientIdentifier, portfolioCode, serviceName });
    }
    return result;
  }

  async findOne(id: string): Promise<Task | null> {
    return (this.prisma as any).task.findUnique({ where: { id } });
  }

  async findByClient(clientId: string): Promise<Task[]> {
    return (this.prisma as any).task.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByService(serviceId: string): Promise<Task[]> {
    return (this.prisma as any).task.findMany({
      where: { serviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    return (this.prisma as any).task.findMany({
      where: { assigneeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOverdue(): Promise<Task[]> {
    const now = new Date();
    return (this.prisma as any).task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findDueSoon(days: number = 7): Promise<Task[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return (this.prisma as any).task.findMany({
      where: {
        dueDate: { gte: now, lte: futureDate },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const updated = await (this.prisma as any).task.update({
      where: { id },
      data: {
        ...updateTaskDto,
      },
    });

    this.logger.log(`Updated task: ${updated.title} (${updated.id})`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) return false;

    await (this.prisma as any).task.delete({ where: { id } });
    this.logger.log(`Deleted task: ${existing.title} (${existing.id})`);
    return true;
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const uniqueIds = Array.from(new Set(ids));
    const result = await (this.prisma as any).task.deleteMany({
      where: { id: { in: uniqueIds } },
    });
    if (result?.count) {
      this.logger.log(`Deleted ${result.count} task(s) via bulk delete`);
    }
    return result?.count || 0;
  }

  async generateTasksFromService(serviceId: string): Promise<Task[]> {
    const service = await this.servicesService.findOne(serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    const template = await this.findServiceTemplateByKindAndFrequency(service.kind, service.frequency);
    if (!template) return [];

    const created: Task[] = [];
    for (const taskTemplate of template.taskTemplates) {
      const dueDate = service.nextDue
        ? new Date(new Date(service.nextDue).getTime() - taskTemplate.daysBeforeDue * 24 * 60 * 60 * 1000)
        : undefined;
      const existing = await (this.prisma as any).task.findFirst({
        where: {
          serviceId: service.id,
          title: taskTemplate.title,
          dueDate: dueDate ?? null,
          status: { notIn: ['CANCELLED'] },
        },
      });
      if (existing) {
        continue;
      }
      const task = await this.create({
        title: taskTemplate.title,
        description: taskTemplate.description,
        clientId: service.clientId,
        serviceId: service.id,
        dueDate,
        assigneeId: taskTemplate.assigneeId,
        priority: taskTemplate.priority,
        tags: taskTemplate.tags,
      });
      created.push(task);
    }

    return created;
  }

  async generateTasksForAllServices(): Promise<Record<string, number>> {
    const services = await this.servicesService.findAll({ status: 'ACTIVE' });
    let created = 0;
    for (const service of services) {
      const tasks = await this.generateTasksFromService(service.id);
      created += tasks.length;
    }
    return { created, services: services.length };
  }

  async generateTasksForClient(clientId: string): Promise<Record<string, number>> {
    const services = await this.servicesService.findAll({ clientId });
    let created = 0;
    for (const service of services) {
      const tasks = await this.generateTasksFromService(service.id);
      created += tasks.length;
    }
    return { created, services: services.length };
  }

  async updateServiceNextDueDate(serviceId: string): Promise<void> {
    const service = await this.servicesService.findOne(serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }
    if (!service.nextDue) return;

    const nextDue = this.advanceDate(service.nextDue, service.frequency);
    await this.servicesService.update(serviceId, { nextDue });
  }

  async getDashboardAlerts(portfolioCode?: number): Promise<any> {
    const tasks = await this.findAll({ portfolioCode });
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    endOfTomorrow.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const open = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
    const overdue = open.filter(t => t.dueDate && new Date(t.dueDate) < now);
    const dueToday = open.filter(t => t.dueDate && new Date(t.dueDate) <= endOfToday && new Date(t.dueDate) >= now);
    const dueTomorrow = open.filter(t => t.dueDate && new Date(t.dueDate) > endOfToday && new Date(t.dueDate) <= endOfTomorrow);
    const dueThisWeek = open.filter(t => t.dueDate && new Date(t.dueDate) <= endOfWeek);
    const urgent = open.filter(t => t.priority === 'URGENT');

    return {
      overdue: { count: overdue.length, severity: overdue.length ? 'critical' : 'normal', tasks: overdue },
      dueToday: { count: dueToday.length, severity: dueToday.length ? 'high' : 'normal', tasks: dueToday },
      dueTomorrow: { count: dueTomorrow.length, severity: dueTomorrow.length ? 'medium' : 'normal', tasks: dueTomorrow },
      dueThisWeek: { count: dueThisWeek.length, severity: dueThisWeek.length ? 'medium' : 'normal', tasks: dueThisWeek },
      urgent: { count: urgent.length, severity: urgent.length ? 'high' : 'normal', tasks: urgent },
    };
  }

  async getPriorityTaskRecommendations(assignee?: string, portfolioCode?: number): Promise<any> {
    const filters: TaskFilters = { portfolioCode };
    if (assignee) filters.assigneeId = assignee;
    const tasks = await this.findAll(filters);

    const scored = tasks.map((t) => ({
      ...t,
      assignee: t.assigneeId,
      priorityScore: this.scoreTaskPriority(t),
    }));

    scored.sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      topPriority: scored.slice(0, 25),
      recommendations: {
        overdue: scored.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
        urgent: scored.filter(t => t.priority === 'URGENT').length,
        inProgress: scored.filter(t => t.status === 'IN_PROGRESS').length,
      },
    };
  }

  async getComplianceDeadlines(portfolioCode?: number): Promise<any> {
    try {
      const tasks = await this.findAll({ portfolioCode });
      const now = new Date();
      const complianceTags = new Set(['compliance', 'filing', 'statutory', 'deadline']);
      const complianceTasks = tasks.filter(t => Array.isArray(t.tags) && t.tags.some(tag => complianceTags.has(tag)));
      const upcoming = complianceTasks.filter(t => t.dueDate && new Date(t.dueDate) >= now);
      const overdue = complianceTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
      const criticalCount = overdue.filter(t => t.priority === 'URGENT').length;
      return {
        upcoming,
        overdue,
        summary: {
          totalUpcoming: upcoming.length,
          totalOverdue: overdue.length,
          criticalCount,
        },
      };
    } catch {
      return {
        upcoming: [],
        overdue: [],
        summary: { totalUpcoming: 0, totalOverdue: 0, criticalCount: 0 },
      };
    }
  }

  private async findServiceTemplateByKindAndFrequency(serviceKind: string, frequency: string): Promise<ServiceTemplate | null> {
    const templates = await this.findAllServiceTemplates();
    return templates.find(
      (t) => t.serviceKind === serviceKind && t.frequency === (frequency as any)
    ) || null;
  }

  private advanceDate(date: Date, frequency: string): Date {
    const d = new Date(date);
    switch (frequency) {
      case 'WEEKLY':
        d.setDate(d.getDate() + 7);
        break;
      case 'MONTHLY':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'QUARTERLY':
        d.setMonth(d.getMonth() + 3);
        break;
      case 'ANNUAL':
        d.setFullYear(d.getFullYear() + 1);
        break;
      case 'ONE_OFF':
      default:
        break;
    }
    return d;
  }

  private scoreTaskPriority(task: Task): number {
    let score = 0;
    if (task.priority === 'URGENT') score += 100;
    if (task.priority === 'HIGH') score += 60;
    if (task.priority === 'MEDIUM') score += 30;
    if (task.priority === 'LOW') score += 10;
    if (task.status === 'IN_PROGRESS') score += 5;
    if (task.dueDate) {
      const days = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (days < 0) score += 50;
      else if (days <= 1) score += 20;
      else if (days <= 7) score += 10;
    }
    return score;
  }

  async getTaskSummary(portfolioCode?: number): Promise<Record<string, any>> {
    const tasks = await this.findAll({ portfolioCode });

    const counts = {
      totalTasks: tasks.length,
      openTasks: tasks.filter((t) => t.status === 'TODO').length,
      inProgressTasks: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      reviewTasks: tasks.filter((t) => t.status === 'REVIEW').length,
      completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
      cancelledTasks: tasks.filter((t) => t.status === 'CANCELLED').length,
      overdueTasks: tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
      ).length,
      dueSoonTasks: tasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) >= new Date() &&
          new Date(t.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ).length,
    };

    const tasksByPriority: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    const tasksByStatus: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, COMPLETED: 0, CANCELLED: 0 };

    tasks.forEach((task) => {
      tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;
      tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1;
    });

    return { ...counts, tasksByPriority, tasksByStatus };
  }

  // Service Template operations (kept in file storage)
  async createServiceTemplate(createDto: CreateServiceTemplateDto): Promise<ServiceTemplate> {
    const id = this.generateId();
    const now = new Date();

    const taskTemplates: TaskTemplate[] = createDto.taskTemplates.map((template) => ({
      ...template,
      id: this.generateId(),
    }));

    const serviceTemplate: ServiceTemplate = {
      id,
      serviceKind: createDto.serviceKind,
      frequency: createDto.frequency,
      appliesTo: createDto.appliesTo || [],
      complianceImpact: createDto.complianceImpact ?? false,
      pricingModel: createDto.pricingModel || 'per_period',
      taskTemplates,
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('service-templates', id, serviceTemplate);
    this.logger.log(`Created service template: ${serviceTemplate.serviceKind} (${serviceTemplate.frequency})`);

    return serviceTemplate;
  }

  async findAllServiceTemplates(): Promise<ServiceTemplate[]> {
    return this.fileStorage.searchFiles<ServiceTemplate>('service-templates', () => true);
  }

  async findServiceTemplate(id: string): Promise<ServiceTemplate | null> {
    return this.fileStorage.readJson<ServiceTemplate>('service-templates', id);
  }

  async getAllServiceTemplates(): Promise<ServiceTemplate[]> {
    return this.findAllServiceTemplates();
  }

  async updateServiceTemplate(id: string, updateDto: UpdateServiceTemplateDto): Promise<ServiceTemplate> {
    const existing = await this.findServiceTemplate(id);
    if (!existing) {
      throw new NotFoundException(`Service template with ID ${id} not found`);
    }

    const updated: ServiceTemplate = {
      ...existing,
      ...updateDto,
      taskTemplates: updateDto.taskTemplates
        ? updateDto.taskTemplates.map((t) => ({ ...t, id: this.generateId() }))
        : existing.taskTemplates,
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('service-templates', id, updated);
    this.logger.log(`Updated service template: ${updated.serviceKind} (${updated.frequency})`);

    return updated;
  }

  async deleteServiceTemplate(id: string): Promise<boolean> {
    const existing = await this.findServiceTemplate(id);
    if (!existing) return false;
    await this.fileStorage.deleteJson('service-templates', id);
    this.logger.log(`Deleted service template: ${existing.serviceKind} (${existing.frequency})`);
    return true;
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
