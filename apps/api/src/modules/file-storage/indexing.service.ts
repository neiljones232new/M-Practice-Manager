import { Injectable, Logger } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { SearchService, SearchOptions, PaginatedResults } from './search.service';
import { FilterService, FilterOptions, FilteredResults } from './filter.service';
import { getValidPortfolioCodes } from '../../common/constants/portfolio.constants';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

export interface IndexingOptions {
  categories?: string[];
  portfolioCodes?: number[];
  rebuildIfStale?: boolean;
  maxStaleHours?: number;
}

export interface CombinedSearchOptions extends SearchOptions {
  filters?: FilterOptions['filters'];
  sort?: FilterOptions['sort'];
  useFullTextSearch?: boolean;
  combineMode?: 'intersect' | 'union';
}

export interface IndexingStats {
  totalDocuments: number;
  totalTerms: number;
  indexSizes: Record<string, number>;
  lastUpdated: Record<string, Date>;
  health: Record<string, 'healthy' | 'stale' | 'corrupted'>;
}

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);
  private readonly indexingPath: string;
  private isIndexing = false;
  private indexingQueue: Array<{ category: string; id: string; data: any; portfolioCode?: number }> = [];

  constructor(
    private fileStorageService: FileStorageService,
    private searchService: SearchService,
    private filterService: FilterService
  ) {
    this.indexingPath = path.join(fileStorageService['storagePath'], 'indexing');
    this.initializeIndexing();
  }

  private async initializeIndexing(): Promise<void> {
    try {
      await this.ensureDirectory(this.indexingPath);
      
      // Start background indexing process
      this.startBackgroundIndexing();
      
      this.logger.log('Indexing service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize indexing service:', error);
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private startBackgroundIndexing(): void {
    // Process indexing queue every 5 seconds
    setInterval(async () => {
      if (this.indexingQueue.length > 0 && !this.isIndexing) {
        await this.processIndexingQueue();
      }
    }, 5000);
  }

  private async processIndexingQueue(): Promise<void> {
    if (this.isIndexing || this.indexingQueue.length === 0) {
      return;
    }

    this.isIndexing = true;
    const batch = this.indexingQueue.splice(0, 100); // Process in batches of 100

    try {
      for (const item of batch) {
        await this.searchService.updateIndex(item.category, item.id, item.data, item.portfolioCode);
      }
      
      this.logger.debug(`Processed indexing batch: ${batch.length} items`);
    } catch (error) {
      this.logger.error('Failed to process indexing batch:', error);
      // Re-queue failed items
      this.indexingQueue.unshift(...batch);
    } finally {
      this.isIndexing = false;
    }
  }

  async queueForIndexing(category: string, id: string, data: any, portfolioCode?: number): Promise<void> {
    this.indexingQueue.push({ category, id, data, portfolioCode });
  }

  async rebuildAllIndexes(options: IndexingOptions = {}): Promise<void> {
    const { categories = ['clients', 'people', 'services', 'tasks', 'documents', 'compliance'] } = options;
    
    this.logger.log('Starting full index rebuild');
    
    for (const category of categories) {
      try {
        await this.searchService.rebuildIndex(category);
        this.logger.log(`Rebuilt index for ${category}`);
      } catch (error) {
        this.logger.error(`Failed to rebuild index for ${category}:`, error);
      }
    }
    
    this.logger.log('Full index rebuild completed');
  }

  async optimizeAllIndexes(): Promise<void> {
    const categories = ['clients', 'people', 'services', 'tasks', 'documents', 'compliance'];
    
    this.logger.log('Starting index optimization');
    
    for (const category of categories) {
      try {
        await this.searchService.optimizeIndex(category);
        this.logger.log(`Optimized index for ${category}`);
      } catch (error) {
        this.logger.error(`Failed to optimize index for ${category}:`, error);
      }
    }
    
    this.logger.log('Index optimization completed');
  }

  async combinedSearch<T>(query: string, options: CombinedSearchOptions = {}): Promise<PaginatedResults<T>> {
    const {
      useFullTextSearch = true,
      combineMode = 'intersect',
      filters,
      sort,
      ...searchOptions
    } = options;

    try {
      let searchResults: T[] = [];

      if (useFullTextSearch && query) {
        // Use full-text search
        const textSearchResults = await this.searchService.search<T>(query, searchOptions);
        searchResults = textSearchResults.results.map(r => r.data);
      } else {
        // Get all data from specified categories
        const categories = searchOptions.categories || ['clients', 'services', 'tasks'];
        const allData: T[] = [];

        for (const category of categories) {
          if (category === 'clients') {
            // Handle portfolio-based clients
            const portfolioCodes = options.portfolioCode ? [options.portfolioCode] : getValidPortfolioCodes();
            for (const portfolioCode of portfolioCodes) {
              const files = await this.fileStorageService.listFiles(category, portfolioCode);
              const bulkData = await this.fileStorageService.bulkReadJson<T>(category, files, portfolioCode);
              for (const data of bulkData.values()) {
                if (data) allData.push(data);
              }
            }
          } else {
            const files = await this.fileStorageService.listFiles(category);
            const bulkData = await this.fileStorageService.bulkReadJson<T>(category, files);
            for (const data of bulkData.values()) {
              if (data) allData.push(data);
            }
          }
        }

        searchResults = allData;
      }

      // Apply additional filters if specified
      if (filters && filters.length > 0) {
        const filterOptions: FilterOptions = {
          filters,
          sort,
          pagination: {
            page: Math.floor((searchOptions.offset || 0) / (searchOptions.limit || 50)) + 1,
            limit: searchOptions.limit || 50
          }
        };

        const filteredResults = this.filterService.applyFilters(searchResults, filterOptions);
        
        return {
          results: filteredResults.data.map(data => ({
            id: (data as any).id || '',
            category: searchOptions.categories?.[0] || 'unknown',
            data,
            score: 1.0,
            matchedFields: []
          })),
          total: filteredResults.total,
          offset: (filteredResults.page - 1) * filteredResults.limit,
          limit: filteredResults.limit,
          hasMore: filteredResults.hasNext
        };
      }

      // Apply sorting and pagination manually if no filters
      if (sort && sort.length > 0) {
        searchResults = this.filterService['sortData'](searchResults, sort);
      }

      const total = searchResults.length;
      const offset = searchOptions.offset || 0;
      const limit = searchOptions.limit || 50;
      const paginatedResults = searchResults.slice(offset, offset + limit);

      return {
        results: paginatedResults.map(data => ({
          id: (data as any).id || '',
          category: searchOptions.categories?.[0] || 'unknown',
          data,
          score: 1.0,
          matchedFields: []
        })),
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      };

    } catch (error) {
      this.logger.error('Combined search failed:', error);
      return {
        results: [],
        total: 0,
        offset: 0,
        limit: options.limit || 50,
        hasMore: false
      };
    }
  }

  async getIndexingStats(): Promise<IndexingStats> {
    const searchStats = await this.searchService.getSearchStats();
    const indexHealth = await this.searchService.getIndexHealth();
    
    const stats: IndexingStats = {
      totalDocuments: Object.values(searchStats.documentCounts || {}).reduce((sum, count) => sum + count, 0),
      totalTerms: searchStats.totalTerms,
      indexSizes: searchStats.indexSizes,
      lastUpdated: {},
      health: {}
    };

    // Convert last rebuild dates
    for (const [category, date] of Object.entries(searchStats.lastRebuild)) {
      stats.lastUpdated[category] = date || new Date(0);
    }

    // Convert health status
    for (const [category, healthInfo] of Object.entries(indexHealth)) {
      if (healthInfo.status === 'healthy') {
        stats.health[category] = 'healthy';
      } else if (healthInfo.status === 'needs_rebuild') {
        stats.health[category] = 'stale';
      } else {
        stats.health[category] = 'corrupted';
      }
    }

    return stats;
  }

  async checkIndexHealth(): Promise<Record<string, { status: string; issues: string[]; recommendations: string[] }>> {
    const health = await this.searchService.getIndexHealth();
    const result: Record<string, { status: string; issues: string[]; recommendations: string[] }> = {};

    for (const [category, healthInfo] of Object.entries(health)) {
      const recommendations: string[] = [];

      if (healthInfo.status === 'needs_rebuild') {
        recommendations.push('Rebuild the search index');
        recommendations.push('Check for recent data changes');
      } else if (healthInfo.status === 'corrupted') {
        recommendations.push('Rebuild the search index immediately');
        recommendations.push('Check file system integrity');
        recommendations.push('Review recent system errors');
      } else if (healthInfo.status === 'healthy') {
        recommendations.push('Consider optimizing the index for better performance');
      }

      result[category] = {
        status: healthInfo.status,
        issues: healthInfo.issues,
        recommendations
      };
    }

    return result;
  }

  async performMaintenance(): Promise<void> {
    this.logger.log('Starting indexing maintenance');

    try {
      // Check index health
      const health = await this.checkIndexHealth();
      
      for (const [category, healthInfo] of Object.entries(health)) {
        if (healthInfo.status === 'corrupted' || healthInfo.status === 'needs_rebuild') {
          this.logger.log(`Rebuilding index for ${category} due to: ${healthInfo.issues.join(', ')}`);
          await this.searchService.rebuildIndex(category);
        } else if (healthInfo.status === 'healthy') {
          // Optimize healthy indexes
          await this.searchService.optimizeIndex(category);
        }
      }

      // Process any remaining items in the queue
      if (this.indexingQueue.length > 0) {
        await this.processIndexingQueue();
      }

      this.logger.log('Indexing maintenance completed');
    } catch (error) {
      this.logger.error('Indexing maintenance failed:', error);
    }
  }

  // Utility methods for specific data types
  async searchClients(query: string, options: {
    portfolioCode?: number;
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PaginatedResults<any>> {
    const filters = [];
    
    if (options.status) {
      filters.push({ field: 'status', operator: 'eq' as const, value: options.status });
    }
    
    if (options.type) {
      filters.push({ field: 'type', operator: 'eq' as const, value: options.type });
    }

    return this.combinedSearch(query, {
      categories: ['clients'],
      portfolioCode: options.portfolioCode,
      limit: options.limit,
      offset: options.offset,
      filters
    });
  }

  async searchTasks(query: string, options: {
    status?: string;
    priority?: string;
    assignee?: string;
    overdue?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<PaginatedResults<any>> {
    const filters = [];
    
    if (options.status) {
      filters.push({ field: 'status', operator: 'eq' as const, value: options.status });
    }
    
    if (options.priority) {
      filters.push({ field: 'priority', operator: 'eq' as const, value: options.priority });
    }
    
    if (options.assignee) {
      filters.push({ field: 'assignee', operator: 'eq' as const, value: options.assignee });
    }
    
    if (options.overdue) {
      filters.push({ field: 'dueDate', operator: 'lt' as const, value: new Date() });
      filters.push({ field: 'status', operator: 'ne' as const, value: 'COMPLETED' });
    }

    return this.combinedSearch(query, {
      categories: ['tasks'],
      limit: options.limit,
      offset: options.offset,
      filters,
      sort: [
        { field: 'priority', direction: 'desc' },
        { field: 'dueDate', direction: 'asc' }
      ]
    });
  }

  async searchServices(query: string, options: {
    clientId?: string;
    frequency?: string;
    status?: string;
    minFee?: number;
    maxFee?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<PaginatedResults<any>> {
    const filters = [];
    
    if (options.clientId) {
      filters.push({ field: 'clientId', operator: 'eq' as const, value: options.clientId });
    }
    
    if (options.frequency) {
      filters.push({ field: 'frequency', operator: 'eq' as const, value: options.frequency });
    }
    
    if (options.status) {
      filters.push({ field: 'status', operator: 'eq' as const, value: options.status });
    }
    
    if (options.minFee !== undefined) {
      filters.push({ field: 'fee', operator: 'gte' as const, value: options.minFee });
    }
    
    if (options.maxFee !== undefined) {
      filters.push({ field: 'fee', operator: 'lte' as const, value: options.maxFee });
    }

    return this.combinedSearch(query, {
      categories: ['services'],
      limit: options.limit,
      offset: options.offset,
      filters,
      sort: [
        { field: 'fee', direction: 'desc' },
        { field: 'kind', direction: 'asc' }
      ]
    });
  }
}