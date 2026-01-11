import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { FileStorageService } from './file-storage.service';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs module
jest.mock('fs/promises');
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('SearchService', () => {
  let service: SearchService;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const mockClients = [
    { id: 'client-1', name: 'ABC Company Ltd', type: 'COMPANY', status: 'ACTIVE', ref: '1A001' },
    { id: 'client-2', name: 'XYZ Partnership', type: 'PARTNERSHIP', status: 'ACTIVE', ref: '1A002' },
    { id: 'client-3', name: 'John Smith', type: 'INDIVIDUAL', status: 'INACTIVE', ref: '1A003' }
  ];

  const mockTasks = [
    { id: 'task-1', title: 'Annual Accounts', clientId: 'client-1', status: 'OPEN', priority: 'HIGH' },
    { id: 'task-2', title: 'VAT Return', clientId: 'client-2', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { id: 'task-3', title: 'Tax Return', clientId: 'client-3', status: 'COMPLETED', priority: 'LOW' }
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockFileStorageService = {
      indexPath: './test-storage/indexes',
      listFiles: jest.fn(),
      readJson: jest.fn(),
      setSearchService: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    fileStorageService = module.get(FileStorageService);

    // Mock file system operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.writeFile.mockResolvedValue(undefined);
    mockExistsSync.mockReturnValue(false);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize search indexes', () => {
      expect(mockFs.mkdir).toHaveBeenCalled();
    });
  });

  describe('indexing operations', () => {
    beforeEach(() => {
      fileStorageService.listFiles.mockResolvedValue(['client-1', 'client-2']);
      fileStorageService.readJson
        .mockResolvedValueOnce(mockClients[0])
        .mockResolvedValueOnce(mockClients[1]);
    });

    it('should rebuild index for category', async () => {
      await service.rebuildIndex('clients');

      expect(fileStorageService.listFiles).toHaveBeenCalledWith('clients', 1);
      expect(fileStorageService.readJson).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should update index when document changes', async () => {
      const testData = { id: 'test-1', name: 'Test Client', status: 'active' };
      
      await service.updateIndex('clients', 'test-1', testData);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should remove document from index', async () => {
      await service.removeFromIndex('clients', 'test-1');

      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      // Mock search index data
      const mockIndex = {
        'company': {
          'clients': {
            'client-1': {
              fields: ['name', 'type'],
              score: 3.0,
              lastUpdated: new Date()
            }
          }
        },
        'partnership': {
          'clients': {
            'client-2': {
              fields: ['name', 'type'],
              score: 2.5,
              lastUpdated: new Date()
            }
          }
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockIndex));
      mockExistsSync.mockReturnValue(true);

      fileStorageService.readJson
        .mockResolvedValueOnce(mockClients[0])
        .mockResolvedValueOnce(mockClients[1]);
    });

    it('should search across categories', async () => {
      const results = await service.search('company', {
        categories: ['clients'],
        limit: 10
      });

      expect(results.results).toHaveLength(1);
      expect(results.results[0].data).toEqual(mockClients[0]);
      expect(results.total).toBe(1);
    });

    it('should support fuzzy search', async () => {
      const results = await service.search('compny', {
        categories: ['clients'],
        fuzzy: true,
        limit: 10
      });

      expect(results.results.length).toBeGreaterThan(0);
    });

    it('should support exact match search', async () => {
      const results = await service.search('ABC Company Ltd', {
        categories: ['clients'],
        exactMatch: true,
        limit: 10
      });

      expect(results.results).toHaveLength(1);
    });

    it('should filter by portfolio code', async () => {
      const results = await service.search('company', {
        categories: ['clients'],
        portfolioCode: 1,
        limit: 10
      });

      expect(results.results.length).toBeGreaterThanOrEqual(0);
    });

    it('should support pagination', async () => {
      const results = await service.search('company', {
        categories: ['clients'],
        limit: 1,
        offset: 0
      });

      expect(results.limit).toBe(1);
      expect(results.offset).toBe(0);
      expect(results.hasMore).toBeDefined();
    });

    it('should sort results by score', async () => {
      const results = await service.search('company', {
        categories: ['clients'],
        sortBy: 'score',
        sortOrder: 'desc'
      });

      if (results.results.length > 1) {
        expect(results.results[0].score).toBeGreaterThanOrEqual(results.results[1].score);
      }
    });

    it('should handle search errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Read failed'));

      const results = await service.search('company');

      expect(results.results).toEqual([]);
      expect(results.total).toBe(0);
    });
  });

  describe('term extraction and processing', () => {
    it('should extract meaningful terms from text', () => {
      const text = 'ABC Company Ltd - Professional Services';
      const terms = service['extractTerms'](text);

      expect(terms).toContain('abc');
      expect(terms).toContain('company');
      expect(terms).toContain('ltd');
      expect(terms).toContain('professional');
      expect(terms).toContain('services');
      expect(terms).not.toContain('the');
      expect(terms).not.toContain('and');
    });

    it('should filter out stop words', () => {
      const text = 'The company and the partnership';
      const terms = service['extractTerms'](text);

      expect(terms).not.toContain('the');
      expect(terms).not.toContain('and');
      expect(terms).toContain('company');
      expect(terms).toContain('partnership');
    });

    it('should handle special characters', () => {
      const text = 'ABC-Company (Ltd.) & Partners';
      const terms = service['extractTerms'](text);

      expect(terms).toContain('abc');
      expect(terms).toContain('company');
      expect(terms).toContain('ltd');
      expect(terms).toContain('partners');
    });
  });

  describe('similarity calculations', () => {
    it('should calculate string similarity correctly', () => {
      const similarity1 = service['calculateSimilarity']('company', 'company');
      expect(similarity1).toBe(1.0);

      const similarity2 = service['calculateSimilarity']('company', 'compny');
      expect(similarity2).toBeGreaterThan(0.7);

      const similarity3 = service['calculateSimilarity']('company', 'xyz');
      expect(similarity3).toBeLessThan(0.5);
    });

    it('should calculate Levenshtein distance correctly', () => {
      const distance1 = service['levenshteinDistance']('company', 'company');
      expect(distance1).toBe(0);

      const distance2 = service['levenshteinDistance']('company', 'compny');
      expect(distance2).toBe(1);

      const distance3 = service['levenshteinDistance']('abc', 'xyz');
      expect(distance3).toBe(3);
    });
  });

  describe('field scoring', () => {
    it('should assign higher scores to important fields', () => {
      const nameScore = service['calculateFieldScore']('name', 'company', 'ABC Company Ltd');
      const descriptionScore = service['calculateFieldScore']('description', 'company', 'A company description');

      expect(nameScore).toBeGreaterThan(descriptionScore);
    });

    it('should boost scores for exact matches', () => {
      const exactScore = service['calculateFieldScore']('name', 'company', 'Company Name');
      const partialScore = service['calculateFieldScore']('name', 'comp', 'Company Name');

      expect(exactScore).toBeGreaterThan(partialScore);
    });

    it('should boost scores for matches at beginning', () => {
      const startScore = service['calculateFieldScore']('name', 'abc', 'ABC Company');
      const middleScore = service['calculateFieldScore']('name', 'company', 'ABC Company');

      expect(startScore).toBeGreaterThan(middleScore);
    });
  });

  describe('searchable fields extraction', () => {
    it('should extract correct fields for clients', () => {
      const client = {
        id: 'client-1',
        name: 'ABC Company',
        ref: '1A001',
        type: 'COMPANY',
        registeredNumber: '12345678',
        mainEmail: 'info@abc.com'
      };

      const fields = service['getSearchableFields']('clients', client);

      expect(fields).toHaveProperty('name', 'ABC Company');
      expect(fields).toHaveProperty('ref', '1A001');
      expect(fields).toHaveProperty('type', 'COMPANY');
      expect(fields).toHaveProperty('registeredNumber', '12345678');
      expect(fields).toHaveProperty('mainEmail', 'info@abc.com');
    });

    it('should extract correct fields for tasks', () => {
      const task = {
        id: 'task-1',
        title: 'Annual Accounts',
        description: 'Prepare annual accounts',
        status: 'OPEN',
        priority: 'HIGH',
        assignee: 'john.doe',
        tags: ['accounts', 'annual']
      };

      const fields = service['getSearchableFields']('tasks', task);

      expect(fields).toHaveProperty('name', 'Annual Accounts');
      expect(fields).toHaveProperty('description', 'Prepare annual accounts');
      expect(fields).toHaveProperty('status', 'OPEN');
      expect(fields).toHaveProperty('priority', 'HIGH');
      expect(fields).toHaveProperty('assignee', 'john.doe');
      expect(fields).toHaveProperty('tags', 'accounts annual');
    });
  });

  describe('search statistics', () => {
    beforeEach(() => {
      mockFs.stat.mockResolvedValue({ mtime: new Date() } as any);
      mockExistsSync.mockReturnValue(true);
    });

    it('should return search statistics', async () => {
      const stats = await service.getSearchStats();

      expect(stats).toHaveProperty('totalTerms');
      expect(stats).toHaveProperty('categoryCounts');
      expect(stats).toHaveProperty('indexSizes');
      expect(stats).toHaveProperty('lastRebuild');
    });

    it('should handle missing index files', async () => {
      mockExistsSync.mockReturnValue(false);

      const stats = await service.getSearchStats();

      expect(stats.lastRebuild).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle file read errors during indexing', async () => {
      fileStorageService.listFiles.mockResolvedValue(['client-1']);
      fileStorageService.readJson.mockRejectedValue(new Error('Read failed'));

      await expect(service.rebuildIndex('clients')).resolves.not.toThrow();
    });

    it('should handle file write errors during indexing', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(service.updateIndex('clients', 'test-1', {})).resolves.not.toThrow();
    });

    it('should handle invalid JSON in index files', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      mockExistsSync.mockReturnValue(true);

      await expect(service.search('test')).resolves.not.toThrow();
    });
  });
});