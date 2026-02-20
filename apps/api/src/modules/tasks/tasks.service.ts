import { Injectable, Logger, NotFoundException, Optional, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

const TASK_STATUS_VALUES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'] as const;
const TASK_PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly defaultTaskGenerationWindowDays = 60;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    @Inject(forwardRef(() => ServicesService))
    private servicesService: ServicesService,
    @Optional() private integrationConfig?: IntegrationConfigService,
  ) {}

  private normalizeTaskRow(task: any): Task {
    if (!task) return task;
    return {
      ...task,
      clientId: task.clientId || task.service?.clientId,
    };
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const normalizedCreateDto = this.normalizeTaskPayload(createTaskDto, true);
    const service = await this.servicesService.findOne(normalizedCreateDto.serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${normalizedCreateDto.serviceId} not found`);
    }
    normalizedCreateDto.serviceId = service.id;

    const task = await (this.prisma as any).task.create({
      data: {
        title: normalizedCreateDto.title,
        serviceId: normalizedCreateDto.serviceId,
        description: normalizedCreateDto.description,
        dueDate: normalizedCreateDto.dueDate,
        assigneeId: normalizedCreateDto.assigneeId,
        creatorId: normalizedCreateDto.creatorId,
        status: normalizedCreateDto.status || 'TODO',
        priority: normalizedCreateDto.priority || 'MEDIUM',
        tags: normalizedCreateDto.tags || [],
      },
    });

    this.logger.log(`Created task: ${task.title} (${task.id})`);
    return this.normalizeTaskRow({
      ...task,
      service: { clientId: service.clientId },
    });
  }

  async findAll(filters: TaskFilters = {}): Promise<Task[]> {
    try {
      const normalizedFilters = this.normalizeTaskFilters(filters);
      const where: any = {};

      if (normalizedFilters.clientId) {
        const resolvedClientId = await this.clientsService.resolveClientId(normalizedFilters.clientId);
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          { service: { clientId: resolvedClientId || normalizedFilters.clientId } },
        ];
      }
      if (normalizedFilters.serviceId) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          {
            serviceId: normalizedFilters.serviceId,
          },
        ];
      }
      if (normalizedFilters.assigneeId) where.assigneeId = normalizedFilters.assigneeId;
      if (normalizedFilters.status) where.status = normalizedFilters.status;
      if (normalizedFilters.priority) where.priority = normalizedFilters.priority;

      if (normalizedFilters.dueBefore || normalizedFilters.dueAfter) {
        where.dueDate = {};
        if (normalizedFilters.dueBefore) where.dueDate.lte = normalizedFilters.dueBefore;
        if (normalizedFilters.dueAfter) where.dueDate.gte = normalizedFilters.dueAfter;
      }

      if (normalizedFilters.portfolioCode) {
        const clients = await this.clientsService.findByPortfolio(normalizedFilters.portfolioCode);
        const ids = clients.map((c) => c.id);
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          { service: { clientId: { in: ids } } },
        ];
      }

      if (normalizedFilters.search) {
        where.OR = [
          { title: { contains: normalizedFilters.search, mode: 'insensitive' } },
          { description: { contains: normalizedFilters.search, mode: 'insensitive' } },
        ];
      }

      const skip = normalizedFilters.offset !== undefined ? Number(normalizedFilters.offset) : 0;
      const take = normalizedFilters.limit !== undefined ? Number(normalizedFilters.limit) : 100;

      const rows = await (this.prisma as any).task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Number.isFinite(skip) ? skip : 0,
        take: Number.isFinite(take) ? take : 100,
        include: {
          service: {
            select: { clientId: true },
          },
        },
      });
      return rows.map((task: any) => this.normalizeTaskRow(task));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn('Database unavailable while loading tasks; returning empty list');
        return [];
      }
      throw error;
    }
  }

  async findAllWithClientDetails(
    filters: TaskFilters = {}
  ): Promise<
    Array<
      Task & {
        clientId?: string;
        clientName?: string;
        clientIdentifier?: string;
        portfolioCode?: number;
        assignee?: string;
        serviceName?: string;
      }
    >
  > {
    const tasks = await this.findAll(filters);
    const result: Array<
      Task & {
        clientId?: string;
        clientName?: string;
        clientIdentifier?: string;
        portfolioCode?: number;
        assignee?: string;
        serviceName?: string;
      }
    > = [];
    for (const task of tasks) {
      let clientId: string | undefined;
      let clientName: string | undefined;
      let clientIdentifier: string | undefined;
      let portfolioCode: number | undefined;
      let serviceName: string | undefined;
      if (task.serviceId) {
        const service = await this.servicesService.findOne(task.serviceId);
        serviceName = service?.kind;
        clientId = service?.clientId;
        const client = service ? await this.clientsService.findOne(service.clientId) : null;
        clientName = client?.name;
        clientIdentifier = client?.clientRef || client?.registeredNumber || client?.id;
        portfolioCode = client?.portfolioCode;
      }
      result.push({
        ...task,
        clientId,
        assignee: task.assigneeId,
        clientName,
        clientIdentifier,
        portfolioCode,
        serviceName,
      });
    }
    return result;
  }

  async findOne(id: string): Promise<Task | null> {
    try {
      const task = await (this.prisma as any).task.findUnique({
        where: { id },
        include: {
          service: {
            select: { clientId: true },
          },
        },
      });
      return task ? this.normalizeTaskRow(task) : null;
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading task ${id}`);
        return null;
      }
      throw error;
    }
  }

  async findByClient(clientId: string): Promise<Task[]> {
    try {
      const resolvedClientId = await this.clientsService.resolveClientId(clientId);
      const rows = await (this.prisma as any).task.findMany({
        where: {
          service: { clientId: resolvedClientId || clientId },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            select: { clientId: true },
          },
        },
      });
      return rows.map((task: any) => this.normalizeTaskRow(task));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading tasks for client ${clientId}`);
        return [];
      }
      throw error;
    }
  }

  async findByService(serviceId: string): Promise<Task[]> {
    try {
      const rows = await (this.prisma as any).task.findMany({
        where: { serviceId: serviceId },
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            select: { clientId: true },
          },
        },
      });
      return rows.map((task: any) => this.normalizeTaskRow(task));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading tasks for service ${serviceId}`);
        return [];
      }
      throw error;
    }
  }

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    try {
      const rows = await (this.prisma as any).task.findMany({
        where: { assigneeId },
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            select: { clientId: true },
          },
        },
      });
      return rows.map((task: any) => this.normalizeTaskRow(task));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading tasks for assignee ${assigneeId}`);
        return [];
      }
      throw error;
    }
  }

  async findOverdue(): Promise<Task[]> {
    try {
      const now = new Date();
      const rows = await (this.prisma as any).task.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          service: {
            select: { clientId: true },
          },
        },
      });
      return rows.map((task: any) => this.normalizeTaskRow(task));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn('Database unavailable while loading overdue tasks');
        return [];
      }
      throw error;
    }
  }

  async findDueSoon(days: number = 7): Promise<Task[]> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const rows = await (this.prisma as any).task.findMany({
        where: {
          dueDate: { gte: now, lte: futureDate },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          service: {
            select: { clientId: true },
          },
        },
      });
      return rows.map((task: any) => this.normalizeTaskRow(task));
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn('Database unavailable while loading due-soon tasks');
        return [];
      }
      throw error;
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    const normalizedUpdateDto = this.normalizeTaskPayload(updateTaskDto, false);

    const updated = await (this.prisma as any).task.update({
      where: { id },
      data: {
        ...normalizedUpdateDto,
      },
    });

    this.logger.log(`Updated task: ${updated.title} (${updated.id})`);
    const refreshed = await this.findOne(updated.id);
    if (!refreshed) {
      throw new NotFoundException(`Task with ID ${updated.id} not found after update`);
    }
    return refreshed;
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
    if (service.status !== 'ACTIVE') {
      this.logger.debug(`Skipping task generation for non-active service ${serviceId} (${service.status})`);
      return [];
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

  private async findServiceTemplateByKindAndFrequency(serviceKind: string, frequency?: string): Promise<ServiceTemplate | null> {
    if (!frequency) {
      return null;
    }
    const templates = await this.findAllServiceTemplates();
    return templates.find(
      (t) => t.serviceKind === serviceKind && t.frequency === (frequency as any)
    ) || null;
  }

  private advanceDate(date: Date, frequency?: string): Date {
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

  // Service Template operations (Prisma-backed)
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

    await (this.prisma as any).serviceTemplate.create({
      data: {
        id,
        serviceKind: serviceTemplate.serviceKind,
        frequency: serviceTemplate.frequency,
        appliesTo: serviceTemplate.appliesTo || [],
        complianceImpact: serviceTemplate.complianceImpact ?? false,
        pricingModel: serviceTemplate.pricingModel || 'per_period',
        taskTemplates: {
          create: serviceTemplate.taskTemplates.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            daysBeforeDue: t.daysBeforeDue,
            priority: t.priority,
            tags: t.tags || [],
            assigneeId: t.assigneeId,
          })),
        },
      },
    });
    this.logger.log(`Created service template: ${serviceTemplate.serviceKind} (${serviceTemplate.frequency})`);

    return serviceTemplate;
  }

  async findAllServiceTemplates(): Promise<ServiceTemplate[]> {
    let templates: any[] = [];
    try {
      templates = await (this.prisma as any).serviceTemplate.findMany({
        orderBy: { createdAt: 'desc' },
        include: { taskTemplates: true },
      });
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn('Database unavailable while loading service templates; returning empty list');
        return [];
      }
      throw error;
    }

    return templates.map((t: any) => ({
      id: t.id,
      serviceKind: t.serviceKind,
      frequency: t.frequency,
      appliesTo: t.appliesTo || [],
      complianceImpact: t.complianceImpact,
      pricingModel: t.pricingModel,
      taskTemplates: (t.taskTemplates || []).map((tt: any) => ({
        id: tt.id,
        title: tt.title,
        description: tt.description,
        daysBeforeDue: tt.daysBeforeDue,
        priority: tt.priority,
        tags: tt.tags || [],
        assigneeId: tt.assigneeId || undefined,
      })),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async findServiceTemplate(id: string): Promise<ServiceTemplate | null> {
    let t: any = null;
    try {
      t = await (this.prisma as any).serviceTemplate.findUnique({
        where: { id },
        include: { taskTemplates: true },
      });
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while loading service template ${id}`);
        return null;
      }
      throw error;
    }

    if (!t) return null;
    return {
      id: t.id,
      serviceKind: t.serviceKind,
      frequency: t.frequency,
      appliesTo: t.appliesTo || [],
      complianceImpact: t.complianceImpact,
      pricingModel: t.pricingModel,
      taskTemplates: (t.taskTemplates || []).map((tt: any) => ({
        id: tt.id,
        title: tt.title,
        description: tt.description,
        daysBeforeDue: tt.daysBeforeDue,
        priority: tt.priority,
        tags: tt.tags || [],
        assigneeId: tt.assigneeId || undefined,
      })),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
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

    await (this.prisma as any).serviceTemplate.update({
      where: { id },
      data: {
        serviceKind: updated.serviceKind,
        frequency: updated.frequency,
        appliesTo: updated.appliesTo || [],
        complianceImpact: updated.complianceImpact ?? false,
        pricingModel: updated.pricingModel || 'per_period',
        taskTemplates: {
          deleteMany: {},
          create: updated.taskTemplates.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            daysBeforeDue: t.daysBeforeDue,
            priority: t.priority,
            tags: t.tags || [],
            assigneeId: t.assigneeId,
          })),
        },
      },
    });
    this.logger.log(`Updated service template: ${updated.serviceKind} (${updated.frequency})`);

    return updated;
  }

  async deleteServiceTemplate(id: string): Promise<boolean> {
    const existing = await this.findServiceTemplate(id);
    if (!existing) return false;
    await (this.prisma as any).serviceTemplate.delete({ where: { id } });
    this.logger.log(`Deleted service template: ${existing.serviceKind} (${existing.frequency})`);
    return true;
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private normalizeTaskFilters(filters: TaskFilters): TaskFilters {
    const normalized: TaskFilters = {
      ...filters,
    };
    if (normalized.status !== undefined) {
      normalized.status = this.normalizeEnumField(
        normalized.status,
        'status',
        TASK_STATUS_VALUES,
      ) as TaskFilters['status'];
    }
    if (normalized.priority !== undefined) {
      normalized.priority = this.normalizeEnumField(
        normalized.priority,
        'priority',
        TASK_PRIORITY_VALUES,
      ) as TaskFilters['priority'];
    }
    if (normalized.portfolioCode !== undefined) {
      const code = Number(normalized.portfolioCode);
      if (!Number.isFinite(code)) {
        throw new BadRequestException('portfolioCode must be a number');
      }
      normalized.portfolioCode = code;
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'dueBefore')) {
      normalized.dueBefore = this.parseOptionalDate(normalized.dueBefore, 'dueBefore') as Date | undefined;
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'dueAfter')) {
      normalized.dueAfter = this.parseOptionalDate(normalized.dueAfter, 'dueAfter') as Date | undefined;
    }
    return normalized;
  }

  private normalizeTaskPayload(payload: CreateTaskDto | UpdateTaskDto, requireServiceId: boolean): any {
    const normalized: Record<string, any> = { ...payload };
    if (normalized.assignee && !normalized.assigneeId) {
      normalized.assigneeId = normalized.assignee;
    }
    if (requireServiceId && !normalized.serviceId) {
      throw new BadRequestException('serviceId is required');
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'dueDate')) {
      normalized.dueDate = this.parseOptionalDate(normalized.dueDate, 'dueDate');
    }
    if (normalized.status !== undefined) {
      const status = this.normalizeEnumField(normalized.status, 'status', TASK_STATUS_VALUES);
      if (!status) {
        throw new BadRequestException('status cannot be empty');
      }
      normalized.status = status;
    }
    if (normalized.priority !== undefined) {
      const priority = this.normalizeEnumField(normalized.priority, 'priority', TASK_PRIORITY_VALUES);
      if (!priority) {
        throw new BadRequestException('priority cannot be empty');
      }
      normalized.priority = priority;
    }
    return normalized;
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
    const message = String((error as any)?.message || error || '').toLowerCase();
    return (
      message.includes("can't reach database server")
      || message.includes('prismaclientinitializationerror')
      || message.includes('connection refused')
      || message.includes('timed out')
      || message.includes('database connection failed')
    );
  }
}
