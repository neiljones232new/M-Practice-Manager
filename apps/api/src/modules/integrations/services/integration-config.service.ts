import { Injectable, Logger } from '@nestjs/common';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { EncryptionService } from '../../security/services/encryption.service';
import {
  IntegrationConfig,
  CreateIntegrationConfigDto,
  UpdateIntegrationConfigDto,
  PracticeSettings,
  UpdatePracticeSettingsDto,
  Portfolio,
} from '../interfaces/integration.interface';

@Injectable()
export class IntegrationConfigService {
  private readonly logger = new Logger(IntegrationConfigService.name);

  constructor(
    private readonly fileStorage: FileStorageService,
    private readonly encryption: EncryptionService,
  ) {}

  // ============================================================
  // ⚙️ INTEGRATION CONFIG MANAGEMENT
  // ============================================================

  async getIntegrations(): Promise<IntegrationConfig[]> {
    const list = await this.safeReadIntegrations();
    if (!Array.isArray(list) || !list.length) {
      this.logger.warn('No integrations found — initializing defaults');
      return this.initializeDefaultIntegrations();
    }

    // Hide encrypted API keys in API responses
    return list.map((i) => ({
      ...i,
      apiKey: i.apiKey ? '[ENCRYPTED]' : undefined,
    }));
  }

  async getIntegrationById(id: string): Promise<IntegrationConfig> {
    const integrations = await this.safeReadIntegrations();
    const integration = integrations.find((i) => i.id === id);

    if (!integration) {
      this.logger.warn(`Integration ${id} not found — returning fallback`);
      return this.createDefaultIntegrationFallback(id);
    }

    return {
      ...integration,
      apiKey: integration.apiKey ? '[ENCRYPTED]' : undefined,
    };
  }

  async getIntegrationByType(
    type: string,
  ): Promise<IntegrationConfig | null> {
    const integrations = await this.safeReadIntegrations();
    return integrations.find((i) => i.type === type) || null;
  }

  async createIntegration(
    dto: CreateIntegrationConfigDto,
  ): Promise<IntegrationConfig> {
    const integrations = await this.safeReadIntegrations();
    const exists = integrations.find((i) => i.type === dto.type);
    if (exists) throw new Error(`Integration type ${dto.type} already exists`);

    const now = new Date();
    const newIntegration: IntegrationConfig = {
      id: this.encryption.generateSecureToken(16),
      name: dto.name,
      type: dto.type,
      enabled: dto.enabled ?? true,
      apiKey: dto.apiKey || undefined,
      baseUrl: dto.baseUrl || '',
      settings: dto.settings || {},
      status: 'DISCONNECTED',
      createdAt: now,
      updatedAt: now,
    };

    integrations.push(newIntegration);
    await this.saveIntegrations(integrations);
    return { ...newIntegration, apiKey: '[ENCRYPTED]' };
  }

  async updateIntegration(
    id: string,
    dto: UpdateIntegrationConfigDto,
  ): Promise<IntegrationConfig> {
    const integrations = await this.safeReadIntegrations();
    const index = integrations.findIndex((i) => i.id === id);

    if (index === -1) {
      this.logger.warn(`Integration ${id} not found — creating new entry`);
      const created = await this.createIntegration({
        ...dto,
        name: dto.name || id,
        // Default safely to OPENAI type to satisfy the union
        type: 'OPENAI',
      });
      return created;
    }

    const integration = integrations[index];
    integrations[index] = {
      ...integration,
      ...dto,
      apiKey: dto.apiKey || integration.apiKey,
      updatedAt: new Date(),
    };

    await this.saveIntegrations(integrations);
    return { ...integrations[index], apiKey: '[ENCRYPTED]' };
  }

  async deleteIntegration(id: string): Promise<void> {
    const integrations = await this.safeReadIntegrations();
    const filtered = integrations.filter((i) => i.id !== id);
    await this.saveIntegrations(filtered);
  }

  async getDecryptedApiKey(
    type: string,
  ): Promise<string | null> {
    const integrations = await this.safeReadIntegrations();
    const integration = integrations.find((i) => i.type === type && i.enabled);
    if (!integration?.apiKey) return null;

    return integration.apiKey;
  }

  async updateIntegrationStatus(
    id: string,
    status: IntegrationConfig['status'],
    error?: string,
  ): Promise<void> {
    const integrations = await this.safeReadIntegrations();
    const integration = integrations.find((i) => i.id === id);
    if (!integration) return;

    integration.status = status;
    integration.lastError = error;
    integration.lastTested = new Date();
    integration.updatedAt = new Date();
    await this.saveIntegrations(integrations);
  }

  // ============================================================
  // 🏢 PRACTICE SETTINGS
  // ============================================================

  async getPracticeSettings(): Promise<PracticeSettings> {
    try {
      const data = await this.fileStorage.readJson<PracticeSettings>(
        'config',
        'practice-settings',
      );
      if (data) return data;
    } catch {
      this.logger.warn('Missing practice-settings.json — initializing default');
    }

    const defaultSettings = await this.initializeDefaultPracticeSettings();
    await this.fileStorage.writeJson('config', 'practice-settings', defaultSettings);
    return defaultSettings;
  }

