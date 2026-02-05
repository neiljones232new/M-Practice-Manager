export interface Document {
  id: string;
  title: string;
  kind: string;
  path: string;
  mimeType?: string;
  size?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
  clientRef?: string;
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
  kind?: string;
  dateFrom?: Date;
  dateTo?: Date;
  mimeType?: string;
  search?: string;
}

export interface CreateDocumentDto {
  originalName: string;
  mimeType: string;
  clientId?: string;
  category?: string;
}

export interface UpdateDocumentDto {
  title?: string;
  kind?: string;
  clientId?: string;
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
