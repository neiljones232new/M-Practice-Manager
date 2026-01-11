import { Injectable, Logger } from '@nestjs/common';
import { IntegrationConfigService } from './integration-config.service';
import {
  IntegrationConfig,
  IntegrationTestResult,
  IntegrationHealthStatus,
} from '../interfaces/integration.interface';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class IntegrationHealthService {
  private readonly logger = new Logger(IntegrationHealthService.name);
  private readonly testTimeoutMs = 10000; // 10 seconds

  constructor(
    private readonly configService: IntegrationConfigService,
  ) {}

  /**
   * Test a specific integration
   */
  async testIntegration(id: string): Promise<IntegrationTestResult> {
    const integration = await this.configService.getIntegrationById(id);
    const startTime = Date.now();

    try {
      await this.configService.updateIntegrationStatus(id, 'TESTING');
      
      let result: IntegrationTestResult;
      
      switch (integration.type) {
        case 'OPENAI':
          result = await this.testOpenAI(integration);
          break;
        case 'COMPANIES_HOUSE':
          result = await this.testCompaniesHouse(integration);
          break;
        case 'HMRC':
          result = await this.testHMRC(integration);
          break;
        case 'GOV_NOTIFY':
          result = await this.testGovNotify(integration);
          break;
        default:
          result = {
            success: false,
            responseTime: Date.now() - startTime,
            error: `Unknown integration type: ${integration.type}`,
          };
      }

      // Update integration status based on test result
      await this.configService.updateIntegrationStatus(
        id,
        result.success ? 'CONNECTED' : 'ERROR',
        result.error,
      );

      return result;
    } catch (error) {
      const result: IntegrationTestResult = {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };

      await this.configService.updateIntegrationStatus(id, 'ERROR', error.message);
      return result;
    }
  }

  /**
   * Test all integrations
   */
  async testAllIntegrations(): Promise<IntegrationTestResult[]> {
    const integrations = await this.configService.getIntegrations();
    const results: IntegrationTestResult[] = [];

    for (const integration of integrations) {
      if (integration.enabled) {
        try {
          const result = await this.testIntegration(integration.id);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            responseTime: 0,
            error: error.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get health status for all integrations
   */
  async getHealthStatus(): Promise<IntegrationHealthStatus[]> {
    const integrations = await this.configService.getIntegrations();
    
    return integrations.map(integration => ({
      id: integration.id,
      name: integration.name,
      type: integration.type,
      status: integration.status,
      lastTested: integration.lastTested,
      error: integration.lastError,
      rateLimit: integration.rateLimit,
    }));
  }

  /**
   * Test OpenAI integration
   */
  private async testOpenAI(integration: IntegrationConfig): Promise<IntegrationTestResult> {
    const apiKey = await this.configService.getDecryptedApiKey('OPENAI');
    
    if (!apiKey) {
      return {
        success: false,
        responseTime: 0,
        error: 'API key not configured',
      };
    }

    const startTime = Date.now();

    try {
      // Test with a simple completion request
      const response = await this.makeHttpRequest({
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.statusCode === 200) {
        return {
          success: true,
          responseTime,
          details: {
            statusCode: response.statusCode,
            modelsAvailable: true,
          },
        };
      } else {
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.statusCode}: ${response.data}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Test Companies House integration
   */
  private async testCompaniesHouse(integration: IntegrationConfig): Promise<IntegrationTestResult> {
    const apiKey = await this.configService.getDecryptedApiKey('COMPANIES_HOUSE');
    
    if (!apiKey) {
      return {
        success: false,
        responseTime: 0,
        error: 'API key not configured',
      };
    }

    const startTime = Date.now();

    try {
      // Test with a simple company search
      const auth = Buffer.from(`${apiKey}:`).toString('base64');
      const response = await this.makeHttpRequest({
        hostname: 'api.company-information.service.gov.uk',
        port: 443,
        path: '/search/companies?q=test&items_per_page=1',
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.statusCode === 200) {
        return {
          success: true,
          responseTime,
          details: {
            statusCode: response.statusCode,
            searchWorking: true,
          },
        };
      } else {
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.statusCode}: ${response.data}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Test HMRC integration
   */
  private async testHMRC(integration: IntegrationConfig): Promise<IntegrationTestResult> {
    const apiKey = await this.configService.getDecryptedApiKey('HMRC');
    
    if (!apiKey) {
      return {
        success: false,
        responseTime: 0,
        error: 'API key not configured',
      };
    }

    const startTime = Date.now();

    try {
      // Test with a simple hello world endpoint
      const response = await this.makeHttpRequest({
        hostname: 'api.service.hmrc.gov.uk',
        port: 443,
        path: '/hello/world',
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.hmrc.1.0+json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.statusCode === 200) {
        return {
          success: true,
          responseTime,
          details: {
            statusCode: response.statusCode,
            helloWorldWorking: true,
          },
        };
      } else {
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.statusCode}: ${response.data}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Test GOV.UK Notify integration
   */
  private async testGovNotify(integration: IntegrationConfig): Promise<IntegrationTestResult> {
    const apiKey = await this.configService.getDecryptedApiKey('GOV_NOTIFY');
    
    if (!apiKey) {
      return {
        success: false,
        responseTime: 0,
        error: 'API key not configured',
      };
    }

    const startTime = Date.now();

    try {
      // Test with a simple template list request
      const response = await this.makeHttpRequest({
        hostname: 'api.notifications.service.gov.uk',
        port: 443,
        path: '/v2/templates',
        method: 'GET',
        headers: {
          'Authorization': `ApiKey-v1 ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.statusCode === 200) {
        return {
          success: true,
          responseTime,
          details: {
            statusCode: response.statusCode,
            templatesAccessible: true,
          },
        };
      } else {
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.statusCode}: ${response.data}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Make HTTP request with timeout
   */
  private makeHttpRequest(options: any): Promise<{ statusCode: number; data: string }> {
    return new Promise((resolve, reject) => {
      const client = options.port === 443 ? https : http;
      
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            data,
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(this.testTimeoutMs, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Monitor integration usage and rate limits
   */
  async updateUsageStats(type: string, requestCount: number = 1): Promise<void> {
    try {
      const integration = await this.configService.getIntegrationByType(type);
      if (!integration) return;

      const now = new Date();
      const currentRateLimit = integration.rateLimit || {
        requestsPerMinute: 0,
        requestsPerDay: 0,
        currentUsage: 0,
        resetTime: now,
      };

      // Reset counters if needed
      if (now > currentRateLimit.resetTime) {
        currentRateLimit.currentUsage = 0;
        currentRateLimit.resetTime = new Date(now.getTime() + 60000); // Reset in 1 minute
      }

      currentRateLimit.currentUsage += requestCount;

      // Update the integration with new usage stats
      await this.configService.updateIntegration(integration.id, {
        settings: {
          ...integration.settings,
          rateLimit: currentRateLimit,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update usage stats for ${type}`, error);
    }
  }
}