  async updatePracticeSettings(
    dto: UpdatePracticeSettingsDto,
  ): Promise<PracticeSettings> {
    const current = await this.getPracticeSettings();
    const updated: PracticeSettings = {
      ...current,
      ...dto,
      systemSettings: {
        ...current.systemSettings,
        ...dto.systemSettings,
        backupRetentionDays:
          dto.systemSettings?.backupRetentionDays ??
          current.systemSettings.backupRetentionDays,
        autoBackupEnabled:
          dto.systemSettings?.autoBackupEnabled ??
          current.systemSettings.autoBackupEnabled,
        auditLogRetentionDays:
          dto.systemSettings?.auditLogRetentionDays ??
          current.systemSettings.auditLogRetentionDays,
        defaultServiceFrequency:
          dto.systemSettings?.defaultServiceFrequency ??
          current.systemSettings.defaultServiceFrequency,
        taskGenerationWindowDays:
          dto.systemSettings?.taskGenerationWindowDays ??
          current.systemSettings.taskGenerationWindowDays ?? 60,
      },
      updatedAt: new Date(),
    };
    await this.fileStorage.writeJson('config', 'practice-settings', updated);
    return updated;
  }

  // ============================================================
  // 🎨 BRANDING (Practice Logo)
  // ============================================================

  async getBrandingLogo(): Promise<string | null> {
    try {
      const saved = await this.fileStorage.readJson<{ dataUrl?: string }>(
        'config',
        'branding-logo',
      );
      return saved?.dataUrl || null;
    } catch (e) {
      this.logger.warn('No branding logo set; returning null');
      return null;
    }
  }

  async setBrandingLogo(dataUrl: string | null): Promise<string | null> {
    try {
      if (!dataUrl) {
        // Clear branding file by writing empty payload
        await this.fileStorage.writeJson('config', 'branding-logo', { dataUrl: null });
        return null;
      }
      // Basic size guard (avoid mega-large data URLs)
      if (dataUrl.length > 2_000_000) {
        throw new Error('Logo is too large; please upload a smaller image.');
      }
      await this.fileStorage.writeJson('config', 'branding-logo', { dataUrl });
      return dataUrl;
    } catch (e) {
      this.logger.error('Failed to set branding logo', e as any);
      throw e;
    }
  }

  // ============================================================
  // 🧩 INTERNAL HELPERS
  // ============================================================

  private async safeReadIntegrations(): Promise<IntegrationConfig[]> {
    try {
      const data = await this.fileStorage.readJson<IntegrationConfig[]>(
        'config',
        'integrations',
      );
      if (!Array.isArray(data)) throw new Error('Invalid integrations data');
      return data;
    } catch {
      return this.initializeDefaultIntegrations();
    }
  }

  private async saveIntegrations(data: IntegrationConfig[]): Promise<void> {
    await this.fileStorage.writeJson('config', 'integrations', data);
  }

  // ============================================================
  // 🔧 DEFAULTS
  // ============================================================

  private async initializeDefaultIntegrations(): Promise<IntegrationConfig[]> {
    const now = new Date();
    const defaults: IntegrationConfig[] = [
      {
        id: this.encryption.generateSecureToken(16),
        name: 'OpenAI GPT',
        type: 'OPENAI',
        enabled: !!process.env.OPENAI_API_KEY,
        apiKey: process.env.OPENAI_API_KEY || undefined,
        baseUrl: 'https://api.openai.com/v1',
        settings: { model: 'gpt-4' },
        status: process.env.OPENAI_API_KEY ? 'CONNECTED' : 'DISCONNECTED',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: this.encryption.generateSecureToken(16),
        name: 'Companies House',
        type: 'COMPANIES_HOUSE',
        enabled: !!process.env.COMPANIES_HOUSE_API_KEY,
        apiKey: process.env.COMPANIES_HOUSE_API_KEY || undefined,
        baseUrl: 'https://api.company-information.service.gov.uk',
        settings: { rateLimit: 600 },
        status: process.env.COMPANIES_HOUSE_API_KEY ? 'CONNECTED' : 'DISCONNECTED',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: this.encryption.generateSecureToken(16),
        name: 'GOV.UK Notify',
        type: 'GOV_NOTIFY',
        enabled: !!process.env.GOVUK_NOTIFY_API_KEY,
        apiKey: process.env.GOVUK_NOTIFY_API_KEY || undefined,
        baseUrl: 'https://api.notifications.service.gov.uk',
        settings: {},
        status: process.env.GOVUK_NOTIFY_API_KEY ? 'CONNECTED' : 'DISCONNECTED',
        createdAt: now,
        updatedAt: now,
      },
    ];

    await this.saveIntegrations(defaults);
    this.logger.log('Default integrations initialized');
    return defaults;
  }

  private async initializeDefaultPracticeSettings(): Promise<PracticeSettings> {
    const now = new Date();
    const defaultSettings: PracticeSettings = {
      id: this.encryption.generateSecureToken(16),
      practiceName: 'MDJ Practice',
      practiceEmail: 'admin@example.com',
      practicePhone: '',
      defaultPortfolioCode: 1,
      portfolios: [
        {
          code: 1,
          name: 'Main Portfolio',
          description: 'Default portfolio',
          enabled: true,
          clientCount: 0,
        },
      ],
      systemSettings: {
        backupRetentionDays: 30,
        autoBackupEnabled: true,
        auditLogRetentionDays: 365,
        defaultServiceFrequency: 'ANNUAL',
        taskGenerationWindowDays: 60,
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('config', 'practice-settings', defaultSettings);
    this.logger.log('Default practice settings initialized');
    return defaultSettings;
  }

  private createDefaultIntegrationFallback(id: string): IntegrationConfig {
    const now = new Date();
    return {
      id,
      name: id,
      type: 'OPENAI', // safe default to satisfy the union
      enabled: false,
      baseUrl: '',
      settings: {},
      status: 'DISCONNECTED',
      createdAt: now,
      updatedAt: now,
    };
  }
}
