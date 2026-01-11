import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { TasksService } from '../tasks/tasks.service';
import { ServiceComplianceIntegrationService } from './service-compliance-integration.service';
import { Service, CreateServiceDto, UpdateServiceDto } from './interfaces/service.interface';

describe('ServicesService', () => {
  let service: ServicesService;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let clientsService: jest.Mocked<ClientsService>;
  let tasksService: jest.Mocked<TasksService>;
  let serviceComplianceIntegration: jest.Mocked<ServiceComplianceIntegrationService>;

  const mockClient = {
    id: 'client_123',
    ref: '1A001',
    name: 'Test Company Ltd',
    type: 'COMPANY' as const,
    portfolioCode: 1,
    status: 'ACTIVE' as const,
    services: [],
    parties: [],
    tasks: [],
    documents: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockService: Service = {
    id: 'service_123',
    clientId: 'client_123',
    kind: 'Annual Accounts',
    frequency: 'ANNUAL',
    fee: 1000,
    annualized: 1000,
    status: 'ACTIVE',
    nextDue: new Date('2024-12-31'),
    description: 'Annual accounts preparation',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      deleteJson: jest.fn(),
      searchFiles: jest.fn(),
    };

    const mockClientsService = {
      findOne: jest.fn(),
      findByPortfolio: jest.fn(),
    };

    const mockTasksService = {
      findByService: jest.fn(),
      delete: jest.fn(),
    };

    const mockServiceComplianceIntegration = {
      createComplianceItemsForService: jest.fn(),
      syncServiceAndComplianceDates: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: ServiceComplianceIntegrationService,
          useValue: mockServiceComplianceIntegration,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    fileStorageService = module.get(FileStorageService);
    clientsService = module.get(ClientsService);
    tasksService = module.get(TasksService);
    serviceComplianceIntegration = module.get(ServiceComplianceIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createServiceDto: CreateServiceDto = {
      clientId: 'client_123',
      kind: 'Annual Accounts',
      frequency: 'ANNUAL',
      fee: 1000,
      status: 'ACTIVE',
      nextDue: new Date('2024-12-31'),
      description: 'Annual accounts preparation',
    };

    it('should create a service successfully', async () => {
      clientsService.findOne.mockResolvedValue(mockClient);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createServiceDto);

      expect(result).toMatchObject({
        clientId: createServiceDto.clientId,
        kind: createServiceDto.kind,
        frequency: createServiceDto.frequency,
        fee: createServiceDto.fee,
        annualized: 1000, // Annual frequency, so same as fee
        status: createServiceDto.status,
        nextDue: createServiceDto.nextDue,
        description: createServiceDto.description,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('services', result.id, result);
    });

    it('should calculate annualized fee correctly for different frequencies', async () => {
      clientsService.findOne.mockResolvedValue(mockClient);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      // Test quarterly
      const quarterlyDto = { ...createServiceDto, frequency: 'QUARTERLY' as const, fee: 250 };
      const quarterlyResult = await service.create(quarterlyDto);
      expect(quarterlyResult.annualized).toBe(1000); // 250 * 4

      // Test monthly
      const monthlyDto = { ...createServiceDto, frequency: 'MONTHLY' as const, fee: 100 };
      const monthlyResult = await service.create(monthlyDto);
      expect(monthlyResult.annualized).toBe(1200); // 100 * 12

      // Test weekly
      const weeklyDto = { ...createServiceDto, frequency: 'WEEKLY' as const, fee: 50 };
      const weeklyResult = await service.create(weeklyDto);
      expect(weeklyResult.annualized).toBe(2600); // 50 * 52
    });

    it('should throw NotFoundException when client does not exist', async () => {
      clientsService.findOne.mockResolvedValue(null);

      await expect(service.create(createServiceDto)).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should update client services array', async () => {
      const clientWithoutService = { ...mockClient, services: [] };
      clientsService.findOne.mockResolvedValue(clientWithoutService);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.create(createServiceDto);

      // Should be called twice: once for service, once for updated client
      expect(fileStorageService.writeJson).toHaveBeenCalledTimes(2);
      
      // Check client update call
      const clientUpdateCall = fileStorageService.writeJson.mock.calls.find(
        call => call[0] === 'clients'
      );
      expect(clientUpdateCall).toBeDefined();
      expect((clientUpdateCall![2] as any).services).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return all services without filters', async () => {
      const mockServices = [mockService];
      fileStorageService.searchFiles.mockResolvedValue(mockServices);

      const result = await service.findAll();

      expect(result).toEqual(mockServices);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('services', expect.any(Function));
    });

    it('should apply pagination', async () => {
      const mockServices = Array.from({ length: 100 }, (_, i) => ({
        ...mockService,
        id: `service_${i}`,
      }));
      fileStorageService.searchFiles.mockResolvedValue(mockServices);

      const result = await service.findAll({ limit: 10, offset: 20 });

      expect(result).toHaveLength(10);
      expect(result[0].id).toBe('service_20');
    });
  });

  describe('findOne', () => {
    it('should return a service by id', async () => {
      fileStorageService.readJson.mockResolvedValue(mockService);

      const result = await service.findOne('service_123');

      expect(result).toEqual(mockService);
      expect(fileStorageService.readJson).toHaveBeenCalledWith('services', 'service_123');
    });

    it('should return null when service not found', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateServiceDto: UpdateServiceDto = {
      kind: 'Updated Service',
      fee: 1500,
      status: 'INACTIVE',
    };

    it('should update a service successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockService);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update('service_123', updateServiceDto);

      expect(result).toMatchObject({
        ...mockService,
        ...updateServiceDto,
        annualized: 1500, // Recalculated based on new fee
        updatedAt: expect.any(Date),
      });
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('services', 'service_123', result);
    });

    it('should recalculate annualized fee when fee or frequency changes', async () => {
      fileStorageService.readJson.mockResolvedValue(mockService);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const updateDto = { fee: 500, frequency: 'QUARTERLY' as const };
      const result = await service.update('service_123', updateDto);

      expect(result.annualized).toBe(2000); // 500 * 4
    });

    it('should throw NotFoundException when service does not exist', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateServiceDto)).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a service successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockService);
      clientsService.findOne.mockResolvedValue({ ...mockClient, services: ['service_123'] });
      tasksService.findByService.mockResolvedValue([]);
      fileStorageService.deleteJson.mockResolvedValue(undefined);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.delete('service_123');

      expect(result).toBe(true);
      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('services', 'service_123');
    });

    it('should cascade delete related tasks when deleting a service', async () => {
      const mockTasks = [
        { 
          id: 'task_1', 
          title: 'Task 1', 
          clientId: 'client_123',
          serviceId: 'service_123',
          status: 'OPEN' as const,
          priority: 'MEDIUM' as const,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          id: 'task_2', 
          title: 'Task 2', 
          clientId: 'client_123',
          serviceId: 'service_123',
          status: 'OPEN' as const,
          priority: 'MEDIUM' as const,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      fileStorageService.readJson.mockResolvedValue(mockService);
      clientsService.findOne.mockResolvedValue({ ...mockClient, services: ['service_123'] });
      tasksService.findByService.mockResolvedValue(mockTasks);
      tasksService.delete.mockResolvedValue(true);
      fileStorageService.deleteJson.mockResolvedValue(undefined);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.delete('service_123');

      expect(result).toBe(true);
      expect(tasksService.findByService).toHaveBeenCalledWith('service_123');
      expect(tasksService.delete).toHaveBeenCalledTimes(2);
      expect(tasksService.delete).toHaveBeenCalledWith('task_1');
      expect(tasksService.delete).toHaveBeenCalledWith('task_2');
      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('services', 'service_123');
    });

    it('should continue with service deletion even if task deletion fails', async () => {
      const mockTasks = [
        { 
          id: 'task_1', 
          title: 'Task 1', 
          clientId: 'client_123',
          serviceId: 'service_123',
          status: 'OPEN' as const,
          priority: 'MEDIUM' as const,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      fileStorageService.readJson.mockResolvedValue(mockService);
      clientsService.findOne.mockResolvedValue({ ...mockClient, services: ['service_123'] });
      tasksService.findByService.mockResolvedValue(mockTasks);
      tasksService.delete.mockRejectedValue(new Error('Task deletion failed'));
      fileStorageService.deleteJson.mockResolvedValue(undefined);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.delete('service_123');

      expect(result).toBe(true);
      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('services', 'service_123');
    });

    it('should remove service from client services array', async () => {
      const clientWithService = { ...mockClient, services: ['service_123', 'other_service'] };
      fileStorageService.readJson.mockResolvedValue(mockService);
      clientsService.findOne.mockResolvedValue(clientWithService);
      tasksService.findByService.mockResolvedValue([]);
      fileStorageService.deleteJson.mockResolvedValue(undefined);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.delete('service_123');

      // Check client update call
      const clientUpdateCall = fileStorageService.writeJson.mock.calls.find(
        call => call[0] === 'clients'
      );
      expect(clientUpdateCall).toBeDefined();
      expect((clientUpdateCall![2] as any).services).toEqual(['other_service']);
    });

    it('should return false when service does not exist', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });
  });

  describe('getServiceSummary', () => {
    it('should calculate service summary correctly', async () => {
      const mockServices = [
        { ...mockService, status: 'ACTIVE', annualized: 1000, kind: 'Accounts', frequency: 'ANNUAL' },
        { ...mockService, id: 'service_2', status: 'ACTIVE', annualized: 2000, kind: 'VAT', frequency: 'QUARTERLY' },
        { ...mockService, id: 'service_3', status: 'INACTIVE', annualized: 500, kind: 'Accounts', frequency: 'ANNUAL' },
      ];
      fileStorageService.searchFiles.mockResolvedValue(mockServices);

      const result = await service.getServiceSummary();

      expect(result).toEqual({
        totalServices: 3,
        activeServices: 2,
        totalAnnualFees: 3000, // Only active services: 1000 + 2000
        servicesByKind: {
          'Accounts': 2,
          'VAT': 1,
        },
        servicesByFrequency: {
          'ANNUAL': 2,
          'QUARTERLY': 1,
        },
      });
    });

    it('should filter by portfolio when provided', async () => {
      const mockServices = [mockService];
      const mockClients = [mockClient];
      
      fileStorageService.searchFiles.mockResolvedValue(mockServices);
      clientsService.findByPortfolio.mockResolvedValue(mockClients);

      await service.getServiceSummary(1);

      expect(clientsService.findByPortfolio).toHaveBeenCalledWith(1);
    });
  });

  describe('findByClient', () => {
    it('should return services for a specific client', async () => {
      const mockServices = [mockService];
      fileStorageService.searchFiles.mockResolvedValue(mockServices);

      const result = await service.findByClient('client_123');

      expect(result).toEqual(mockServices);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('services', expect.any(Function));
    });
  });

  describe('updateStatus', () => {
    it('should update service status', async () => {
      fileStorageService.readJson.mockResolvedValue(mockService);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.updateStatus('service_123', 'SUSPENDED');

      expect(result.status).toBe('SUSPENDED');
      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });
  });

  describe('updateNextDueDate', () => {
    it('should update next due date', async () => {
      const newDueDate = new Date('2025-01-01');
      fileStorageService.readJson.mockResolvedValue(mockService);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.updateNextDueDate('service_123', newDueDate);

      expect(result.nextDue).toEqual(newDueDate);
      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });
  });
});