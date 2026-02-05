import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { getValidPortfolioCodes } from '../../common/constants/portfolio.constants';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

export interface SearchIndex {
  [term: string]: {
    [category: string]: {
      [id: string]: {
        fields: string[];
        score: number;
        lastUpdated: Date;
        portfolioCode?: number;
      };
    };
  };
}

export interface IndexStats {
  totalTerms: number;
  totalDocuments: number;
  averageTermsPerDocument: number;
  indexSize: number;
  lastRebuild: Date | null;
}

export interface SearchResult<T = any> {
  id: string;
  category: string;
  portfolioCode?: number;
  data: T;
  score: number;
  matchedFields: string[];
}

interface ClientIndexEntry {
  id: string;
  portfolioCode?: number;
  name?: string;
  identifier?: string;
  status?: string;
  type?: string;
  updatedAt?: string;
  createdAt?: string;
  searchText: string;
}

export interface SearchOptions {
  categories?: string[];
  portfolioCode?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'score' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
  fuzzy?: boolean;
  exactMatch?: boolean;
}

export interface PaginatedResults<T> {
  results: SearchResult<T>[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly searchIndex = new Map<string, SearchIndex>();
  private readonly indexPath: string;
  private readonly clientIndexPath: string;
  private clientIndex: ClientIndexEntry[] = [];

  constructor(
    @Inject(forwardRef(() => FileStorageService))
    private fileStorageService: FileStorageService
  ) {
    this.indexPath = path.join(fileStorageService['indexPath'], 'search');
    this.clientIndexPath = path.join(fileStorageService['indexPath'], 'clients-lite.json');
    this.initializeSearchIndex();
    
    // Set up the circular reference
    setTimeout(() => {
      fileStorageService.setSearchService(this);
    }, 0);
  }

  private async initializeSearchIndex(): Promise<void> {
    try {
      await this.ensureDirectory(this.indexPath);
      
      const categories = ['clients', 'people', 'services', 'tasks', 'calendar', 'documents', 'compliance'];
      
      for (const category of categories) {
        await this.loadSearchIndex(category);
      }

      await this.loadClientIndex();
      
      this.logger.log('Search indexes initialized');
    } catch (error) {
      this.logger.error('Failed to initialize search indexes:', error);
    }
  }

  private async loadClientIndex(): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(this.clientIndexPath));
      if (existsSync(this.clientIndexPath)) {
        const content = await fs.readFile(this.clientIndexPath, 'utf8');
        this.clientIndex = JSON.parse(content);
      } else {
        await this.rebuildClientIndex();
      }
    } catch (error) {
      this.logger.warn('Failed to load client index, rebuilding:', error);
      await this.rebuildClientIndex();
    }
  }

  private async saveClientIndex(): Promise<void> {
    try {
      await fs.writeFile(this.clientIndexPath, JSON.stringify(this.clientIndex, null, 2), 'utf8');
    } catch (error) {
      this.logger.error('Failed to save client index:', error);
    }
  }

  private buildClientIndexEntry(data: any, id: string, portfolioCode?: number): ClientIndexEntry {
    const name = data?.name || data?.companyName || data?.title || '';
    const identifier = data?.registeredNumber || data?.id || '';
    const status = data?.status || '';
    const type = data?.type || '';
    const searchable = [
      name,
      identifier,
      data?.registeredNumber,
      data?.mainEmail,
      data?.mainPhone,
      data?.address ? Object.values(data.address).join(' ') : '',
      status,
      type,
    ].filter(Boolean).join(' ').toLowerCase();

    return {
      id,
      portfolioCode,
      name,
      identifier,
      status,
      type,
      updatedAt: data?.updatedAt,
      createdAt: data?.createdAt,
      searchText: searchable,
    };
  }

  async rebuildClientIndex(): Promise<void> {
    try {
      const entries: ClientIndexEntry[] = [];
      const portfolioCodes = getValidPortfolioCodes();
      for (const portfolioCode of portfolioCodes) {
        const files = (await this.fileStorageService.listFiles('clients', portfolioCode)) || [];
        for (const id of files) {
          const data = await this.fileStorageService.readJson<any>('clients', id, portfolioCode);
          if (data) {
            entries.push(this.buildClientIndexEntry(data, id, portfolioCode));
          }
        }
      }
      this.clientIndex = entries;
      await this.saveClientIndex();
    } catch (error) {
      this.logger.error('Failed to rebuild client index:', error);
    }
  }

  private async updateClientIndexEntry(id: string, data: any, portfolioCode?: number): Promise<void> {
    const updatedEntry = this.buildClientIndexEntry(data, id, portfolioCode);
    const matchIndex = this.clientIndex.findIndex(
      (entry) => entry.id === id && entry.portfolioCode === portfolioCode
    );
    if (matchIndex >= 0) {
      this.clientIndex[matchIndex] = updatedEntry;
    } else {
      this.clientIndex.push(updatedEntry);
    }
    await this.saveClientIndex();
  }

  private async removeClientIndexEntry(id: string, portfolioCode?: number): Promise<void> {
    const originalLength = this.clientIndex.length;
    this.clientIndex = this.clientIndex.filter(
      (entry) => !(entry.id === id && entry.portfolioCode === portfolioCode)
    );
    if (this.clientIndex.length !== originalLength) {
      await this.saveClientIndex();
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async loadSearchIndex(category: string): Promise<void> {
    const indexFile = path.join(this.indexPath, `${category}_search.json`);
    
    try {
      if (existsSync(indexFile)) {
        const content = await fs.readFile(indexFile, 'utf8');
        this.searchIndex.set(category, JSON.parse(content));
      } else {
        this.searchIndex.set(category, {});
        await this.rebuildIndex(category);
      }
    } catch (error) {
      this.logger.warn(`Failed to load search index for ${category}:`, error);
      this.searchIndex.set(category, {});
    }
  }

  private async saveSearchIndex(category: string): Promise<void> {
    const indexFile = path.join(this.indexPath, `${category}_search.json`);
    const index = this.searchIndex.get(category) || {};
    
    try {
      await fs.writeFile(indexFile, JSON.stringify(index, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(`Failed to save search index for ${category}:`, error);
    }
  }

  async rebuildIndex(category: string): Promise<void> {
    this.logger.log(`Rebuilding search index for ${category}`);
    
    try {
      const newIndex: SearchIndex = {};
      
      if (category === 'clients') {
        // Handle portfolio-based clients
        const portfolioCodes = getValidPortfolioCodes();
        for (const portfolioCode of portfolioCodes) {
          const files = await this.fileStorageService.listFiles(category, portfolioCode);
          
          for (const id of files) {
            const data = await this.fileStorageService.readJson(category, id, portfolioCode);
            if (data) {
              this.indexDocument(newIndex, category, id, data, portfolioCode);
            }
          }
        }
      } else {
        const files = await this.fileStorageService.listFiles(category);
        
        for (const id of files) {
          const data = await this.fileStorageService.readJson(category, id);
          if (data) {
            this.indexDocument(newIndex, category, id, data);
          }
        }
      }
      
      this.searchIndex.set(category, newIndex);
      await this.saveSearchIndex(category);
      
      this.logger.log(`Rebuilt search index for ${category}`);
    } catch (error) {
      this.logger.error(`Failed to rebuild search index for ${category}:`, error);
    }
  }

  private indexDocument(index: SearchIndex, category: string, id: string, data: any, portfolioCode?: number): void {
    const searchableFields = this.getSearchableFields(category, data);
    
    for (const [field, value] of Object.entries(searchableFields)) {
      if (value && typeof value === 'string') {
        const terms = this.extractTerms(value);
        
        for (const term of terms) {
          if (!index[term]) {
            index[term] = {};
          }
          if (!index[term][category]) {
            index[term][category] = {};
          }
          
          const documentKey = portfolioCode ? `${portfolioCode}:${id}` : id;
          
          if (!index[term][category][documentKey]) {
            index[term][category][documentKey] = {
              fields: [],
              score: 0,
              lastUpdated: new Date(),
              portfolioCode
            };
          }
          
          // Avoid duplicate fields
          if (!index[term][category][documentKey].fields.includes(field)) {
            index[term][category][documentKey].fields.push(field);
          }
          index[term][category][documentKey].score += this.calculateFieldScore(field, term, value);
        }
      }
    }
  }

  private getSearchableFields(category: string, data: any): Record<string, any> {
    const baseFields = {
      id: data.id,
      name: data.name || data.title,
      description: data.description,
      status: data.status,
      type: data.type || data.kind
    };

    switch (category) {
      case 'clients':
        return {
          ...baseFields,
          identifier: data.registeredNumber || data.id,
          registeredNumber: data.registeredNumber,
          mainEmail: data.mainEmail,
          mainPhone: data.mainPhone,
          address: data.address ? Object.values(data.address).join(' ') : null
        };
      
      case 'people':
        return {
          ...baseFields,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          role: data.role
        };
      
      case 'services':
        return {
          ...baseFields,
          clientId: data.clientId,
          frequency: data.frequency,
          fee: data.fee?.toString()
        };
      
      case 'tasks':
        return {
          ...baseFields,
          clientId: data.clientId,
          assignee: data.assignee,
          priority: data.priority,
          tags: data.tags?.join(' ')
        };
      
      case 'documents':
        return {
          ...baseFields,
          clientId: data.clientId,
          fileName: data.fileName,
          tags: data.tags?.join(' '),
          category: data.category
        };
      
      default:
        return baseFields;
    }
  }

  private extractTerms(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !this.isStopWord(term));
  }

  private isStopWord(term: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'among', 'this', 'that', 'these', 'those', 'is', 'are', 'was',
      'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'shall'
    ]);
    
    return stopWords.has(term);
  }

  private calculateFieldScore(field: string, term: string, value: string): number {
    let score = 1;
    
    // Higher scores for more important fields
    const fieldWeights = {
      name: 3,
      title: 3,
      identifier: 2.5,
      id: 2,
      email: 2,
      description: 1.5,
      tags: 1.5,
      status: 1,
      type: 1
    };
    
    score *= fieldWeights[field] || 1;
    
    // Boost score for exact matches
    if (value.toLowerCase().includes(term)) {
      score *= 1.5;
    }
    
    // Boost score for matches at the beginning of the field
    if (value.toLowerCase().startsWith(term)) {
      score *= 2;
    }
    
    return score;
  }

  async updateIndex(category: string, id: string, data: any, portfolioCode?: number): Promise<void> {
    try {
      const index = this.searchIndex.get(category) || {};
      
      // Remove old entries for this document
      await this.removeFromIndex(category, id, portfolioCode);
      
      // Add new entries
      this.indexDocument(index, category, id, data, portfolioCode);
      
      this.searchIndex.set(category, index);
      await this.saveSearchIndex(category);

      if (category === 'clients') {
        await this.updateClientIndexEntry(id, data, portfolioCode);
      }
    } catch (error) {
      this.logger.error(`Failed to update search index for ${category}/${id}:`, error);
    }
  }

  async removeFromIndex(category: string, id: string, portfolioCode?: number): Promise<void> {
    try {
      const index = this.searchIndex.get(category) || {};
      const documentKey = portfolioCode ? `${portfolioCode}:${id}` : id;
      
      for (const term in index) {
        if (index[term][category] && index[term][category][documentKey]) {
          delete index[term][category][documentKey];
          
          // Clean up empty structures
          if (Object.keys(index[term][category]).length === 0) {
            delete index[term][category];
          }
          if (Object.keys(index[term]).length === 0) {
            delete index[term];
          }
        }
      }
      
      this.searchIndex.set(category, index);
      await this.saveSearchIndex(category);

      if (category === 'clients') {
        await this.removeClientIndexEntry(id, portfolioCode);
      }
    } catch (error) {
      this.logger.error(`Failed to remove from search index ${category}/${id}:`, error);
    }
  }

  async search<T = any>(query: string, options: SearchOptions = {}): Promise<PaginatedResults<T>> {
    const {
      categories = ['clients', 'people', 'services', 'tasks', 'documents'],
      portfolioCode,
      limit = 50,
      offset = 0,
      sortBy = 'score',
      sortOrder = 'desc',
      fuzzy = true,
      exactMatch = false
    } = options;

    try {
      const normalizedQuery = query.trim().toLowerCase();
      if (categories.length === 1 && categories[0] === 'clients' && normalizedQuery && this.clientIndex.length > 0) {
        const matches = this.clientIndex
          .filter(entry => {
            if (portfolioCode && entry.portfolioCode !== portfolioCode) {
              return false;
            }
            return entry.searchText.includes(normalizedQuery);
          })
          .map(entry => {
            let score = 1;
            if (entry.name?.toLowerCase().startsWith(normalizedQuery)) {
              score = 2;
            } else if (entry.identifier?.toLowerCase().startsWith(normalizedQuery)) {
              score = 1.5;
            }
            return { entry, score };
          });

        matches.sort((a, b) => {
          if (sortBy === 'name') {
            const aName = a.entry.name || '';
            const bName = b.entry.name || '';
            return sortOrder === 'desc' ? bName.localeCompare(aName) : aName.localeCompare(bName);
          }
          return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
        });

        const total = matches.length;
        const paginated = matches.slice(offset, offset + limit);
        const results: SearchResult<T>[] = [];
        for (const match of paginated) {
          const data = await this.fileStorageService.readJson<T>('clients', match.entry.id, match.entry.portfolioCode);
          if (data) {
            results.push({
              id: match.entry.id,
              category: 'clients',
              portfolioCode: match.entry.portfolioCode,
              data,
              score: match.score,
              matchedFields: [],
            });
          }
        }

        return {
          results,
          total,
          offset,
          limit,
          hasMore: offset + limit < total,
        };
      }

      const searchTerms = exactMatch ? [query.toLowerCase()] : this.extractTerms(query);
      const results = new Map<string, SearchResult<T>>();

      for (const category of categories) {
        const index = this.searchIndex.get(category) || {};
        
        for (const term of searchTerms) {
          const matches = this.findMatches(index, term, fuzzy);
          
          for (const match of matches) {
            for (const [documentKey, indexEntry] of Object.entries(match.documents)) {
              const [portfolioStr, docId] = documentKey.includes(':') 
                ? documentKey.split(':') 
                : [null, documentKey];
              
              const docPortfolio = portfolioStr ? parseInt(portfolioStr) : undefined;
              
              // Filter by portfolio if specified
              if (portfolioCode && docPortfolio !== portfolioCode) {
                continue;
              }
              
              const resultKey = `${category}:${documentKey}`;
              
              if (!results.has(resultKey)) {
                results.set(resultKey, {
                  id: docId,
                  category,
                  portfolioCode: docPortfolio,
                  data: null, // Will be loaded later
                  score: 0,
                  matchedFields: []
                });
              }
              
              const result = results.get(resultKey)!;
              result.score += indexEntry.score * match.similarity;
              result.matchedFields.push(...indexEntry.fields);
            }
          }
        }
      }

      // Load actual data for results
      const resultArray: SearchResult<T>[] = [];
      for (const result of results.values()) {
        try {
          const data = await this.fileStorageService.readJson<T>(
            result.category, 
            result.id, 
            result.portfolioCode
          );
          
          if (data) {
            result.data = data;
            result.matchedFields = [...new Set(result.matchedFields)]; // Remove duplicates
            resultArray.push(result);
          }
        } catch (error) {
          this.logger.warn(`Failed to load data for search result ${result.category}/${result.id}:`, error);
        }
      }

      // Sort results
      resultArray.sort((a, b) => {
        switch (sortBy) {
          case 'score':
            return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
          case 'date':
            const aDate = new Date((a.data as any)?.updatedAt || (a.data as any)?.createdAt || 0);
            const bDate = new Date((b.data as any)?.updatedAt || (b.data as any)?.createdAt || 0);
            return sortOrder === 'desc' ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime();
          case 'name':
            const aName = (a.data as any)?.name || (a.data as any)?.title || '';
            const bName = (b.data as any)?.name || (b.data as any)?.title || '';
            return sortOrder === 'desc' ? bName.localeCompare(aName) : aName.localeCompare(bName);
          default:
            return 0;
        }
      });

      // Apply pagination
      const total = resultArray.length;
      const paginatedResults = resultArray.slice(offset, offset + limit);

      return {
        results: paginatedResults,
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      };

    } catch (error) {
      this.logger.error('Search failed:', error);
      return {
        results: [],
        total: 0,
        offset,
        limit,
        hasMore: false
      };
    }
  }

  private findMatches(index: SearchIndex, term: string, fuzzy: boolean): Array<{
    term: string;
    similarity: number;
    documents: SearchIndex[string][string];
  }> {
    const matches: Array<{
      term: string;
      similarity: number;
      documents: SearchIndex[string][string];
    }> = [];

    // Exact match
    if (index[term]) {
      for (const [category, documents] of Object.entries(index[term])) {
        matches.push({
          term,
          similarity: 1.0,
          documents
        });
      }
    }

    // Fuzzy matching
    if (fuzzy && term.length > 3) {
      for (const indexTerm in index) {
        if (indexTerm !== term) {
          const similarity = this.calculateSimilarity(term, indexTerm);
          if (similarity > 0.7) {
            for (const [category, documents] of Object.entries(index[indexTerm])) {
              matches.push({
                term: indexTerm,
                similarity,
                documents
              });
            }
          }
        }
      }
    }

    return matches;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  async getSearchStats(): Promise<{
    totalTerms: number;
    categoryCounts: Record<string, number>;
    indexSizes: Record<string, number>;
    lastRebuild: Record<string, Date | null>;
    documentCounts: Record<string, number>;
    averageTermsPerDocument: Record<string, number>;
  }> {
    const stats = {
      totalTerms: 0,
      categoryCounts: {} as Record<string, number>,
      indexSizes: {} as Record<string, number>,
      lastRebuild: {} as Record<string, Date | null>,
      documentCounts: {} as Record<string, number>,
      averageTermsPerDocument: {} as Record<string, number>
    };

    for (const [category, index] of this.searchIndex.entries()) {
      const termCount = Object.keys(index).length;
      stats.categoryCounts[category] = termCount;
      stats.totalTerms += termCount;
      
      // Calculate index size in bytes
      const indexJson = JSON.stringify(index);
      stats.indexSizes[category] = Buffer.byteLength(indexJson, 'utf8');
      
      // Count unique documents
      const documentSet = new Set<string>();
      for (const term in index) {
        if (index[term][category]) {
          Object.keys(index[term][category]).forEach(docKey => documentSet.add(docKey));
        }
      }
      stats.documentCounts[category] = documentSet.size;
      stats.averageTermsPerDocument[category] = documentSet.size > 0 ? termCount / documentSet.size : 0;
      
      // Get last rebuild time from file stats
      const indexFile = path.join(this.indexPath, `${category}_search.json`);
      try {
        if (existsSync(indexFile)) {
          const fileStat = await fs.stat(indexFile);
          stats.lastRebuild[category] = fileStat.mtime;
        } else {
          stats.lastRebuild[category] = null;
        }
      } catch (error) {
        stats.lastRebuild[category] = null;
      }
    }

    return stats;
  }

  async optimizeIndex(category: string): Promise<void> {
    this.logger.log(`Optimizing search index for ${category}`);
    
    try {
      const index = this.searchIndex.get(category) || {};
      const optimizedIndex: SearchIndex = {};
      
      // Remove terms with very low scores or single occurrences
      for (const [term, termData] of Object.entries(index)) {
        const categoryData = termData[category];
        if (categoryData) {
          const documentCount = Object.keys(categoryData).length;
          const totalScore = Object.values(categoryData).reduce((sum, doc) => sum + doc.score, 0);
          
          // Keep terms that appear in multiple documents or have high scores
          if (documentCount > 1 || totalScore > 2.0) {
            optimizedIndex[term] = termData;
          }
        }
      }
      
      this.searchIndex.set(category, optimizedIndex);
      await this.saveSearchIndex(category);
      
      this.logger.log(`Optimized search index for ${category}: ${Object.keys(index).length} -> ${Object.keys(optimizedIndex).length} terms`);
    } catch (error) {
      this.logger.error(`Failed to optimize search index for ${category}:`, error);
    }
  }

  async getIndexHealth(): Promise<Record<string, { status: 'healthy' | 'needs_rebuild' | 'corrupted'; issues: string[] }>> {
    const health: Record<string, { status: 'healthy' | 'needs_rebuild' | 'corrupted'; issues: string[] }> = {};
    
    for (const category of ['clients', 'people', 'services', 'tasks', 'documents', 'compliance']) {
      const issues: string[] = [];
      let status: 'healthy' | 'needs_rebuild' | 'corrupted' = 'healthy';
      
      try {
        const index = this.searchIndex.get(category) || {};
        const indexFile = path.join(this.indexPath, `${category}_search.json`);
        
        // Check if index file exists
        if (!existsSync(indexFile)) {
          issues.push('Index file missing');
          status = 'needs_rebuild';
        }
        
        // Check if index is empty but data exists
        const files = await this.fileStorageService.listFiles(category);
        if (files.length > 0 && Object.keys(index).length === 0) {
          issues.push('Index is empty but data exists');
          status = 'needs_rebuild';
        }
        
        // Check for corrupted entries
        let corruptedEntries = 0;
        for (const [term, termData] of Object.entries(index)) {
          if (!termData || typeof termData !== 'object') {
            corruptedEntries++;
          }
        }
        
        if (corruptedEntries > 0) {
          issues.push(`${corruptedEntries} corrupted entries found`);
          status = corruptedEntries > Object.keys(index).length * 0.1 ? 'corrupted' : 'needs_rebuild';
        }
        
      } catch (error) {
        issues.push(`Error checking index: ${error.message}`);
        status = 'corrupted';
      }
      
      health[category] = { status, issues };
    }
    
    return health;
  }
}
