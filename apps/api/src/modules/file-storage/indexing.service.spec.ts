import { Test, TestingModule } from '@nestjs/testing';
import { IndexingService } from './indexing.service';
import { FileStorageService } from './file-storage.service';
import { SearchService } from './search.service';
import { FilterService } from './filter.service';

describe('IndexingService', () => {
  let service: IndexingService;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let searchService: jest.Mocked<SearchService>;
  let filterService: jest.Mocked<FilterService>;

  const mockClients = [
    { id: 'client-1', name: 'ABC Company Ltd', type: 'COMPANY', status: 'ACTIVE', ref: '1A001' },
    { id: 'client-2', name: 'XYZ Partnership', type: 'PARTNERSHIP', status: 'ACTIVE', ref: '1A002' },
    { id: 'client-3', name: 'John Smith', type: 'INDIVIDUAL', status: 'INACTIVE', ref: '1A003' }
  ];

  const mockTasks = [
    { id: 'task-1', title: 'Annual Accounts', clientId: 'client-1', status: 'OPEN', priority: 'HIGH', dueDate: new Date('2024-12-31') },
    { id: 'task-2', title: 'VAT Return', clientId: 'client-2', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: new Date('2024-11-30') },
    { id: 'task-3', title: 'Tax Return', clientId: 'client-3', status: 'COMPLETED', priority: 'LOW', dueDate: new Date('2024-10-31') }
  ];

  const mockServices = [
    { id: 'service-1', kind: 'Accounts', frequency: 'ANNUAL', status: 'ACTIVE', fee: 1000, clientId: 'client-1' },
    { id: 'service-2', kind: 'VAT', frequency: 'QUARTERLY', status: 'ACTIVE', fee: 500, clientId: 'client-2' },
    { id: 'service-3', kind: 'Payroll', frequency: 'MONTHLY', status: 'INACTIVE', fee: 200, clientId: 'client-1' }
  ];

  beforeEach(async () => {
    const mockFileStorageService = {
      storagePath: './test-storage',
      listFiles: jest.fn(),
      readJson: jest.fn(),
      bulkReadJson: jest.fn(),
    };

    const mockSearchService = {
      search: jest.fn(),
      updateIndex: jest.fn().mockResolvedValue(undefined),
      rebuildIndex: jest.fn(),
      rebuildClientIndex: jest.fn(),
      optimizeIndex: jest.fn(),
      getSearchStats: jest.fn(),
      getIndexHealth: jest.fn(),
    };

    const mockFilterService = {
      applyFilters: jest.fn(),
      sortData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndexingService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: FilterService,
          useValue: mockFilterService,
        },
      ],
    }).compile();

    service = module.get<IndexingService>(IndexingService);
    fileStorageService = module.get(FileStorageService);
    searchService = module.get(SearchService);
    filterService = module.get(FilterService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Stop background indexing to prevent test pollution
    service.stopBackgroundIndexing();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('indexing operations', () => {
    it('should queue items for indexing', async () => {
      const testData = { id: 'test-1', name: 'Test Item' };
      
      await service.queueForIndexing('clients', 'test-1', testData, 1);
      
      // Queue should contain the item (private property, so we test the effect)
      expect(service['indexingQueue']).toHaveLength(1);
    });

    it('should rebuild all indexes', async () => {
      searchService.rebuildIndex.mockResolvedValue();

      await service.rebuildAllIndexes({
        categories: ['clients', 'tasks']
      });

      expect(searchService.rebuildIndex).toHaveBeenCalledWith('clients');
      expect(searchService.rebuildIndex).toHaveBeenCalledWith('tasks');
    });

    it('should optimize all indexes', async () => {
      searchService.optimizeIndex.mockResolvedValue();

      await service.optimizeAllIndexes();

      expect(searchService.optimizeIndex).toHaveBeenCalledTimes(6); // All default categories
    });

    it('should handle rebuild errors gracefully', async () => {
      searchService.rebuildIndex.mockRejectedValue(new Error('Rebuild failed'));

      await expect(service.rebuildAllIndexes()).resolves.not.toThrow();
    });
  });

  describe('combined search', () => {
    beforeEach(() => {
      searchService.search.mockResolvedValue({
        results: mockClients.map(client => ({
          id: client.id,
          category: 'clients',
          data: client,
          score: 1.0,
          matchedFields: ['name']
        })),
        total: mockClients.length,
        offset: 0,
        limit: 50,
        hasMore: false
      });

      filterService.applyFilters.mockReturnValue({
        data: mockClients,
        total: mockClients.length,
        page: 1,
        limit: 50,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false
      });
    });

    it('should perform combined search with full-text search', async () => {
      const results = await service.combinedSearch('company', {
        categories: ['clients'],
        useFullTextSearch: true,
        limit: 10
      });

      expect(searchService.search).toHaveBeenCalledWith('company', {
        categories: ['clients'],
        limit: 10
      });
      expect(results.results).toHaveLength(3);
      expect(results.total).toBe(3);
    });

    it('should perform combined search with filters', async () => {
      const filters = [
        { field: 'status', operator: 'eq' as const, value: 'ACTIVE' }
      ];

      const results = await service.combinedSearch('company', {
        categories: ['clients'],
        filters,
        limit: 10
      });

      expect(filterService.applyFilters).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          filters
        })
      );
    });

    it('should handle search without full-text search', async () => {
      fileStorageService.listFiles.mockResolvedValue(['client-1', 'client-2']);
      fileStorageService.bulkReadJson.mockResolvedValue(
        new Map([
          ['client-1', mockClients[0]],
          ['client-2', mockClients[1]]
        ])
      );

      const results = await service.combinedSearch('', {
        categories: ['clients'],
        portfolioCode: 1,
        useFullTextSearch: false,
        limit: 10
      });

      expect(fileStorageService.listFiles).toHaveBeenCalledWith('clients', 1);
      expect(results.results).toHaveLength(2);
    });

    it('should handle search errors gracefully', async () => {
      searchService.search.mockRejectedValue(new Error('Search failed'));

      const results = await service.combinedSearch('company');

      expect(results.results).toEqual([]);
      expect(results.total).toBe(0);
    });
  });

  describe('specialized search methods', () => {
    beforeEach(() => {
      jest.spyOn(service, 'combinedSearch').mockResolvedValue({
        results: [],
        total: 0,
        offset: 0,
        limit: 50,
        hasMore: false
      });
    });

    it('should search clients with filters', async () => {
      await service.searchClients('ABC', {
        status: 'ACTIVE',
        type: 'COMPANY',
        portfolioCode: 1
      });

      expect(service.combinedSearch).toHaveBeenCalledWith('ABC', {
        categories: ['clients'],
        portfolioCode: 1,
        filters: [
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
          { field: 'type', operator: 'eq', value: 'COMPANY' }
        ]
      });
    });

    it('should search tasks with filters', async () => {
      await service.searchTasks('accounts', {
        status: 'OPEN',
        priority: 'HIGH',
        overdue: true
      });

      expect(service.combinedSearch).toHaveBeenCalledWith('accounts', {
        categories: ['tasks'],
        filters: [
          { field: 'status', operator: 'eq', value: 'OPEN' },
          { field: 'priority', operator: 'eq', value: 'HIGH' },
          { field: 'dueDate', operator: 'lt', value: expect.any(Date) },
          { field: 'status', operator: 'ne', value: 'COMPLETED' }
        ],
        sort: [
          { field: 'priority', direction: 'desc' },
          { field: 'dueDate', direction: 'asc' }
        ]
      });
    });

    it('should search services with filters', async () => {
      await service.searchServices('VAT', {
        clientId: 'client-1',
        frequency: 'QUARTERLY',
        minFee: 100,
        maxFee: 1000
      });

      expect(service.combinedSearch).toHaveBeenCalledWith('VAT', {
        categories: ['services'],
        filters: [
          { field: 'clientId', operator: 'eq', value: 'client-1' },
          { field: 'frequency', operator: 'eq', value: 'QUARTERLY' },
          { field: 'fee', operator: 'gte', value: 100 },
          { field: 'fee', operator: 'lte', value: 1000 }
        ],
        sort: [
          { field: 'fee', direction: 'desc' },
          { field: 'kind', direction: 'asc' }
        ]
      });
    });
  });

  describe('statistics and health', () => {
    beforeEach(() => {
      searchService.getSearchStats.mockResolvedValue({
        totalTerms: 1000,
        categoryCounts: { clients: 300, tasks: 400, services: 300 },
        indexSizes: { clients: 50000, tasks: 60000, services: 40000 },
        lastRebuild: { clients: new Date(), tasks: new Date(), services: new Date() },
        documentCounts: { clients: 50, tasks: 80, services: 30 },
        averageTermsPerDocument: { clients: 6, tasks: 5, services: 10 }
      });

      searchService.getIndexHealth.mockResolvedValue({
        clients: { status: 'healthy', issues: [] },
        tasks: { status: 'needs_rebuild', issues: ['Index is stale'] },
        services: { status: 'corrupted', issues: ['Corrupted entries found'] }
      });
    });

    it('should get indexing statistics', async () => {
      const stats = await service.getIndexingStats();

      expect(stats.totalDocuments).toBe(160); // 50 + 80 + 30
      expect(stats.totalTerms).toBe(1000);
      expect(stats.health.clients).toBe('healthy');
      expect(stats.health.tasks).toBe('stale');
      expect(stats.health.services).toBe('corrupted');
    });

    it('should check index health with recommendations', async () => {
      const health = await service.checkIndexHealth();

      expect(health.clients.status).toBe('healthy');
      expect(health.clients.recommendations).toContain('Consider optimizing the index for better performance');

      expect(health.tasks.status).toBe('needs_rebuild');
      expect(health.tasks.recommendations).toContain('Rebuild the search index');

      expect(health.services.status).toBe('corrupted');
      expect(health.services.recommendations).toContain('Rebuild the search index immediately');
    });
  });

  describe('maintenance operations', () => {
    beforeEach(() => {
      searchService.getIndexHealth.mockResolvedValue({
        clients: { status: 'healthy', issues: [] },
        tasks: { status: 'needs_rebuild', issues: ['Index is stale'] },
        services: { status: 'corrupted', issues: ['Corrupted entries found'] }
      });

      searchService.rebuildIndex.mockResolvedValue();
      searchService.optimizeIndex.mockResolvedValue();
    });

    it('should perform maintenance operations', async () => {
      await service.performMaintenance();

      expect(searchService.rebuildIndex).toHaveBeenCalledWith('tasks');
      expect(searchService.rebuildIndex).toHaveBeenCalledWith('services');
      expect(searchService.optimizeIndex).toHaveBeenCalledWith('clients');
    });

    it('should handle maintenance errors gracefully', async () => {
      searchService.rebuildIndex.mockRejectedValue(new Error('Rebuild failed'));

      await expect(service.performMaintenance()).resolves.not.toThrow();
    });
  });

  describe('background processing', () => {
    it('should process indexing queue', async () => {
      searchService.updateIndex.mockResolvedValue();
      
      // Add items to queue
      await service.queueForIndexing('clients', 'test-1', { id: 'test-1', name: 'Test' });
      await service.queueForIndexing('tasks', 'test-2', { id: 'test-2', title: 'Test Task' });

      // Process queue manually
      await service['processIndexingQueue']();

      expect(searchService.updateIndex).toHaveBeenCalledTimes(2);
      expect(service['indexingQueue']).toHaveLength(0);
    });

    it('should handle queue processing errors', async () => {
      searchService.updateIndex.mockRejectedValue(new Error('Update failed'));
      
      await service.queueForIndexing('clients', 'test-1', { id: 'test-1', name: 'Test' });
      
      await service['processIndexingQueue']();

      // Item should be re-queued on error
      expect(service['indexingQueue']).toHaveLength(1);
    });
  });
});