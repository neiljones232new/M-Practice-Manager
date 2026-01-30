import { Inject, Injectable, forwardRef, Logger, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { DatabaseService } from '../database/database.service';
import { ClientsService } from '../clients/clients.service';
import { TasksService } from '../tasks/tasks.service';
import { ServiceComplianceIntegrationService } from './service-compliance-integration.service';
import { buildClientContext, evaluateServiceEligibility } from '../clients/dto/client-context.dto';
import { 
  Service, 
  ServiceFilters, 
  CreateServiceDto, 
  UpdateServiceDto,
  ServiceSummary
} from './interfaces/service.interface';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private fileStorage: FileStorageService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
    @Inject(forwardRef(() => ServiceComplianceIntegrationService))
    private serviceComplianceIntegration: ServiceComplianceIntegrationService,
    private databaseService: DatabaseService,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    // Validate client exists
    const client = await this.clientsService.findOne(createServiceDto.clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${createServiceDto.clientId} not found`);
    }

    const id = this.generateId();
    const now = new Date();
    const annualized = this.calculateAnnualizedFee(createServiceDto.fee, createServiceDto.frequency);

    const service: Service = {
      id,
      clientId: createServiceDto.clientId,
      kind: createServiceDto.kind,
      frequency: createServiceDto.frequency,
      fee: createServiceDto.fee,
      annualized,
      status: createServiceDto.status || 'ACTIVE',
      nextDue: createServiceDto.nextDue,
      description: createServiceDto.description,
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('services', id, service, undefined, client.ref);
    
    // Add service ID to client's services array
    if (!client.services.includes(id)) {
      client.services.push(id);
      client.updatedAt = new Date();
      await this.fileStorage.writeJson('clients', client.ref, client, client.portfolioCode);
    }

    this.logger.log(`Created service: ${service.kind} for client ${client.ref} (${service.id})`);

    // DISABLED: Auto-create compliance items to prevent duplicates
    // Create compliance items if applicable (Requirements: 7.1, 7.4)
    // if (this.shouldCreateComplianceItems(service.kind)) {
    //   try {
    //     await this.serviceComplianceIntegration.createComplianceItemsForService(service.id);
    //     this.logger.log(`Created compliance items for service ${service.id}`);
    //   } catch (error) {
    //     this.logger.error(
    //       `Failed to create compliance items for service ${service.id}: ${error.message}`,
    //       error.stack
    //     );
    //     // Don't fail service creation if compliance item creation fails
    //   }
    // }

    return service;
  }

  async findAll(filters?: ServiceFilters): Promise<Service[]> {
    let services = await this.fileStorage.searchFiles<Service>('services', () => true);

    // Apply filters
    if (filters) {
      services = await this.applyFilters(services, filters);
    }

    // Apply pagination
    if (filters?.offset !== undefined || filters?.limit !== undefined) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      services = services.slice(offset, offset + limit);
    }

    return services;
  }

  async findOne(id: string): Promise<Service | null> {
    return this.fileStorage.readJson<Service>('services', id);
  }

  async findByClient(clientId: string): Promise<Array<Service & { eligibility?: { status: 'active' | 'blocked' | 'warning'; reasons: string[]; eligible: boolean } }>> {
    const services = await this.fileStorage.searchFiles<Service>(
      'services',
      (service) => service.clientId === clientId
    );

    const client = await this.clientsService.findOne(clientId);
    if (!client) {
      return services;
    }

    const dbClient = client.registeredNumber
      ? await this.databaseService.getClientByNumber(client.registeredNumber)
      : null;
    const context = buildClientContext(client, dbClient);

    return services.map((service) => ({
      ...service,
      eligibility: evaluateServiceEligibility(service.kind, context),
    }));
  }

  // Alias for compatibility with reports service
  async getServicesByClient(clientId: string): Promise<Service[]> {
    return this.findByClient(clientId);
  }

  async findByKind(kind: string): Promise<Service[]> {
    return this.fileStorage.searchFiles<Service>('services', 
      (service) => service.kind.toLowerCase().includes(kind.toLowerCase())
    );
  }

  async search(query: string, filters?: ServiceFilters): Promise<Service[]> {
    const searchPredicate = (service: Service) => {
      const searchText = `${service.kind} ${service.description || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    };

    let services = await this.fileStorage.searchFiles<Service>('services', searchPredicate);
    
    if (filters) {
      services = await this.applyFilters(services, filters);
    }

    return services;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    // Recalculate annualized fee if fee or frequency changed
    let annualized = existing.annualized;
    if (updateServiceDto.fee !== undefined || updateServiceDto.frequency !== undefined) {
      const fee = updateServiceDto.fee ?? existing.fee;
      const frequency = updateServiceDto.frequency ?? existing.frequency;
      annualized = this.calculateAnnualizedFee(fee, frequency);
    }

    const updatedService: Service = {
      ...existing,
      ...updateServiceDto,
      id: existing.id, // Ensure ID cannot be changed
      clientId: existing.clientId, // Ensure client ID cannot be changed
      annualized,
      updatedAt: new Date(),
    };

    const client = await this.clientsService.findOne(existing.clientId);
    const clientRef = client?.ref || existing.clientId;
    await this.fileStorage.writeJson('services', id, updatedService, undefined, clientRef);
    this.logger.log(`Updated service: ${updatedService.kind} (${updatedService.id})`);

    // Sync compliance item dates if nextDue changed (Requirements: 7.4, 7.5)
    if (updateServiceDto.nextDue && updateServiceDto.nextDue !== existing.nextDue) {
      try {
        await this.serviceComplianceIntegration.syncServiceAndComplianceDates(id);
        this.logger.log(`Synced compliance dates for service ${id}`);
      } catch (error) {
        this.logger.error(
          `Failed to sync compliance dates for service ${id}: ${error.message}`,
          error.stack
        );
        // Don't fail service update if compliance sync fails
      }
    }

    return updatedService;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) {
      return false;
    }

    // Cascade delete: Find and delete all related tasks (Requirements: 1.5, 9.2)
    try {
      const relatedTasks = await this.tasksService.findByService(id);
      
      if (relatedTasks.length > 0) {
        this.logger.log(`Cascade delete: Found ${relatedTasks.length} tasks related to service ${id}`);
        
        for (const task of relatedTasks) {
          await this.tasksService.delete(task.id);
          this.logger.log(`Cascade delete: Deleted task ${task.id} (${task.title}) for service ${id}`);
        }
        
        this.logger.log(`Cascade delete: Successfully deleted ${relatedTasks.length} tasks for service ${id}`);
      } else {
        this.logger.log(`Cascade delete: No tasks found for service ${id}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to cascade delete tasks for service ${id}: ${error.message}`,
        error.stack
      );
      // Continue with service deletion even if task deletion fails
    }

    // Remove service ID from client's services array
    const client = await this.clientsService.findOne(existing.clientId);
    if (client) {
      const index = client.services.indexOf(id);
      if (index > -1) {
        client.services.splice(index, 1);
        client.updatedAt = new Date();
        await this.fileStorage.writeJson('clients', client.ref, client, client.portfolioCode);
      }
    }

    await this.fileStorage.deleteJson('services', id);
    this.logger.log(`Deleted service: ${existing.kind} (${existing.id})`);

    return true;
  }

  async getServiceSummary(portfolioCode?: number): Promise<ServiceSummary> {
    let services = await this.fileStorage.searchFiles<Service>('services', () => true);

    // Filter by portfolio if specified
    if (portfolioCode) {
      const clients = await this.clientsService.findByPortfolio(portfolioCode);
      const clientIds = clients.map(c => c.id);
      services = services.filter(s => clientIds.includes(s.clientId));
    }

    const activeServices = services.filter(s => s.status === 'ACTIVE');
    const totalAnnualFees = activeServices.reduce((sum, s) => sum + s.annualized, 0);

    const servicesByKind: Record<string, number> = {};
    const servicesByFrequency: Record<string, number> = {};

    services.forEach(service => {
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

  async getServicesWithClientDetails(filters?: ServiceFilters): Promise<Array<Service & { clientName: string; clientRef: string; portfolioCode: number }>> {
    const services = await this.findAll(filters);
    const result = [];

    for (const service of services) {
      const client = await this.clientsService.findOne(service.clientId);
      if (client) {
        result.push({
          ...service,
          clientName: client.name,
          clientRef: client.ref,
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

  private async applyFilters(services: Service[], filters: ServiceFilters): Promise<Service[]> {
    let filtered = services;

    if (filters.clientId) {
      filtered = filtered.filter(service => service.clientId === filters.clientId);
    }

    if (filters.kind) {
      filtered = filtered.filter(service => 
        service.kind.toLowerCase().includes(filters.kind!.toLowerCase())
      );
    }

    if (filters.frequency) {
      filtered = filtered.filter(service => service.frequency === filters.frequency);
    }

    if (filters.status) {
      filtered = filtered.filter(service => service.status === filters.status);
    }

    if (filters.portfolioCode) {
      // Get clients for the portfolio
      const clients = await this.clientsService.findByPortfolio(filters.portfolioCode);
      const clientIds = clients.map(c => c.id);
      filtered = filtered.filter(service => clientIds.includes(service.clientId));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(service => {
        const searchText = `${service.kind} ${service.description || ''}`.toLowerCase();
        return searchText.includes(searchLower);
      });
    }

    return filtered;
  }

  /**
   * Determines if compliance items should be created for a service kind
   * Requirements: 7.1, 7.4, 7.5
   */
  private shouldCreateComplianceItems(serviceKind: string): boolean {
    const complianceServices = [
      'Annual Accounts',
      'Confirmation Statement',
      'VAT Returns',
      'Corporation Tax',
      'Self Assessment',
      'Payroll',
    ];
    return complianceServices.includes(serviceKind);
  }

  private generateId(): string {
    return `service_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get service data formatted for template placeholder resolution
   * Requirements: 11.2, 11.3
   */
  async getServicePlaceholderData(serviceId: string): Promise<Record<string, any>> {
    const service = await this.findOne(serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    // Get client information
    let clientName = '';
    let clientRef = '';
    try {
      const client = await this.clientsService.findOne(service.clientId);
      if (client) {
        clientName = client.name;
        clientRef = client.ref;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch client for service ${serviceId}:`, error);
    }

    // Format date as DD/MM/YYYY
    const formatDate = (date?: Date): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Format currency
    const formatCurrency = (amount: number): string => {
      return `£${amount.toFixed(2)}`;
    };

    // Calculate frequency description
    const getFrequencyDescription = (frequency: string): string => {
      const descriptions: Record<string, string> = {
        'ANNUAL': 'annually',
        'QUARTERLY': 'quarterly',
        'MONTHLY': 'monthly',
        'WEEKLY': 'weekly'
      };
      return descriptions[frequency] || frequency.toLowerCase();
    };

    return {
      // Basic service information
      serviceId: service.id,
      serviceName: service.kind,
      serviceKind: service.kind,
      serviceType: service.kind, // Alias
      
      // Frequency and timing
      frequency: service.frequency,
      frequencyDescription: getFrequencyDescription(service.frequency),
      nextDue: service.nextDue ? formatDate(service.nextDue) : '',
      nextDueDate: service.nextDue ? formatDate(service.nextDue) : '', // Alias
      
      // Fee information
      fee: formatCurrency(service.fee),
      feeAmount: service.fee.toString(),
      annualizedFee: formatCurrency(service.annualized),
      annualizedFeeAmount: service.annualized.toString(),
      
      // Status
      status: service.status,
      isActive: service.status === 'ACTIVE',
      
      // Description
      description: service.description || '',
      
      // Client information (for convenience)
      clientName,
      clientRef,
      
      // Dates
      createdAt: formatDate(service.createdAt),
      updatedAt: formatDate(service.updatedAt),
      
      // System data
      currentDate: formatDate(new Date()),
      currentYear: new Date().getFullYear().toString()
    };
  }
}
