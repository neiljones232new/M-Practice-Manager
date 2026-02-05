import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
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
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
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
    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const list = await this.safeReadIntegrations();
      const integration = list.find((i) => i.id === id);
      if (!integration) {
        this.logger.warn(`Integration ${id} not found — returning fallback`);
        return this.createDefaultIntegrationFallback(id);
      }
      return { ...integration, apiKey: integration.apiKey ? '[ENCRYPTED]' : undefined };
    }

    const integration = await model.findUnique({ where: { id } });

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
    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const list = await this.safeReadIntegrations();
      return list.find((i) => i.type === type) || null;
    }
    return model.findFirst({ where: { type } });
  }

  async createIntegration(
    dto: CreateIntegrationConfigDto,
  ): Promise<IntegrationConfig> {
    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const list = await this.safeReadIntegrations();
      if (list.find((i) => i.type === dto.type)) {
        throw new Error(`Integration type ${dto.type} already exists`);
      }
      const now = new Date();
      const created: IntegrationConfig = {
        id: (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? (globalThis.crypto as any).randomUUID()
          : `int_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
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
      await this.writeIntegrationsToStorage([...list, created]);
      return { ...created, apiKey: '[ENCRYPTED]' };
    }

    const exists = await model.findFirst({ where: { type: dto.type } });
    if (exists) throw new Error(`Integration type ${dto.type} already exists`);

    const created = await model.create({
      data: {
      name: dto.name,
      type: dto.type,
      enabled: dto.enabled ?? true,
      apiKey: dto.apiKey || undefined,
      baseUrl: dto.baseUrl || '',
      settings: dto.settings || {},
      status: 'DISCONNECTED',
      },
    });

    return { ...created, apiKey: '[ENCRYPTED]' };
  }

  async updateIntegration(
    id: string,
    dto: UpdateIntegrationConfigDto,
  ): Promise<IntegrationConfig> {
    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const list = await this.safeReadIntegrations();
      const idx = list.findIndex((i) => i.id === id);
      const now = new Date();
      const updated: IntegrationConfig = idx >= 0
        ? {
            ...list[idx],
            name: dto.name ?? list[idx].name,
            enabled: dto.enabled ?? list[idx].enabled,
            apiKey: dto.apiKey ?? list[idx].apiKey,
            baseUrl: dto.baseUrl ?? list[idx].baseUrl,
            settings: dto.settings ?? list[idx].settings,
            updatedAt: now,
          }
        : {
            id,
            name: dto.name || id,
            type: 'OPENAI',
            enabled: dto.enabled ?? true,
            apiKey: dto.apiKey || undefined,
            baseUrl: dto.baseUrl || '',
            settings: dto.settings || {},
            status: 'DISCONNECTED',
            createdAt: now,
            updatedAt: now,
          };

      const next = idx >= 0
        ? [...list.slice(0, idx), updated, ...list.slice(idx + 1)]
        : [...list, updated];
      await this.writeIntegrationsToStorage(next);
      return { ...updated, apiKey: '[ENCRYPTED]' };
    }

    const existing = await model.findUnique({ where: { id } });

    if (!existing) {
      this.logger.warn(`Integration ${id} not found — creating new entry`);
      const created = await this.createIntegration({
        ...dto,
        name: dto.name || id,
        // Default safely to OPENAI type to satisfy the union
        type: 'OPENAI',
      });
      return created;
    }

    const updated = await model.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        enabled: dto.enabled ?? existing.enabled,
        apiKey: dto.apiKey ?? existing.apiKey,
        baseUrl: dto.baseUrl ?? existing.baseUrl,
        settings: dto.settings ?? existing.settings,
      },
    });

    return { ...updated, apiKey: '[ENCRYPTED]' };
  }

  async deleteIntegration(id: string): Promise<void> {
    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const list = await this.safeReadIntegrations();
      await this.writeIntegrationsToStorage(list.filter((i) => i.id !== id));
      return;
    }
    await model.delete({ where: { id } });
  }

  async getDecryptedApiKey(
    type: string,
  ): Promise<string | null> {
    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const list = await this.safeReadIntegrations();
      const integration = list.find((i) => i.type === type && i.enabled);
      return integration?.apiKey || null;
    }

    const integration = await model.findFirst({ where: { type, enabled: true } });
    if (!integration?.apiKey) return null;

    return integration.apiKey;
  }

  async updateIntegrationStatus(
    id: string,
    status: IntegrationConfig['status'],
    error?: string,
  ): Promise<void> {
    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const list = await this.safeReadIntegrations();
      const idx = list.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const updated = {
        ...list[idx],
        status,
        lastError: error,
        lastTested: new Date(),
        updatedAt: new Date(),
      };
      const next = [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
      await this.writeIntegrationsToStorage(next);
      return;
    }

    const integration = await model.findUnique({ where: { id } });
    if (!integration) return;

    await model.update({
      where: { id },
      data: {
        status,
        lastError: error,
        lastTested: new Date(),
      },
    });
  }

  // ============================================================
  // 🏢 PRACTICE SETTINGS
  // ============================================================

  async getPracticeSettings(): Promise<PracticeSettings> {
    const config = await this.ensurePracticeConfig();
    const settings = (config.settings || {}) as PracticeSettings;
    return this.attachPortfolioStats({
      ...settings,
      id: config.id,
    });
  }

  async updatePracticeSettings(
    dto: UpdatePracticeSettingsDto,
  ): Promise<PracticeSettings> {
    const config = await this.ensurePracticeConfig();
    const current = (config.settings || {}) as PracticeSettings;
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
    const model = (this.prisma as any).practiceConfig;
    if (!model) {
      await this.writePracticeSettingsToStorage(updated);
    } else {
      await model.update({ where: { id: config.id }, data: { settings: updated } });
    }

    return this.attachPortfolioStats({
      ...updated,
      id: config.id,
    });
  }

  // ============================================================
  // 🎨 BRANDING (Practice Logo)
  // ============================================================

  async getBrandingLogo(): Promise<string | null> {
    const config = await this.ensurePracticeConfig();
    return config.brandingLogoDataUrl || null;
  }

  async setBrandingLogo(dataUrl: string | null): Promise<string | null> {
    try {
      if (!dataUrl) {
        const config = await this.ensurePracticeConfig();
        const model = (this.prisma as any).practiceConfig;
        if (!model) {
          await this.writeBrandingLogoToStorage(null);
        } else {
          await model.update({
            where: { id: config.id },
            data: { brandingLogoDataUrl: null },
          });
        }
        return null;
      }
      // Basic size guard (avoid mega-large data URLs)
      if (dataUrl.length > 2_000_000) {
        throw new Error('Logo is too large; please upload a smaller image.');
      }
      const config = await this.ensurePracticeConfig();
      const model = (this.prisma as any).practiceConfig;
      if (!model) {
        await this.writeBrandingLogoToStorage(dataUrl);
      } else {
        await model.update({
          where: { id: config.id },
          data: { brandingLogoDataUrl: dataUrl },
        });
      }
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
    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const stored = await this.readIntegrationsFromStorage();
      if (!stored.length) {
        return this.initializeDefaultIntegrations();
      }
      return stored;
    }

    const data = await model.findMany({ orderBy: { name: 'asc' } });
    if (!Array.isArray(data) || data.length === 0) {
      return this.initializeDefaultIntegrations();
    }
    return data;
  }

  // ============================================================
  // 🔧 DEFAULTS
  // ============================================================

  private async initializeDefaultIntegrations(): Promise<IntegrationConfig[]> {
    const defaults: Array<Omit<IntegrationConfig, 'id'>> = [
      {
        name: 'OpenAI GPT',
        type: 'OPENAI',
        enabled: !!process.env.OPENAI_API_KEY,
        apiKey: process.env.OPENAI_API_KEY || undefined,
        baseUrl: 'https://api.openai.com/v1',
        settings: { model: 'gpt-4' },
        status: process.env.OPENAI_API_KEY ? 'CONNECTED' : 'DISCONNECTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Companies House',
        type: 'COMPANIES_HOUSE',
        enabled: !!process.env.COMPANIES_HOUSE_API_KEY,
        apiKey: process.env.COMPANIES_HOUSE_API_KEY || undefined,
        baseUrl: 'https://api.company-information.service.gov.uk',
        settings: { rateLimit: 600 },
        status: process.env.COMPANIES_HOUSE_API_KEY ? 'CONNECTED' : 'DISCONNECTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'GOV.UK Notify',
        type: 'GOV_NOTIFY',
        enabled: !!process.env.GOVUK_NOTIFY_API_KEY,
        apiKey: process.env.GOVUK_NOTIFY_API_KEY || undefined,
        baseUrl: 'https://api.notifications.service.gov.uk',
        settings: {},
        status: process.env.GOVUK_NOTIFY_API_KEY ? 'CONNECTED' : 'DISCONNECTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const model = (this.prisma as any).integrationConfig;
    if (!model) {
      const now = new Date();
      const list: IntegrationConfig[] = defaults.map((d) => ({
        id: `int_${Math.random().toString(36).slice(2, 10)}`,
        ...d,
        createdAt: d.createdAt || now,
        updatedAt: d.updatedAt || now,
      }));
      await this.writeIntegrationsToStorage(list);
      this.logger.log('Default integrations initialized (file storage)');
      return list;
    }

    await model.createMany({
      data: defaults.map(({ createdAt, updatedAt, ...rest }) => rest),
      skipDuplicates: true,
    });
    this.logger.log('Default integrations initialized');
    return model.findMany({ orderBy: { name: 'asc' } });
  }

  private async initializeDefaultPracticeSettings(): Promise<PracticeSettings> {
    const now = new Date();
    const defaultSettings: PracticeSettings = {
      id: '',
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

    this.logger.log('Default practice settings initialized');
    return defaultSettings;
  }

  private async ensurePracticeConfig(): Promise<any> {
    const model = (this.prisma as any).practiceConfig;
    if (!model) {
      const settings = (await this.readPracticeSettingsFromStorage()) || (await this.initializeDefaultPracticeSettings());
      const brandingLogoDataUrl = await this.readBrandingLogoFromStorage();
      return {
        id: 'practice-settings',
        settings,
        brandingLogoDataUrl,
      };
    }

    let config = await model.findFirst();
    if (config) return config;

    const defaults = await this.initializeDefaultPracticeSettings();
    config = await model.create({
      data: { settings: defaults, brandingLogoDataUrl: null },
    });
    return config;
  }

  private async attachPortfolioStats(settings: PracticeSettings): Promise<PracticeSettings> {
    const portfolios = await (this.prisma as any).portfolio.findMany({
      orderBy: { code: 'asc' },
    });
    const counts = await (this.prisma as any).client.groupBy({
      by: ['portfolioCode'],
      _count: { _all: true },
    });
    const countMap = new Map<number, number>(
      counts.map((c: any) => [c.portfolioCode, c._count._all])
    );

    return {
      ...settings,
      portfolios: portfolios.map((p: any) => ({
        code: p.code,
        name: p.name,
        description: p.description,
        enabled: true,
        clientCount: countMap.get(p.code) ?? 0,
      })),
    };
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

  private async readIntegrationsFromStorage(): Promise<IntegrationConfig[]> {
    try {
      const data = await this.fileStorageService.readJson<IntegrationConfig[]>('config', 'integrations');
      if (Array.isArray(data)) return data;
      return [];
    } catch {
      return [];
    }
  }

  private async writeIntegrationsToStorage(list: IntegrationConfig[]): Promise<void> {
    await this.fileStorageService.writeJson('config', 'integrations', list);
  }

  private async readPracticeSettingsFromStorage(): Promise<PracticeSettings | null> {
    try {
      const data = await this.fileStorageService.readJson<PracticeSettings>('config', 'practice-settings');
      return data || null;
    } catch {
      return null;
    }
  }

  private async writePracticeSettingsToStorage(settings: PracticeSettings): Promise<void> {
    await this.fileStorageService.writeJson('config', 'practice-settings', settings);
  }

  private async readBrandingLogoFromStorage(): Promise<string | null> {
    try {
      const data = await this.fileStorageService.readJson<{ dataUrl: string | null }>('config', 'branding-logo');
      return data?.dataUrl ?? null;
    } catch {
      return null;
    }
  }

  private async writeBrandingLogoToStorage(dataUrl: string | null): Promise<void> {
    await this.fileStorageService.writeJson('config', 'branding-logo', { dataUrl });
  }
}
