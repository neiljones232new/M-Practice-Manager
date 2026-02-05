export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  type: TemplateType;
  content: string;
  isActive?: boolean;
  placeholders?: TemplatePlaceholder[];
  metadata?: TemplateMetadata;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum TemplateCategory {
  TAX = 'TAX',
  HMRC = 'HMRC',
  VAT = 'VAT',
  COMPLIANCE = 'COMPLIANCE',
  GENERAL = 'GENERAL',
  ENGAGEMENT = 'ENGAGEMENT',
  CLIENT = 'CLIENT',
  REPORTS = 'REPORTS',
  COMMERCIAL = 'COMMERCIAL',
}

export enum TemplateType {
  DOCUMENT = 'DOCUMENT',
  TASK = 'TASK',
  SERVICE = 'SERVICE',
  EMAIL = 'EMAIL',
}

export interface TemplatePlaceholder {
  key: string;
  label: string;
  type: PlaceholderType;
  required: boolean;
  defaultValue?: string;
  format?: string;
  source?: PlaceholderSource;
  sourcePath?: string;
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
  CONDITIONAL = 'CONDITIONAL',
}

export enum PlaceholderSource {
  CLIENT = 'CLIENT',
  PROFILE = 'PROFILE',
  SERVICE = 'SERVICE',
  USER = 'USER',
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
  PRACTICE = 'PRACTICE',
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
  type?: TemplateType;
  search?: string;
  createdById?: string;
}

export interface CreateTemplateDto {
  name: string;
  description: string;
  category: TemplateCategory;
  type: TemplateType;
  content: string;
  placeholders?: TemplatePlaceholder[];
  metadata?: TemplateMetadata;
  createdById?: string;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  type?: TemplateType;
  content?: string;
  placeholders?: TemplatePlaceholder[];
  metadata?: TemplateMetadata;
}

export interface ParsedTemplate {
  content: string;
  placeholders?: TemplatePlaceholder[];
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
