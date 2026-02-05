export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  isArchived: boolean;
  uploadedById?: string;
  createdAt: Date;
  updatedAt: Date;
  clientId?: string;
}

export enum DocumentCategory {
  TAX = 'TAX',
  ACCOUNTS = 'ACCOUNTS',
  COMPLIANCE = 'COMPLIANCE',
  REPORTS = 'REPORTS',
  INVOICES = 'INVOICES',
  RECEIPTS = 'RECEIPTS',
  BANK_STATEMENTS = 'BANK_STATEMENTS',
  OTHER = 'OTHER'
}

export interface DocumentFilters {
  clientId?: string;
  category?: DocumentCategory;
  uploadedById?: string;
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
  category: DocumentCategory;
  uploadedById?: string;
}

export interface UpdateDocumentDto {
  category?: DocumentCategory;
  clientId?: string;
  isArchived?: boolean;
  uploadedById?: string;
}

export interface DocumentSearchResult {
  document: Document;
  relevanceScore: number;
  matchedFields: string[];
}

export interface DocumentUploadResult {
  document: Document | null;
  success: boolean;
  error?: string;
}

export interface BulkDocumentOperation {
  documentIds: string[];
  operation: 'archive' | 'unarchive' | 'delete' | 'move';
  parameters?: {
    clientId?: string;
    category?: DocumentCategory;
  };
}
