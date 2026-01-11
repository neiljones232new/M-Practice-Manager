export interface GeneratedLetter {
  id: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  clientId: string;
  clientName: string;
  serviceId?: string;
  serviceName?: string;
  documentId: string;            // Link to Documents module
  placeholderValues: Record<string, any>;
  generatedBy: string;
  generatedAt: Date;
  status: LetterStatus;
  downloadCount: number;
  lastDownloadedAt?: Date;
}

export enum LetterStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  DOWNLOADED = 'DOWNLOADED',
  SENT = 'SENT',
  ARCHIVED = 'ARCHIVED'
}

export interface GenerateLetterDto {
  templateId: string;
  clientId: string;
  serviceId?: string;
  placeholderValues?: Record<string, any>;
  outputFormats?: ('PDF' | 'DOCX')[];
  autoSave?: boolean;
}

export interface BulkGenerateLetterDto {
  templateId: string;
  clientIds: string[];
  serviceId?: string;
  placeholderValues?: Record<string, any>;
  outputFormats?: ('PDF' | 'DOCX')[];
}

export interface LetterFilters {
  clientId?: string;
  serviceId?: string;
  templateId?: string;
  status?: LetterStatus;
  generatedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface BulkGenerationResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BulkGenerationItem[];
  zipFileId?: string;
  summary: string;
}

export interface BulkGenerationItem {
  clientId: string;
  clientName: string;
  success: boolean;
  letterId?: string;
  error?: string;
}

export interface LetterDownloadResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}
