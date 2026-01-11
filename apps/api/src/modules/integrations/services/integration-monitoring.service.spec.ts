import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationMonitoringService } from './integration-monitoring.service';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationHealthService } from './integration-health.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { IntegrationConfig } from '../interfaces/integration.interface';

describe('IntegrationMonitoringService', () => {
  let service: IntegrationMonitoringService;
  let configService: jest.Mocked<IntegrationConfigService>;
  let healthService: jest.Mocked<IntegrationHealthService>;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const mockIntegration: IntegrationConfig = {
    id: 'test-id-1',
    name: 'Test OpenAI',
    type: 'OPENAI',
    enabled: true,
    settings: {},
    status: 'CONNECTED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsageMetrics = [
    {
      integrationId: 'test-id-1',
      integrationType: 'OPENAI',
      requestCount: 100,
      errorCount: 5,
      lastRequestTime: new Date(),
      averageResponseTime: 250,
      rateLimitHits: 2,
      dailyUsage: [
        { date: '2024-01-01', requests: 50, errors: 2 },
        { date: '2024-01-02', requests: 50, errors: 3 },
      ],
    },
  ];

  beforeEach(async () => {
    const mockConfigService = {
      getIntegrations: jest.fn(),
      getIntegrationByType: jest.fn(),
      updateIntegration: jest.fn(),
    };

    const mockHealthService = {
      testIntegration: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const mockFileStorageService = {
      readJson: jest.fn(),
      writeJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationMonitoringService,
        {
          provide: IntegrationConfigService,
          useValue: mockConfigService,
        },
        {
          provide: IntegrationHealthService,
          useValue: mockHealthService,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    service = module.get<IntegrationMonitoringService>(IntegrationMonitoringService);
    configService = module.get(IntegrationConfigService);
    healthService = module.get(IntegrationHealthService);
    fileStorageService = module.get(FileStorageService);
  });

  afterEach(() => {
    service.stopHealthMonitoring();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordUsage', () => {
    it('should record usage metrics for existing integration', async () => {
      fileStorageService.readJson.mockResolvedValue(mockUsageMetrics);
      fileStorageService.writeJson.mockResolvedValue(undefined);
      configService.getIntegrationByType.mockResolvedValue(mockIntegration);

      await service.recordUsage('OPENAI', 300, true);

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'monitoring',
        'usage-metrics',
        expect.arrayContaining([
          expect.objectContaining({
            integrationId: 'test-id-1',
            requestCount: 101,
            errorCount: 5,
            averageResponseTime: expect.any(Number),
          }),
        ])
      );
    });

    it('should create new metrics for new integration', async () => {
      fileStorageService.readJson.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);
      configService.getIntegrationByType.mockResolvedValue(mockIntegration);

      await service.recordUsage('OPENAI', 200, true);

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'monitoring',
        'usage-metrics',
        expect.arrayContaining([
          expect.objectContaining({
            integrationId: 'test-id-1',
            integrationType: 'OPENAI',
            requestCount: 1,
            errorCount: 0,
          }),
        ])
      );
    });

    it('should increment error count for failed requests', async () => {
      fileStorageService.readJson.mockResolvedValue(mockUsageMetrics);
      fileStorageService.writeJson.mockResolvedValue(undefined);
      configService.getIntegrationByType.mockResolvedValue(mockIntegration);

      await service.recordUsage('OPENAI', 500, false);

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'monitoring',
        'usage-metrics',
        expect.arrayContaining([
          expect.objectContaining({
            integrationId: 'test-id-1',
            requestCount: 101,
            errorCount: 6,
          }),
        ])
      );
    });

    it('should handle missing integration gracefully', async () => {
      configService.getIntegrationByType.mockResolvedValue(null);

      await expect(service.recordUsage('NON_EXISTENT', 200, true)).resolves.not.toThrow();
    });

    it('should handle file storage errors gracefully', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('Storage error'));

      await expect(service.recordUsage('OPENAI', 200, true)).resolves.not.toThrow();
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const integrationWithRateLimit = {
        ...mockIntegration,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerDay: 1000,
          currentUsage: 50,
          resetTime: new Date(Date.now() + 60000),
        },
      };

      configService.getIntegrationByType.mockResolvedValue(integrationWithRateLimit);
      fileStorageService.readJson.mockResolvedValue(mockUsageMetrics);

      const result = await service.checkRateLimit('OPENAI');

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(50);
    });

    it('should deny requests over rate limit', async () => {
      const integrationWithRateLimit = {
        ...mockIntegration,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerDay: 1000,
          currentUsage: 100,
          resetTime: new Date(Date.now() + 60000),
        },
      };

      configService.getIntegrationByType.mockResolvedValue(integrationWithRateLimit);
      fileStorageService.readJson.mockResolvedValue(mockUsageMetrics);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.checkRateLimit('OPENAI');

      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
    });

    it('should reset rate limit after time expires', async () => {
      const integrationWithRateLimit = {
        ...mockIntegration,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerDay: 1000,
          currentUsage: 100,
          resetTime: new Date(Date.now() - 1000), // Expired
        },
      };

      configService.getIntegrationByType.mockResolvedValue(integrationWithRateLimit);
      configService.updateIntegration.mockResolvedValue(integrationWithRateLimit);
      fileStorageService.readJson.mockResolvedValue(mockUsageMetrics);

      const result = await service.checkRateLimit('OPENAI');

      expect(result.allowed).toBe(true);
      expect(configService.updateIntegration).toHaveBeenCalledWith(
        'test-id-1',
        expect.objectContaining({
          settings: expect.objectContaining({
            rateLimit: expect.objectContaining({
              currentUsage: 0,
            }),
          }),
        })
      );
    });

    it('should allow unlimited requests for integrations without rate limits', async () => {
      configService.getIntegrationByType.mockResolvedValue(mockIntegration);

      const result = await service.checkRateLimit('OPENAI');

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(Infinity);
    });
  });

  describe('storeFallbackData', () => {
    it('should store fallback data with expiration', async () => {
      configService.getIntegrationByType.mockResolvedValue(mockIntegration);
      fileStorageService.readJson.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const testData = { result: 'test response' };
      await service.storeFallbackData('OPENAI', testData, 30);

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'monitoring',
        'fallback-data',
        expect.arrayContaining([
          expect.objectContaining({
            integrationId: 'test-id-1',
            integrationType: 'OPENAI',
            lastSuccessfulResponse: testData,
            expiresAt: expect.any(Date),
          }),
        ])
      );
    });

    it('should update existing fallback data', async () => {
      const existingFallback = [
        {
          integrationId: 'test-id-1',
          integrationType: 'OPENAI',
          lastSuccessfulResponse: { old: 'data' },
          cachedAt: new Date(),
          expiresAt: new Date(),
        },
      ];

      configService.getIntegrationByType.mockResolvedValue(mockIntegration);
      fileStorageService.readJson.mockResolvedValue(existingFallback);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const newData = { new: 'data' };
      await service.storeFallbackData('OPENAI', newData);

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'monitoring',
        'fallback-data',
        expect.arrayContaining([
          expect.objectContaining({
            integrationId: 'test-id-1',
            lastSuccessfulResponse: newData,
          }),
        ])
      );
    });
  });

  describe('getFallbackResponse', () => {
    it('should return valid fallback data', async () => {
      const fallbackData = [
        {
          integrationId: 'test-id-1',
          integrationType: 'OPENAI',
          lastSuccessfulResponse: { cached: 'response' },
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 60000), // Valid for 1 minute
        },
      ];

      configService.getIntegrationByType.mockResolvedValue(mockIntegration);
      fileStorageService.readJson.mockResolvedValue(fallbackData);

      const result = await service.getFallbackResponse('OPENAI');

      expect(result).toEqual({ cached: 'response' });
    });

    it('should return null for expired fallback data', async () => {
      const fallbackData = [
        {
          integrationId: 'test-id-1',
          integrationType: 'OPENAI',
          lastSuccessfulResponse: { cached: 'response' },
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      ];

      configService.getIntegrationByType.mockResolvedValue(mockIntegration);
      fileStorageService.readJson.mockResolvedValue(fallbackData);

      const result = await service.getFallbackResponse('OPENAI');

      expect(result).toBeNull();
    });

    it('should return null for missing fallback data', async () => {
      configService.getIntegrationByType.mockResolvedValue(mockIntegration);
      fileStorageService.readJson.mockResolvedValue([]);

      const result = await service.getFallbackResponse('OPENAI');

      expect(result).toBeNull();
    });
  });

  describe('getHealthDashboard', () => {
    it('should return comprehensive health dashboard', async () => {
      const healthStatus = [
        {
          id: 'test-id-1',
          name: 'OpenAI',
          type: 'OPENAI',
          status: 'CONNECTED' as const,
        },
        {
          id: 'test-id-2',
          name: 'Companies House',
          type: 'COMPANIES_HOUSE',
          status: 'ERROR' as const,
          error: 'Connection failed',
        },
      ];

      healthService.getHealthStatus.mockResolvedValue(healthStatus);
      fileStorageService.readJson.mockResolvedValue(mockUsageMetrics);

      const result = await service.getHealthDashboard();

      expect(result.overallHealth).toBeDefined();
      expect(result.integrations).toEqual(healthStatus);
      expect(result.metrics).toEqual({
        totalRequests: 100,
        totalErrors: 5,
        averageResponseTime: 250,
        rateLimitHits: 2,
      });
      expect(result.alerts).toBeDefined();
    });

    it('should determine overall health as CRITICAL for high error rate', async () => {
      const healthStatus = [
        {
          id: 'test-id-1',
          name: 'OpenAI',
          type: 'OPENAI',
          status: 'CONNECTED' as const,
        },
      ];

      const highErrorMetrics = [
        {
          ...mockUsageMetrics[0],
          requestCount: 100,
          errorCount: 15, // 15% error rate
        },
      ];

      healthService.getHealthStatus.mockResolvedValue(healthStatus);
      fileStorageService.readJson.mockResolvedValue(highErrorMetrics);

      const result = await service.getHealthDashboard();

      expect(result.overallHealth).toBe('CRITICAL');
    });

    it('should generate alerts for high error rates', async () => {
      const healthStatus = [
        {
          id: 'test-id-1',
          name: 'OpenAI',
          type: 'OPENAI',
          status: 'CONNECTED' as const,
        },
      ];

      const highErrorMetrics = [
        {
          ...mockUsageMetrics[0],
          requestCount: 100,
          errorCount: 8, // 8% error rate
        },
      ];

      healthService.getHealthStatus.mockResolvedValue(healthStatus);
      fileStorageService.readJson.mockResolvedValue(highErrorMetrics);

      const result = await service.getHealthDashboard();

      expect(result.alerts).toContainEqual(
        expect.objectContaining({
          type: 'WARNING',
          message: expect.stringContaining('Elevated error rate (8.0%)'),
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should remove expired fallback data', async () => {
      const fallbackData = [
        {
          integrationId: 'test-id-1',
          integrationType: 'OPENAI',
          lastSuccessfulResponse: { valid: 'data' },
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 60000), // Valid
        },
        {
          integrationId: 'test-id-2',
          integrationType: 'COMPANIES_HOUSE',
          lastSuccessfulResponse: { expired: 'data' },
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      ];

      fileStorageService.readJson
        .mockResolvedValueOnce(mockUsageMetrics)
        .mockResolvedValueOnce(fallbackData);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.cleanup();

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'monitoring',
        'fallback-data',
        expect.arrayContaining([
          expect.objectContaining({
            integrationId: 'test-id-1',
          }),
        ])
      );

      // Should not contain the expired entry
      const writtenData = fileStorageService.writeJson.mock.calls[0][2] as any[];
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].integrationId).toBe('test-id-1');
    });
  });

  describe('handleIntegrationFailure', () => {
    it('should return fallback data when available', async () => {
      const fallbackData = { cached: 'response' };
      const error = new Error('Connection failed');

      configService.getIntegrationByType.mockResolvedValue(mockIntegration);
      fileStorageService.readJson.mockResolvedValue([
        {
          integrationId: 'test-id-1',
          integrationType: 'OPENAI',
          lastSuccessfulResponse: fallbackData,
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 60000),
        },
      ]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.handleIntegrationFailure('OPENAI', error);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fallbackData);
      expect(result.usingFallback).toBe(true);
      expect(result.error).toBe('Connection failed');
    });

    it('should return failure when no fallback available', async () => {
      const error = new Error('Connection failed');

      configService.getIntegrationByType.mockResolvedValue(mockIntegration);
      fileStorageService.readJson.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.handleIntegrationFailure('OPENAI', error);

      expect(result.success).toBe(false);
      expect(result.usingFallback).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('isIntegrationHealthy', () => {
    it('should return healthy status for connected integration', async () => {
      const healthyIntegration = {
        ...mockIntegration,
        status: 'CONNECTED' as const,
        lastTested: new Date(),
      };

      configService.getIntegrationByType.mockResolvedValue(healthyIntegration);
      fileStorageService.readJson.mockResolvedValue(mockUsageMetrics);

      const result = await service.isIntegrationHealthy('OPENAI');

      expect(result.healthy).toBe(true);
      expect(result.status).toBe('CONNECTED');
      expect(result.lastTested).toBeDefined();
    });

    it('should return unhealthy for disabled integration', async () => {
      const disabledIntegration = {
        ...mockIntegration,
        enabled: false,
      };

      configService.getIntegrationByType.mockResolvedValue(disabledIntegration);

      const result = await service.isIntegrationHealthy('OPENAI');

      expect(result.healthy).toBe(false);
      expect(result.status).toBe('DISABLED');
    });

    it('should return unhealthy for non-configured integration', async () => {
      configService.getIntegrationByType.mockResolvedValue(null);

      const result = await service.isIntegrationHealthy('NON_EXISTENT');

      expect(result.healthy).toBe(false);
      expect(result.status).toBe('NOT_CONFIGURED');
    });

    it('should return unhealthy for rate limited integration', async () => {
      const rateLimitedIntegration = {
        ...mockIntegration,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerDay: 1000,
          currentUsage: 100,
          resetTime: new Date(Date.now() + 60000),
        },
      };

      configService.getIntegrationByType.mockResolvedValue(rateLimitedIntegration);
      configService.updateIntegration.mockResolvedValue(rateLimitedIntegration);
      fileStorageService.readJson.mockResolvedValue(mockUsageMetrics);

      const result = await service.isIntegrationHealthy('OPENAI');

      expect(result.healthy).toBe(false);
      expect(result.status).toBe('RATE_LIMITED');
      expect(result.error).toContain('Rate limit exceeded');
    });
  });

  describe('getIntegrationAvailability', () => {
    it('should return LIVE mode for healthy integration', async () => {
      const healthyIntegration = {
        ...mockIntegration,
        status: 'CONNECTED' as const,
      };

      configService.getIntegrationByType.mockResolvedValue(healthyIntegration);
      fileStorageService.readJson.mockResolvedValue([]);

      const result = await service.getIntegrationAvailability('OPENAI');

      expect(result.available).toBe(true);
      expect(result.mode).toBe('LIVE');
      expect(result.details.status).toBe('CONNECTED');
      expect(result.details.fallbackAvailable).toBe(false);
    });

    it('should return FALLBACK mode for unhealthy integration with fallback', async () => {
      const unhealthyIntegration = {
        ...mockIntegration,
        status: 'ERROR' as const,
        lastError: 'Connection failed',
      };

      const fallbackData = [
        {
          integrationId: 'test-id-1',
          integrationType: 'OPENAI',
          lastSuccessfulResponse: { cached: 'data' },
          cachedAt: new Date(Date.now() - 300000), // 5 minutes ago
          expiresAt: new Date(Date.now() + 60000),
        },
      ];

      configService.getIntegrationByType.mockResolvedValue(unhealthyIntegration);
      fileStorageService.readJson.mockResolvedValue(fallbackData);

      const result = await service.getIntegrationAvailability('OPENAI');

      expect(result.available).toBe(true);
      expect(result.mode).toBe('FALLBACK');
      expect(result.details.status).toBe('ERROR');
      expect(result.details.fallbackAvailable).toBe(true);
      expect(result.details.fallbackAge).toBe(5);
    });

    it('should return UNAVAILABLE mode for unhealthy integration without fallback', async () => {
      const unhealthyIntegration = {
        ...mockIntegration,
        status: 'ERROR' as const,
        lastError: 'Connection failed',
      };

      configService.getIntegrationByType.mockResolvedValue(unhealthyIntegration);
      fileStorageService.readJson.mockResolvedValue([]);

      const result = await service.getIntegrationAvailability('OPENAI');

      expect(result.available).toBe(false);
      expect(result.mode).toBe('UNAVAILABLE');
      expect(result.details.status).toBe('ERROR');
      expect(result.details.fallbackAvailable).toBe(false);
    });
  });
});