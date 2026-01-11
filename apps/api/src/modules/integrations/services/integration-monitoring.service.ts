import { Injectable, Logger } from '@nestjs/common';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationHealthService } from './integration-health.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import {
  IntegrationConfig,
  IntegrationHealthStatus,
} from '../interfaces/integration.interface';

interface UsageMetrics {
  integrationId: string;
  integrationType: string;
  requestCount: number;
  errorCount: number;
  lastRequestTime: Date;
  averageResponseTime: number;
  rateLimitHits: number;
  dailyUsage: {
    date: string;
    requests: number;
    errors: number;
  }[];
}

interface FallbackData {
  integrationId: string;
  integrationType: string;
  lastSuccessfulResponse: any;
  cachedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class IntegrationMonitoringService {
  private readonly logger = new Logger(IntegrationMonitoringService.name);
  private readonly usageMetricsPath = 'monitoring/usage-metrics.json';
  private readonly fallbackDataPath = 'monitoring/fallback-data.json';
  private readonly healthCheckInterval = 5 * 60 * 1000; // 5 minutes
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(
    private readonly configService: IntegrationConfigService,
    private readonly healthService: IntegrationHealthService,
    private readonly fileStorage: FileStorageService,
  ) {
    this.startHealthMonitoring();
  }

  /**
   * Start continuous health monitoring
   */
  private startHealthMonitoring(): void {
    this.logger.log('Starting integration health monitoring');
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Health check failed', error);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
      this.logger.log('Stopped integration health monitoring');
    }
  }

