import { Test, TestingModule } from '@nestjs/testing';
import { AssistController } from './assist.controller';
import { AssistService } from './assist.service';
import { ServerLifecycleService } from './server-lifecycle.service';

describe('AssistController', () => {
  let controller: AssistController;
  let assistService: jest.Mocked<AssistService>;
  let serverLifecycleService: jest.Mocked<ServerLifecycleService>;

  const mockAssistService = {
    processQuery: jest.fn(),
    getClientSummary: jest.fn(),
    checkDeadlines: jest.fn(),
    getPriorityTasks: jest.fn(),
    getBusinessInsights: jest.fn(),
    createSnapshot: jest.fn(),
    getStatus: jest.fn(),
    getQueryTemplates: jest.fn(),
    getQueryTemplatesByCategory: jest.fn(),
    getQuickActions: jest.fn(),
    searchQueryTemplates: jest.fn(),
    getContextualTemplates: jest.fn(),
    processTemplateQuery: jest.fn(),
    getBusinessInsightsWithRecommendations: jest.fn(),
    getClientRiskAssessment: jest.fn(),
  };

  const mockServerLifecycleService = {
    getServerStatus: jest.fn(),
    startDockerServices: jest.fn(),
    stopDockerServices: jest.fn(),
    restartDockerServices: jest.fn(),
    createSnapshot: jest.fn(),
    loadSnapshot: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistController],
      providers: [
        { provide: AssistService, useValue: mockAssistService },
        { provide: ServerLifecycleService, useValue: mockServerLifecycleService },
      ],
    }).compile();

    controller = module.get<AssistController>(AssistController);
    assistService = module.get(AssistService);
    serverLifecycleService = module.get(ServerLifecycleService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('Query Endpoints', () => {
    it('should process general query', async () => {
      const mockResponse = 'This is a test response';
      const mockStatus = { online: true, mode: 'Online', provider: 'OpenAI' };
      
      assistService.processQuery.mockResolvedValue(mockResponse);
      assistService.getStatus.mockReturnValue(mockStatus);

      const body = {
        prompt: 'What are my tasks?',
        context: { includeTasks: true },
      };

      const result = await controller.query(body);

      expect(assistService.processQuery).toHaveBeenCalledWith(body.prompt, body.context);
      expect(result).toEqual({
        query: body.prompt,
        response: mockResponse,
        timestamp: expect.any(String),
        mode: 'Online',
      });
    });

    it('should get client summary', async () => {
      const mockResponse = 'Client summary response';
      const mockStatus = { online: true, mode: 'Online', provider: 'OpenAI' };
      
      assistService.getClientSummary.mockResolvedValue(mockResponse);
      assistService.getStatus.mockReturnValue(mockStatus);

      const body = { clientRef: '1A001' };
      const result = await controller.getClientSummary(body);

      expect(assistService.getClientSummary).toHaveBeenCalledWith(body.clientRef);
      expect(result).toEqual({
        clientRef: body.clientRef,
        response: mockResponse,
        timestamp: expect.any(String),
        mode: 'Online',
      });
    });

    it('should check deadlines', async () => {
      const mockResponse = 'Deadline check response';
      const mockStatus = { online: true, mode: 'Online', provider: 'OpenAI' };
      
      assistService.checkDeadlines.mockResolvedValue(mockResponse);
      assistService.getStatus.mockReturnValue(mockStatus);

      const body = { daysAhead: 30 };
      const result = await controller.checkDeadlines(body);

      expect(assistService.checkDeadlines).toHaveBeenCalledWith(30);
      expect(result).toEqual({
        daysAhead: 30,
        response: mockResponse,
        timestamp: expect.any(String),
        mode: 'Online',
      });
    });

    it('should check deadlines with default days', async () => {
      const mockResponse = 'Deadline check response';
      assistService.checkDeadlines.mockResolvedValue(mockResponse);

      const body = {};
      await controller.checkDeadlines(body);

      expect(assistService.checkDeadlines).toHaveBeenCalledWith(30);
    });

    it('should get priority tasks', async () => {
      const mockResponse = 'Priority tasks response';
      const mockStatus = { online: true, mode: 'Online', provider: 'OpenAI' };
      
      assistService.getPriorityTasks.mockResolvedValue(mockResponse);
      assistService.getStatus.mockReturnValue(mockStatus);

      const body = { userId: 'user_123' };
      const result = await controller.getPriorityTasks(body);

      expect(assistService.getPriorityTasks).toHaveBeenCalledWith(body.userId);
      expect(result).toEqual({
        userId: body.userId,
        response: mockResponse,
        timestamp: expect.any(String),
        mode: 'Online',
      });
    });

    it('should get business insights', async () => {
      const mockResponse = 'Business insights response';
      const mockStatus = { online: true, mode: 'Online', provider: 'OpenAI' };
      
      assistService.getBusinessInsights.mockResolvedValue(mockResponse);
      assistService.getStatus.mockReturnValue(mockStatus);

      const body = { portfolioCode: 1 };
      const result = await controller.getBusinessInsights(body);

      expect(assistService.getBusinessInsights).toHaveBeenCalledWith(body.portfolioCode);
      expect(result).toEqual({
        portfolioCode: body.portfolioCode,
        response: mockResponse,
        timestamp: expect.any(String),
        mode: 'Online',
      });
    });
  });

  describe('Server Management Endpoints', () => {
    it('should get server status', async () => {
      const mockStatus = {
        isOnline: true,
        mode: 'hybrid',
        services: { api: { status: 'running' } },
      };
      
      serverLifecycleService.getServerStatus.mockResolvedValue(mockStatus as any);

      const result = await controller.getServerStatus();

      expect(serverLifecycleService.getServerStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });

    it('should start Docker services', async () => {
      const mockResult = { success: true, message: 'Services started' };
      serverLifecycleService.startDockerServices.mockResolvedValue(mockResult);

      const result = await controller.startDockerServices();

      expect(serverLifecycleService.startDockerServices).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should stop Docker services', async () => {
      const mockResult = { success: true, message: 'Services stopped' };
      serverLifecycleService.stopDockerServices.mockResolvedValue(mockResult);

      const result = await controller.stopDockerServices();

      expect(serverLifecycleService.stopDockerServices).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should restart Docker services', async () => {
      const mockResult = { success: true, message: 'Services restarted' };
      serverLifecycleService.restartDockerServices.mockResolvedValue(mockResult);

      const result = await controller.restartDockerServices();

      expect(serverLifecycleService.restartDockerServices).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should create snapshot', async () => {
      serverLifecycleService.createSnapshot.mockResolvedValue({
        success: true,
        message: 'Snapshot created',
        path: './snapshot.json',
      });

      const result = await controller.createSnapshot();

      expect(serverLifecycleService.createSnapshot).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Snapshot created',
        path: './snapshot.json',
      });
    });

    it('should load snapshot', async () => {
      const mockResult = {
        success: true,
        message: 'Snapshot loaded',
        data: { test: true },
      };
      serverLifecycleService.loadSnapshot.mockResolvedValue(mockResult);

      const result = await controller.loadSnapshot();

      expect(serverLifecycleService.loadSnapshot).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });

    it('should load snapshot with custom path', async () => {
      const customPath = './custom-snapshot.json';
      const mockResult = {
        success: true,
        message: 'Snapshot loaded',
        data: { test: true },
      };
      serverLifecycleService.loadSnapshot.mockResolvedValue(mockResult);

      const result = await controller.loadSnapshot(customPath);

      expect(serverLifecycleService.loadSnapshot).toHaveBeenCalledWith(customPath);
      expect(result).toEqual(mockResult);
    });
  });

  describe('Template Endpoints', () => {
    it('should get all query templates', () => {
      const mockTemplates = [
        { id: 'template1', title: 'Template 1' },
        { id: 'template2', title: 'Template 2' },
      ];
      assistService.getQueryTemplates.mockReturnValue(mockTemplates as any);

      const result = controller.getQueryTemplates();

      expect(assistService.getQueryTemplates).toHaveBeenCalled();
      expect(result).toEqual({
        templates: mockTemplates,
        timestamp: expect.any(String),
      });
    });

    it('should get query templates by category', () => {
      const category = 'client';
      const mockTemplates = [
        { id: 'client-template', category: 'client', title: 'Client Template' },
      ];
      assistService.getQueryTemplatesByCategory.mockReturnValue(mockTemplates as any);

      const result = controller.getQueryTemplatesByCategory(category);

      expect(assistService.getQueryTemplatesByCategory).toHaveBeenCalledWith(category);
      expect(result).toEqual({
        templates: mockTemplates,
        category,
        timestamp: expect.any(String),
      });
    });

    it('should get quick actions', () => {
      const mockQuickActions = [
        { id: 'action1', label: 'Quick Action 1' },
        { id: 'action2', label: 'Quick Action 2' },
      ];
      assistService.getQuickActions.mockReturnValue(mockQuickActions as any);

      const result = controller.getQuickActions();

      expect(assistService.getQuickActions).toHaveBeenCalled();
      expect(result).toEqual({
        quickActions: mockQuickActions,
        timestamp: expect.any(String),
      });
    });

    it('should search query templates', () => {
      const query = 'client';
      const mockTemplates = [
        { id: 'client-template', title: 'Client Template' },
      ];
      assistService.searchQueryTemplates.mockReturnValue(mockTemplates as any);

      const result = controller.searchQueryTemplates(query);

      expect(assistService.searchQueryTemplates).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        templates: mockTemplates,
        query,
        timestamp: expect.any(String),
      });
    });

    it('should get contextual templates', async () => {
      const body = { clientRef: '1A001', userId: 'user_123' };
      const mockTemplates = [
        { id: 'contextual-template', title: 'Contextual Template' },
      ];
      assistService.getContextualTemplates.mockResolvedValue(mockTemplates as any);

      const result = await controller.getContextualTemplates(body);

      expect(assistService.getContextualTemplates).toHaveBeenCalledWith(body);
      expect(result).toEqual({
        templates: mockTemplates,
        context: body,
        timestamp: expect.any(String),
      });
    });

    it('should execute template', async () => {
      const body = {
        templateId: 'client-summary',
        context: { clientRef: '1A001' },
      };
      const mockResponse = 'Template execution response';
      const mockStatus = { online: true, mode: 'Online', provider: 'OpenAI' };
      
      assistService.processTemplateQuery.mockResolvedValue(mockResponse);
      assistService.getStatus.mockReturnValue(mockStatus);

      const result = await controller.executeTemplate(body);

      expect(assistService.processTemplateQuery).toHaveBeenCalledWith(body.templateId, body.context);
      expect(result).toEqual({
        templateId: body.templateId,
        context: body.context,
        response: mockResponse,
        timestamp: expect.any(String),
        mode: 'Online',
      });
    });
  });

  describe('Business Intelligence Endpoints', () => {
    it('should get business insights with recommendations', async () => {
      const mockResponse = 'Comprehensive business insights';
      const mockStatus = { online: true, mode: 'Online', provider: 'OpenAI' };
      
      assistService.getBusinessInsightsWithRecommendations.mockResolvedValue(mockResponse);
      assistService.getStatus.mockReturnValue(mockStatus);

      const result = await controller.getBusinessInsightsWithRecommendations();

      expect(assistService.getBusinessInsightsWithRecommendations).toHaveBeenCalled();
      expect(result).toEqual({
        response: mockResponse,
        timestamp: expect.any(String),
        mode: 'Online',
      });
    });

    it('should get client risk assessment', async () => {
      const mockResponse = 'Client risk assessment results';
      const mockStatus = { online: true, mode: 'Online', provider: 'OpenAI' };
      
      assistService.getClientRiskAssessment.mockResolvedValue(mockResponse);
      assistService.getStatus.mockReturnValue(mockStatus);

      const result = await controller.getClientRiskAssessment();

      expect(assistService.getClientRiskAssessment).toHaveBeenCalled();
      expect(result).toEqual({
        response: mockResponse,
        timestamp: expect.any(String),
        mode: 'Online',
      });
    });
  });

  describe('Status Endpoint', () => {
    it('should get assist status', () => {
      const mockStatus = {
        online: true,
        mode: 'Online',
        provider: 'OpenAI',
      };
      assistService.getStatus.mockReturnValue(mockStatus);

      const result = controller.getStatus();

      expect(assistService.getStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors in query processing', async () => {
      assistService.processQuery.mockRejectedValue(new Error('Service error'));

      const body = { prompt: 'test query' };

      await expect(controller.query(body)).rejects.toThrow('Service error');
    });

    it('should handle service errors in template execution', async () => {
      assistService.processTemplateQuery.mockRejectedValue(new Error('Template error'));

      const body = { templateId: 'invalid-template' };

      await expect(controller.executeTemplate(body)).rejects.toThrow('Template error');
    });

    it('should handle server lifecycle errors', async () => {
      serverLifecycleService.startDockerServices.mockRejectedValue(new Error('Docker error'));

      await expect(controller.startDockerServices()).rejects.toThrow('Docker error');
    });
  });
});