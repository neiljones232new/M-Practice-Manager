import { Injectable, Logger, NotFoundException, Optional, Inject, forwardRef } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { Service } from '../services/interfaces/service.interface';
import { IntegrationConfigService } from '../integrations/services/integration-config.service';
import { DatabaseService } from '../database/database.service';
import { buildClientContext, ClientContext, evaluateServiceEligibility } from '../clients/dto/client-context.dto';
import { 
  Task, 
  TaskFilters, 
  CreateTaskDto, 
  UpdateTaskDto,
  ServiceTemplate,
  TaskTemplate,
  CreateServiceTemplateDto,
  UpdateServiceTemplateDto
} from './interfaces/task.interface';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly defaultTaskGenerationWindowDays = 60;

  constructor(
    private fileStorage: FileStorageService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    @Inject(forwardRef(() => ServicesService))
    private servicesService: ServicesService,
    private databaseService: DatabaseService,
    @Optional() private integrationConfig?: IntegrationConfigService,
  ) {}

  // Task CRUD operations
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // Validate client exists
    const client = await this.clientsService.findOne(createTaskDto.clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${createTaskDto.clientId} not found`);
    }

    // Validate service exists if provided
    if (createTaskDto.serviceId) {
      const service = await this.servicesService.findOne(createTaskDto.serviceId);
      if (!service) {
        throw new NotFoundException(`Service with ID ${createTaskDto.serviceId} not found`);
      }
    }

    const id = this.generateId();
    const now = new Date();

    const task: Task = {
      id,
      clientId: client.ref,
      serviceId: createTaskDto.serviceId,
      title: createTaskDto.title,
      description: createTaskDto.description,
      dueDate: createTaskDto.dueDate,
      assignee: createTaskDto.assignee,
      status: createTaskDto.status || 'OPEN',
      priority: createTaskDto.priority || 'MEDIUM',
      tags: createTaskDto.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('tasks', id, task);
    this.logger.log(`Created task: ${task.title} for client ${client.ref} (${task.id})`);

    return task;
  }

  async findAll(filters?: TaskFilters): Promise<Task[]> {
    let tasks = await this.fileStorage.searchFiles<Task>('tasks', () => true);

    // Apply filters
    if (filters) {
      tasks = await this.applyFilters(tasks, filters);
    }

    // Apply pagination
    if (filters?.offset !== undefined || filters?.limit !== undefined) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      tasks = tasks.slice(offset, offset + limit);
    }

    return tasks;
  }

  async findOne(id: string): Promise<Task | null> {
    return this.fileStorage.readJson<Task>('tasks', id);
  }

  async findByClient(clientId: string): Promise<Task[]> {
    const resolvedClient = await this.clientsService.findOne(clientId);
    const acceptableClientIds = new Set(
      [clientId, resolvedClient?.id, resolvedClient?.ref].filter(Boolean).map(String)
    );

    return this.fileStorage.searchFiles<Task>('tasks', (task) => {
      if (!task?.clientId) return false;
      return acceptableClientIds.has(String(task.clientId));
    });
  }

  async findByService(serviceId: string): Promise<Task[]> {
    return this.fileStorage.searchFiles<Task>('tasks', 
      (task) => task.serviceId === serviceId
    );
  }

  async findByAssignee(assignee: string): Promise<Task[]> {
    return this.fileStorage.searchFiles<Task>('tasks', 
      (task) => task.assignee === assignee
    );
  }

  async findOverdue(): Promise<Task[]> {
    const now = new Date();
    return this.fileStorage.searchFiles<Task>('tasks', 
      (task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
    );
  }

  async findDueSoon(days: number = 7): Promise<Task[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return this.fileStorage.searchFiles<Task>('tasks', 
      (task) => task.dueDate && 
        new Date(task.dueDate) >= now && 
        new Date(task.dueDate) <= futureDate && 
        task.status !== 'COMPLETED' && 
        task.status !== 'CANCELLED'
    );
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const updatedTask: Task = {
      ...existing,
      ...updateTaskDto,
      id: existing.id, // Ensure ID cannot be changed
      clientId: existing.clientId, // Ensure client ID cannot be changed
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('tasks', id, updatedTask);
    this.logger.log(`Updated task: ${updatedTask.title} (${updatedTask.id})`);

    return updatedTask;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) {
      return false;
    }

    await this.fileStorage.deleteJson('tasks', id);
    this.logger.log(`Deleted task: ${existing.title} (${existing.id})`);

    return true;
  }

  // Service Template operations
  async createServiceTemplate(createDto: CreateServiceTemplateDto): Promise<ServiceTemplate> {
    const id = this.generateId();
    const now = new Date();

    const taskTemplates: TaskTemplate[] = createDto.taskTemplates.map(template => ({
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

  async findServiceTemplate(serviceKind: string, frequency: string): Promise<ServiceTemplate | null> {
    const templates = await this.fileStorage.searchFiles<ServiceTemplate>('service-templates', 
      (template) => template.serviceKind === serviceKind && template.frequency === frequency
    );
    
    return templates.length > 0 ? templates[0] : null;
  }

  async getAllServiceTemplates(): Promise<ServiceTemplate[]> {
    return this.fileStorage.searchFiles<ServiceTemplate>('service-templates', () => true);
  }

  async updateServiceTemplate(id: string, updateDto: UpdateServiceTemplateDto): Promise<ServiceTemplate> {
    const existing = await this.fileStorage.readJson<ServiceTemplate>('service-templates', id);
    if (!existing) {
      throw new NotFoundException(`Service template with ID ${id} not found`);
    }

    let taskTemplates = existing.taskTemplates;
    if (updateDto.taskTemplates) {
      taskTemplates = updateDto.taskTemplates.map(template => ({
        ...template,
        id: this.generateId(),
      }));
    }

    const updatedTemplate: ServiceTemplate = {
      ...existing,
      ...updateDto,
      taskTemplates,
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('service-templates', id, updatedTemplate);
    this.logger.log(`Updated service template: ${updatedTemplate.serviceKind} (${updatedTemplate.frequency})`);

    return updatedTemplate;
  }

  async deleteServiceTemplate(id: string): Promise<boolean> {
    const existing = await this.fileStorage.readJson<ServiceTemplate>('service-templates', id);
    if (!existing) {
      return false;
    }

    await this.fileStorage.deleteJson('service-templates', id);
    this.logger.log(`Deleted service template: ${existing.serviceKind} (${existing.frequency})`);

    return true;
  }

  // Task generation from services
  async generateTasksFromService(serviceId: string): Promise<Task[]> {
    const service = await this.servicesService.findOne(serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    const clientContext = await this.buildClientContext(service.clientId);
    const eligibility = evaluateServiceEligibility(service.kind, clientContext);
    if (!eligibility.eligible) {
      const reasonText = eligibility.reasons.join(', ') || 'Eligibility rules';
      this.logger.warn(
        `Skipping task generation for client ${clientContext.node.ref} (${reasonText})`
      );
      return [];
    }

    // Find matching service template
    let template = await this.findServiceTemplate(service.kind, service.frequency);
    if (!template) {
      const aliases = this.getServiceKindAliases(service.kind, service.frequency);
      for (const alias of aliases) {
        if (alias === service.kind) continue;
        template = await this.findServiceTemplate(alias, service.frequency);
        if (template) break;
      }
    }
    if (!template) {
      this.logger.warn(`No service template found for ${service.kind} (${service.frequency})`);
      return [];
    }

    const generatedTasks: Task[] = [];
    const serviceDueDate = service.nextDue ? new Date(service.nextDue) : null;

    for (const taskTemplate of template.taskTemplates) {
      let taskDueDate: Date | undefined;
      
      if (serviceDueDate) {
        // Calculate task due date based on template
        taskDueDate = new Date(serviceDueDate.getTime() - (taskTemplate.daysBeforeDue * 24 * 60 * 60 * 1000));
      }

      const createTaskDto: CreateTaskDto = {
        clientId: service.clientId,
        serviceId: service.id,
        title: taskTemplate.title,
        description: taskTemplate.description,
        dueDate: taskDueDate,
        assignee: taskTemplate.assignee
          || clientContext.profile.clientManager
          || clientContext.profile.partnerResponsible,
        priority: taskTemplate.priority,
        tags: [...taskTemplate.tags, 'auto-generated'],
      };

      const task = await this.create(createTaskDto);
      generatedTasks.push(task);
    }

    this.logger.log(`Generated ${generatedTasks.length} tasks from service ${service.kind} (${service.id})`);
    return generatedTasks;
  }

  private getServiceKindAliases(serviceKind: string, frequency: string): string[] {
    const normalized = String(serviceKind || '').trim();
    const candidates = new Set<string>();
    if (normalized) {
      candidates.add(normalized);
    }

    if (normalized === 'VAT Returns') {
      if (frequency === 'MONTHLY') candidates.add('VAT Returns (Monthly)');
      if (frequency === 'QUARTERLY') candidates.add('VAT Returns (Quarterly)');
    }
    if (normalized.startsWith('VAT Returns (')) {
      candidates.add('VAT Returns');
    }
    if (normalized === 'Corporation Tax') {
      candidates.add('Corporation Tax Return');
    }
    if (normalized === 'Corporation Tax Return') {
      candidates.add('Corporation Tax');
    }
    if (normalized === 'Self Assessment') {
      candidates.add('Self Assessment Tax Return');
    }
    if (normalized === 'Self Assessment Tax Return') {
      candidates.add('Self Assessment');
    }
    if (normalized === 'Payroll') {
      candidates.add('Payroll Services');
    }
    if (normalized === 'Payroll Services') {
      candidates.add('Payroll');
    }

    return Array.from(candidates);
  }

  async generateTasksForAllServices(): Promise<{ serviceId: string; tasksGenerated: number }[]> {
    const windowDays = await this.getTaskGenerationWindowDays();
    const services = await this.servicesService.findAll({ status: 'ACTIVE' });
    const results: { serviceId: string; tasksGenerated: number }[] = [];

    for (const service of services) {
      try {
        if (!this.shouldGenerateTasksForService(service, windowDays)) {
          continue;
        }

        // Check if tasks already exist for this service
        const existingTasks = await this.findByService(service.id);
        const hasOpenTasks = existingTasks.some(task =>
          task.status === 'OPEN' || task.status === 'IN_PROGRESS'
        );

        if (!hasOpenTasks) {
          const tasks = await this.generateTasksFromService(service.id);
          results.push({
            serviceId: service.id,
            tasksGenerated: tasks.length,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to generate tasks for service ${service.id}:`, error);
      }
    }

    return results;
  }

  async generateTasksForClient(clientId: string): Promise<{ serviceId: string; tasksGenerated: number }[]> {
    const windowDays = await this.getTaskGenerationWindowDays();
    const services = await this.servicesService.findByClient(clientId);
    const results: { serviceId: string; tasksGenerated: number }[] = [];

    for (const service of services) {
      try {
        if (!this.shouldGenerateTasksForService(service, windowDays)) {
          continue;
        }

        const existingTasks = await this.findByService(service.id);
        const hasOpenTasks = existingTasks.some(task =>
          task.status === 'OPEN' || task.status === 'IN_PROGRESS'
        );

        if (!hasOpenTasks) {
          const tasks = await this.generateTasksFromService(service.id);
          results.push({
            serviceId: service.id,
            tasksGenerated: tasks.length,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to generate tasks for service ${service.id}:`, error);
      }
    }

    return results;
  }

  async updateServiceNextDueDate(serviceId: string): Promise<void> {
    const service = await this.servicesService.findOne(serviceId);
    if (!service || !service.nextDue) {
      return;
    }

    const currentDue = new Date(service.nextDue);
    let nextDue: Date;

    switch (service.frequency) {
      case 'WEEKLY':
        nextDue = new Date(currentDue.getTime() + (7 * 24 * 60 * 60 * 1000));
        break;
      case 'MONTHLY':
        nextDue = new Date(currentDue);
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextDue = new Date(currentDue);
        nextDue.setMonth(nextDue.getMonth() + 3);
        break;
      case 'ANNUAL':
        nextDue = new Date(currentDue);
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;
      default:
        return;
    }

    await this.servicesService.updateNextDueDate(serviceId, nextDue);
    this.logger.log(`Updated next due date for service ${serviceId} to ${nextDue.toISOString()}`);
  }

  private async applyFilters(tasks: Task[], filters: TaskFilters): Promise<Task[]> {
    let filtered = tasks;

    if (filters.clientId) {
      const resolvedClient = await this.clientsService.findOne(filters.clientId);
      const acceptableClientIds = new Set(
        [filters.clientId, resolvedClient?.id, resolvedClient?.ref].filter(Boolean).map(String)
      );
      filtered = filtered.filter(task => task?.clientId && acceptableClientIds.has(String(task.clientId)));
    }

    if (filters.serviceId) {
      filtered = filtered.filter(task => task.serviceId === filters.serviceId);
    }

    if (filters.assignee) {
      filtered = filtered.filter(task => task.assignee === filters.assignee);
    }

    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    if (filters.dueBefore) {
      filtered = filtered.filter(task => 
        task.dueDate && new Date(task.dueDate) <= filters.dueBefore!
      );
    }

    if (filters.dueAfter) {
      filtered = filtered.filter(task => 
        task.dueDate && new Date(task.dueDate) >= filters.dueAfter!
      );
    }

    if (filters.portfolioCode) {
      // Get clients for the portfolio
      const clients = await this.clientsService.findByPortfolio(filters.portfolioCode);
      const acceptableClientIds = new Set<string>();
      clients.forEach((c) => {
        acceptableClientIds.add(String(c.id));
        acceptableClientIds.add(String(c.ref));
      });
      filtered = filtered.filter(task => task?.clientId && acceptableClientIds.has(String(task.clientId)));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task => {
        const searchText = `${task.title} ${task.description || ''}`.toLowerCase();
        return searchText.includes(searchLower);
      });
    }

    return filtered;
  }

  private async buildClientContext(clientId: string): Promise<ClientContext> {
    const client = await this.clientsService.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const dbClient = client.registeredNumber
      ? await this.databaseService.getClientByNumber(client.registeredNumber)
      : null;

    return buildClientContext(client, dbClient);
  }

  async findAllWithClientDetails(filters?: TaskFilters): Promise<any[]> {
    const tasks = await this.findAll(filters);
    const tasksWithDetails = [];

    for (const task of tasks) {
      const client = await this.clientsService.findOne(task.clientId);
      let service = null;
      
      if (task.serviceId) {
        service = await this.servicesService.findOne(task.serviceId);
      }

      tasksWithDetails.push({
        ...task,
        clientName: client?.name || 'Unknown Client',
        clientRef: client?.ref || 'N/A',
        portfolioCode: client?.portfolioCode || 0,
        serviceName: service?.kind || undefined,
      });
    }

    return tasksWithDetails;
  }

  async getTaskSummary(portfolioCode?: number): Promise<any> {
    let tasks = await this.fileStorage.searchFiles<Task>('tasks', () => true);

    // Filter by portfolio if specified
    if (portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(portfolioCode);
      const clientIds = clients.map(c => c.id);
      tasks = tasks.filter(task => clientIds.includes(task.clientId));
    }

    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const summary = {
      totalTasks: tasks.length,
      openTasks: tasks.filter(t => t.status === 'OPEN').length,
      inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
      overdueTasks: tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < now && 
        t.status !== 'COMPLETED' && 
        t.status !== 'CANCELLED'
      ).length,
      dueSoonTasks: tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) >= now && 
        new Date(t.dueDate) <= nextWeek && 
        t.status !== 'COMPLETED' && 
        t.status !== 'CANCELLED'
      ).length,
      tasksByPriority: {
        LOW: tasks.filter(t => t.priority === 'LOW').length,
        MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
        HIGH: tasks.filter(t => t.priority === 'HIGH').length,
        URGENT: tasks.filter(t => t.priority === 'URGENT').length,
      },
      tasksByStatus: {
        OPEN: tasks.filter(t => t.status === 'OPEN').length,
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
        CANCELLED: tasks.filter(t => t.status === 'CANCELLED').length,
      },
    };

    return summary;
  }

  // Deadline tracking and notification methods
  async getDashboardAlerts(portfolioCode?: number): Promise<any> {
    let tasks = await this.fileStorage.searchFiles<Task>('tasks', () => true);

    // Filter by portfolio if specified
    if (portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(portfolioCode);
      const clientIds = clients.map(c => c.id);
      tasks = tasks.filter(task => clientIds.includes(task.clientId));
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const overdueTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'COMPLETED' && 
      t.status !== 'CANCELLED'
    );

    const dueTodayTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate).toDateString() === now.toDateString() && 
      t.status !== 'COMPLETED' && 
      t.status !== 'CANCELLED'
    );

    const dueTomorrowTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate).toDateString() === tomorrow.toDateString() && 
      t.status !== 'COMPLETED' && 
      t.status !== 'CANCELLED'
    );

    const dueThisWeekTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) >= now && 
      new Date(t.dueDate) <= nextWeek && 
      t.status !== 'COMPLETED' && 
      t.status !== 'CANCELLED'
    );

    const urgentTasks = tasks.filter(t => 
      t.priority === 'URGENT' && 
      t.status !== 'COMPLETED' && 
      t.status !== 'CANCELLED'
    );

    return {
      overdue: {
        count: overdueTasks.length,
        tasks: overdueTasks.slice(0, 5), // Limit to 5 for dashboard
        severity: 'critical',
      },
      dueToday: {
        count: dueTodayTasks.length,
        tasks: dueTodayTasks.slice(0, 5),
        severity: 'high',
      },
      dueTomorrow: {
        count: dueTomorrowTasks.length,
        tasks: dueTomorrowTasks.slice(0, 5),
        severity: 'medium',
      },
      dueThisWeek: {
        count: dueThisWeekTasks.length,
        tasks: dueThisWeekTasks.slice(0, 10),
        severity: 'low',
      },
      urgent: {
        count: urgentTasks.length,
        tasks: urgentTasks.slice(0, 5),
        severity: 'high',
      },
    };
  }

  async getPriorityTaskRecommendations(assignee?: string, portfolioCode?: number): Promise<any> {
    let tasks = await this.fileStorage.searchFiles<Task>('tasks', () => true);

    // Filter by assignee if specified
    if (assignee) {
      tasks = tasks.filter(task => task.assignee === assignee);
    }

    // Filter by portfolio if specified
    if (portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(portfolioCode);
      const clientIds = clients.map(c => c.id);
      tasks = tasks.filter(task => clientIds.includes(task.clientId));
    }

    // Only consider open and in-progress tasks
    tasks = tasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');

    const now = new Date();
    
    // Score tasks based on priority, due date, and status
    const scoredTasks = tasks.map(task => {
      let score = 0;
      
      // Priority scoring
      switch (task.priority) {
        case 'URGENT': score += 100; break;
        case 'HIGH': score += 75; break;
        case 'MEDIUM': score += 50; break;
        case 'LOW': score += 25; break;
      }
      
      // Due date scoring
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          // Overdue - highest priority
          score += 200 + Math.abs(daysUntilDue) * 10;
        } else if (daysUntilDue === 0) {
          // Due today
          score += 150;
        } else if (daysUntilDue === 1) {
          // Due tomorrow
          score += 100;
        } else if (daysUntilDue <= 7) {
          // Due this week
          score += 75 - (daysUntilDue * 5);
        } else if (daysUntilDue <= 30) {
          // Due this month
          score += 25 - (daysUntilDue * 1);
        }
      }
      
      // Status scoring
      if (task.status === 'IN_PROGRESS') {
        score += 25; // Boost in-progress tasks
      }
      
      return { ...task, priorityScore: score };
    });

    // Sort by score descending
    scoredTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      topPriority: scoredTasks.slice(0, 5),
      recommendations: {
        overdue: scoredTasks.filter(t => t.dueDate && new Date(t.dueDate) < now).length,
        urgent: scoredTasks.filter(t => t.priority === 'URGENT').length,
        inProgress: scoredTasks.filter(t => t.status === 'IN_PROGRESS').length,
        totalScore: scoredTasks.reduce((sum, t) => sum + t.priorityScore, 0),
      },
    };
  }

  async getComplianceDeadlines(portfolioCode?: number): Promise<any> {
    // This method integrates with compliance items to provide unified deadline tracking
    try {
      // Get compliance items (this would need to be injected or imported)
      // For now, we'll focus on task-based deadlines
      
      let tasks = await this.fileStorage.searchFiles<Task>('tasks', () => true);

      // Filter by portfolio if specified
      if (portfolioCode) {
        const clients = await this.clientsService.findByPortfolio(portfolioCode);
        const clientIds = clients.map(c => c.id);
        tasks = tasks.filter(task => clientIds.includes(task.clientId));
      }

      const now = new Date();
      const next30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      // Filter for compliance-related tasks (based on tags or service types)
      const complianceTasks = tasks.filter(task => 
        task.tags.some(tag => 
          tag.toLowerCase().includes('compliance') ||
          tag.toLowerCase().includes('filing') ||
          tag.toLowerCase().includes('deadline') ||
          tag.toLowerCase().includes('statutory')
        ) ||
        (task.serviceId && task.title.toLowerCase().includes('filing'))
      );

      const upcomingDeadlines = complianceTasks.filter(task =>
        task.dueDate &&
        new Date(task.dueDate) >= now &&
        new Date(task.dueDate) <= next30Days &&
        task.status !== 'COMPLETED' &&
        task.status !== 'CANCELLED'
      );

      const overdueDeadlines = complianceTasks.filter(task =>
        task.dueDate &&
        new Date(task.dueDate) < now &&
        task.status !== 'COMPLETED' &&
        task.status !== 'CANCELLED'
      );

      return {
        upcoming: upcomingDeadlines.sort((a, b) => 
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
        ),
        overdue: overdueDeadlines.sort((a, b) => 
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
        ),
        summary: {
          totalUpcoming: upcomingDeadlines.length,
          totalOverdue: overdueDeadlines.length,
          criticalCount: overdueDeadlines.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length,
        },
      };
    } catch (error) {
      this.logger.error('Error getting compliance deadlines:', error);
      return {
        upcoming: [],
        overdue: [],
        summary: { totalUpcoming: 0, totalOverdue: 0, criticalCount: 0 },
      };
    }
  }

  private shouldGenerateTasksForService(service: Service, windowDays: number, referenceDate: Date = new Date()): boolean {
    if (service.status !== 'ACTIVE' || !service.nextDue) {
      return false;
    }

    const dueDate = new Date(service.nextDue);
    if (isNaN(dueDate.getTime())) {
      return false;
    }

    const windowEnd = new Date(referenceDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
    return dueDate >= referenceDate && dueDate <= windowEnd;
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async getTaskGenerationWindowDays(): Promise<number> {
    try {
      const settings = await this.integrationConfig?.getPracticeSettings();
      const days = settings?.systemSettings?.taskGenerationWindowDays;
      if (typeof days === 'number' && days > 0) {
        return days;
      }
    } catch (e) {
      this.logger.warn('Falling back to default task generation window (settings unavailable)');
    }
    return this.defaultTaskGenerationWindowDays;
  }
}
