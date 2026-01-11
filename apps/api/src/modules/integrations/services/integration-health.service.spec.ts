import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationHealthService } from './integration-health.service';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationConfig, IntegrationTestResult } from '../interfaces/integration.interface';

// Mock the HTTP modules
jest.mock('https');
jest.mock('http');

describe('IntegrationHealthService', () => {
  let service: IntegrationHealthService;
  let configService: jest.Mocked<IntegrationConfigService>;

  const mockIntegration: IntegrationConfig = {
    id: 'test-id-1',
    name: 'Test OpenAI',
    type: 'OPENAI',
    enabled: true,
    apiKey: '[ENCRYPTED]',
    settings: { model: 'gpt-4' },
    status: 'DISCONNECTED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      getIntegrationById: jest.fn(),
      getIntegrations: jest.fn(),
      getIntegrationByType: jest.fn(),
      getDecryptedApiKey: jest.fn(),
      updateIntegrationStatus: jest.fn(),
      updateIntegration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationHealthService,
        {
          provide: IntegrationConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IntegrationHealthService>(IntegrationHealthService);
    configService = module.get(IntegrationConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('testIntegration', () => {
    it('should test OpenAI integration successfully', async () => {
      configService.getIntegrationById.mockResolvedValue(mockIntegration);
      configService.getDecryptedApiKey.mockResolvedValue('test-api-key');
      configService.updateIntegrationStatus.mockResolvedValue(undefined);

      // Mock successful HTTP response
      const mockRequest = {
        on: jest.fn(),
        setTimeout: jest.fn(),
        end: jest.fn(),
      };

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('{"data": [{"id": "gpt-4"}]}');
          } else if (event === 'end') {
            callback();
          }
        }),
      };

      // Mock https.request
      const https = require('https');
      https.request = jest.fn((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await service.testIntegration('test-id-1');

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(configService.updateIntegrationStatus).toHaveBeenCalledWith('test-id-1', 'CONNECTED', undefined);
    });

    it('should handle OpenAI integration failure', async () => {
      configService.getIntegrationById.mockResolvedValue(mockIntegration);
      configService.getDecryptedApiKey.mockResolvedValue('invalid-api-key');
      configService.updateIntegrationStatus.mockResolvedValue(undefined);

      // Mock failed HTTP response
      const mockRequest = {
        on: jest.fn(),
        setTimeout: jest.fn(),
        end: jest.fn(),
      };

      const mockResponse = {
        statusCode: 401,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('{"error": {"message": "Invalid API key"}}');
          } else if (event === 'end') {
            callback();
          }
        }),
      };

      const https = require('https');
      https.request = jest.fn((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await service.testIntegration('test-id-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 401');
      expect(configService.updateIntegrationStatus).toHaveBeenCalledWith('test-id-1', 'ERROR', expect.any(String));
    });

    it('should handle missing API key', async () => {
      configService.getIntegrationById.mockResolvedValue(mockIntegration);
      configService.getDecryptedApiKey.mockResolvedValue(null);
      configService.updateIntegrationStatus.mockResolvedValue(undefined);

      const result = await service.testIntegration('test-id-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not configured');
      expect(configService.updateIntegrationStatus).toHaveBeenCalledWith('test-id-1', 'ERROR', 'API key not configured');
    });

    it('should test Companies House integration', async () => {
      const companiesHouseIntegration: IntegrationConfig = {
        ...mockIntegration,
        type: 'COMPANIES_HOUSE',
        name: 'Companies House API',
      };

      configService.getIntegrationById.mockResolvedValue(companiesHouseIntegration);
      configService.getDecryptedApiKey.mockResolvedValue('test-ch-key');
      configService.updateIntegrationStatus.mockResolvedValue(undefined);

      // Mock successful HTTP response
      const mockRequest = {
        on: jest.fn(),
        setTimeout: jest.fn(),
        end: jest.fn(),
      };

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('{"items": []}');
          } else if (event === 'end') {
            callback();
          }
        }),
      };

      const https = require('https');
      https.request = jest.fn((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await service.testIntegration('test-id-1');

      expect(result.success).toBe(true);
      expect(configService.updateIntegrationStatus).toHaveBeenCalledWith('test-id-1', 'CONNECTED', undefined);
    });

    it('should handle network timeout', async () => {
      configService.getIntegrationById.mockResolvedValue(mockIntegration);
      configService.getDecryptedApiKey.mockResolvedValue('test-api-key');
      configService.updateIntegrationStatus.mockResolvedValue(undefined);

      // Mock timeout
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // Don't call the callback to simulate timeout
          }
        }),
        setTimeout: jest.fn((timeout, callback) => {
          // Simulate timeout
          setTimeout(callback, 10);
        }),
        destroy: jest.fn(),
        end: jest.fn(),
      };

      const https = require('https');
      https.request = jest.fn(() => mockRequest);

      const result = await service.testIntegration('test-id-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
      expect(configService.updateIntegrationStatus).toHaveBeenCalledWith('test-id-1', 'ERROR', 'Request timeout');
    });

    it('should handle unknown integration type', async () => {
      const unknownIntegration: IntegrationConfig = {
        ...mockIntegration,
        type: 'UNKNOWN' as any,
      };

      configService.getIntegrationById.mockResolvedValue(unknownIntegration);
      configService.updateIntegrationStatus.mockResolvedValue(undefined);

      const result = await service.testIntegration('test-id-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown integration type');
      expect(configService.updateIntegrationStatus).toHaveBeenCalledWith('test-id-1', 'ERROR', expect.any(String));
    });
  });

  describe('testAllIntegrations', () => {
    it('should test all enabled integrations', async () => {
      const integrations = [
        { ...mockIntegration, enabled: true },
        { ...mockIntegration, id: 'test-id-2', enabled: false },
        { ...mockIntegration, id: 'test-id-3', enabled: true },
      ];

      configService.getIntegrations.mockResolvedValue(integrations);
      configService.getIntegrationById.mockImplementation(async (id) => 
        integrations.find(i => i.id === id)!
      );
      configService.getDecryptedApiKey.mockResolvedValue('test-api-key');
      configService.updateIntegrationStatus.mockResolvedValue(undefined);

      // Mock successful HTTP responses
      const mockRequest = {
        on: jest.fn(),
        setTimeout: jest.fn(),
        end: jest.fn(),
      };

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('{"data": []}');
          } else if (event === 'end') {
            callback();
          }
        }),
      };

      const https = require('https');
      https.request = jest.fn((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const results = await service.testAllIntegrations();

      expect(results).toHaveLength(2); // Only enabled integrations
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status for all integrations', async () => {
      const integrations = [
        { ...mockIntegration, status: 'CONNECTED' as const },
        { ...mockIntegration, id: 'test-id-2', status: 'ERROR' as const, lastError: 'Connection failed' },
      ];

      configService.getIntegrations.mockResolvedValue(integrations);

      const result = await service.getHealthStatus();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('CONNECTED');
      expect(result[1].status).toBe('ERROR');
      expect(result[1].error).toBe('Connection failed');
    });
  });

  describe('updateUsageStats', () => {
    it('should update usage statistics', async () => {
      const integration = { ...mockIntegration, rateLimit: undefined };
      configService.getIntegrationByType.mockResolvedValue(integration);
      configService.updateIntegration.mockResolvedValue(integration);

      await service.updateUsageStats('OPENAI', 5);

      expect(configService.updateIntegration).toHaveBeenCalledWith(
        'test-id-1',
        expect.objectContaining({
          settings: expect.objectContaining({
            rateLimit: expect.objectContaining({
              currentUsage: 5,
            }),
          }),
        })
      );
    });

    it('should handle missing integration gracefully', async () => {
      configService.getIntegrationByType.mockResolvedValue(null);

      await expect(service.updateUsageStats('NON_EXISTENT')).resolves.not.toThrow();
    });
  });
});