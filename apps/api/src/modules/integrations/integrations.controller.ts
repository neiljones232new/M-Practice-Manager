import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegrationConfigService } from './services/integration-config.service';
import { IntegrationHealthService } from './services/integration-health.service';
import { IntegrationMonitoringService } from './services/integration-monitoring.service';
import {
  IntegrationConfig,
  CreateIntegrationConfigDto,
  UpdateIntegrationConfigDto,
  IntegrationTestResult,
  IntegrationHealthStatus,
  PracticeSettings,
  UpdatePracticeSettingsDto,
} from './interfaces/integration.interface';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(
    private readonly configService: IntegrationConfigService,
    private readonly healthService: IntegrationHealthService,
    private readonly monitoringService: IntegrationMonitoringService,
  ) {}

  // ============================================================
  // 🔧 CONFIGURATION ROUTES
  // ============================================================

  /** Get all integration configurations */
  @Get()
  async getIntegrations(): Promise<IntegrationConfig[]> {
    this.logger.log('Fetching all integration configurations');
    return this.configService.getIntegrations();
  }

  /** Get integration by ID */
  @Get(':id')
  async getIntegrationById(@Param('id') id: string): Promise<IntegrationConfig> {
    this.logger.log(`Fetching integration configuration: ${id}`);
    return this.configService.getIntegrationById(id);
  }

  /** Create new integration configuration */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createIntegration(
    @Body() dto: CreateIntegrationConfigDto,
  ): Promise<IntegrationConfig> {
    this.logger.log(`Creating integration configuration: ${dto.name} (${dto.type})`);
    return this.configService.createIntegration(dto);
  }

  /** Update integration configuration */
  @Put(':id')
  async updateIntegration(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationConfigDto,
  ): Promise<IntegrationConfig> {
    this.logger.log(`Updating integration configuration: ${id}`);
    return this.configService.updateIntegration(id, dto);
  }

  /** Delete integration configuration */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntegration(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting integration configuration: ${id}`);
    return this.configService.deleteIntegration(id);
  }

  /** Enable or disable integration */
  @Post(':id/toggle')
  async toggleIntegration(@Param('id') id: string): Promise<IntegrationConfig> {
    this.logger.log(`Toggling integration: ${id}`);
    const integration = await this.configService.getIntegrationById(id);
    return this.configService.updateIntegration(id, {
      enabled: !integration.enabled,
    });
  }

  // ============================================================
  // 🧪 TESTING & HEALTH ROUTES
  // ============================================================

  /** Test a specific integration */
  @Post(':id/test')
  async testIntegration(@Param('id') id: string): Promise<IntegrationTestResult> {
    this.logger.log(`Testing integration: ${id}`);
    return this.healthService.testIntegration(id);
  }

  /** Test all integrations */
  @Post('test-all')
  async testAllIntegrations(): Promise<IntegrationTestResult[]> {
    this.logger.log('Testing all integrations');
    return this.healthService.testAllIntegrations();
  }

  /** Get health status for all integrations */
  @Get('health/status')
  async getHealthStatus(): Promise<IntegrationHealthStatus[]> {
    this.logger.log('Fetching integration health status');
    return this.healthService.getHealthStatus();
  }

  /** Check integration health status (specific type) */
  @Get('monitoring/health/:type')
  async checkIntegrationHealth(@Param('type') type: string): Promise<any> {
    this.logger.log(`Checking health for integration type: ${type}`);
    return this.monitoringService.isIntegrationHealthy(type);
  }

  /** Get integration availability with fallback info */
  @Get('monitoring/availability/:type')
  async getIntegrationAvailability(@Param('type') type: string): Promise<any> {
    this.logger.log(`Checking availability for integration type: ${type}`);
    return this.monitoringService.getIntegrationAvailability(type);
  }

  // ============================================================
  // ⚙️ PRACTICE SETTINGS ROUTES
  // ============================================================

  /** Get practice settings */
  @Get('settings/practice')
  async getPracticeSettings(): Promise<PracticeSettings> {
    this.logger.log('Fetching practice settings');
    return this.configService.getPracticeSettings();
  }

  /** Update practice settings */
  @Put('settings/practice')
  async updatePracticeSettings(
    @Body() dto: UpdatePracticeSettingsDto,
  ): Promise<PracticeSettings> {
    this.logger.log('Updating practice settings');
    return this.configService.updatePracticeSettings(dto);
  }

  // ============================================================
  // 🎨 BRANDING (Practice Logo)
  // ============================================================

  /** Get practice branding logo (base64 data URL or null) */
  @Public()
  @Get('settings/logo')
  async getBrandingLogo(): Promise<{ dataUrl: string | null }> {
    this.logger.log('Fetching practice branding logo');
    const dataUrl = await this.configService.getBrandingLogo();
    return { dataUrl };
  }

  /** Set/reset practice branding logo */
  @Put('settings/logo')
  async setBrandingLogo(
    @Body() body: { dataUrl: string | null },
  ): Promise<{ dataUrl: string | null }> {
    this.logger.log('Updating practice branding logo');
    const next = await this.configService.setBrandingLogo(body?.dataUrl || null);
    return { dataUrl: next };
  }

  // ============================================================
  // 🔍 INTEGRATION LOOKUPS
  // ============================================================

  /** Get integration by type (for internal service use) */
  @Get('type/:type')
  async getIntegrationByType(
    @Param('type') type: string,
  ): Promise<IntegrationConfig | null> {
    this.logger.log(`Fetching integration by type: ${type}`);
    return this.configService.getIntegrationByType(type);
  }

  /** Get integration usage statistics */
  @Get(':id/usage')
  async getIntegrationUsage(@Param('id') id: string): Promise<any> {
    this.logger.log(`Fetching usage statistics for integration: ${id}`);
    const integration = await this.configService.getIntegrationById(id);
    const metrics = await this.monitoringService.getUsageStatistics(integration.type);
    return {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      rateLimit: integration.rateLimit,
      lastTested: integration.lastTested,
      status: integration.status,
      metrics: metrics.find((m) => m.integrationId === integration.id),
    };
  }

  // ============================================================
  // 📊 MONITORING ROUTES
  // ============================================================

  /** ✅ NEW: Default monitoring route (fixes 404) */
  @Get('monitoring')
  async getMonitoringSummary(): Promise<any> {
    this.logger.log('Fetching default monitoring summary');
    return this.monitoringService.getHealthDashboard();
  }

  /** Get health dashboard data */
  @Get('monitoring/dashboard')
  async getHealthDashboard(): Promise<any> {
    this.logger.log('Fetching integration health dashboard');
    return this.monitoringService.getHealthDashboard();
  }

  /** Get usage statistics for all integrations */
  @Get('monitoring/usage')
  async getAllUsageStatistics(): Promise<any> {
    this.logger.log('Fetching usage statistics for all integrations');
    return this.monitoringService.getUsageStatistics();
  }

  /** Check rate limit for integration type */
  @Get('monitoring/rate-limit/:type')
  async checkRateLimit(@Param('type') type: string): Promise<any> {
    this.logger.log(`Checking rate limit for integration type: ${type}`);
    return this.monitoringService.checkRateLimit(type);
  }

  /** Trigger cleanup of old monitoring data */
  @Post('monitoring/cleanup')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cleanupMonitoringData(): Promise<void> {
    this.logger.log('Triggering monitoring data cleanup');
    return this.monitoringService.cleanup();
  }

  /** Get fallback data for integration */
  @Get('monitoring/fallback/:type')
  async getFallbackData(@Param('type') type: string): Promise<any> {
    this.logger.log(`Getting fallback data for integration type: ${type}`);
    const fallback = await this.monitoringService.getFallbackResponse(type);
    return {
      available: !!fallback,
      data: fallback,
    };
  }
}
