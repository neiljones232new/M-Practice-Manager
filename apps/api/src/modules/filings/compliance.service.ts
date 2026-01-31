import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { ComplianceItem, CreateComplianceItemDto } from '../companies-house/interfaces/companies-house.interface';
import { Client } from '../clients/interfaces/client.interface';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly fileStorageService: FileStorageService,
    @Inject(forwardRef(() => ClientsService))
    private readonly clientsService: ClientsService,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
  ) {}

  async createComplianceItem(createDto: CreateComplianceItemDto): Promise<ComplianceItem> {
    const id = `C${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    const complianceItem: ComplianceItem = {
      id,
      ...createDto,
      status: createDto.status || 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const clientRef = await this.resolveClientRef(createDto.clientId);
    await this.fileStorageService.writeJson('compliance', id, complianceItem, undefined, clientRef);
    this.logger.log(`Created compliance item ${id} for client ${createDto.clientId}`);
    return complianceItem;
  }

  async getComplianceItem(id: string): Promise<ComplianceItem> {
    try {
      const item = await this.fileStorageService.readJson<ComplianceItem>('compliance', id);
      return item;
    } catch (error) {
      throw new NotFoundException(`Compliance item ${id} not found`);
    }
  }

  async updateComplianceItem(id: string, updateData: Partial<ComplianceItem>): Promise<ComplianceItem> {
    const existingItem = await this.getComplianceItem(id);
    const updatedItem = {
      ...existingItem,
      ...updateData,
      updatedAt: new Date(),
    };

    const clientRef = await this.resolveClientRef(updatedItem.clientId);
    await this.fileStorageService.writeJson('compliance', id, updatedItem, undefined, clientRef);
    this.logger.log(`Updated compliance item ${id}`);
    return updatedItem;
  }

  async deleteComplianceItem(id: string): Promise<void> {
    try {
      await this.fileStorageService.deleteJson('compliance', id);
      this.logger.log(`Deleted compliance item ${id}`);
    } catch (error) {
      throw new NotFoundException(`Compliance item ${id} not found`);
    }
  }

  async getComplianceItemsByClient(clientId: string): Promise<ComplianceItem[]> {
    try {
      const files = await this.fileStorageService.listFiles('compliance');
      const complianceItems: ComplianceItem[] = [];

      for (const id of files) {
        const item = await this.fileStorageService.readJson<ComplianceItem>('compliance', id);
        if (item && item.clientId === clientId) {
          complianceItems.push(item);
        }
      }

      return complianceItems.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } catch (error) {
      this.logger.error(`Error getting compliance items for client ${clientId}: ${error.message}`, error.stack);
      return [];
    }
  }

  async getAllComplianceItems(): Promise<ComplianceItem[]> {
    try {
      const files = await this.fileStorageService.listFiles('compliance');
      const complianceItems: ComplianceItem[] = [];

      this.logger.log(`Found ${files.length} compliance files to process`);

      // If there are too many files, log a warning and limit processing
      const maxFiles = 2000; // Reasonable limit to prevent timeouts
      const filesToProcess = files.length > maxFiles ? files.slice(0, maxFiles) : files;
      
      if (files.length > maxFiles) {
        this.logger.warn(`Too many compliance files (${files.length}). Processing only first ${maxFiles}. Consider running cleanup.`);
      }

      let successCount = 0;
      let errorCount = 0;

      for (const id of filesToProcess) {
        try {
          const item = await this.fileStorageService.readJson<ComplianceItem>('compliance', id);
          if (item) {
            complianceItems.push(item);
            successCount++;
          } else {
            this.logger.warn(`Compliance item ${id} returned null`);
            errorCount++;
          }
        } catch (error) {
          this.logger.warn(`Failed to read compliance item ${id}: ${error.message}`);
          errorCount++;
          // Continue processing other files instead of failing completely
        }
      }

      this.logger.log(`Processed ${filesToProcess.length} files: ${successCount} successful, ${errorCount} errors`);
      this.logger.log(`Returning ${complianceItems.length} compliance items`);

      return complianceItems.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } catch (error) {
      this.logger.error(`Error getting all compliance items: ${error.message}`, error.stack);
      return [];
    }
  }

  async findAll(filters: {
    portfolioCode?: number;
    clientId?: string;
    serviceId?: string;
    status?: string | string[];
    dueDateFrom?: Date;
    dueDateTo?: Date;
  } = {}): Promise<ComplianceItem[]> {
    let items = await this.getAllComplianceItems();

    // Filter by portfolio if specified
    if (filters.portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(filters.portfolioCode);
      const clientIds = clients.map(c => c.id);
      items = items.filter(item => item.clientId && clientIds.includes(item.clientId));
    }

    // Filter by client ID
    if (filters.clientId) {
      items = items.filter(item => item.clientId === filters.clientId);
    }

    // Filter by service ID
    if (filters.serviceId) {
      items = items.filter(item => item.serviceId === filters.serviceId);
    }

    // Filter by status
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      items = items.filter(item => statuses.includes(item.status));
    }

    // Filter by date range
    if (filters.dueDateFrom) {
      items = items.filter(item => 
        item.dueDate && new Date(item.dueDate) >= filters.dueDateFrom!
      );
    }

    if (filters.dueDateTo) {
      items = items.filter(item => 
        item.dueDate && new Date(item.dueDate) <= filters.dueDateTo!
      );
    }

    return items;
  }

  async findByService(serviceId: string): Promise<ComplianceItem[]> {
    try {
      const files = await this.fileStorageService.listFiles('compliance');
      const complianceItems: ComplianceItem[] = [];

      for (const id of files) {
        const item = await this.fileStorageService.readJson<ComplianceItem>('compliance', id);
        if (item && item.serviceId === serviceId) {
          complianceItems.push(item);
        }
      }

      return complianceItems.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } catch (error) {
      this.logger.error(`Error getting compliance items for service ${serviceId}: ${error.message}`, error.stack);
      return [];
    }
  }

  async getOverdueComplianceItems(): Promise<ComplianceItem[]> {
    const allItems = await this.getAllComplianceItems();
    const now = new Date();
    
    return allItems.filter(item => {
      if (!item.dueDate) return false;
      return new Date(item.dueDate) < now && item.status === 'PENDING';
    });
  }

  async getUpcomingComplianceItems(daysAhead: number = 30): Promise<ComplianceItem[]> {
    const allItems = await this.getAllComplianceItems();
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);
    
    return allItems.filter(item => {
      if (!item.dueDate) return false;
      const dueDate = new Date(item.dueDate);
      return dueDate >= now && dueDate <= futureDate && item.status === 'PENDING';
    });
  }

  async markComplianceItemFiled(id: string, filedDate?: Date): Promise<ComplianceItem> {
    return this.updateComplianceItem(id, {
      status: 'FILED',
      updatedAt: filedDate || new Date(),
    });
  }

  async markComplianceItemOverdue(id: string): Promise<ComplianceItem> {
    return this.updateComplianceItem(id, {
      status: 'OVERDUE',
    });
  }

  async createManualComplianceItem(createDto: CreateComplianceItemDto): Promise<ComplianceItem> {
    // Ensure manual items are marked with MANUAL source
    const manualDto = {
      ...createDto,
      source: 'MANUAL' as const,
    };
    
    return this.createComplianceItem(manualDto);
  }

  async getComplianceItemsByType(type: string): Promise<ComplianceItem[]> {
    try {
      const files = await this.fileStorageService.listFiles('compliance');
      const complianceItems: ComplianceItem[] = [];

      for (const id of files) {
        const item = await this.fileStorageService.readJson<ComplianceItem>('compliance', id);
        if (item && item.type === type) {
          complianceItems.push(item);
        }
      }

      return complianceItems.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } catch (error) {
      this.logger.error(`Error getting compliance items by type ${type}: ${error.message}`, error.stack);
      return [];
    }
  }

  async getComplianceItemsBySource(source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL'): Promise<ComplianceItem[]> {
    try {
      const files = await this.fileStorageService.listFiles('compliance');
      const complianceItems: ComplianceItem[] = [];

      for (const id of files) {
        const item = await this.fileStorageService.readJson<ComplianceItem>('compliance', id);
        if (item && item.source === source) {
          complianceItems.push(item);
        }
      }

      return complianceItems.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } catch (error) {
      this.logger.error(`Error getting compliance items by source ${source}: ${error.message}`, error.stack);
      return [];
    }
  }

  async getComplianceItemsByDateRange(startDate: Date, endDate: Date): Promise<ComplianceItem[]> {
    const allItems = await this.getAllComplianceItems();
    
    return allItems.filter(item => {
      if (!item.dueDate) return false;
      const dueDate = new Date(item.dueDate);
      return dueDate >= startDate && dueDate <= endDate;
    });
  }

  async bulkUpdateComplianceStatus(ids: string[], status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT'): Promise<ComplianceItem[]> {
    const updatedItems: ComplianceItem[] = [];
    
    for (const id of ids) {
      try {
        const updatedItem = await this.updateComplianceItem(id, { status });
        updatedItems.push(updatedItem);
      } catch (error) {
        this.logger.error(`Error updating compliance item ${id}: ${error.message}`);
      }
    }
    
    return updatedItems;
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
    // Get filtered items based on portfolio if specified
    let allItems = await this.getAllComplianceItems();
    if (portfolioCode) {
      // Filter by portfolio through client association
      const clients = await this.clientsService.findByPortfolio(portfolioCode);
      const clientIds = clients.map(c => c.id);
      allItems = allItems.filter(item => item.clientId && clientIds.includes(item.clientId));
    }

    const overdueItems = allItems.filter(item => 
      item.dueDate && new Date(item.dueDate) < new Date() && item.status === 'PENDING'
    );
    
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dueThisMonth = allItems.filter(item => 
      item.dueDate && 
      new Date(item.dueDate) >= now && 
      new Date(item.dueDate) <= endOfMonth &&
      item.status === 'PENDING'
    );

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    allItems.forEach(item => {
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

  async createTaskFromComplianceItem(complianceItemId: string, assignee?: string): Promise<string> {
    const complianceItem = await this.getComplianceItem(complianceItemId);
    
    // Create task data
    const taskData = {
      clientId: complianceItem.clientId,
      title: `${complianceItem.type.replace(/_/g, ' ')} - ${complianceItem.description}`,
      description: `Compliance task for ${complianceItem.description}${complianceItem.period ? ` (Period: ${complianceItem.period})` : ''}`,
      dueDate: complianceItem.dueDate ? new Date(complianceItem.dueDate) : undefined,
      assignee,
      priority: this.getTaskPriorityFromComplianceStatus(complianceItem.status, complianceItem.dueDate),
      tags: ['compliance', 'filing', complianceItem.type.toLowerCase(), complianceItem.source.toLowerCase()],
    };

    // Use file storage to create task directly (since we can't inject TasksService due to circular dependency)
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    
    const task = {
      id: taskId,
      ...taskData,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorageService.writeJson('tasks', taskId, task);
    this.logger.log(`Created task ${taskId} from compliance item ${complianceItemId}`);
    
    return taskId;
  }

  async createTasksForOverdueCompliance(assignee?: string): Promise<string[]> {
    const overdueItems = await this.getOverdueComplianceItems();
    const taskIds: string[] = [];

    for (const item of overdueItems) {
      // Check if task already exists for this compliance item
      const existingTasks = await this.findTasksForComplianceItem(item.id);
      if (existingTasks.length === 0) {
        const taskId = await this.createTaskFromComplianceItem(item.id, assignee);
        taskIds.push(taskId);
      }
    }

    this.logger.log(`Created ${taskIds.length} tasks for overdue compliance items`);
    return taskIds;
  }

  async createTasksForUpcomingCompliance(daysAhead: number = 30, assignee?: string): Promise<string[]> {
    const upcomingItems = await this.getUpcomingComplianceItems(daysAhead);
    const taskIds: string[] = [];

    for (const item of upcomingItems) {
      // Check if task already exists for this compliance item
      const existingTasks = await this.findTasksForComplianceItem(item.id);
      if (existingTasks.length === 0) {
        const taskId = await this.createTaskFromComplianceItem(item.id, assignee);
        taskIds.push(taskId);
      }
    }

    this.logger.log(`Created ${taskIds.length} tasks for upcoming compliance items`);
    return taskIds;
  }

  async findTasksForComplianceItem(complianceItemId: string): Promise<any[]> {
    try {
      const files = await this.fileStorageService.listFiles('tasks');
      const tasks: any[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.replace('.json', '');
          const task = await this.fileStorageService.readJson<any>('tasks', id);
          if (task && task.tags && task.tags.includes('compliance')) {
            // Check if task title or description contains compliance item reference
            const titleMatch = task.title.toLowerCase().includes(complianceItemId.toLowerCase());
            const descMatch = task.description && task.description.toLowerCase().includes(complianceItemId.toLowerCase());
            
            if (titleMatch || descMatch) {
              tasks.push(task);
            }
          }
        }
      }

      return tasks;
    } catch (error) {
      this.logger.error(`Error finding tasks for compliance item ${complianceItemId}: ${error.message}`);
      return [];
    }
  }

  async escalateOverdueCompliance(): Promise<{ escalated: number; tasksCreated: number }> {
    const overdueItems = await this.getOverdueComplianceItems();
    let escalated = 0;
    let tasksCreated = 0;

    for (const item of overdueItems) {
      // Mark as overdue if not already
      if (item.status !== 'OVERDUE') {
        await this.markComplianceItemOverdue(item.id);
        escalated++;
      }

      // Create high-priority task if none exists
      const existingTasks = await this.findTasksForComplianceItem(item.id);
      if (existingTasks.length === 0) {
        await this.createTaskFromComplianceItem(item.id);
        tasksCreated++;
      } else {
        // Escalate existing task priority
        for (const task of existingTasks) {
          if (task.priority !== 'URGENT' && (task.status === 'OPEN' || task.status === 'IN_PROGRESS')) {
            const updatedTask = {
              ...task,
              priority: 'URGENT',
              updatedAt: new Date(),
            };
            await this.fileStorageService.writeJson('tasks', task.id, updatedTask);
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
        relatedTasks: relatedTasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee,
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

  /**
   * Auto-generate compliance items from active services
   * Scans all active services and creates compliance items for services that require tracking
   */
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
    this.logger.log('Starting auto-generation of compliance items from services');
    
    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];
    let clientsNotFound = 0;
    let servicesProcessed = 0;

    try {
      // Get all services using the ServicesService
      const allServices = await this.servicesService.findAll();
      const activeServices = allServices.filter(s => s.status === 'ACTIVE');
      
      this.logger.log(`Found ${allServices.length} total services, ${activeServices.length} active`);
      
      // Group services by clientId
      const servicesByClient = new Map<string, any[]>();
      for (const service of activeServices) {
        if (!servicesByClient.has(service.clientId)) {
          servicesByClient.set(service.clientId, []);
        }
        servicesByClient.get(service.clientId)!.push(service);
      }

      this.logger.log(`Found ${servicesByClient.size} unique clients with active services`);

      // Process each client's services
      for (const [clientId, services] of servicesByClient) {
        try {
          // Try to find the client
          const client = await this.findClientById(clientId);
          if (!client) {
            this.logger.warn(`Client ${clientId} not found, skipping ${services.length} services`);
            clientsNotFound++;
            continue;
          }

          if (client.status !== 'ACTIVE') {
            this.logger.debug(`Client ${client.name} (${client.ref}) is not active, skipping`);
            continue;
          }

          this.logger.log(`Processing ${services.length} services for client ${client.name} (${client.ref})`);

          for (const service of services) {
            servicesProcessed++;
            
            // Check if this service type requires compliance tracking
            const complianceTypes = this.getComplianceTypesForService(service.kind);
            
            if (complianceTypes.length === 0) {
              this.logger.debug(`No compliance mapping for service kind: ${service.kind}`);
              continue;
            }

            this.logger.debug(`Service ${service.kind} maps to ${complianceTypes.length} compliance types`);

            for (const complianceType of complianceTypes) {
              // Check if compliance item already exists
              const existingItems = await this.findExistingComplianceItem(
                client.id,
                service.id,
                complianceType.type
              );

              if (existingItems.length > 0) {
                skipped++;
                this.logger.debug(`Compliance item ${complianceType.type} already exists for ${client.name}`);
                continue;
              }

              // Create compliance item
              try {
                const dueDate = this.calculateDueDateForService(service, complianceType.type);
                
                await this.createComplianceItem({
                  clientId: client.id, // Use the client's current ID, not the service's clientId reference
                  serviceId: service.id,
                  type: complianceType.type,
                  description: `${client.name} - ${complianceType.description}`,
                  dueDate: dueDate,
                  source: complianceType.source,
                  status: 'PENDING',
                  reference: client.registeredNumber || undefined,
                });

                generated++;
                this.logger.log(
                  `Generated ${complianceType.type} compliance item for client ${client.name} (${client.ref}) using client ID ${client.id}`
                );
              } catch (error) {
                const errorMsg = `Failed to create ${complianceType.type} for ${client.name}: ${error.message}`;
                errors.push(errorMsg);
                this.logger.error(errorMsg);
              }
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process client ${clientId}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      this.logger.log(
        `Auto-generation complete: ${generated} generated, ${skipped} skipped, ${errors.length} errors, ${clientsNotFound} clients not found`
      );

      return { 
        generated, 
        skipped, 
        errors,
        debug: {
          totalServices: allServices.length,
          activeServices: activeServices.length,
          clientsWithServices: servicesByClient.size,
          servicesProcessed,
          clientsNotFound
        }
      };
    } catch (error) {
      this.logger.error(`Auto-generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ensure compliance items exist for a specific client service.
   */
  async ensureComplianceForService(
    client: { id: string; name: string; registeredNumber?: string },
    service: { id: string; kind: string; nextDue?: string | Date },
  ): Promise<number> {
    if (!client?.id || !service?.id || !service?.kind) return 0;

    let created = 0;
    const complianceTypes = this.getComplianceTypesForService(service.kind);
    if (complianceTypes.length === 0) return 0;

    for (const complianceType of complianceTypes) {
      const existingItems = await this.findExistingComplianceItem(
        client.id,
        service.id,
        complianceType.type,
      );

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

  /**
   * Find client by ID (works with both old ID format and new ref format)
   */
  private async findClientById(clientId: string): Promise<any | null> {
    try {
      // First try using the ClientsService which handles the portfolio structure
      const client = await this.clientsService.findOne(clientId);
      if (client) {
        return client;
      }

      // If not found, search across all portfolios manually
      // This handles cases where services have old client IDs that don't match current client IDs
      const portfolios = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      for (const portfolioCode of portfolios) {
        try {
          const clients = await this.fileStorageService.searchFiles<any>('clients', () => true, portfolioCode);
          
          // Try to find by exact ID match first
          let foundClient = clients.find(c => c.id === clientId || c.ref === clientId);
          if (foundClient) {
            return foundClient;
          }
          
          // If still not found, this might be an old service referencing a client that was migrated
          // In this case, we'll need to find any active client that could match
          // For now, we'll skip this service as the client reference is broken
        } catch (error) {
          // Portfolio might not exist, continue
          continue;
        }
      }

      this.logger.warn(`Client ${clientId} not found in any portfolio - this may be an old service reference`);
      return null;
    } catch (error) {
      this.logger.error(`Error finding client ${clientId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get compliance types that should be tracked for a service
   */
  private getComplianceTypesForService(serviceKind: string): Array<{
    type: string;
    description: string;
    source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  }> {
    const mappings: Record<string, Array<{
      type: string;
      description: string;
      source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
    }>> = {
      // Accounts services
      'Annual Accounts': [
        {
          type: 'ANNUAL_ACCOUNTS',
          description: 'Annual Accounts Filing',
          source: 'COMPANIES_HOUSE',
        },
      ],
      'Accounts Preparation': [
        {
          type: 'ANNUAL_ACCOUNTS',
          description: 'Annual Accounts Filing',
          source: 'COMPANIES_HOUSE',
        },
      ],
      'Statutory Accounts': [
        {
          type: 'ANNUAL_ACCOUNTS',
          description: 'Annual Accounts Filing',
          source: 'COMPANIES_HOUSE',
        },
      ],
      
      // Company secretarial services
      'Company Secretarial': [
        {
          type: 'CONFIRMATION_STATEMENT',
          description: 'Confirmation Statement Filing',
          source: 'COMPANIES_HOUSE',
        },
      ],
      'Confirmation Statement': [
        {
          type: 'CONFIRMATION_STATEMENT',
          description: 'Confirmation Statement Filing',
          source: 'COMPANIES_HOUSE',
        },
      ],
      
      // Tax services
      'Corporation Tax': [
        {
          type: 'CT600',
          description: 'Corporation Tax Return',
          source: 'HMRC',
        },
      ],
      'VAT Returns': [
        {
          type: 'VAT_RETURN',
          description: 'VAT Return',
          source: 'HMRC',
        },
      ],
      'Self Assessment': [
        {
          type: 'SA100',
          description: 'Self Assessment Tax Return',
          source: 'HMRC',
        },
      ],
      'Payroll': [
        {
          type: 'RTI_SUBMISSION',
          description: 'Real Time Information Submission',
          source: 'HMRC',
        },
      ],
    };

    // Also check for partial matches
    const exactMatch = mappings[serviceKind];
    if (exactMatch) {
      return exactMatch;
    }

    // Check for partial matches
    const lowerServiceKind = serviceKind.toLowerCase();
    const partialMatches: Array<{
      type: string;
      description: string;
      source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
    }> = [];

    if (lowerServiceKind.includes('account')) {
      partialMatches.push({
        type: 'ANNUAL_ACCOUNTS',
        description: 'Annual Accounts Filing',
        source: 'COMPANIES_HOUSE',
      });
    }

    if (lowerServiceKind.includes('confirmation') || lowerServiceKind.includes('secretarial')) {
      partialMatches.push({
        type: 'CONFIRMATION_STATEMENT',
        description: 'Confirmation Statement Filing',
        source: 'COMPANIES_HOUSE',
      });
    }

    if (lowerServiceKind.includes('corporation') || lowerServiceKind.includes('ct600')) {
      partialMatches.push({
        type: 'CT600',
        description: 'Corporation Tax Return',
        source: 'HMRC',
      });
    }

    if (lowerServiceKind.includes('vat')) {
      partialMatches.push({
        type: 'VAT_RETURN',
        description: 'VAT Return',
        source: 'HMRC',
      });
    }

    return partialMatches;
  }

  /**
   * Find existing compliance items for a client/service/type combination
   */
  private async findExistingComplianceItem(
    clientId: string,
    serviceId: string,
    type: string
  ): Promise<ComplianceItem[]> {
    try {
      const files = await this.fileStorageService.listFiles('compliance');
      const items: ComplianceItem[] = [];

      // Limit the search to avoid performance issues with large numbers of files
      const maxFilesToCheck = 1000;
      const filesToCheck = files.slice(0, maxFilesToCheck);
      
      this.logger.debug(`Checking ${filesToCheck.length} compliance files for existing items (limited from ${files.length} total)`);

      for (const id of filesToCheck) {
        const item = await this.fileStorageService.readJson<ComplianceItem>('compliance', id);
        if (
          item &&
          item.clientId === clientId &&
          item.serviceId === serviceId &&
          item.type === type &&
          item.status !== 'FILED' // Don't consider filed items as existing
        ) {
          items.push(item);
        }
      }

      if (files.length > maxFilesToCheck) {
        this.logger.warn(`Only checked ${maxFilesToCheck} of ${files.length} compliance files for duplicates. Consider cleanup.`);
      }

      return items;
    } catch (error) {
      this.logger.error(`Error finding existing compliance items: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate due date for a service based on compliance type
   */
  private calculateDueDateForService(service: any, complianceType: string): Date | undefined {
    // If service has a nextDue date, use that
    if (service.nextDue) {
      return new Date(service.nextDue);
    }

    // Otherwise, calculate based on service frequency and type
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (complianceType) {
      case 'ANNUAL_ACCOUNTS':
        // Typically due 9 months after year-end
        // Default to March 31st year-end if no specific date
        return new Date(currentYear + 1, 11, 31); // December 31st of next year
        
      case 'CONFIRMATION_STATEMENT':
        // Due annually on anniversary of incorporation
        // Default to end of current year if no specific date
        return new Date(currentYear, 11, 31);
        
      case 'CT600':
        // Due 12 months after accounting period end
        return new Date(currentYear + 1, 11, 31);
        
      case 'VAT_RETURN':
        // Quarterly returns - next quarter end
        const currentMonth = now.getMonth();
        const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3;
        return new Date(currentYear, nextQuarterMonth, 0); // Last day of quarter
        
      default:
        // Default to end of current year
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
      // Get all compliance items
      const files = await this.fileStorageService.listFiles('compliance');
      totalItems = files.length;

      this.logger.log(`Checking ${totalItems} compliance items for invalid client IDs`);

      // Get all valid client IDs from all portfolios
      const validClientIds = new Set<string>();
      
      // Load clients from all portfolios
      for (let portfolio = 1; portfolio <= 10; portfolio++) {
        try {
          const clientFiles = await this.fileStorageService.listFiles('clients', portfolio);
          for (const clientRef of clientFiles) {
            try {
              const client = await this.fileStorageService.readJson<Client>('clients', clientRef, portfolio);
              if (client?.id) {
                validClientIds.add(client.id);
              }
            } catch (error) {
              this.logger.warn(`Failed to read client ${clientRef} from portfolio ${portfolio}: ${error.message}`);
            }
          }
        } catch (error) {
          // Portfolio might not exist, continue
        }
      }

      this.logger.log(`Found ${validClientIds.size} valid client IDs across all portfolios`);

      // Check each compliance item
      for (const id of files) {
        try {
          const item = await this.fileStorageService.readJson<ComplianceItem>('compliance', id);
          if (item) {
            if (!validClientIds.has(item.clientId)) {
              invalidItems++;
              this.logger.log(`Removing compliance item ${id} with invalid client ID: ${item.clientId}`);

              try {
                await this.fileStorageService.deleteJson('compliance', id);
                removedItems++;
              } catch (deleteError) {
                errors.push(`Failed to delete ${id}: ${deleteError.message}`);
              }
            }
          }
        } catch (readError) {
          errors.push(`Failed to read compliance item ${id}: ${readError.message}`);
        }
      }

      this.logger.log(`Cleanup complete: ${removedItems} items removed, ${errors.length} errors`);

      return {
        totalItems,
        invalidItems,
        removedItems,
        errors
      };
    } catch (error) {
      this.logger.error(`Error during cleanup: ${error.message}`, error.stack);
      errors.push(`Cleanup failed: ${error.message}`);
      
      return {
        totalItems,
        invalidItems,
        removedItems,
        errors
      };
    }
  }

  private async resolveClientRef(clientId: string): Promise<string> {
    const client = await this.clientsService.findOne(clientId);
    return client?.ref || clientId;
  }
}
