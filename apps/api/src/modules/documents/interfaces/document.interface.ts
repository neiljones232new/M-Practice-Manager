export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  clientId?: string;
  serviceId?: string;
  taskId?: string;
  category: DocumentCategory;
  tags: string[];
  description?: string;
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt: Date;
  filePath: string;
  checksum: string;
  isArchived: boolean;
  metadata?: DocumentMetadata;
}

export interface DocumentMetadata {
  pageCount?: number;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  createdDate?: Date;
  modifiedDate?: Date;
  application?: string;
  version?: string;
  // Template-generated document metadata
  templateId?: string;
  templateName?: string;
  templateVersion?: number;
  generatedBy?: string;
  generatedAt?: Date;
  placeholderValues?: Record<string, any>;
  [key: string]: any;
}

export enum DocumentCategory {
  ACCOUNTS = 'ACCOUNTS',
  VAT = 'VAT',
  PAYROLL = 'PAYROLL',
  CORRESPONDENCE = 'CORRESPONDENCE',
  CONTRACTS = 'CONTRACTS',
  COMPLIANCE = 'COMPLIANCE',
  REPORTS = 'REPORTS',
  INVOICES = 'INVOICES',
  RECEIPTS = 'RECEIPTS',
  BANK_STATEMENTS = 'BANK_STATEMENTS',
  OTHER = 'OTHER'
}

export interface DocumentFilters {
  clientId?: string;
  serviceId?: string;
  taskId?: string;
  category?: DocumentCategory;
  tags?: string[];
  uploadedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  mimeType?: string;
  isArchived?: boolean;
  search?: string;
}

export interface CreateDocumentDto {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  clientId?: string;
  serviceId?: string;
  taskId?: string;
  category: DocumentCategory;
  tags?: string[];
  description?: string;
  uploadedBy: string;
}

export interface UpdateDocumentDto {
  category?: DocumentCategory;
  tags?: string[];
  description?: string;
  clientId?: string;
  serviceId?: string;
  taskId?: string;
  isArchived?: boolean;
  metadata?: DocumentMetadata;
}

export interface DocumentSearchResult {
  document: Document;
  relevanceScore: number;
  matchedFields: string[];
}

export interface DocumentUploadResult {
  document: Document;
  success: boolean;
  error?: string;
}

export interface BulkDocumentOperation {
  documentIds: string[];
  operation: 'archive' | 'unarchive' | 'delete' | 'tag' | 'untag' | 'move';
  parameters?: {
    tags?: string[];
    clientId?: string;
    category?: DocumentCategory;
  };
}