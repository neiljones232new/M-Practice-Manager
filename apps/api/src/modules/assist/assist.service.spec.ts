import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AssistService, AssistContext } from './assist.service';
import { QueryTemplatesService } from './query-templates.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { TasksService } from '../tasks/tasks.service';
import { ServicesService } from '../services/services.service';
import { ComplianceService } from '../filings/compliance.service';

describe('AssistService', () => {
  let service: AssistService;
  let configService: jest.Mocked<ConfigService>;
  let queryTemplatesService: jest.Mocked<QueryTemplatesService>;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let clientsService: jest.Mocked<ClientsService>;
  let tasksService: jest.Mocked<TasksService>;
  let servicesService: jest.Mocked<ServicesService>;
  let complianceService: jest.Mocked<ComplianceService>;

  const mockClients = [
    {
      id: 'client_1',
      ref: '1A001',
      name: 'Test Client Ltd',
      type: 'COMPANY',
      portfolioCode: 1,
      status: 'ACTIVE',
      services: [],
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockTasks = [
    {
      id: 'task_1',
      clientId: 'client_1',
      title: 'Complete VAT return',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'OPEN',
      priority: 'HIGH',
      assignee: 'user_1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'task_2',
      clientId: 'client_1',
      title: 'Overdue task',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'OPEN',
      priority: 'URGENT',
      assignee: 'user_1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockServices = [
    {
      id: 'service_1',
      clientId: 'client_1',
      kind: 'VAT',
      frequency: 'QUARTERLY',
      fee: 500,
      annualized: 2000,
      status: 'ACTIVE',
    },
  ];

  const mockCompliance = [
    {
      id: 'compliance_1',
      clientId: 'client_1',
      type: 'VAT Return',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'PENDING',
      source: 'HMRC',
    },
  ];

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_API_KEY') return null; // Test offline mode
        if (key === 'STORAGE_PATH') return './test-data';
        return null;
      }),
    };

    const mockQueryTemplatesService = {
      getTemplateById: jest.fn(),
      buildPromptFromTemplate: jest.fn(),
      getTemplates: jest.fn(),
      getTemplatesByCategory: jest.fn(),
      getQuickActions: jest.fn(),
      searchTemplates: jest.fn(),
      getContextualTemplates: jest.fn(),
    };

    const mockFileStorageService = {
      read: jest.fn(),
      write: jest.fn(),
    } as any;

    const mockClientsService = {
      findAll: jest.fn(),
      findByRef: jest.fn(),
    } as any;

    const mockTasksService = {
      findAll: jest.fn(),
    } as any;

    const mockServicesService = {
      findAll: jest.fn(),
    } as any;

    const mockComplianceService = {
      findAll: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: QueryTemplatesService, useValue: mockQueryTemplatesService },
        { provide: FileStorageService, useValue: mockFileStorageService },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: TasksService, useValue: mockTasksService },
        { provide: ServicesService, useValue: mockServicesService },
        { provide: ComplianceService, useValue: mockComplianceService },
      ],
    }).compile();

    service = module.get<AssistService>(AssistService);
    configService = module.get(ConfigService);
    queryTemplatesService = module.get(QueryTemplatesService);
    fileStorageService = module.get(FileStorageService);
    clientsService = module.get(ClientsService);
    tasksService = module.get(TasksService);
    servicesService = module.get(ServicesService);
    complianceService = module.get(ComplianceService);

    // Setup default mock implementations
    clientsService.findAll.mockResolvedValue(mockClients as any);
    tasksService.findAll.mockResolvedValue(mockTasks as any);
    servicesService.findAll.mockResolvedValue(mockServices as any);
    complianceService.findAll.mockResolvedValue(mockCompliance as any);
    fileStorageService.readFile.mockResolvedValue(null);
    fileStorageService.writeFile.mockResolvedValue(undefined);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize in offline mode when no OpenAI API key is provided', () => {
      const status = service.getStatus();
      expect(status.online).toBe(false);
      expect(status.mode).toBe('Offline');
    });
  });

  describe('Context Data Generation', () => {
    it('should generate context data with clients', async () => {
      const context: AssistContext = {
        includeClients: true,
      };

      const result = await service['generateContextData'](context);

      expect(result.clients).toEqual(mockClients);
      expect(clientsService.findAll).toHaveBeenCalledWith({});
    });

    it('should generate context data with tasks', async () => {
      const context: AssistContext = {
        includeTasks: true,
      };

      const result = await service['generateContextData'](context);

      expect(result.tasks).toEqual(mockTasks);
      expect(tasksService.findAll).toHaveBeenCalledWith({});
    });

    it('should generate context data with specific client', async () => {
      const clientRef = '1A001';
      clientsService.findByRef.mockResolvedValue(mockClients[0] as any);

      const context: AssistContext = {
        clientRef,
        includeClients: true,
      };

      const result = await service['generateContextData'](context);

      expect(result.client).toEqual(mockClients[0]);
      expect(clientsService.findByRef).toHaveBeenCalledWith(clientRef);
    });

    it('should filter tasks by assignee', async () => {
      const userId = 'user_1';
      const context: AssistContext = {
        userId,
        includeTasks: true,
      };

      await service['generateContextData'](context);

      expect(tasksService.findAll).toHaveBeenCalledWith({ assignee: userId });
    });

    it('should filter data by date range', async () => {
      const dateRange = {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      const context: AssistContext = {
        includeTasks: true,
        includeCompliance: true,
        dateRange,
      };

      await service['generateContextData'](context);

      expect(tasksService.findAll).toHaveBeenCalledWith({ dueDateRange: dateRange });
      expect(complianceService.findAll).toHaveBeenCalledWith({ dueDateRange: dateRange });
    });
  });

  describe('Query Processing', () => {
    it('should process query in offline mode', async () => {
      const prompt = 'What are my priority tasks?';
      const context: AssistContext = {
        includeTasks: true,
      };

      const result = await service.processQuery(prompt, context);

      expect(result).toContain('offline mode');
      expect(result).toContain('Overdue Tasks: 1');
      expect(result).toContain('Total Active Tasks: 2');
    });

    it('should cache responses', async () => {
      const prompt = 'Test query';
      const context: AssistContext = {};

      // First call
      const result1 = await service.processQuery(prompt, context);
      
      // Second call should return cached result
      const result2 = await service.processQuery(prompt, context);

      expect(result1).toBe(result2);
      expect(fileStorageService.writeFile).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      clientsService.findAll.mockRejectedValue(new Error('Database error'));

      const prompt = 'Test query';
      const context: AssistContext = {
        includeClients: true,
      };

      const result = await service.processQuery(prompt, context);

      expect(result).toContain('offline mode');
    });
  });

  describe('Specialized Query Methods', () => {
    it('should get client summary', async () => {
      const clientRef = '1A001';
      clientsService.findByRef.mockResolvedValue(mockClients[0] as any);

      const result = await service.getClientSummary(clientRef);

      expect(result).toContain('CLIENT SUMMARY');
      expect(result).toContain(clientRef);
      expect(clientsService.findByRef).toHaveBeenCalledWith(clientRef);
    });

    it('should check deadlines', async () => {
      const daysAhead = 30;

      const result = await service.checkDeadlines(daysAhead);

      expect(result).toContain('DEADLINE CHECK');
      expect(result).toContain('Overdue Tasks: 1');
      expect(complianceService.findAll).toHaveBeenCalledWith({
        dueDateRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
      });
    });

    it('should get priority tasks', async () => {
      const userId = 'user_1';

      const result = await service.getPriorityTasks(userId);

      expect(result).toContain('offline mode');
      expect(tasksService.findAll).toHaveBeenCalledWith({ assignee: userId });
    });

    it('should get business insights', async () => {
      const portfolioCode = 1;

      const result = await service.getBusinessInsights(portfolioCode);

      expect(result).toContain('offline mode');
      expect(clientsService.findAll).toHaveBeenCalledWith({ portfolioCode });
    });
  });

  describe('Template Integration', () => {
    it('should process template query', async () => {
      const templateId = 'client-summary';
      const context = { clientRef: '1A001' };
      const mockTemplate = {
        id: templateId,
        category: 'client',
        title: 'Client Summary',
        prompt: 'Summarize client {clientRef}',
      };

      queryTemplatesService.getTemplateById.mockReturnValue(mockTemplate as any);
      queryTemplatesService.buildPromptFromTemplate.mockReturnValue('Summarize client 1A001');

      const result = await service.processTemplateQuery(templateId, context);

      expect(queryTemplatesService.getTemplateById).toHaveBeenCalledWith(templateId);
      expect(queryTemplatesService.buildPromptFromTemplate).toHaveBeenCalledWith(mockTemplate, context);
      expect(result).toBeDefined();
    });

    it('should throw error for invalid template', async () => {
      const templateId = 'invalid-template';
      queryTemplatesService.getTemplateById.mockReturnValue(undefined);

      await expect(service.processTemplateQuery(templateId)).rejects.toThrow('Template not found');
    });

    it('should get contextual templates', async () => {
      const context = { clientRef: '1A001', userId: 'user_1' };
      const mockTemplates = [
        { id: 'client-summary', category: 'client', title: 'Client Summary' },
        { id: 'priority-tasks', category: 'task', title: 'Priority Tasks' },
      ];

      queryTemplatesService.getContextualTemplates.mockReturnValue(mockTemplates as any);

      const result = await service.getContextualTemplates(context);

      expect(result).toEqual(mockTemplates);
      expect(queryTemplatesService.getContextualTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          clientRef: '1A001',
          hasOverdueTasks: true,
          hasUpcomingDeadlines: true,
        })
      );
    });
  });

  describe('Snapshot Management', () => {
    it('should create snapshot', async () => {
      await service.createSnapshot();

      expect(fileStorageService.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('offline-snapshot.json'),
        expect.objectContaining({
          timestamp: expect.any(String),
          clients: mockClients,
          tasks: mockTasks,
          services: mockServices,
          compliance: mockCompliance,
        })
      );
    });

    it('should handle snapshot creation errors', async () => {
      fileStorageService.writeFile.mockRejectedValue(new Error('Write error'));

      // Should not throw, but log error
      await expect(service.createSnapshot()).resolves.toBeUndefined();
    });
  });

  describe('Cache Management', () => {
    it('should load cached responses on initialization', async () => {
      const cachedData = {
        responses: [
          {
            key: 'test-key',
            query: 'test query',
            response: 'test response',
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      };

      fileStorageService.readFile.mockResolvedValue(cachedData);

      // Create new service instance to test initialization
      const newService = new AssistService(
        configService,
        queryTemplatesService,
        fileStorageService,
        clientsService,
        tasksService,
        servicesService,
        complianceService,
      );

      expect(fileStorageService.readFile).toHaveBeenCalledWith(expect.stringContaining('cached-responses.json'));
    });

    it('should save cached responses', async () => {
      const prompt = 'test query';
      await service.processQuery(prompt);

      expect(fileStorageService.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('cached-responses.json'),
        expect.objectContaining({
          responses: expect.arrayContaining([
            expect.objectContaining({
              query: prompt,
              response: expect.any(String),
            }),
          ]),
        })
      );
    });
  });

  describe('Business Intelligence Methods', () => {
    it('should get business insights with recommendations', async () => {
      const result = await service.getBusinessInsightsWithRecommendations();

      expect(result).toContain('offline mode');
      expect(clientsService.findAll).toHaveBeenCalled();
      expect(servicesService.findAll).toHaveBeenCalled();
      expect(tasksService.findAll).toHaveBeenCalled();
      expect(complianceService.findAll).toHaveBeenCalled();
    });

    it('should get client risk assessment', async () => {
      const result = await service.getClientRiskAssessment();

      expect(result).toContain('offline mode');
      expect(clientsService.findAll).toHaveBeenCalled();
      expect(servicesService.findAll).toHaveBeenCalled();
      expect(tasksService.findAll).toHaveBeenCalled();
      expect(complianceService.findAll).toHaveBeenCalled();
    });
  });
});