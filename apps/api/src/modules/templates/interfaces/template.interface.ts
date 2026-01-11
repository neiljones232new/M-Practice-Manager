export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fileName: string;
  filePath: string;
  fileFormat: 'DOCX' | 'MD';
  placeholders: TemplatePlaceholder[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: TemplateMetadata;
}

export enum TemplateCategory {
  TAX = 'TAX',
  HMRC = 'HMRC',
  VAT = 'VAT',
  COMPLIANCE = 'COMPLIANCE',
  GENERAL = 'GENERAL',
  ENGAGEMENT = 'ENGAGEMENT',
  CLIENT = 'CLIENT'
}

export interface TemplatePlaceholder {
  key: string;                    // e.g., "clientName"
  label: string;                  // e.g., "Client Name"
  type: PlaceholderType;
  required: boolean;
  defaultValue?: string;
  format?: string;                // For dates, currency, etc.
  source?: PlaceholderSource;     // Where to get the data
  sourcePath?: string;            // Path to data (e.g., "client.name")
  validation?: PlaceholderValidation;
}

export enum PlaceholderType {
  TEXT = 'TEXT',
  DATE = 'DATE',
  CURRENCY = 'CURRENCY',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  ADDRESS = 'ADDRESS',
  LIST = 'LIST',
  CONDITIONAL = 'CONDITIONAL'
}

export enum PlaceholderSource {
  CLIENT = 'CLIENT',
  SERVICE = 'SERVICE',
  USER = 'USER',
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM'
}

export interface PlaceholderValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface TemplateMetadata {
  author?: string;
  tags?: string[];
  usageCount?: number;
  lastUsed?: Date;
  notes?: string;
}

export interface TemplateFilters {
  category?: TemplateCategory;
  isActive?: boolean;
  search?: string;
  tags?: string[];
  createdBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateTemplateDto {
  name: string;
  description: string;
  category: TemplateCategory;
  fileName: string;
  fileFormat: 'DOCX' | 'MD';
  placeholders?: TemplatePlaceholder[];
  isActive?: boolean;
  createdBy: string;
  metadata?: TemplateMetadata;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  placeholders?: TemplatePlaceholder[];
  isActive?: boolean;
  metadata?: TemplateMetadata;
}

export interface ParsedTemplate {
  content: string;
  placeholders: TemplatePlaceholder[];
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}
