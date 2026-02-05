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

export interface LetterDownloadResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}
