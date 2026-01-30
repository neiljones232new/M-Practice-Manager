import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { SearchService } from '../file-storage/search.service';
import { ConfigService } from '@nestjs/config';
import { ClientsService } from '../clients/clients.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import * as crypto from 'crypto';
import * as mime from 'mime-types';
import {
  Document,
  DocumentCategory,
  DocumentFilters,
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentSearchResult,
  DocumentUploadResult,
  BulkDocumentOperation,
  DocumentMetadata
} from './interfaces/document.interface';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly documentsPath: string;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  constructor(
    private configService: ConfigService,
    private fileStorageService: FileStorageService,
    private searchService: SearchService,
    private clientsService: ClientsService
  ) {
    const storagePath = this.configService.get<string>('STORAGE_PATH') || '../../storage';
    this.documentsPath = path.join(storagePath, 'documents', 'files');
    this.initializeDocumentStorage();
  }

  private async initializeDocumentStorage(): Promise<void> {
    try {
      if (!existsSync(this.documentsPath)) {
        await fs.mkdir(this.documentsPath, { recursive: true });
      }
      this.logger.log(`Document storage initialized at: ${this.documentsPath}`);
    } catch (error) {
      this.logger.error('Failed to initialize document storage:', error);
      throw error;
    }
  }

  async uploadDocument(
    fileBuffer: Buffer,
    createDocumentDto: CreateDocumentDto
  ): Promise<DocumentUploadResult> {
    try {
      // Validate file size
      if (fileBuffer.length > this.maxFileSize) {
        throw new BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      // Validate MIME type
      if (!this.allowedMimeTypes.includes(createDocumentDto.mimeType)) {
        throw new BadRequestException(`File type ${createDocumentDto.mimeType} is not allowed`);
      }

      // Generate unique filename
      const fileExtension = mime.extension(createDocumentDto.mimeType) || 'bin';
      const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = path.join(this.documentsPath, uniqueFilename);

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check for duplicate files
      const existingDocument = await this.findDocumentByChecksum(checksum);
      if (existingDocument) {
        this.logger.warn(`Duplicate file detected: ${createDocumentDto.originalName}`);
        return {
          document: existingDocument,
          success: true,
          error: 'File already exists'
        };
      }

      // Save file to disk
      await fs.writeFile(filePath, fileBuffer);

      // Extract metadata
      const metadata = await this.extractMetadata(fileBuffer, createDocumentDto.mimeType);

      // Auto-tag based on filename and content
      const autoTags = await this.generateAutoTags(createDocumentDto, metadata);
      const allTags = [...new Set([...(createDocumentDto.tags || []), ...autoTags])];

      // Create document record
      const resolvedClient = createDocumentDto.clientId
        ? await this.clientsService.findOne(createDocumentDto.clientId)
        : null;
      const normalizedClientId = resolvedClient?.ref || createDocumentDto.clientId;

      const document: Document = {
        id: crypto.randomUUID(),
        filename: uniqueFilename,
        originalName: createDocumentDto.originalName,
        mimeType: createDocumentDto.mimeType,
        size: fileBuffer.length,
        clientId: normalizedClientId,
        serviceId: createDocumentDto.serviceId,
        taskId: createDocumentDto.taskId,
        category: createDocumentDto.category,
        tags: allTags,
        description: createDocumentDto.description,
        uploadedBy: createDocumentDto.uploadedBy,
        uploadedAt: new Date(),
        updatedAt: new Date(),
        filePath: uniqueFilename,
        checksum,
        isArchived: false,
        metadata
      };

      // Save document metadata
      await this.fileStorageService.writeJson('documents/metadata', document.id, document);

      // Update search index
      await this.updateSearchIndex(document);

      this.logger.log(`Document uploaded successfully: ${document.originalName} (${document.id})`);

      return {
        document,
        success: true
      };
    } catch (error) {
      this.logger.error('Failed to upload document:', error);
      return {
        document: null,
        success: false,
        error: error.message
      };
    }
  }

  async getDocument(id: string): Promise<Document> {
    const document = await this.fileStorageService.readJson<Document>('documents/metadata', id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async getDocuments(filters: DocumentFilters = {}): Promise<Document[]> {
    const searchOptions = {
      limit: 1000,
      offset: 0,
      useIndex: true
    };

    const resolvedClient = filters.clientId ? await this.clientsService.findOne(filters.clientId) : null;
    const acceptableClientIds = filters.clientId
      ? new Set([filters.clientId, resolvedClient?.id, resolvedClient?.ref].filter(Boolean).map(String))
      : null;

    if (filters.search) {
      const searchResults = await this.searchService.search(filters.search, {
        categories: ['documents/metadata'],
        ...searchOptions
      });
      
      let documents = searchResults.results.map(r => r.data as Document);
      return this.applyFilters(documents, filters, acceptableClientIds);
    }

    // Get all documents and apply filters
    const allDocuments = await this.fileStorageService.searchFiles<Document>(
      'documents/metadata',
      () => true
    );

    return this.applyFilters(allDocuments, filters, acceptableClientIds);
  }

  async updateDocument(id: string, updateDto: UpdateDocumentDto): Promise<Document> {
    const document = await this.getDocument(id);

    const updatedDocument: Document = {
      ...document,
      ...updateDto,
      updatedAt: new Date()
    };

    await this.fileStorageService.writeJson('documents/metadata', id, updatedDocument);
    await this.updateSearchIndex(updatedDocument);

    this.logger.log(`Document updated: ${id}`);
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    const document = await this.getDocument(id);

    // Delete physical file
    const filePath = path.join(this.documentsPath, document.filename);
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }

    // Delete metadata
    await this.fileStorageService.deleteJson('documents/metadata', id);

    // Remove from search index
    await this.searchService.removeFromIndex('documents/metadata', id);

    this.logger.log(`Document deleted: ${id}`);
  }

  async getDocumentFile(id: string): Promise<{ buffer: Buffer; document: Document }> {
    const document = await this.getDocument(id);
    const filePath = path.join(this.documentsPath, document.filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Document file not found: ${document.filename}`);
    }

    const buffer = await fs.readFile(filePath);
    return { buffer, document };
  }

  async searchDocuments(query: string, filters: DocumentFilters = {}): Promise<DocumentSearchResult[]> {
    const searchResults = await this.searchService.search(query, {
      categories: ['documents/metadata'],
      limit: 100,
      offset: 0
    });

    const resolvedClient = filters.clientId ? await this.clientsService.findOne(filters.clientId) : null;
    const acceptableClientIds = filters.clientId
      ? new Set([filters.clientId, resolvedClient?.id, resolvedClient?.ref].filter(Boolean).map(String))
      : null;

    const documents = searchResults.results.map(result => ({
      document: result.data as Document,
      relevanceScore: result.score,
      matchedFields: result.matchedFields || []
    }));

    // Apply additional filters
    const filteredDocuments = documents.filter(({ document }) => 
      this.matchesFilters(document, filters, acceptableClientIds)
    );

    return filteredDocuments;
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return this.getDocuments({ clientId });
  }

  async getDocumentsByService(serviceId: string): Promise<Document[]> {
    return this.getDocuments({ serviceId });
  }

  async getDocumentsByTask(taskId: string): Promise<Document[]> {
    return this.getDocuments({ taskId });
  }

  /**
   * Create a document record for a template-generated letter
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  async createTemplateGeneratedDocument(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    clientId: string,
    uploadedBy: string,
    templateMetadata: {
      templateId: string;
      templateName: string;
      templateVersion: number;
      placeholderValues: Record<string, any>;
    },
    serviceId?: string
  ): Promise<Document> {
    const createDto: CreateDocumentDto = {
      filename: originalName,
      originalName,
      mimeType,
      size: fileBuffer.length,
      clientId,
      serviceId,
      category: DocumentCategory.CORRESPONDENCE,
      tags: ['template-generated', templateMetadata.templateName.toLowerCase().replace(/\s+/g, '-')],
      description: `Generated from template: ${templateMetadata.templateName}`,
      uploadedBy
    };

    const result = await this.uploadDocument(fileBuffer, createDto);
    
    if (!result.success || !result.document) {
      throw new Error(`Failed to create template-generated document: ${result.error}`);
    }

    // Update document with template metadata
    const updatedDocument = await this.updateDocument(result.document.id, {
      metadata: {
        ...result.document.metadata,
        templateId: templateMetadata.templateId,
        templateName: templateMetadata.templateName,
        templateVersion: templateMetadata.templateVersion,
        generatedBy: uploadedBy,
        generatedAt: new Date(),
        placeholderValues: templateMetadata.placeholderValues
      }
    });

    this.logger.log(`Created template-generated document: ${originalName} (${updatedDocument.id})`);
    return updatedDocument;
  }

  /**
   * Get all template-generated documents
   */
  async getTemplateGeneratedDocuments(filters?: DocumentFilters): Promise<Document[]> {
    const allFilters: DocumentFilters = {
      ...filters,
      category: DocumentCategory.CORRESPONDENCE,
      tags: ['template-generated']
    };
    return this.getDocuments(allFilters);
  }

  /**
   * Get template-generated documents by template ID
   */
  async getDocumentsByTemplate(templateId: string): Promise<Document[]> {
    const documents = await this.fileStorageService.searchFiles<Document>(
      'documents/metadata',
      (doc) => doc.metadata?.templateId === templateId
    );
    return documents;
  }

  async bulkOperation(operation: BulkDocumentOperation): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] };

    for (const documentId of operation.documentIds) {
      try {
        switch (operation.operation) {
          case 'archive':
            await this.updateDocument(documentId, { isArchived: true });
            break;
          case 'unarchive':
            await this.updateDocument(documentId, { isArchived: false });
            break;
          case 'delete':
            await this.deleteDocument(documentId);
            break;
          case 'tag':
            const document = await this.getDocument(documentId);
            const newTags = [...new Set([...document.tags, ...(operation.parameters?.tags || [])])];
            await this.updateDocument(documentId, { tags: newTags });
            break;
          case 'untag':
            const doc = await this.getDocument(documentId);
            const filteredTags = doc.tags.filter(tag => !operation.parameters?.tags?.includes(tag));
            await this.updateDocument(documentId, { tags: filteredTags });
            break;
          case 'move':
            await this.updateDocument(documentId, {
              clientId: operation.parameters?.clientId,
              category: operation.parameters?.category
            });
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${documentId}: ${error.message}`);
      }
    }

    return results;
  }

  async getDocumentStats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    documentsByCategory: Record<DocumentCategory, number>;
    documentsByMimeType: Record<string, number>;
    recentUploads: Document[];
  }> {
    const allDocuments = await this.getDocuments();

    const stats = {
      totalDocuments: allDocuments.length,
      totalSize: allDocuments.reduce((sum, doc) => sum + doc.size, 0),
      documentsByCategory: {} as Record<DocumentCategory, number>,
      documentsByMimeType: {} as Record<string, number>,
      recentUploads: allDocuments
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .slice(0, 10)
    };

    // Count by category
    Object.values(DocumentCategory).forEach(category => {
      stats.documentsByCategory[category] = allDocuments.filter(doc => doc.category === category).length;
    });

    // Count by MIME type
    allDocuments.forEach(doc => {
      stats.documentsByMimeType[doc.mimeType] = (stats.documentsByMimeType[doc.mimeType] || 0) + 1;
    });

    return stats;
  }

  private async findDocumentByChecksum(checksum: string): Promise<Document | null> {
    const documents = await this.fileStorageService.searchFiles<Document>(
      'documents/metadata',
      (doc) => doc.checksum === checksum
    );
    return documents.length > 0 ? documents[0] : null;
  }

  private async extractMetadata(fileBuffer: Buffer, mimeType: string): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {};

    try {
      // Basic metadata extraction based on MIME type
      if (mimeType === 'application/pdf') {
        // For PDF files, we could use a PDF parser library
        // For now, just set basic info
        metadata.application = 'PDF';
      } else if (mimeType.startsWith('image/')) {
        // For images, we could extract EXIF data
        metadata.application = 'Image';
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        metadata.application = 'Document';
      } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        metadata.application = 'Spreadsheet';
      }

      metadata.createdDate = new Date();
    } catch (error) {
      this.logger.warn('Failed to extract metadata:', error);
    }

    return metadata;
  }

  private async generateAutoTags(createDto: CreateDocumentDto, metadata: DocumentMetadata): Promise<string[]> {
    const tags: string[] = [];

    // Tag based on filename
    const filename = createDto.originalName.toLowerCase();
    
    if (filename.includes('invoice')) tags.push('invoice');
    if (filename.includes('receipt')) tags.push('receipt');
    if (filename.includes('statement')) tags.push('statement');
    if (filename.includes('contract')) tags.push('contract');
    if (filename.includes('report')) tags.push('report');
    if (filename.includes('vat')) tags.push('vat');
    if (filename.includes('payroll')) tags.push('payroll');
    if (filename.includes('accounts')) tags.push('accounts');

    // Tag based on MIME type
    if (createDto.mimeType === 'application/pdf') tags.push('pdf');
    if (createDto.mimeType.startsWith('image/')) tags.push('image');
    if (createDto.mimeType.includes('excel') || createDto.mimeType.includes('spreadsheet')) tags.push('spreadsheet');
    if (createDto.mimeType.includes('word') || createDto.mimeType.includes('document')) tags.push('document');

    // Tag based on category
    tags.push(createDto.category.toLowerCase());

    // Tag based on date
    const currentYear = new Date().getFullYear().toString();
    tags.push(currentYear);

    return tags;
  }

  private applyFilters(documents: Document[], filters: DocumentFilters, acceptableClientIds: Set<string> | null): Document[] {
    return documents.filter(doc => this.matchesFilters(doc, filters, acceptableClientIds));
  }

  private matchesFilters(document: Document, filters: DocumentFilters, acceptableClientIds: Set<string> | null): boolean {
    if (filters.clientId) {
      if (!document.clientId) return false;
      if (!acceptableClientIds) return false;
      if (!acceptableClientIds.has(String(document.clientId))) return false;
    }
    if (filters.serviceId && document.serviceId !== filters.serviceId) return false;
    if (filters.taskId && document.taskId !== filters.taskId) return false;
    if (filters.category && document.category !== filters.category) return false;
    if (filters.uploadedBy && document.uploadedBy !== filters.uploadedBy) return false;
    if (filters.mimeType && document.mimeType !== filters.mimeType) return false;
    if (filters.isArchived !== undefined && document.isArchived !== filters.isArchived) return false;

    if (filters.tags && filters.tags.length > 0) {
      const hasAllTags = filters.tags.every(tag => document.tags.includes(tag));
      if (!hasAllTags) return false;
    }

    if (filters.dateFrom && document.uploadedAt < filters.dateFrom) return false;
    if (filters.dateTo && document.uploadedAt > filters.dateTo) return false;

    if (filters.search) {
      const searchText = filters.search.toLowerCase();
      const searchableContent = [
        document.originalName,
        document.description || '',
        document.tags.join(' '),
        document.category
      ].join(' ').toLowerCase();
      
      if (!searchableContent.includes(searchText)) return false;
    }

    return true;
  }

  private async updateSearchIndex(document: Document): Promise<void> {
    try {
      await this.searchService.updateIndex('documents/metadata', document.id, document);
    } catch (error) {
      this.logger.warn(`Failed to update search index for document ${document.id}:`, error);
    }
  }
}
