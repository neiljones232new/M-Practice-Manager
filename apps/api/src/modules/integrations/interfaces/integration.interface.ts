export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'OPENAI' | 'COMPANIES_HOUSE' | 'HMRC' | 'GOV_NOTIFY' | 'XERO';
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  settings: Record<string, any>;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'TESTING';
  lastTested?: Date;
  lastError?: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
    currentUsage: number;
    resetTime: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntegrationConfigDto {
  name: string;
  type: 'OPENAI' | 'COMPANIES_HOUSE' | 'HMRC' | 'GOV_NOTIFY' | 'XERO';
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  settings?: Record<string, any>;
}

export interface UpdateIntegrationConfigDto {
  name?: string;
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  settings?: Record<string, any>;
}

export interface IntegrationTestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  details?: Record<string, any>;
}

export interface IntegrationHealthStatus {
  id: string;
  name: string;
  type: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'TESTING';
  lastTested?: Date;
  responseTime?: number;
  error?: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
    currentUsage: number;
    resetTime: Date;
  };
}

export interface PracticeSettings {
  id: string;
  practiceName: string;
  practiceAddress?: string;
  practicePhone?: string;
  practiceEmail?: string;
  practiceWebsite?: string;
  defaultPortfolioCode: number;
  portfolios: Portfolio[];
  systemSettings: {
    backupRetentionDays: number;
    autoBackupEnabled: boolean;
    auditLogRetentionDays: number;
    defaultTaskAssignee?: string;
    defaultServiceFrequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
    /** Number of days ahead to auto-generate upcoming tasks (e.g., 60) */
    taskGenerationWindowDays?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Portfolio {
  code: number;
  name: string;
  description?: string;
  enabled: boolean;
  clientCount: number;
}

export interface CreatePracticeSettingsDto {
  practiceName: string;
  practiceAddress?: string;
  practicePhone?: string;
  practiceEmail?: string;
  practiceWebsite?: string;
  defaultPortfolioCode?: number;
  systemSettings?: {
    backupRetentionDays?: number;
    autoBackupEnabled?: boolean;
    auditLogRetentionDays?: number;
    defaultTaskAssignee?: string;
    defaultServiceFrequency?: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
    taskGenerationWindowDays?: number;
  };
}

export interface UpdatePracticeSettingsDto {
  practiceName?: string;
  practiceAddress?: string;
  practicePhone?: string;
  practiceEmail?: string;
  practiceWebsite?: string;
  defaultPortfolioCode?: number;
  systemSettings?: {
    backupRetentionDays?: number;
    autoBackupEnabled?: boolean;
    auditLogRetentionDays?: number;
    defaultTaskAssignee?: string;
    defaultServiceFrequency?: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
    taskGenerationWindowDays?: number;
  };
}

export interface IntegrationConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  settings: Record<string, any>;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'TESTING';
  lastTested?: Date;
  lastError?: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
    currentUsage: number;
    resetTime: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntegrationConfigDto {
  name: string;
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  settings?: Record<string, any>;
}

export interface UpdateIntegrationConfigDto {
  name?: string;
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  settings?: Record<string, any>;
}
