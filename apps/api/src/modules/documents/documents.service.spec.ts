import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { SearchService } from '../file-storage/search.service';
import { ConfigService } from '@nestjs/config';
import { DocumentCategory, CreateDocumentDto } from './interfaces/document.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

// Create a temporary directory for testing
const createTempDir = async (): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdj-docs-test-'));
  return tempDir;
};

// Clean up temporary directory
const cleanupTempDir = async (tempDir: string): Promise<void> => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
};

describe('DocumentsService - File Upload and Storage Operations', () => {
  let service: DocumentsService;
  let fileStorageService: FileStorageService;
  let searchService: SearchService;
  let testStoragePath: string;
  let documentsPath: string;

  const mockDocumentData = {
    id: 'test-doc-1',
    filename: 'test.pdf',
    originalName: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    category: DocumentCategory.ACCOUNTS,
    tags: ['accounts', '2024', 'client-a'],
    description: 'Test document for accounts',
    uploadedBy: 'test-user',
    uploadedAt: new Date(),
    updatedAt: new Date(),
    filePath: 'test.pdf',
    checksum: 'test-checksum',
    isArchived: false,
  };

  beforeEach(async () => {
    // Create a real temporary directory for each test
    testStoragePath = await createTempDir();
    documentsPath = path.join(testStoragePath, 'documents', 'files');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'STORAGE_PATH' ? testStoragePath : undefined)),
          },
        },
        {
          provide: FileStorageService,
          useValue: {
            writeJson: jest.fn(),
            readJson: jest.fn(),
            deleteJson: jest.fn(),
            searchFiles: jest.fn(),
          },
        },
        {
          provide: SearchService,
          useValue: {
            search: jest.fn(),
            updateIndex: jest.fn(),
            removeFromIndex: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
    searchService = module.get<SearchService>(SearchService);

    // Create documents directory
    await fs.mkdir(documentsPath, { recursive: true });

    // Override the private documentsPath property for testing
    (service as any).documentsPath = documentsPath;
  });

  afterEach(async () => {
    await cleanupTempDir(testStoragePath);
  });

  describe('File Upload and Storage Operations', () => {
    const createTestBuffer = (content: string): Buffer => {
      return Buffer.from(content, 'utf8');
    };

    const createTestDocumentDto = (overrides: Partial<CreateDocumentDto> = {}): CreateDocumentDto => ({
      filename: 'test-document.pdf',
      originalName: 'Test Document.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      category: DocumentCategory.OTHER,
      tags: ['test', 'document'],
      description: 'Test document description',
      uploadedBy: 'test-user',
      ...overrides,
    });

    it('should upload document successfully', async () => {
      const testBuffer = createTestBuffer('Test PDF content');
      const createDto = createTestDocumentDto();

      jest.spyOn(fileStorageService, 'writeJson').mockResolvedValue(undefined);
      jest.spyOn(searchService, 'updateIndex').mockResolvedValue(undefined);

      const result = await service.uploadDocument(testBuffer, createDto);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.originalName).toBe(createDto.originalName);
      expect(result.document!.mimeType).toBe(createDto.mimeType);
      expect(result.document!.size).toBe(testBuffer.length);
      expect(result.document!.checksum).toBeDefined();
      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });

    it('should reject files that are too large', async () => {
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      const createDto = createTestDocumentDto({ size: largeBuffer.length });

      const result = await service.uploadDocument(largeBuffer, createDto);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File size exceeds maximum');
    });

    it('should reject unsupported file types', async () => {
      const testBuffer = createTestBuffer('Test content');
      const createDto = createTestDocumentDto({
        mimeType: 'application/x-executable',
      });

      const result = await service.uploadDocument(testBuffer, createDto);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File type');
      expect(result.error).toContain('is not allowed');
    });

    it('should generate unique filenames for uploads', async () => {
      const testBuffer = createTestBuffer('Test content');
      const createDto = createTestDocumentDto();

      jest.spyOn(fileStorageService, 'writeJson').mockResolvedValue(undefined);
      jest.spyOn(searchService, 'updateIndex').mockResolvedValue(undefined);

      const result1 = await service.uploadDocument(testBuffer, createDto);
      const result2 = await service.uploadDocument(testBuffer, createDto);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.document!.filename).not.toBe(result2.document!.filename);
      expect(result1.document!.id).not.toBe(result2.document!.id);
    });

    it('should calculate correct checksums', async () => {
      const testContent = 'Test PDF content for checksum';
      const testBuffer = createTestBuffer(testContent);
      const expectedChecksum = crypto.createHash('sha256').update(testBuffer).digest('hex');
      const createDto = createTestDocumentDto();

      jest.spyOn(fileStorageService, 'writeJson').mockResolvedValue(undefined);
      jest.spyOn(searchService, 'updateIndex').mockResolvedValue(undefined);

      const result = await service.uploadDocument(testBuffer, createDto);

      expect(result.success).toBe(true);
      expect(result.document!.checksum).toBe(expectedChecksum);
    });

    it('should handle duplicate files by checksum', async () => {
      const testBuffer = createTestBuffer('Duplicate content');
      const createDto = createTestDocumentDto();

      // Mock finding existing document with same checksum
      const existingDocument = {
        id: 'existing-doc',
        filename: 'existing.pdf',
        originalName: 'Existing.pdf',
        checksum: crypto.createHash('sha256').update(testBuffer).digest('hex'),
        ...createDto,
      };

      jest.spyOn(fileStorageService, 'searchFiles').mockResolvedValue([existingDocument]);

      const result = await service.uploadDocument(testBuffer, createDto);

      expect(result.success).toBe(true);
      expect(result.document).toEqual(existingDocument);
      expect(result.error).toBe('File already exists');
    });

    it('should generate auto-tags based on filename and content', async () => {
      const testBuffer = createTestBuffer('Invoice content');
      const createDto = createTestDocumentDto({
        originalName: 'Invoice_2024_VAT_Report.pdf',
        category: DocumentCategory.INVOICES,
        tags: ['manual-tag'],
      });

      jest.spyOn(fileStorageService, 'writeJson').mockResolvedValue(undefined);
      jest.spyOn(searchService, 'updateIndex').mockResolvedValue(undefined);

      const result = await service.uploadDocument(testBuffer, createDto);

      expect(result.success).toBe(true);
      expect(result.document!.tags).toContain('manual-tag');
      expect(result.document!.tags).toContain('invoice');
      expect(result.document!.tags).toContain('vat');
      expect(result.document!.tags).toContain('pdf');
      expect(result.document!.tags).toContain('invoices');
      expect(result.document!.tags).toContain(new Date().getFullYear().toString());
    });

    it('should handle different file types correctly', async () => {
      const testCases = [
        {
          mimeType: 'application/pdf',
          expectedTags: ['pdf'],
          content: 'PDF content',
        },
        {
          mimeType: 'image/jpeg',
          expectedTags: ['image'],
          content: 'JPEG content',
        },
        {
          mimeType: 'application/vnd.ms-excel',
          expectedTags: ['spreadsheet'],
          content: 'Excel content',
        },
        {
          mimeType: 'application/msword',
          expectedTags: ['document'],
          content: 'Word content',
        },
      ];

      jest.spyOn(fileStorageService, 'writeJson').mockResolvedValue(undefined);
      jest.spyOn(searchService, 'updateIndex').mockResolvedValue(undefined);

      for (const testCase of testCases) {
        const testBuffer = createTestBuffer(testCase.content);
        const createDto = createTestDocumentDto({
          mimeType: testCase.mimeType,
          originalName: `test.${testCase.mimeType.split('/')[1]}`,
        });

        const result = await service.uploadDocument(testBuffer, createDto);

        expect(result.success).toBe(true);
        testCase.expectedTags.forEach(tag => {
          expect(result.document!.tags).toContain(tag);
        });
      }
    });
  });

  describe('Document Tagging and Search Functionality', () => {

    it('should search documents using search service', async () => {
      const searchResults = {
        results: [{ 
          id: 'test-doc-1',
          category: 'documents/metadata',
          data: mockDocumentData, 
          score: 0.95, 
          matchedFields: ['originalName'] 
        }],
        total: 1,
        hasMore: false,
        offset: 0,
        limit: 100,
      };

      jest.spyOn(searchService, 'search').mockResolvedValue(searchResults);

      const results = await service.searchDocuments('test query');

      expect(results).toHaveLength(1);
      expect(results[0].document).toEqual(mockDocumentData);
      expect(results[0].relevanceScore).toBe(0.95);
      expect(results[0].matchedFields).toEqual(['originalName']);
      expect(searchService.search).toHaveBeenCalledWith('test query', {
        categories: ['documents/metadata'],
        limit: 100,
        offset: 0,
      });
    });

    it('should apply filters to search results', async () => {
      const searchResults = {
        results: [
          { 
            id: 'doc-1',
            category: 'documents/metadata',
            data: { ...mockDocumentData, clientId: 'client-1' }, 
            score: 0.95,
            matchedFields: ['originalName']
          },
          { 
            id: 'doc-2',
            category: 'documents/metadata',
            data: { ...mockDocumentData, id: 'doc-2', clientId: 'client-2' }, 
            score: 0.85,
            matchedFields: ['originalName']
          },
        ],
        total: 2,
        hasMore: false,
        offset: 0,
        limit: 100,
      };

      jest.spyOn(searchService, 'search').mockResolvedValue(searchResults);

      const results = await service.searchDocuments('test', { clientId: 'client-1' });

      expect(results).toHaveLength(1);
      expect(results[0].document.clientId).toBe('client-1');
    });

    it('should filter documents by category', async () => {
      const documents = [
        { ...mockDocumentData, category: DocumentCategory.ACCOUNTS },
        { ...mockDocumentData, id: 'doc-2', category: DocumentCategory.VAT },
        { ...mockDocumentData, id: 'doc-3', category: DocumentCategory.ACCOUNTS },
      ];

      jest.spyOn(fileStorageService, 'searchFiles').mockResolvedValue(documents);

      const results = await service.getDocuments({ category: DocumentCategory.ACCOUNTS });

      expect(results).toHaveLength(2);
      results.forEach(doc => {
        expect(doc.category).toBe(DocumentCategory.ACCOUNTS);
      });
    });

    it('should filter documents by tags', async () => {
      const documents = [
        { ...mockDocumentData, tags: ['accounts', '2024', 'important'] },
        { ...mockDocumentData, id: 'doc-2', tags: ['vat', '2024'] },
        { ...mockDocumentData, id: 'doc-3', tags: ['accounts', '2023'] },
      ];

      jest.spyOn(fileStorageService, 'searchFiles').mockResolvedValue(documents);

      const results = await service.getDocuments({ tags: ['accounts', '2024'] });

      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('accounts');
      expect(results[0].tags).toContain('2024');
    });

    it('should filter documents by date range', async () => {
      const baseDate = new Date('2024-01-15');
      const documents = [
        { ...mockDocumentData, uploadedAt: new Date('2024-01-10') },
        { ...mockDocumentData, id: 'doc-2', uploadedAt: new Date('2024-01-20') },
        { ...mockDocumentData, id: 'doc-3', uploadedAt: new Date('2024-01-25') },
      ];

      jest.spyOn(fileStorageService, 'searchFiles').mockResolvedValue(documents);

      const results = await service.getDocuments({
        dateFrom: new Date('2024-01-15'),
        dateTo: new Date('2024-01-22'),
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc-2');
    });

    it('should filter archived documents', async () => {
      const documents = [
        { ...mockDocumentData, isArchived: false },
        { ...mockDocumentData, id: 'doc-2', isArchived: true },
        { ...mockDocumentData, id: 'doc-3', isArchived: false },
      ];

      jest.spyOn(fileStorageService, 'searchFiles').mockResolvedValue(documents);

      const activeResults = await service.getDocuments({ isArchived: false });
      const archivedResults = await service.getDocuments({ isArchived: true });

      expect(activeResults).toHaveLength(2);
      expect(archivedResults).toHaveLength(1);
      expect(archivedResults[0].id).toBe('doc-2');
    });
  });

  describe('PDF Generation and Report Creation', () => {
    it('should generate document statistics correctly', async () => {
      const documents = [
        {
          ...mockDocumentData,
          category: DocumentCategory.ACCOUNTS,
          mimeType: 'application/pdf',
          size: 1024,
          uploadedAt: new Date(),
        },
        {
          ...mockDocumentData,
          id: 'doc-2',
          category: DocumentCategory.VAT,
          mimeType: 'image/jpeg',
          size: 2048,
          uploadedAt: new Date(Date.now() - 86400000), // Yesterday
        },
        {
          ...mockDocumentData,
          id: 'doc-3',
          category: DocumentCategory.ACCOUNTS,
          mimeType: 'application/pdf',
          size: 512,
          uploadedAt: new Date(),
        },
      ];

      jest.spyOn(service, 'getDocuments').mockResolvedValue(documents);

      const stats = await service.getDocumentStats();

      expect(stats.totalDocuments).toBe(3);
      expect(stats.totalSize).toBe(3584); // 1024 + 2048 + 512
      expect(stats.documentsByCategory[DocumentCategory.ACCOUNTS]).toBe(2);
      expect(stats.documentsByCategory[DocumentCategory.VAT]).toBe(1);
      expect(stats.documentsByMimeType['application/pdf']).toBe(2);
      expect(stats.documentsByMimeType['image/jpeg']).toBe(1);
      expect(stats.recentUploads).toHaveLength(3);
    });

    it('should handle bulk operations correctly', async () => {
      const documentIds = ['doc-1', 'doc-2', 'doc-3'];
      const mockDocuments = documentIds.map(id => ({ ...mockDocumentData, id }));

      jest.spyOn(service, 'getDocument')
        .mockImplementation(async (id) => mockDocuments.find(doc => doc.id === id)!);
      jest.spyOn(service, 'updateDocument').mockResolvedValue(mockDocumentData);
      jest.spyOn(service, 'deleteDocument').mockResolvedValue(undefined);

      const archiveResult = await service.bulkOperation({
        documentIds,
        operation: 'archive',
      });

      expect(archiveResult.success).toBe(3);
      expect(archiveResult.failed).toBe(0);
      expect(archiveResult.errors).toHaveLength(0);
      expect(service.updateDocument).toHaveBeenCalledTimes(3);
    });

    it('should handle bulk operation failures gracefully', async () => {
      const documentIds = ['doc-1', 'doc-2', 'doc-3'];

      jest.spyOn(service, 'getDocument')
        .mockImplementation(async (id) => {
          if (id === 'doc-2') {
            throw new Error('Document not found');
          }
          return { ...mockDocumentData, id };
        });
      jest.spyOn(service, 'updateDocument').mockResolvedValue(mockDocumentData);

      const result = await service.bulkOperation({
        documentIds,
        operation: 'archive',
      });

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('doc-2');
    });

    it('should handle tag operations in bulk', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const mockDocs = [
        { ...mockDocumentData, id: 'doc-1', tags: ['existing', 'tag'] },
        { ...mockDocumentData, id: 'doc-2', tags: ['other', 'tags'] },
      ];

      jest.spyOn(service, 'getDocument')
        .mockImplementation(async (id) => mockDocs.find(doc => doc.id === id)!);
      jest.spyOn(service, 'updateDocument').mockResolvedValue(mockDocumentData);

      const result = await service.bulkOperation({
        documentIds,
        operation: 'tag',
        parameters: { tags: ['new-tag', 'bulk-tag'] },
      });

      expect(result.success).toBe(2);
      expect(service.updateDocument).toHaveBeenCalledWith('doc-1', {
        tags: ['existing', 'tag', 'new-tag', 'bulk-tag'],
      });
      expect(service.updateDocument).toHaveBeenCalledWith('doc-2', {
        tags: ['other', 'tags', 'new-tag', 'bulk-tag'],
      });
    });

    it('should handle untag operations in bulk', async () => {
      const documentIds = ['doc-1'];
      const mockDoc = {
        ...mockDocumentData,
        id: 'doc-1',
        tags: ['keep-this', 'remove-this', 'also-remove'],
      };

      jest.spyOn(service, 'getDocument').mockResolvedValue(mockDoc);
      jest.spyOn(service, 'updateDocument').mockResolvedValue(mockDocumentData);

      const result = await service.bulkOperation({
        documentIds,
        operation: 'untag',
        parameters: { tags: ['remove-this', 'also-remove'] },
      });

      expect(result.success).toBe(1);
      expect(service.updateDocument).toHaveBeenCalledWith('doc-1', {
        tags: ['keep-this'],
      });
    });

    it('should handle move operations in bulk', async () => {
      const documentIds = ['doc-1', 'doc-2'];

      jest.spyOn(service, 'getDocument')
        .mockImplementation(async (id) => ({ ...mockDocumentData, id }));
      jest.spyOn(service, 'updateDocument').mockResolvedValue(mockDocumentData);

      const result = await service.bulkOperation({
        documentIds,
        operation: 'move',
        parameters: {
          clientId: 'new-client-id',
          category: DocumentCategory.VAT,
        },
      });

      expect(result.success).toBe(2);
      expect(service.updateDocument).toHaveBeenCalledWith('doc-1', {
        clientId: 'new-client-id',
        category: DocumentCategory.VAT,
      });
      expect(service.updateDocument).toHaveBeenCalledWith('doc-2', {
        clientId: 'new-client-id',
        category: DocumentCategory.VAT,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle file storage errors gracefully', async () => {
      const testBuffer = createTestBuffer('Test content');
      const createDto = createTestDocumentDto();

      jest.spyOn(fileStorageService, 'writeJson')
        .mockRejectedValue(new Error('Storage error'));

      const result = await service.uploadDocument(testBuffer, createDto);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage error');
    });

    it('should handle search service errors gracefully', async () => {
      jest.spyOn(searchService, 'search')
        .mockRejectedValue(new Error('Search error'));
      jest.spyOn(fileStorageService, 'searchFiles')
        .mockResolvedValue([mockDocumentData]);

      const results = await service.searchDocuments('test query');

      // Should fall back to file-based search
      expect(results).toHaveLength(1);
      expect(fileStorageService.searchFiles).toHaveBeenCalled();
    });

    it('should handle missing documents gracefully', async () => {
      jest.spyOn(fileStorageService, 'readJson').mockResolvedValue(null);

      await expect(service.getDocument('non-existent-id'))
        .rejects.toThrow('Document with ID non-existent-id not found');
    });

    it('should handle file deletion when physical file is missing', async () => {
      const mockDoc = { ...mockDocumentData, filename: 'missing-file.pdf' };
      jest.spyOn(fileStorageService, 'readJson').mockResolvedValue(mockDoc);
      jest.spyOn(fileStorageService, 'deleteJson').mockResolvedValue(undefined);
      jest.spyOn(searchService, 'removeFromIndex').mockResolvedValue(undefined);

      // Should not throw error even if physical file is missing
      await expect(service.deleteDocument('test-id')).resolves.not.toThrow();
      expect(fileStorageService.deleteJson).toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      jest.spyOn(searchService, 'search').mockResolvedValue({
        results: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: 100,
      });

      const results = await service.searchDocuments('no-results-query');

      expect(results).toHaveLength(0);
    });

    it('should handle invalid filter parameters', async () => {
      jest.spyOn(fileStorageService, 'searchFiles').mockResolvedValue([mockDocumentData]);

      // Should handle invalid date strings gracefully
      const results = await service.getDocuments({
        dateFrom: new Date('invalid-date'),
        dateTo: new Date('also-invalid'),
      });

      // Should return all documents when filters are invalid
      expect(results).toHaveLength(1);
    });
  });

  const createTestBuffer = (content: string): Buffer => {
    return Buffer.from(content, 'utf8');
  };

  const createTestDocumentDto = (overrides: Partial<CreateDocumentDto> = {}): CreateDocumentDto => ({
    filename: 'test-document.pdf',
    originalName: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    category: DocumentCategory.OTHER,
    tags: ['test', 'document'],
    description: 'Test document description',
    uploadedBy: 'test-user',
    ...overrides,
  });
});