  /**
   * Perform health checks on all enabled integrations
   */
  async performHealthChecks(): Promise<void> {
    try {
      const integrations = await this.configService.getIntegrations();
      
      if (!integrations || !Array.isArray(integrations)) {
        this.logger.warn('No integrations found or invalid integrations data');
        return;
      }

      const enabledIntegrations = integrations.filter(i => i && i.enabled);

      this.logger.log(`Performing health checks on ${enabledIntegrations.length} integrations`);

      for (const integration of enabledIntegrations) {
        try {
          await this.healthService.testIntegration(integration.id);
        } catch (error) {
          this.logger.error(`Health check failed for ${integration.name}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to perform health checks', error);
    }
  }

  /**
   * Record API usage for rate limiting and monitoring
   */
  async recordUsage(
    integrationType: string,
    responseTime: number,
    success: boolean,
  ): Promise<void> {
    try {
      const metrics = await this.getUsageMetrics();
      const integration = await this.configService.getIntegrationByType(integrationType);
      
      if (!integration) return;

      let integrationMetrics = metrics.find(m => m.integrationId === integration.id);
      
      if (!integrationMetrics) {
        integrationMetrics = {
          integrationId: integration.id,
          integrationType,
          requestCount: 0,
          errorCount: 0,
          lastRequestTime: new Date(),
          averageResponseTime: 0,
          rateLimitHits: 0,
          dailyUsage: [],
        };
        metrics.push(integrationMetrics);
      }

      // Update metrics
      integrationMetrics.requestCount++;
      integrationMetrics.lastRequestTime = new Date();
      
      if (!success) {
        integrationMetrics.errorCount++;
      }

      // Update average response time
      integrationMetrics.averageResponseTime = 
        (integrationMetrics.averageResponseTime + responseTime) / 2;

      // Update daily usage
      const today = new Date().toISOString().split('T')[0];
      let dailyUsage = integrationMetrics.dailyUsage.find(d => d.date === today);
      
      if (!dailyUsage) {
        dailyUsage = { date: today, requests: 0, errors: 0 };
        integrationMetrics.dailyUsage.push(dailyUsage);
      }
      
      dailyUsage.requests++;
      if (!success) {
        dailyUsage.errors++;
      }

      // Keep only last 30 days
      integrationMetrics.dailyUsage = integrationMetrics.dailyUsage
        .filter(d => {
          const date = new Date(d.date);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return date >= thirtyDaysAgo;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      await this.fileStorage.writeJson('monitoring', 'usage-metrics', metrics);
    } catch (error) {
      this.logger.error('Failed to record usage metrics', error);
    }
  }

  /**
   * Check if integration is within rate limits
   */
  async checkRateLimit(integrationType: string): Promise<{
    allowed: boolean;
    remainingRequests: number;
    resetTime: Date;
  }> {
    try {
      const integration = await this.configService.getIntegrationByType(integrationType);
      
      if (!integration?.rateLimit) {
        return {
          allowed: true,
          remainingRequests: Infinity,
          resetTime: new Date(),
        };
      }

      const metrics = await this.getUsageMetrics();
      const integrationMetrics = metrics.find(m => m.integrationId === integration.id);
      
      if (!integrationMetrics) {
        return {
          allowed: true,
          remainingRequests: integration.rateLimit.requestsPerMinute,
          resetTime: integration.rateLimit.resetTime,
        };
      }

      const now = new Date();
      const resetTime = new Date(integration.rateLimit.resetTime);
      
      // Reset if time has passed
      if (now > resetTime) {
        integration.rateLimit.currentUsage = 0;
        integration.rateLimit.resetTime = new Date(now.getTime() + 60000); // Reset in 1 minute
        
        await this.configService.updateIntegration(integration.id, {
          settings: {
            ...integration.settings,
            rateLimit: integration.rateLimit,
          },
        });
      }

      const allowed = integration.rateLimit.currentUsage < integration.rateLimit.requestsPerMinute;
      const remainingRequests = Math.max(0, 
        integration.rateLimit.requestsPerMinute - integration.rateLimit.currentUsage
      );

      if (!allowed) {
        integrationMetrics.rateLimitHits++;
        await this.fileStorage.writeJson('monitoring', 'usage-metrics', metrics);
      }

      return {
        allowed,
        remainingRequests,
        resetTime: integration.rateLimit.resetTime,
      };
    } catch (error) {
      this.logger.error('Failed to check rate limit', error);
      return {
        allowed: true,
        remainingRequests: 0,
        resetTime: new Date(),
      };
    }
  }

  /**
   * Store fallback data for offline mode
   */
  async storeFallbackData(
    integrationType: string,
    data: any,
    expirationMinutes: number = 60,
  ): Promise<void> {
    try {
      const integration = await this.configService.getIntegrationByType(integrationType);
      if (!integration) return;

      const fallbackData = await this.getFallbackData();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expirationMinutes * 60000);

      const existingIndex = fallbackData.findIndex(f => f.integrationId === integration.id);
      const newFallback: FallbackData = {
        integrationId: integration.id,
        integrationType,
        lastSuccessfulResponse: data,
        cachedAt: now,
        expiresAt,
      };

      if (existingIndex >= 0) {
        fallbackData[existingIndex] = newFallback;
      } else {
        fallbackData.push(newFallback);
      }

      await this.fileStorage.writeJson('monitoring', 'fallback-data', fallbackData);
    } catch (error) {
      this.logger.error('Failed to store fallback data', error);
    }
  }

  /**
   * Get fallback data when integration is unavailable
   */
  async getFallbackResponse(integrationType: string): Promise<any | null> {
    try {
      const integration = await this.configService.getIntegrationByType(integrationType);
      if (!integration) return null;

      const fallbackData = await this.getFallbackData();
      const cached = fallbackData.find(f => f.integrationId === integration.id);

      if (!cached) return null;

      const now = new Date();
      if (now > new Date(cached.expiresAt)) {
        this.logger.warn(`Fallback data expired for ${integrationType}`);
        return null;
      }

      this.logger.log(`Using fallback data for ${integrationType}`);
      return cached.lastSuccessfulResponse;
    } catch (error) {
      this.logger.error('Failed to get fallback data', error);
      return null;
    }
  }

  /**
   * Handle integration failure with fallback
   */
  async handleIntegrationFailure(
    integrationType: string,
    error: Error,
    fallbackResponse?: any,
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    usingFallback: boolean;
  }> {
    try {
      // Record the failure
      await this.recordUsage(integrationType, 0, false);

      // Try to get fallback data
      const fallback = fallbackResponse || await this.getFallbackResponse(integrationType);
      
      if (fallback) {
        this.logger.warn(`Integration ${integrationType} failed, using fallback data: ${error.message}`);
        return {
          success: true,
          data: fallback,
          error: error.message,
          usingFallback: true,
        };
      }

      // No fallback available
      this.logger.error(`Integration ${integrationType} failed with no fallback: ${error.message}`);
      return {
        success: false,
        error: error.message,
        usingFallback: false,
      };
    } catch (fallbackError) {
      this.logger.error('Failed to handle integration failure', fallbackError);
      return {
        success: false,
        error: error.message,
        usingFallback: false,
      };
    }
  }

  /**
   * Check if integration is healthy and available
   */
  async isIntegrationHealthy(integrationType: string): Promise<{
    healthy: boolean;
    status: string;
    lastTested?: Date;
    error?: string;
  }> {
    try {
      const integration = await this.configService.getIntegrationByType(integrationType);
      
      if (!integration) {
        return {
          healthy: false,
          status: 'NOT_CONFIGURED',
        };
      }

      if (!integration.enabled) {
        return {
          healthy: false,
          status: 'DISABLED',
        };
      }

      // Check rate limits
      const rateLimit = await this.checkRateLimit(integrationType);
      if (!rateLimit.allowed) {
        return {
          healthy: false,
          status: 'RATE_LIMITED',
          error: `Rate limit exceeded. Reset at ${rateLimit.resetTime}`,
        };
      }

      return {
        healthy: integration.status === 'CONNECTED',
        status: integration.status,
        lastTested: integration.lastTested,
        error: integration.lastError,
      };
    } catch (error) {
      this.logger.error(`Failed to check integration health for ${integrationType}`, error);
      return {
        healthy: false,
        status: 'ERROR',
        error: error.message,
      };
    }
  }

  /**
   * Get integration availability with fallback options
   */
  async getIntegrationAvailability(integrationType: string): Promise<{
    available: boolean;
    mode: 'LIVE' | 'FALLBACK' | 'UNAVAILABLE';
    details: {
      status: string;
      lastTested?: Date;
      error?: string;
      fallbackAvailable: boolean;
      fallbackAge?: number; // minutes
    };
  }> {
    try {
      const health = await this.isIntegrationHealthy(integrationType);
      const fallback = await this.getFallbackResponse(integrationType);
      
      let fallbackAge: number | undefined;
      if (fallback) {
        const fallbackData = await this.getFallbackData();
        const integration = await this.configService.getIntegrationByType(integrationType);
        const cached = fallbackData.find(f => f.integrationId === integration?.id);
        if (cached) {
          fallbackAge = Math.floor((Date.now() - new Date(cached.cachedAt).getTime()) / 60000);
        }
      }

      if (health.healthy) {
        return {
          available: true,
          mode: 'LIVE',
          details: {
            status: health.status,
            lastTested: health.lastTested,
            fallbackAvailable: !!fallback,
            fallbackAge,
          },
        };
      }

      if (fallback) {
        return {
          available: true,
          mode: 'FALLBACK',
          details: {
            status: health.status,
            lastTested: health.lastTested,
            error: health.error,
            fallbackAvailable: true,
            fallbackAge,
          },
        };
      }

      return {
        available: false,
        mode: 'UNAVAILABLE',
        details: {
          status: health.status,
          lastTested: health.lastTested,
          error: health.error,
          fallbackAvailable: false,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get integration availability for ${integrationType}`, error);
      return {
        available: false,
        mode: 'UNAVAILABLE',
        details: {
          status: 'ERROR',
          error: error.message,
          fallbackAvailable: false,
        },
      };
    }
  }

  /**
   * Get comprehensive usage statistics
   */
  async getUsageStatistics(integrationType?: string): Promise<UsageMetrics[]> {
    const metrics = await this.getUsageMetrics();
    
    if (integrationType) {
      return metrics.filter(m => m.integrationType === integrationType);
    }
    
    return metrics;
  }

  /**
   * Get integration health dashboard data
   */
  async getHealthDashboard(): Promise<{
    overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    integrations: IntegrationHealthStatus[];
    metrics: {
      totalRequests: number;
      totalErrors: number;
      averageResponseTime: number;
      rateLimitHits: number;
    };
    alerts: Array<{
      type: 'ERROR' | 'WARNING' | 'INFO';
      message: string;
      integrationId: string;
      timestamp: Date;
    }>;
  }> {
    const [healthStatus, metrics] = await Promise.all([
      this.healthService.getHealthStatus(),
      this.getUsageMetrics(),
    ]);

    const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
    const averageResponseTime = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length 
      : 0;
    const rateLimitHits = metrics.reduce((sum, m) => sum + m.rateLimitHits, 0);

    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    const connectedCount = healthStatus.filter(h => h.status === 'CONNECTED').length;
    const totalCount = healthStatus.length;

    let overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    if (errorRate > 0.1 || connectedCount === 0) {
      overallHealth = 'CRITICAL';
    } else if (errorRate > 0.05 || connectedCount < totalCount * 0.8) {
      overallHealth = 'DEGRADED';
    } else {
      overallHealth = 'HEALTHY';
    }

    const alerts = this.generateAlerts(healthStatus, metrics);

    return {
      overallHealth,
      integrations: healthStatus,
      metrics: {
        totalRequests,
        totalErrors,
        averageResponseTime,
        rateLimitHits,
      },
      alerts,
    };
  }

  /**
   * Generate alerts based on health status and metrics
   */
  private generateAlerts(
    healthStatus: IntegrationHealthStatus[],
    metrics: UsageMetrics[],
  ): Array<{
    type: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    integrationId: string;
    timestamp: Date;
  }> {
    const alerts: Array<{
      type: 'ERROR' | 'WARNING' | 'INFO';
      message: string;
      integrationId: string;
      timestamp: Date;
    }> = [];

    const now = new Date();

    // Check for disconnected integrations
    healthStatus.forEach(status => {
      if (status.status === 'ERROR') {
        alerts.push({
          type: 'ERROR',
          message: `${status.name} integration is disconnected: ${status.error}`,
          integrationId: status.id,
          timestamp: now,
        });
      }
    });

    // Check for high error rates
    metrics.forEach(metric => {
      const errorRate = metric.requestCount > 0 ? metric.errorCount / metric.requestCount : 0;
      
      if (errorRate > 0.1) {
        alerts.push({
          type: 'ERROR',
          message: `High error rate (${(errorRate * 100).toFixed(1)}%) for ${metric.integrationType}`,
          integrationId: metric.integrationId,
          timestamp: now,
        });
      } else if (errorRate > 0.05) {
        alerts.push({
          type: 'WARNING',
          message: `Elevated error rate (${(errorRate * 100).toFixed(1)}%) for ${metric.integrationType}`,
          integrationId: metric.integrationId,
          timestamp: now,
        });
      }

      // Check for rate limit hits
      if (metric.rateLimitHits > 0) {
        alerts.push({
          type: 'WARNING',
          message: `Rate limit exceeded ${metric.rateLimitHits} times for ${metric.integrationType}`,
          integrationId: metric.integrationId,
          timestamp: now,
        });
      }
    });

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get usage metrics from storage
   */
  private async getUsageMetrics(): Promise<UsageMetrics[]> {
    try {
      return await this.fileStorage.readJson<UsageMetrics[]>('monitoring', 'usage-metrics') || [];
    } catch (error) {
      if (error.message.includes('not found')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get fallback data from storage
   */
  private async getFallbackData(): Promise<FallbackData[]> {
    try {
      return await this.fileStorage.readJson<FallbackData[]>('monitoring', 'fallback-data') || [];
    } catch (error) {
      if (error.message.includes('not found')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Cleanup old metrics and fallback data
   */
  async cleanup(): Promise<void> {
    try {
      const [metrics, fallbackData] = await Promise.all([
        this.getUsageMetrics(),
        this.getFallbackData(),
      ]);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clean up old fallback data
      const validFallbackData = fallbackData.filter(f => 
        new Date(f.expiresAt) > new Date()
      );

      if (validFallbackData.length !== fallbackData.length) {
        await this.fileStorage.writeJson('monitoring', 'fallback-data', validFallbackData);
        this.logger.log(`Cleaned up ${fallbackData.length - validFallbackData.length} expired fallback entries`);
      }

      // Clean up old daily usage data (already handled in recordUsage)
      this.logger.log('Cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup old data', error);
    }
  }
}