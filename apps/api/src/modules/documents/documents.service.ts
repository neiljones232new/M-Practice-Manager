import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
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
    'image/webp',
  ];

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private clientsService: ClientsService,
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
    createDocumentDto: CreateDocumentDto,
  ): Promise<DocumentUploadResult> {
    try {
      if (fileBuffer.length > this.maxFileSize) {
        throw new BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      if (!this.allowedMimeTypes.includes(createDocumentDto.mimeType)) {
        throw new BadRequestException(`File type ${createDocumentDto.mimeType} is not allowed`);
      }

      if (createDocumentDto.clientId) {
        const client = await this.clientsService.findOne(createDocumentDto.clientId);
        if (!client) {
          throw new NotFoundException(`Client with ID ${createDocumentDto.clientId} not found`);
        }
      }

      const fileExtension = mime.extension(createDocumentDto.mimeType) || 'bin';
      const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = path.join(this.documentsPath, uniqueFilename);

      await fs.writeFile(filePath, fileBuffer);

      const document = await (this.prisma as any).document.create({
        data: {
          title: createDocumentDto.originalName,
          kind: createDocumentDto.category || 'OTHER',
          path: uniqueFilename,
          mimeType: createDocumentDto.mimeType,
          size: fileBuffer.length,
          clientId: createDocumentDto.clientId,
        },
      });

      this.logger.log(`Document uploaded successfully: ${document.title} (${document.id})`);

      return { document, success: true };
    } catch (error) {
      this.logger.error('Failed to upload document:', error);
      return { document: null, success: false, error: error.message };
    }
  }

  async getDocument(id: string): Promise<Document> {
    const document = await (this.prisma as any).document.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async getDocuments(filters: DocumentFilters = {}): Promise<Document[]> {
    const where: any = {};

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.kind) where.kind = filters.kind;
    if (filters.mimeType) where.mimeType = filters.mimeType;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { kind: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return (this.prisma as any).document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDocument(id: string, updateDto: UpdateDocumentDto): Promise<Document> {
    await this.getDocument(id);
    const updatedDocument = await (this.prisma as any).document.update({
      where: { id },
      data: {
        ...updateDto,
      },
    });

    this.logger.log(`Document updated: ${id}`);
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    const document = await this.getDocument(id);

    const filePath = path.join(this.documentsPath, document.path);
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }

    await (this.prisma as any).document.delete({ where: { id } });
    this.logger.log(`Document deleted: ${id}`);
  }

  async getDocumentFile(id: string): Promise<{ buffer: Buffer; document: Document }> {
    const document = await this.getDocument(id);
    const filePath = path.join(this.documentsPath, document.path);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Document file not found: ${document.path}`);
    }

    const buffer = await fs.readFile(filePath);
    return { buffer, document };
  }

  async searchDocuments(query: string, filters: DocumentFilters = {}): Promise<DocumentSearchResult[]> {
    const docs = await this.getDocuments({ ...filters, search: query });
    return docs.map((document) => ({
      document,
      relevanceScore: 1,
      matchedFields: ['title', 'kind'],
    }));
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return this.getDocuments({ clientId });
  }

  async bulkOperation(operation: BulkDocumentOperation): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const documentId of operation.documentIds) {
      try {
        switch (operation.operation) {
          case 'delete':
            await this.deleteDocument(documentId);
            break;
          case 'move':
            await this.updateDocument(documentId, {
              clientId: operation.parameters?.clientId,
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
    documentsByKind: Record<string, number>;
    documentsByMimeType: Record<string, number>;
    recentUploads: Document[];
  }> {
    const allDocuments = await this.getDocuments();

    const stats = {
      totalDocuments: allDocuments.length,
      totalSize: allDocuments.reduce((sum, doc) => sum + (doc.size || 0), 0),
      documentsByKind: {} as Record<string, number>,
      documentsByMimeType: {} as Record<string, number>,
      recentUploads: allDocuments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10),
    };

    allDocuments.forEach((doc) => {
      stats.documentsByKind[doc.kind] = (stats.documentsByKind[doc.kind] || 0) + 1;
    });

    allDocuments.forEach((doc) => {
      if (doc.mimeType) {
        stats.documentsByMimeType[doc.mimeType] = (stats.documentsByMimeType[doc.mimeType] || 0) + 1;
      }
    });

    return stats;
  }

  async createTemplateGeneratedDocument(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    clientId: string,
    _uploadedById?: string,
    _templateMetadata?: {
      templateId: string;
      templateName: string;
      templateVersion: number;
      placeholderValues: Record<string, any>;
    },
  ): Promise<Document> {
    const createDto: CreateDocumentDto = {
      originalName,
      mimeType,
      clientId,
      category: 'REPORTS',
    };

    const result = await this.uploadDocument(fileBuffer, createDto);

    if (!result.success || !result.document) {
      throw new Error(`Failed to create template-generated document: ${result.error}`);
    }

    return result.document;
  }
}
