import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { PlaceholderService } from './placeholder.service';
import { TemplateParserService } from './template-parser.service';
import { DocumentGeneratorService } from './document-generator.service';
import { TemplateErrorHandlerService } from './template-error-handler.service';
import { DocumentsService } from '../documents/documents.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';
import {
  GeneratedLetter,
  GenerateLetterDto,
  LetterFilters,
  LetterStatus,
  LetterDownloadResult,
} from './interfaces';
import { PlaceholderContext } from './interfaces';
import { DocumentCategory } from '../documents/interfaces/document.interface';

@Injectable()
export class LetterGenerationService {
  private readonly logger = new Logger(LetterGenerationService.name);
  private readonly LETTERS_CATEGORY = 'generated-letters';

  constructor(
    private readonly templatesService: TemplatesService,
    private readonly placeholderService: PlaceholderService,
    private readonly templateParserService: TemplateParserService,
    private readonly documentGeneratorService: DocumentGeneratorService,
    private readonly documentsService: DocumentsService,
    private readonly clientsService: ClientsService,
    private readonly servicesService: ServicesService,
    private readonly fileStorageService: FileStorageService,
    private readonly auditService: AuditService,
    private readonly errorHandler: TemplateErrorHandlerService,
  ) {}

  /**
   * Generate a letter from a template for a specific client
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
   */
  async generateLetter(dto: GenerateLetterDto, userId: string): Promise<GeneratedLetter> {
    try {
      this.logger.log(`Generating letter: template=${dto.templateId}, client=${dto.clientId}`);

      // Step 1: Retrieve template
      const template = await this.templatesService.getTemplate(dto.templateId);
      
      if (template.isActive === false) {
        this.errorHandler.handleTemplateInactive(dto.templateId, template.name);
      }

      // Step 2: Get template content
      const templateContent = await this.templatesService.getTemplateContent(dto.templateId);

      // Step 3: Resolve placeholders
      const context: PlaceholderContext = {
        clientId: dto.clientId,
        serviceId: dto.serviceId,
        userId,
        manualValues: dto.placeholderValues,
      };

      const resolutionResult = await this.placeholderService.resolvePlaceholders(
        template.placeholders,
        context,
      );

      // Step 4: Validate required fields
      if (resolutionResult.missingRequired.length > 0) {
        this.errorHandler.handleMissingRequiredFields(resolutionResult.missingRequired);
      }

      // Step 5: Check for validation errors
      if (resolutionResult.errors.length > 0) {
        const validationErrors = resolutionResult.errors.map(e => ({
          field: e.key,
          message: e.message,
          code: e.code,
        }));
        this.errorHandler.handleValidationErrors(validationErrors);
      }

      // Step 6: Build values object with formatted values
      const values = this.buildTemplateValues(resolutionResult.placeholders);

      // Step 7: Populate template with values
      const populatedContent = this.documentGeneratorService.populateTemplate(
        templateContent,
        values,
      );

      // Step 8: Generate documents in requested formats
      const outputFormats = dto.outputFormats || ['PDF'];
      const generatedDocuments: Array<{ format: string; buffer: Buffer }> = [];

      for (const format of outputFormats) {
        if (format === 'PDF') {
          const pdfBuffer = await this.documentGeneratorService.generatePDF(
            populatedContent,
            template,
          );
          generatedDocuments.push({ format: 'PDF', buffer: pdfBuffer });
        } else if (format === 'DOCX') {
          const docxBuffer = await this.documentGeneratorService.generateDOCX(
            populatedContent,
            template,
          );
          generatedDocuments.push({ format: 'DOCX', buffer: docxBuffer });
        }
      }

      // Step 9: Get client and service names
      const client = await this.clientsService.findOne(dto.clientId);
      if (!client) {
        this.errorHandler.handleClientNotFound(dto.clientId);
      }

      let serviceName: string | undefined;
      if (dto.serviceId) {
        const service = await this.servicesService.findOne(dto.serviceId);
        serviceName = service?.kind;
      }

      // Step 10: Save documents if autoSave is enabled (default true)
      const autoSave = dto.autoSave !== false;
      let documentId: string | undefined;

      if (autoSave && generatedDocuments.length > 0) {
        // Save the first format (usually PDF) as the primary document
        const primaryDoc = generatedDocuments[0];
        const savedDoc = await this.saveGeneratedDocument(
          primaryDoc.buffer,
          template,
          client.name,
          client.id,
          dto.serviceId,
          primaryDoc.format,
          userId,
        );
        documentId = savedDoc.id;
      }

      // Step 11: Create GeneratedLetter record
      const generatedLetter = await this.createGeneratedLetterRecord(
        template,
        client.name,
        client.id,
        serviceName,
        dto.serviceId,
        documentId,
        resolutionResult.placeholders,
        userId,
      );

      this.logger.log(`Letter generated successfully: ${generatedLetter.id}`);

      return generatedLetter;
    } catch (error) {
      // Re-throw if it's already a handled error
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to generate letter: ${error.message}`, error.stack);
      this.errorHandler.handleDocumentGenerationError(dto.templateId, dto.clientId, error as Error);
    }
  }

  /**
   * Generate a preview of the letter without saving
   * Requirements: 2.5, 3.4
   */
  async previewLetter(dto: GenerateLetterDto, userId: string): Promise<string> {
    try {
      this.logger.log(`Generating letter preview: template=${dto.templateId}, client=${dto.clientId}`);

      // Step 1: Retrieve template
      const template = await this.templatesService.getTemplate(dto.templateId);

      // Step 2: Get template content
      const templateContent = await this.templatesService.getTemplateContent(dto.templateId);

      // Step 3: Resolve placeholders
      const context: PlaceholderContext = {
        clientId: dto.clientId,
        serviceId: dto.serviceId,
        userId,
        manualValues: dto.placeholderValues,
      };

      const resolutionResult = await this.placeholderService.resolvePlaceholders(
        template.placeholders,
        context,
      );

      // Step 4: Build values object with formatted values
      // For preview, we'll show placeholders even if they're missing
      const values = this.buildTemplateValues(resolutionResult.placeholders, true);

      // Step 5: Populate template with values
      const populatedContent = this.documentGeneratorService.populateTemplate(
        templateContent,
        values,
      );

      // Step 6: Convert to HTML for preview
      const htmlPreview = this.convertToHtmlPreview(populatedContent, template.name);

      return htmlPreview;
    } catch (error) {
      this.logger.error(`Failed to generate letter preview: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all generated letters with optional filters
   * Requirements: 5.1, 5.2
   */
  async getGeneratedLetters(filters: LetterFilters = {}): Promise<GeneratedLetter[]> {
    try {
      this.logger.log('Getting generated letters with filters:', filters);

      // Get all generated letters from storage
      const allLetters = await this.fileStorageService.searchFiles<GeneratedLetter>(
        this.LETTERS_CATEGORY,
        () => true,
      );

      const resolvedClient = filters.clientId ? await this.clientsService.findOne(filters.clientId) : null;
      const acceptableClientIds = filters.clientId
        ? new Set([filters.clientId, resolvedClient?.id, resolvedClient?.registeredNumber].filter(Boolean).map(String))
        : null;

      // Apply filters
      return this.applyLetterFilters(allLetters, filters, acceptableClientIds);
    } catch (error) {
      this.logger.error(`Failed to get generated letters: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a single generated letter by ID
   * Requirements: 5.1
   */
  async getGeneratedLetter(letterId: string): Promise<GeneratedLetter> {
    try {
      const letter = await this.fileStorageService.readJson<GeneratedLetter>(
        this.LETTERS_CATEGORY,
        letterId,
      );

      if (!letter) {
        this.errorHandler.handleLetterNotFound(letterId);
      }

      return letter;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get generated letter: ${error.message}`, error.stack);
      this.errorHandler.handleGenericError('retrieving letter', error as Error, { letterId });
    }
  }

  /**
   * Get letters for a specific client
   * Requirements: 5.1, 5.2
   */
  async getLettersByClient(clientId: string): Promise<GeneratedLetter[]> {
    return this.getGeneratedLetters({ clientId });
  }

  /**
   * Get letters for a specific service
   * Requirements: 11.4
   */
  async getLettersByService(serviceId: string): Promise<GeneratedLetter[]> {
    return this.getGeneratedLetters({ serviceId });
  }

  /**
   * Download a generated letter
   * Requirements: 8.1, 8.2, 8.3
   */
  async downloadLetter(letterId: string, format: 'PDF' | 'DOCX', userId: string = 'system'): Promise<LetterDownloadResult> {
    try {
      this.logger.log(`Downloading letter: ${letterId}, format: ${format}`);

      // Get the generated letter record
      const letter = await this.getGeneratedLetter(letterId);

      // Get the document from Documents module
      if (!letter.documentId) {
        throw new BadRequestException('Letter has no associated document');
      }

      const { buffer } = await this.documentsService.getDocumentFile(letter.documentId);

      // Update download count
      letter.downloadCount++;
      letter.lastDownloadedAt = new Date();
      letter.status = LetterStatus.DOWNLOADED;
      await this.saveGeneratedLetterRecord(letter);

      // Audit log download
      await this.auditService.logEvent({
        actor: userId,
        actorType: 'USER',
        action: 'DOWNLOAD_LETTER',
        entity: 'LETTER',
        entityId: letterId,
        entityRef: `${letter.clientName} - ${letter.templateName}`,
        metadata: {
          format,
          downloadCount: letter.downloadCount,
          clientId: letter.clientId,
          clientName: letter.clientName,
          templateId: letter.templateId,
          templateName: letter.templateName,
        },
        severity: 'LOW',
        category: 'DATA',
      });

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${letter.templateName}_${letter.clientName}_${timestamp}.${format.toLowerCase()}`;

      const mimeType = format === 'PDF' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      return {
        buffer,
        filename,
        mimeType,
      };
    } catch (error) {
      this.logger.error(`Failed to download letter: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Save generated document to Documents module
   * Requirements: 4.1, 4.2, 4.3, 4.4
   * @private
   */
  private async saveGeneratedDocument(
    buffer: Buffer,
    template: any,
    clientName: string,
    clientId: string,
    serviceId: string | undefined,
    format: string,
    userId: string,
  ): Promise<any> {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${template.name}_${clientName}_${timestamp}.${format.toLowerCase()}`;

      const mimeType = format === 'PDF' ? 'application/pdf' : 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const createDocumentDto = {
        filename,
        originalName: filename,
        mimeType,
        size: buffer.length,
        clientId,
        category: DocumentCategory.REPORTS,
        uploadedById: userId,
      };

      const result = await this.documentsService.uploadDocument(buffer, createDocumentDto);

      if (!result.success || !result.document) {
        throw new BadRequestException('Failed to save generated document');
      }

      this.logger.log(`Document saved: ${result.document.id}`);

      return result.document;
    } catch (error) {
      this.logger.error(`Failed to save generated document: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a GeneratedLetter record
   * Requirements: 4.5, 5.1, 5.2
   * @private
   */
  private async createGeneratedLetterRecord(
    template: any,
    clientName: string,
    clientId: string,
    serviceName: string | undefined,
    serviceId: string | undefined,
    documentId: string | undefined,
    placeholders: Record<string, any>,
    userId: string,
  ): Promise<GeneratedLetter> {
    try {
      // Extract placeholder values
      const placeholderValues: Record<string, any> = {};
      for (const [key, resolved] of Object.entries(placeholders)) {
        placeholderValues[key] = (resolved as any).value;
      }

      const generatedLetter: GeneratedLetter = {
        id: `letter_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        templateId: template.id,
        templateName: template.name,
        templateVersion: template.version,
        clientId,
        clientName,
        serviceId,
        serviceName,
        documentId: documentId || '',
        placeholderValues,
        generatedBy: userId,
        generatedAt: new Date(),
        status: documentId ? LetterStatus.GENERATED : LetterStatus.DRAFT,
        downloadCount: 0,
      };

      // Save to storage
      await this.saveGeneratedLetterRecord(generatedLetter);

      this.logger.log(`Generated letter record created and saved: ${generatedLetter.id}`);

      // Audit log letter generation
      await this.auditService.logEvent({
        actor: userId,
        actorType: 'USER',
        action: 'GENERATE_LETTER',
        entity: 'LETTER',
        entityId: generatedLetter.id,
        entityRef: `${clientName} - ${template.name}`,
        metadata: {
          templateId: template.id,
          templateName: template.name,
          templateVersion: template.version,
          clientId,
          clientName,
          serviceId,
          serviceName,
          documentId,
          status: generatedLetter.status,
        },
        severity: 'LOW',
        category: 'DATA',
      });

      return generatedLetter;
    } catch (error) {
      this.logger.error(`Failed to create generated letter record: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Save a GeneratedLetter record to storage
   * Requirements: 4.5, 5.1, 5.2
   * @private
   */
  private async saveGeneratedLetterRecord(letter: GeneratedLetter): Promise<void> {
    try {
      await this.fileStorageService.writeJson(
        this.LETTERS_CATEGORY,
        letter.id,
        letter,
      );
      this.logger.debug(`Saved generated letter record: ${letter.id}`);
    } catch (error) {
      this.logger.error(`Failed to save generated letter record: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Apply filters to a list of generated letters
   * @private
   */
  private applyLetterFilters(letters: GeneratedLetter[], filters: LetterFilters, acceptableClientIds: Set<string> | null): GeneratedLetter[] {
    return letters.filter(letter => {
      // Filter by client ID
      if (filters.clientId) {
        if (!acceptableClientIds) return false;
        if (!acceptableClientIds.has(String(letter.clientId))) return false;
      }

      // Filter by service ID
      if (filters.serviceId && letter.serviceId !== filters.serviceId) {
        return false;
      }

      // Filter by template ID
      if (filters.templateId && letter.templateId !== filters.templateId) {
        return false;
      }

      // Filter by status
      if (filters.status && letter.status !== filters.status) {
        return false;
      }

      // Filter by generated by
      if (filters.generatedBy && letter.generatedBy !== filters.generatedBy) {
        return false;
      }

      // Filter by date range
      if (filters.dateFrom && new Date(letter.generatedAt) < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && new Date(letter.generatedAt) > filters.dateTo) {
        return false;
      }

      // Filter by search text
      if (filters.search) {
        const searchText = filters.search.toLowerCase();
        const searchableContent = [
          letter.clientName,
          letter.templateName,
          letter.serviceName || '',
        ].join(' ').toLowerCase();

        if (!searchableContent.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Convert populated content to HTML preview
   * @private
   */
  private convertToHtmlPreview(content: string, templateName: string): string {
    // Convert markdown-style content to HTML
    let html = content;

    // Convert headings
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

    // Convert bold text
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert line breaks to paragraphs
    const paragraphs = html.split('\n\n').map(p => {
      if (p.trim() && !p.startsWith('<h') && !p.startsWith('<strong>')) {
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      }
      return p;
    });

    html = paragraphs.join('\n');

    // Wrap in HTML document
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${templateName} - Preview</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .preview-container {
      background-color: white;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      margin-bottom: 20px;
    }
    h2 {
      color: #333;
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h3 {
      color: #555;
      font-size: 16px;
      margin-top: 15px;
      margin-bottom: 8px;
    }
    p {
      margin-bottom: 15px;
      color: #333;
    }
    strong {
      font-weight: bold;
    }
    .header {
      border-bottom: 2px solid #ddd;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .footer {
      border-top: 1px solid #ddd;
      padding-top: 10px;
      margin-top: 30px;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="header">
      <strong>MDJ Consultants</strong>
    </div>
    ${html}
    <div class="footer">
      ${templateName} - Preview Generated on ${new Date().toLocaleDateString('en-GB')}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Build template values from placeholder resolution
   * @private
   */
  private buildTemplateValues(placeholders: Record<string, any>, showMissing = false): Record<string, any> {
    const values: Record<string, any> = {};

    for (const [key, resolved] of Object.entries(placeholders)) {
      const formatted = resolved?.formattedValue ?? '';
      const value = showMissing && (formatted === '' || formatted === null || formatted === undefined)
        ? `[${key}]`
        : formatted;
      values[key] = value;

      if (key.includes('.')) {
        this.assignNestedValue(values, key, value);
      }
    }

    return values;
  }

  private assignNestedValue(target: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current: Record<string, any> = target;

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (!part) continue;

      if (i === parts.length - 1) {
        current[part] = value;
        return;
      }

      if (typeof current[part] !== 'object' || current[part] === null || Array.isArray(current[part])) {
        current[part] = {};
      }

      current = current[part];
    }
  }

}
