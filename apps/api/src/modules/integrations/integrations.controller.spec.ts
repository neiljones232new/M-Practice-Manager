import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from './integrations.controller';
import { IntegrationConfigService } from './services/integration-config.service';
import { IntegrationHealthService } from './services/integration-health.service';
import { IntegrationMonitoringService } from './services/integration-monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  IntegrationConfig,
  CreateIntegrationConfigDto,
  UpdateIntegrationConfigDto,
  PracticeSettings,
} from './interfaces/integration.interface';

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let configService: jest.Mocked<IntegrationConfigService>;
  let healthService: jest.Mocked<IntegrationHealthService>;
  let monitoringService: jest.Mocked<IntegrationMonitoringService>;

  const mockIntegration: IntegrationConfig = {
    id: 'test-id-1',
    name: 'Test OpenAI',
    type: 'OPENAI',
    enabled: true,
    apiKey: '[ENCRYPTED]',
    settings: { model: 'gpt-4' },
    status: 'CONNECTED',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPracticeSettings: PracticeSettings = {
    id: 'practice-1',
    practiceName: 'Test Practice',
    defaultPortfolioCode: 1,
    portfolios: [
      {
        code: 1,
        name: 'Main Portfolio',
        enabled: true,
        clientCount: 5,
      },
    ],
    systemSettings: {
      backupRetentionDays: 30,
      autoBackupEnabled: true,
      auditLogRetentionDays: 365,
      defaultServiceFrequency: 'ANNUAL',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockConfigService = {
      getIntegrations: jest.fn(),
      getIntegrationById: jest.fn(),
      getIntegrationByType: jest.fn(),
      createIntegration: jest.fn(),
      updateIntegration: jest.fn(),
      deleteIntegration: jest.fn(),
      getPracticeSettings: jest.fn(),
      updatePracticeSettings: jest.fn(),
    };

    const mockHealthService = {
      testIntegration: jest.fn(),
      testAllIntegrations: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const mockMonitoringService = {
      getUsageStatistics: jest.fn(),
      getHealthDashboard: jest.fn(),
      checkRateLimit: jest.fn(),
      cleanup: jest.fn(),
      isIntegrationHealthy: jest.fn(),
      getIntegrationAvailability: jest.fn(),
      getFallbackResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: IntegrationConfigService,
          useValue: mockConfigService,
        },
        {
          provide: IntegrationHealthService,
          useValue: mockHealthService,
        },
        {
          provide: IntegrationMonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
    configService = module.get(IntegrationConfigService);
    healthService = module.get(IntegrationHealthService);
    monitoringService = module.get(IntegrationMonitoringService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getIntegrations', () => {
    it('should return all integrations', async () => {
      const integrations = [mockIntegration];
      configService.getIntegrations.mockResolvedValue(integrations);

      const result = await controller.getIntegrations();

      expect(result).toEqual(integrations);
      expect(configService.getIntegrations).toHaveBeenCalled();
    });
  });

  describe('getIntegrationById', () => {
    it('should return integration by ID', async () => {
      configService.getIntegrationById.mockResolvedValue(mockIntegration);

      const result = await controller.getIntegrationById('test-id-1');

      expect(result).toEqual(mockIntegration);
      expect(configService.getIntegrationById).toHaveBeenCalledWith('test-id-1');
    });
  });

  describe('createIntegration', () => {
    it('should create new integration', async () => {
      const dto: CreateIntegrationConfigDto = {
        name: 'New Integration',
        type: 'HMRC',
        apiKey: 'test-api-key',
      };

      configService.createIntegration.mockResolvedValue(mockIntegration);

      const result = await controller.createIntegration(dto);

      expect(result).toEqual(mockIntegration);
      expect(configService.createIntegration).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateIntegration', () => {
    it('should update existing integration', async () => {
      const dto: UpdateIntegrationConfigDto = {
        name: 'Updated Integration',
        enabled: false,
      };

      const updatedIntegration = { ...mockIntegration, ...dto };
      configService.updateIntegration.mockResolvedValue(updatedIntegration);

      const result = await controller.updateIntegration('test-id-1', dto);

      expect(result).toEqual(updatedIntegration);
      expect(configService.updateIntegration).toHaveBeenCalledWith('test-id-1', dto);
    });
  });

  describe('deleteIntegration', () => {
    it('should delete integration', async () => {
      configService.deleteIntegration.mockResolvedValue(undefined);

      await controller.deleteIntegration('test-id-1');

      expect(configService.deleteIntegration).toHaveBeenCalledWith('test-id-1');
    });
  });

  describe('testIntegration', () => {
    it('should test integration connection', async () => {
      const testResult = {
        success: true,
        responseTime: 250,
        details: { statusCode: 200 },
      };

      healthService.testIntegration.mockResolvedValue(testResult);

      const result = await controller.testIntegration('test-id-1');

      expect(result).toEqual(testResult);
      expect(healthService.testIntegration).toHaveBeenCalledWith('test-id-1');
    });
  });

  describe('testAllIntegrations', () => {
    it('should test all integrations', async () => {
      const testResults = [
        { success: true, responseTime: 250 },
        { success: false, responseTime: 0, error: 'Connection failed' },
      ];

      healthService.testAllIntegrations.mockResolvedValue(testResults);

      const result = await controller.testAllIntegrations();

      expect(result).toEqual(testResults);
      expect(healthService.testAllIntegrations).toHaveBeenCalled();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status for all integrations', async () => {
      const healthStatus = [
        {
          id: 'test-id-1',
          name: 'OpenAI',
          type: 'OPENAI',
          status: 'CONNECTED' as const,
        },
      ];

      healthService.getHealthStatus.mockResolvedValue(healthStatus);

      const result = await controller.getHealthStatus();

      expect(result).toEqual(healthStatus);
      expect(healthService.getHealthStatus).toHaveBeenCalled();
    });
  });

  describe('getPracticeSettings', () => {
    it('should return practice settings', async () => {
      configService.getPracticeSettings.mockResolvedValue(mockPracticeSettings);

      const result = await controller.getPracticeSettings();

      expect(result).toEqual(mockPracticeSettings);
      expect(configService.getPracticeSettings).toHaveBeenCalled();
    });
  });

  describe('updatePracticeSettings', () => {
    it('should update practice settings', async () => {
      const dto = {
        practiceName: 'Updated Practice',
        practiceEmail: 'test@example.com',
      };

      const updatedSettings = { ...mockPracticeSettings, ...dto };
      configService.updatePracticeSettings.mockResolvedValue(updatedSettings);

      const result = await controller.updatePracticeSettings(dto);

      expect(result).toEqual(updatedSettings);
      expect(configService.updatePracticeSettings).toHaveBeenCalledWith(dto);
    });
  });

  describe('getIntegrationByType', () => {
    it('should return integration by type', async () => {
      configService.getIntegrationByType.mockResolvedValue(mockIntegration);

      const result = await controller.getIntegrationByType('OPENAI');

      expect(result).toEqual(mockIntegration);
      expect(configService.getIntegrationByType).toHaveBeenCalledWith('OPENAI');
    });

    it('should return null for non-existent type', async () => {
      configService.getIntegrationByType.mockResolvedValue(null);

      const result = await controller.getIntegrationByType('NON_EXISTENT');

      expect(result).toBeNull();
      expect(configService.getIntegrationByType).toHaveBeenCalledWith('NON_EXISTENT');
    });
  });

  describe('toggleIntegration', () => {
    it('should toggle integration enabled status', async () => {
      const disabledIntegration = { ...mockIntegration, enabled: false };
      
      configService.getIntegrationById.mockResolvedValue(mockIntegration);
      configService.updateIntegration.mockResolvedValue(disabledIntegration);

      const result = await controller.toggleIntegration('test-id-1');

      expect(result).toEqual(disabledIntegration);
      expect(configService.updateIntegration).toHaveBeenCalledWith('test-id-1', {
        enabled: false,
      });
    });
  });

  describe('getIntegrationUsage', () => {
    it('should return integration usage statistics', async () => {
      const usageMetrics = [
        {
          integrationId: 'test-id-1',
          integrationType: 'OPENAI',
          requestCount: 100,
          errorCount: 5,
          averageResponseTime: 250,
          rateLimitHits: 2,
          lastRequestTime: new Date(),
          dailyUsage: [],
        },
      ];

      configService.getIntegrationById.mockResolvedValue(mockIntegration);
      monitoringService.getUsageStatistics.mockResolvedValue(usageMetrics);

      const result = await controller.getIntegrationUsage('test-id-1');

      expect(result).toEqual({
        id: mockIntegration.id,
        name: mockIntegration.name,
        type: mockIntegration.type,
        rateLimit: mockIntegration.rateLimit,
        lastTested: mockIntegration.lastTested,
        status: mockIntegration.status,
        metrics: usageMetrics[0],
      });
    });
  });

  describe('getHealthDashboard', () => {
    it('should return health dashboard data', async () => {
      const dashboardData = {
        overallHealth: 'HEALTHY' as const,
        integrations: [],
        metrics: {
          totalRequests: 100,
          totalErrors: 5,
          averageResponseTime: 250,
          rateLimitHits: 2,
        },
        alerts: [],
      };

      monitoringService.getHealthDashboard.mockResolvedValue(dashboardData);

      const result = await controller.getHealthDashboard();

      expect(result).toEqual(dashboardData);
      expect(monitoringService.getHealthDashboard).toHaveBeenCalled();
    });
  });

  describe('getAllUsageStatistics', () => {
    it('should return usage statistics for all integrations', async () => {
      const usageStats = [
        {
          integrationId: 'test-id-1',
          integrationType: 'OPENAI',
          requestCount: 100,
          errorCount: 5,
          averageResponseTime: 250,
          rateLimitHits: 2,
          lastRequestTime: new Date(),
          dailyUsage: [],
        },
      ];

      monitoringService.getUsageStatistics.mockResolvedValue(usageStats);

      const result = await controller.getAllUsageStatistics();

      expect(result).toEqual(usageStats);
      expect(monitoringService.getUsageStatistics).toHaveBeenCalled();
    });
  });

  describe('checkRateLimit', () => {
    it('should return rate limit status', async () => {
      const rateLimitStatus = {
        allowed: true,
        remainingRequests: 50,
        resetTime: new Date(),
      };

      monitoringService.checkRateLimit.mockResolvedValue(rateLimitStatus);

      const result = await controller.checkRateLimit('OPENAI');

      expect(result).toEqual(rateLimitStatus);
      expect(monitoringService.checkRateLimit).toHaveBeenCalledWith('OPENAI');
    });
  });

  describe('cleanupMonitoringData', () => {
    it('should trigger monitoring data cleanup', async () => {
      monitoringService.cleanup.mockResolvedValue(undefined);

      await controller.cleanupMonitoringData();

      expect(monitoringService.cleanup).toHaveBeenCalled();
    });
  });

  describe('checkIntegrationHealth', () => {
    it('should return integration health status', async () => {
      const healthStatus = {
        healthy: true,
        status: 'CONNECTED',
        lastTested: new Date(),
      };

      monitoringService.isIntegrationHealthy.mockResolvedValue(healthStatus);

      const result = await controller.checkIntegrationHealth('OPENAI');

      expect(result).toEqual(healthStatus);
      expect(monitoringService.isIntegrationHealthy).toHaveBeenCalledWith('OPENAI');
    });
  });

  describe('getIntegrationAvailability', () => {
    it('should return integration availability with fallback info', async () => {
      const availability = {
        available: true,
        mode: 'LIVE' as const,
        details: {
          status: 'CONNECTED',
          fallbackAvailable: true,
          fallbackAge: 5,
        },
      };

      monitoringService.getIntegrationAvailability.mockResolvedValue(availability);

      const result = await controller.getIntegrationAvailability('OPENAI');

      expect(result).toEqual(availability);
      expect(monitoringService.getIntegrationAvailability).toHaveBeenCalledWith('OPENAI');
    });
  });

  describe('getFallbackData', () => {
    it('should return fallback data when available', async () => {
      const fallbackData = { cached: 'response' };
      monitoringService.getFallbackResponse.mockResolvedValue(fallbackData);

      const result = await controller.getFallbackData('OPENAI');

      expect(result).toEqual({
        available: true,
        data: fallbackData,
      });
      expect(monitoringService.getFallbackResponse).toHaveBeenCalledWith('OPENAI');
    });

    it('should return unavailable when no fallback data exists', async () => {
      monitoringService.getFallbackResponse.mockResolvedValue(null);

      const result = await controller.getFallbackData('OPENAI');

      expect(result).toEqual({
        available: false,
        data: null,
      });
    });
  });
});