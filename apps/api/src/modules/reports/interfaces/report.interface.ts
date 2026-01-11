export interface ReportMetadata {
  id: string;
  clientId: string;
  calculationId?: string;
  templateId: string;
  title: string;
  format: 'PDF' | 'HTML';
  filePath?: string;
  generatedAt: Date;
  generatedBy: string;
  content: any;
}

export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  placeholders: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}

export interface ReportGenerationOptions {
  includeBranding?: boolean;
  includeCharts?: boolean;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  outputPath?: string;
}

export interface ReportStats {
  totalReports: number;
  reportsByFormat: Record<string, number>;
  reportsByType: Record<string, number>;
  recentReports: ReportMetadata[];
}

export interface BulkReportRequest {
  clientId: string;
  reports: Array<{
    type: 'client-pack' | 'tax-strategy' | 'company-profile';
    title: string;
    format: 'PDF' | 'HTML';
    calculationIds?: string[];
    includeBranding?: boolean;
    includeCharts?: boolean;
  }>;
}

export interface PDFGenerationResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  error?: string;
}