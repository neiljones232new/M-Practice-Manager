import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import * as crypto from 'crypto';
import { EncryptionService, EncryptedData } from '../security/services/encryption.service';

export interface FileStorageTransaction {
  id: string;
  operations: TransactionOperation[];
  timestamp: Date;
  status: 'pending' | 'committed' | 'rolled_back';
}

export interface TransactionOperation {
  type: 'write' | 'delete' | 'move';
  category: string;
  id: string;
  data?: any;
  backupPath?: string;
}

export interface StorageIndex {
  [category: string]: {
    [id: string]: {
      lastModified: Date;
      size: number;
      checksum: string;
    };
  };
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly storagePath: string;
  private readonly backupPath: string;
  private readonly snapshotPath: string;
  private readonly indexPath: string;
  private readonly lockPath: string;
  private readonly encryptAtRest: boolean;
  private readonly activeLocks = new Set<string>();
  private readonly pendingTransactions = new Map<string, FileStorageTransaction>();
  private readonly clientScopedMap = new Map<string, string>();
  private readonly clientScopedCategories = new Set(['services', 'client-parties', 'compliance', 'people']);

  private searchService: any; // Will be injected later to avoid circular dependency

  constructor(
    private configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.storagePath = this.configService.get<string>('STORAGE_PATH') || '../../storage';
    this.backupPath = path.join(this.storagePath, 'backups');
    this.snapshotPath = path.join(this.storagePath, 'snapshots');
    this.indexPath = path.join(this.storagePath, 'indexes');
    this.lockPath = path.join(this.storagePath, '.locks');
    this.encryptAtRest = this.resolveEncryptionSetting();
    this.initializeStorage();
  }

  setSearchService(searchService: any): void {
    this.searchService = searchService;
  }

  private async initializeStorage() {
    try {
      // Create main storage directories
      await this.ensureDirectory(this.storagePath);
      await this.ensureDirectory(this.backupPath);
      await this.ensureDirectory(this.snapshotPath);
      await this.ensureDirectory(this.indexPath);
      await this.ensureDirectory(this.lockPath);
      
      // Create structured directory hierarchy as per design
      const categories = [
        'clients',
        'staff',
        'people', 
        'client-parties',
        'services',
        'tasks',
        'service-templates',
        'task-templates',
        'calendar',
        'documents',
        'compliance',
        'events',
        'config',
        'templates',
        'tax-calculations'
      ];

      for (const category of categories) {
        await this.ensureDirectory(path.join(this.storagePath, category));
        
        // Create portfolio subdirectories for clients
      if (category === 'clients') {
        for (let i = 1; i <= 10; i++) {
          await this.ensureDirectory(path.join(this.storagePath, category, `portfolio-${i}`));
        }
      }
        
        // Create specialized subdirectories
        if (category === 'calendar') {
          await this.ensureDirectory(path.join(this.storagePath, category, 'events'));
        }
        
        if (category === 'documents') {
          await this.ensureDirectory(path.join(this.storagePath, category, 'files'));
          await this.ensureDirectory(path.join(this.storagePath, category, 'metadata'));
        }

        if (category === 'templates') {
          await this.ensureDirectory(path.join(this.storagePath, category, 'files'));
          await this.ensureDirectory(path.join(this.storagePath, category, 'metadata'));
          await this.ensureDirectory(path.join(this.storagePath, category, 'history'));
        }
      }

      // Initialize index files
      await this.initializeIndexes();

      await this.buildClientScopedMap();
      
      this.logger.log(`File storage initialized at: ${this.storagePath}`);
    } catch (error) {
      this.logger.error('Failed to initialize file storage:', error);
      throw error;
    }
  }

  private async ensureDirectory(dirPath: string) {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private isClientScopedCategory(category: string): boolean {
    return this.clientScopedCategories.has(category);
  }

  private getClientScopedDirectory(clientRef: string, category: string): string {
    return path.join(this.storagePath, 'clients', clientRef, category);
  }

  private getClientScopedFilePathFromRef(clientRef: string, category: string, id: string): string {
    return path.join(this.getClientScopedDirectory(clientRef, category), `${id}.json`);
  }

  private async locateClientScopedFile(category: string, id: string): Promise<{ clientRef: string; filePath: string } | null> {
    if (!existsSync(path.join(this.storagePath, 'clients'))) {
      return null;
    }

    const entries = await fs.readdir(path.join(this.storagePath, 'clients'), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const candidate = path.join(this.getClientScopedDirectory(entry.name, category), `${id}.json`);
      if (existsSync(candidate)) {
        return { clientRef: entry.name, filePath: candidate };
      }
    }

    return null;
  }

  private async getClientScopedFilePath(category: string, id: string): Promise<string | null> {
    const cachedRef = this.clientScopedMap.get(id);
    if (cachedRef) {
      return this.getClientScopedFilePathFromRef(cachedRef, category, id);
    }

    const located = await this.locateClientScopedFile(category, id);
    if (located) {
      this.clientScopedMap.set(id, located.clientRef);
      return located.filePath;
    }

    return null;
  }

  private async buildClientScopedMap() {
    const clientsDir = path.join(this.storagePath, 'clients');
    if (!existsSync(clientsDir)) {
      return;
    }

    const entries = await fs.readdir(clientsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const clientRef = entry.name;
      const clientPath = path.join(clientsDir, clientRef);
      for (const category of this.clientScopedCategories) {
        const categoryDir = path.join(clientPath, category);
        if (!existsSync(categoryDir)) continue;
        const files = await fs.readdir(categoryDir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const resourceId = file.replace(/\\.json$/, '');
          this.clientScopedMap.set(resourceId, clientRef);
        }
      }
    }
  }

  private resolveEncryptionSetting(): boolean {
    const setting = this.configService.get<string>('FILE_STORAGE_ENCRYPTION');
    const disabled = setting !== undefined
      && ['false', '0', 'off'].includes(String(setting).toLowerCase());
    if (disabled) {
      return false;
    }

    const hasKey = this.encryptionService.hasConfiguredKey();
    if (setting !== undefined && !hasKey) {
      this.logger.warn('FILE_STORAGE_ENCRYPTION enabled but ENCRYPTION_KEY is missing; disabling at-rest encryption.');
      return false;
    }

    if (setting === undefined) {
      return hasKey;
    }

    return true;
  }

  private encryptPayload(jsonData: string): { __encrypted: true; version: number; payload: EncryptedData } {
    return {
      __encrypted: true,
      version: 1,
      payload: this.encryptionService.encrypt(jsonData),
    };
  }

  private decryptIfNeeded(parsed: unknown): string {
    if (this.isEncryptedPayload(parsed)) {
      return this.encryptionService.decrypt(parsed.payload);
    }
    return JSON.stringify(parsed);
  }

  private isEncryptedPayload(value: unknown): value is { __encrypted: true; version: number; payload: EncryptedData } {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const record = value as Record<string, unknown>;
    const payload = record.payload as EncryptedData | undefined;
    return record.__encrypted === true
      && typeof record.version === 'number'
      && payload
      && typeof payload.data === 'string'
      && typeof payload.iv === 'string'
      && typeof payload.tag === 'string';
  }

  async writeJson<T>(category: string, id: string, data: T, portfolioCode?: number, clientRef?: string): Promise<void> {
    const lockKey = `${category}/${id}`;
    
    try {
      await this.acquireLock(lockKey);
      let filePath: string;
      if (this.isClientScopedCategory(category)) {
        if (!clientRef) {
          throw new Error(`Missing clientRef for scoped category ${category}`);
        }
        await this.ensureDirectory(this.getClientScopedDirectory(clientRef, category));
        filePath = this.getClientScopedFilePathFromRef(clientRef, category, id);
        this.clientScopedMap.set(id, clientRef);
      } else {
        filePath = this.getFilePath(category, id, portfolioCode);
        await this.ensureDirectory(path.dirname(filePath));
      }
      
      // Create backup if file exists
      if (existsSync(filePath)) {
        await this.createBackup(category, id, portfolioCode);
      }

      // Write data atomically using a temporary file
      const tempPath = `${filePath}.tmp`;
      const jsonData = JSON.stringify(data, null, 2);
      const storedContent = this.encryptAtRest
        ? JSON.stringify(this.encryptPayload(jsonData), null, 2)
        : jsonData;
      await fs.writeFile(tempPath, storedContent, 'utf8');
      await fs.rename(tempPath, filePath);
      
      // Update index
      await this.updateIndex(category, id, storedContent);
      
      // Update search index if search service is available
      if (this.searchService) {
        await this.searchService.updateIndex(category, id, data, portfolioCode);
      }
      
      this.logger.debug(`Written ${category}/${id}.json`);
    } catch (error) {
      this.logger.error(`Failed to write ${category}/${id}.json:`, error);
      throw error;
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  // Alias methods for compatibility with other services
  async readFile<T>(filePath: string): Promise<T | null> {
    try {
      if (!existsSync(filePath)) {
        return null;
      }
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  async writeFile<T>(filePath: string, data: T): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf8');
    } catch (error) {
      this.logger.error(`Failed to write file ${filePath}:`, error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath}:`, error);
      throw error;
    }
  }

  async readJson<T>(category: string, id: string, portfolioCode?: number): Promise<T | null> {
    let filePath: string | null;
    if (category === 'clients') {
      filePath = this.resolveClientReadPath(id, portfolioCode);
    } else if (this.isClientScopedCategory(category)) {
      filePath = await this.getClientScopedFilePath(category, id);
    } else {
      filePath = this.getFilePath(category, id, portfolioCode);
    }
    
    try {
      if (!filePath || !existsSync(filePath)) {
        return null;
      }

      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content) as unknown;
      const jsonContent = this.decryptIfNeeded(parsed);
      const data = JSON.parse(jsonContent) as T;
      if (category === 'clients' && portfolioCode) {
        const dataPortfolio = this.resolveClientPortfolioCode(data as any, id);
        if (dataPortfolio === null || dataPortfolio !== portfolioCode) {
          return null;
        }
      }
      
      // Temporarily disable data integrity check for debugging
      // await this.verifyDataIntegrity(category, id, content);
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to read ${category}/${id}.json:`, error);
      throw error;
    }
  }

  async deleteJson(category: string, id: string, portfolioCode?: number): Promise<void> {
    const lockKey = `${category}/${id}`;
    
    try {
      await this.acquireLock(lockKey);
      
    let filePaths: string[] = [];
    if (category === 'clients') {
      filePaths = this.getClientDeletePaths(id);
    } else if (this.isClientScopedCategory(category)) {
      const scopedPath = await this.getClientScopedFilePath(category, id);
      if (scopedPath) {
        filePaths = [scopedPath];
      }
    } else {
      filePaths = [this.getFilePath(category, id, portfolioCode)];
    }
      let deleted = false;
      
      for (const filePath of filePaths) {
        if (!existsSync(filePath)) continue;
        // Create backup before deletion
        await this.createBackup(category, id, portfolioCode);
        await fs.unlink(filePath);
        deleted = true;
        if (this.isClientScopedCategory(category)) {
          this.clientScopedMap.delete(id);
        }
      }
      
      if (deleted) {
        // Remove from index
        await this.removeFromIndex(category, id);
        
        // Remove from search index if search service is available
        if (this.searchService) {
          await this.searchService.removeFromIndex(category, id, portfolioCode);
        }
        
        this.logger.debug(`Deleted ${category}/${id}.json`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete ${category}/${id}.json:`, error);
      throw error;
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  async listFiles(category: string, portfolioCode?: number): Promise<string[]> {
    if (this.isClientScopedCategory(category)) {
      if (this.clientScopedMap.size === 0) {
        await this.buildClientScopedMap();
      }
      return Array.from(this.clientScopedMap.keys());
    }
    const categoryPath = path.join(this.storagePath, category);
    
    try {
      if (!existsSync(categoryPath)) {
        return [];
      }

      if (category !== 'clients') {
        const files = await fs.readdir(categoryPath);
        return files
          .filter(file => file.endsWith('.json') && !file.includes('index.json'))
          .map(file => file.replace('.json', ''));
      }

      const refs = new Set<string>();
      const entries = await fs.readdir(categoryPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (entry.name.startsWith('portfolio-')) continue;
          const clientFile = path.join(categoryPath, entry.name, 'client.json');
          if (existsSync(clientFile)) {
            refs.add(entry.name);
          }
          continue;
        }

        if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.includes('index.json')) {
          refs.add(entry.name.replace('.json', ''));
        }
      }

      const portfolioCodes = portfolioCode ? [portfolioCode] : Array.from({ length: 10 }, (_, i) => i + 1);
      for (const code of portfolioCodes) {
        const legacyPath = path.join(categoryPath, `portfolio-${code}`);
        if (!existsSync(legacyPath)) continue;
        const legacyFiles = await fs.readdir(legacyPath);
        legacyFiles
          .filter(file => file.endsWith('.json') && !file.includes('index.json'))
          .forEach(file => refs.add(file.replace('.json', '')));
      }

      const allRefs = Array.from(refs);
      if (!portfolioCode) {
        return allRefs;
      }

      const filtered: string[] = [];
      for (const ref of allRefs) {
        const data = await this.readJson<any>('clients', ref);
        const dataPortfolio = this.resolveClientPortfolioCode(data, ref);
        if (data && dataPortfolio !== null && dataPortfolio === portfolioCode) {
          filtered.push(ref);
        }
      }

      return filtered;
    } catch (error) {
      this.logger.error(`Failed to list files in ${category}:`, error);
      throw error;
    }
  }

  async listAllClientFiles(): Promise<{ portfolioCode: number; files: string[] }[]> {
    try {
      const refs = await this.listFiles('clients');
      const grouped = new Map<number, string[]>();

      for (const ref of refs) {
        try {
          const data = await this.readJson<any>('clients', ref);
          if (!data) {
            continue;
          }
          const portfolioCode = this.resolveClientPortfolioCode(data, ref);
          if (portfolioCode === null) {
            continue;
          }
          const current = grouped.get(portfolioCode) || [];
          current.push(ref);
          grouped.set(portfolioCode, current);
        } catch (error) {
          this.logger.warn(`Failed to read clients/${ref}.json during portfolio scan:`, error);
        }
      }

      return Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([portfolioCode, files]) => ({ portfolioCode, files }));
    } catch (error) {
      this.logger.error('Failed to list all client files:', error);
      throw error;
    }
  }

  async searchFiles<T>(category: string, predicate: (data: T) => boolean, portfolioCode?: number): Promise<T[]> {
    const results: T[] = [];

    if (category === 'clients') {
      const ids = await this.listFiles(category, portfolioCode);
      for (const id of ids) {
        try {
          const data = await this.readJson<T>(category, id, portfolioCode);
          if (data && predicate(data)) {
            results.push(data);
          }
        } catch (error) {
          this.logger.warn(`Failed to read ${category}/${id}.json during search:`, error);
        }
      }
      return results;
    }

    const ids = await this.listFiles(category, portfolioCode);
    for (const id of ids) {
      try {
        const data = await this.readJson<T>(category, id, portfolioCode);
        if (data && predicate(data)) {
          results.push(data);
        }
      } catch (error) {
        this.logger.warn(`Failed to read ${category}/${id}.json during search:`, error);
      }
    }

    return results;
  }

  // Enhanced search with indexing support
  async searchWithIndex<T>(
    category: string, 
    query: string, 
    options: {
      portfolioCode?: number;
      limit?: number;
      offset?: number;
      useIndex?: boolean;
    } = {}
  ): Promise<{ results: T[]; total: number; hasMore: boolean }> {
    const { portfolioCode, limit = 50, offset = 0, useIndex = true } = options;

    // Use search service if available and requested
    if (useIndex && this.searchService) {
      try {
        const searchResults = await this.searchService.search(query, {
          categories: [category],
          portfolioCode,
          limit,
          offset
        });

        return {
          results: searchResults.results.map(r => r.data),
          total: searchResults.total,
          hasMore: searchResults.hasMore
        };
      } catch (error) {
        this.logger.warn(`Search index failed, falling back to file search:`, error);
      }
    }

    // Fallback to file-based search
    const allResults = await this.searchFiles<T>(
      category,
      (data: any) => {
        if (!query) return true;
        
        const searchableText = JSON.stringify(data).toLowerCase();
        return searchableText.includes(query.toLowerCase());
      },
      portfolioCode
    );

    const total = allResults.length;
    const results = allResults.slice(offset, offset + limit);

    return {
      results,
      total,
      hasMore: offset + limit < total
    };
  }

  // Bulk operations for better performance
  async bulkReadJson<T>(category: string, ids: string[], portfolioCode?: number): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    // Process in parallel with limited concurrency
    const concurrency = 10;
    const chunks = [];
    
    for (let i = 0; i < ids.length; i += concurrency) {
      chunks.push(ids.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (id) => {
        try {
          const data = await this.readJson<T>(category, id, portfolioCode);
          return { id, data };
        } catch (error) {
          this.logger.warn(`Failed to read ${category}/${id}.json:`, error);
          return { id, data: null };
        }
      });

      const chunkResults = await Promise.all(promises);
      chunkResults.forEach(({ id, data }) => {
        results.set(id, data);
      });
    }

    return results;
  }

  async bulkWriteJson<T>(category: string, items: Array<{ id: string; data: T; portfolioCode?: number }>): Promise<void> {
    const transactionId = await this.beginTransaction();
    
    try {
      for (const item of items) {
        await this.writeJson(category, item.id, item.data, item.portfolioCode);
      }
      
      await this.commitTransaction(transactionId);
      this.logger.log(`Bulk write completed: ${items.length} items in ${category}`);
    } catch (error) {
      await this.rollbackTransaction(transactionId);
      this.logger.error(`Bulk write failed for ${category}:`, error);
      throw error;
    }
  }

  private getFilePath(category: string, id: string, portfolioCode?: number): string {
    if (category === 'clients') {
      return this.getClientFilePath(id);
    }
    return path.join(this.storagePath, category, `${id}.json`);
  }

  private getClientDirectory(clientRef: string): string {
    return path.join(this.storagePath, 'clients', clientRef);
  }

  private getClientFilePath(clientRef: string): string {
    return path.join(this.getClientDirectory(clientRef), 'client.json');
  }

  private getLegacyClientFilePath(clientRef: string, portfolioCode?: number): string {
    if (portfolioCode) {
      return path.join(this.storagePath, 'clients', `portfolio-${portfolioCode}`, `${clientRef}.json`);
    }
    return path.join(this.storagePath, 'clients', `${clientRef}.json`);
  }

  private resolveClientPortfolioCode(data: any, fallbackRef?: string): number | null {
    const direct = Number(data?.portfolioCode);
    if (Number.isFinite(direct)) {
      return direct;
    }

    const ref = String(data?.ref || fallbackRef || '');
    const match = ref.match(/^(\d+)/);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolveClientReadPath(clientRef: string, portfolioCode?: number): string | null {
    const primaryPath = this.getClientFilePath(clientRef);
    if (existsSync(primaryPath)) {
      return primaryPath;
    }

    if (portfolioCode) {
      const legacyPortfolioPath = this.getLegacyClientFilePath(clientRef, portfolioCode);
      if (existsSync(legacyPortfolioPath)) {
        return legacyPortfolioPath;
      }
    }

    const legacyRootPath = this.getLegacyClientFilePath(clientRef);
    if (existsSync(legacyRootPath)) {
      return legacyRootPath;
    }

    if (!portfolioCode) {
      for (let i = 1; i <= 10; i++) {
        const legacyPath = this.getLegacyClientFilePath(clientRef, i);
        if (existsSync(legacyPath)) {
          return legacyPath;
        }
      }
    }

    return null;
  }

  private getClientDeletePaths(clientRef: string): string[] {
    const paths = new Set<string>();
    paths.add(this.getClientFilePath(clientRef));
    paths.add(this.getLegacyClientFilePath(clientRef));
    for (let i = 1; i <= 10; i++) {
      paths.add(this.getLegacyClientFilePath(clientRef, i));
    }

    return Array.from(paths);
  }

  private async acquireLock(lockKey: string): Promise<void> {
    const lockFile = path.join(this.lockPath, `${lockKey.replace(/[\\/]/g, '_')}.lock`);
    const maxRetries = 10;
    const retryDelay = 100;

    for (let i = 0; i < maxRetries; i++) {
      try {
        if (!this.activeLocks.has(lockKey) && !existsSync(lockFile)) {
          await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
          this.activeLocks.add(lockKey);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw new Error(`Failed to acquire lock for ${lockKey} after ${maxRetries} retries`);
  }

  private async releaseLock(lockKey: string): Promise<void> {
    const lockFile = path.join(this.lockPath, `${lockKey.replace(/[\\/]/g, '_')}.lock`);
    
    try {
      if (existsSync(lockFile)) {
        await fs.unlink(lockFile);
      }
      this.activeLocks.delete(lockKey);
    } catch (error) {
      this.logger.warn(`Failed to release lock for ${lockKey}:`, error);
    }
  }

  private async initializeIndexes(): Promise<void> {
    const categories = ['clients', 'staff', 'people', 'client-parties', 'services', 'tasks', 'service-templates', 'task-templates', 'calendar', 'documents', 'compliance', 'events', 'templates', 'tax-calculations'];
    
    for (const category of categories) {
      const indexFile = path.join(this.indexPath, `${category}.json`);
      if (!existsSync(indexFile)) {
        await fs.writeFile(indexFile, JSON.stringify({}), 'utf8');
      }
    }
  }

  private async updateIndex(category: string, id: string, storedContent: string): Promise<void> {
    const indexFile = path.join(this.indexPath, `${category}.json`);
    
    try {
      const index: StorageIndex[string] = existsSync(indexFile) 
        ? JSON.parse(await fs.readFile(indexFile, 'utf8'))
        : {};

      index[id] = {
        lastModified: new Date(),
        size: Buffer.byteLength(storedContent, 'utf8'),
        checksum: crypto.createHash('sha256').update(storedContent).digest('hex')
      };

      await fs.writeFile(indexFile, JSON.stringify(index, null, 2), 'utf8');
    } catch (error) {
      this.logger.warn(`Failed to update index for ${category}/${id}:`, error);
    }
  }

  private async removeFromIndex(category: string, id: string): Promise<void> {
    const indexFile = path.join(this.indexPath, `${category}.json`);
    
    try {
      if (existsSync(indexFile)) {
        const index: StorageIndex[string] = JSON.parse(await fs.readFile(indexFile, 'utf8'));
        delete index[id];
        await fs.writeFile(indexFile, JSON.stringify(index, null, 2), 'utf8');
      }
    } catch (error) {
      this.logger.warn(`Failed to remove from index ${category}/${id}:`, error);
    }
  }

  private async verifyDataIntegrity(category: string, id: string, content: string): Promise<boolean> {
    const indexFile = path.join(this.indexPath, `${category}.json`);
    
    try {
      if (existsSync(indexFile)) {
        const index: StorageIndex[string] = JSON.parse(await fs.readFile(indexFile, 'utf8'));
        const entry = index[id];
        
        if (entry) {
          const currentChecksum = crypto.createHash('sha256').update(content).digest('hex');
          if (currentChecksum !== entry.checksum) {
            this.logger.warn(`Data integrity check failed for ${category}/${id}`);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      this.logger.warn(`Failed to verify data integrity for ${category}/${id}:`, error);
      return false;
    }
  }

  private async createBackup(category: string, id: string, portfolioCode?: number): Promise<void> {
    // Disable automatic backups to prevent storage bloat
    // Backups create a timestamped copy on every write, leading to thousands of files
    // TODO: Implement a proper backup strategy (daily snapshots, retention policy, etc.)
    return;
    
    /* Original backup code - disabled
    const sourcePath = this.getFilePath(category, id, portfolioCode);
    const backupDir = path.join(this.backupPath, category);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${id}_${timestamp}.json`);

    try {
      await this.ensureDirectory(backupDir);
      await fs.copyFile(sourcePath, backupPath);
      this.logger.debug(`Created backup: ${backupPath}`);
    } catch (error) {
      this.logger.warn(`Failed to create backup for ${category}/${id}:`, error);
    }
    */
  }

  // Transaction support
  async beginTransaction(): Promise<string> {
    const transactionId = crypto.randomUUID();
    const transaction: FileStorageTransaction = {
      id: transactionId,
      operations: [],
      timestamp: new Date(),
      status: 'pending'
    };

    this.pendingTransactions.set(transactionId, transaction);
    this.logger.debug(`Started transaction: ${transactionId}`);
    
    return transactionId;
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.pendingTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      // All operations have already been performed, just mark as committed
      transaction.status = 'committed';
      
      // Clean up old backups for this transaction
      await this.cleanupTransactionBackups(transaction);
      
      this.pendingTransactions.delete(transactionId);
      this.logger.debug(`Committed transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to commit transaction ${transactionId}:`, error);
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.pendingTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      // Reverse operations in reverse order
      for (let i = transaction.operations.length - 1; i >= 0; i--) {
        const operation = transaction.operations[i];
        await this.reverseOperation(operation);
      }

      transaction.status = 'rolled_back';
      this.pendingTransactions.delete(transactionId);
      this.logger.debug(`Rolled back transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to rollback transaction ${transactionId}:`, error);
      throw error;
    }
  }

  private async reverseOperation(operation: TransactionOperation): Promise<void> {
    switch (operation.type) {
      case 'write':
        if (operation.backupPath && existsSync(operation.backupPath)) {
          // Restore from backup
          const targetPath = this.getFilePath(operation.category, operation.id);
          await fs.copyFile(operation.backupPath, targetPath);
        } else {
          // Delete the file if it was a new creation
          const targetPath = this.getFilePath(operation.category, operation.id);
          if (existsSync(targetPath)) {
            await fs.unlink(targetPath);
          }
        }
        break;
      case 'delete':
        if (operation.backupPath && existsSync(operation.backupPath)) {
          // Restore from backup
          const targetPath = this.getFilePath(operation.category, operation.id);
          await fs.copyFile(operation.backupPath, targetPath);
        }
        break;
    }
  }

  private async cleanupTransactionBackups(transaction: FileStorageTransaction): Promise<void> {
    for (const operation of transaction.operations) {
      if (operation.backupPath && existsSync(operation.backupPath)) {
        try {
          await fs.unlink(operation.backupPath);
        } catch (error) {
          this.logger.warn(`Failed to cleanup backup ${operation.backupPath}:`, error);
        }
      }
    }
  }

  async createSnapshot(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotDir = path.join(this.snapshotPath, `snapshot_${timestamp}`);

    try {
      await this.ensureDirectory(snapshotDir);
      
      // Copy entire storage directory excluding snapshots and locks
      const excludeDirs = ['snapshots', '.locks'];
      await this.copyDirectorySelective(this.storagePath, snapshotDir, excludeDirs);
      
      // Create snapshot metadata
      const metadata = {
        timestamp: new Date(),
        version: '1.0',
        totalFiles: await this.countFiles(snapshotDir),
        checksum: await this.calculateDirectoryChecksum(snapshotDir)
      };
      
      await fs.writeFile(
        path.join(snapshotDir, 'snapshot.meta.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
      );
      
      this.logger.log(`Created snapshot: ${snapshotDir}`);
      return snapshotDir;
    } catch (error) {
      this.logger.error('Failed to create snapshot:', error);
      throw error;
    }
  }

  async restoreFromSnapshot(snapshotPath: string): Promise<void> {
    if (!existsSync(snapshotPath)) {
      throw new Error(`Snapshot not found: ${snapshotPath}`);
    }

    try {
      // Create backup of current state
      const backupPath = await this.createSnapshot();
      
      // Clear current data (except snapshots and locks)
      const categories = ['clients', 'staff', 'people', 'client-parties', 'services', 'tasks', 'calendar', 'documents', 'compliance', 'events', 'config'];
      for (const category of categories) {
        const categoryPath = path.join(this.storagePath, category);
        if (existsSync(categoryPath)) {
          await fs.rm(categoryPath, { recursive: true, force: true });
        }
      }

      // Restore from snapshot
      const excludeDirs = ['snapshots', '.locks'];
      await this.copyDirectorySelective(snapshotPath, this.storagePath, excludeDirs);
      
      this.logger.log(`Restored from snapshot: ${snapshotPath}`);
      this.logger.log(`Backup of previous state created at: ${backupPath}`);
    } catch (error) {
      this.logger.error('Failed to restore from snapshot:', error);
      throw error;
    }
  }

  private async copyDirectorySelective(source: string, destination: string, excludeDirs: string[] = []): Promise<void> {
    await this.ensureDirectory(destination);
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) {
        continue;
      }

      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectorySelective(srcPath, destPath, excludeDirs);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async countFiles(dirPath: string): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += await this.countFiles(path.join(dirPath, entry.name));
      } else {
        count++;
      }
    }

    return count;
  }

  private async calculateDirectoryChecksum(dirPath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Sort entries for consistent checksums
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        const subChecksum = await this.calculateDirectoryChecksum(entryPath);
        hash.update(subChecksum);
      } else {
        const content = await fs.readFile(entryPath);
        hash.update(content);
      }
    }

    return hash.digest('hex');
  }

  private async copyDirectory(source: string, destination: string): Promise<void> {
    await this.ensureDirectory(destination);
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async getStorageStats() {
    const stats = {
      storagePath: this.storagePath,
      backupPath: this.backupPath,
      snapshotPath: this.snapshotPath,
      categories: {} as Record<string, number>,
      portfolios: {} as Record<number, number>,
      totalFiles: 0,
      totalSize: 0,
      lastSnapshot: null as string | null,
      activeLocks: this.activeLocks.size,
      pendingTransactions: this.pendingTransactions.size,
    };

    try {
      const categories = ['clients', 'staff', 'people', 'client-parties', 'services', 'tasks', 'service-templates', 'task-templates', 'calendar', 'documents', 'compliance', 'events', 'config', 'templates', 'tax-calculations'];
      
      for (const category of categories) {
        if (category === 'clients') {
          let clientCount = 0;
          for (let i = 1; i <= 10; i++) {
            const files = await this.listFiles(category, i);
            stats.portfolios[i] = files.length;
            clientCount += files.length;
          }
          stats.categories[category] = clientCount;
          stats.totalFiles += clientCount;
        } else {
          const files = await this.listFiles(category);
          stats.categories[category] = files.length;
          stats.totalFiles += files.length;
        }
      }

      // Get total storage size
      stats.totalSize = await this.getDirectorySize(this.storagePath);

      // Get last snapshot info
      const snapshots = await this.listSnapshots();
      if (snapshots.length > 0) {
        stats.lastSnapshot = snapshots[snapshots.length - 1];
      }

    } catch (error) {
      this.logger.error('Failed to get storage stats:', error);
    }

    return stats;
  }

  async listSnapshots(): Promise<string[]> {
    try {
      if (!existsSync(this.snapshotPath)) {
        return [];
      }

      const entries = await fs.readdir(this.snapshotPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('snapshot_'))
        .map(entry => entry.name)
        .sort();
    } catch (error) {
      this.logger.error('Failed to list snapshots:', error);
      return [];
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(entryPath);
        } else {
          const stats = await fs.stat(entryPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to get size for directory ${dirPath}:`, error);
    }

    return totalSize;
  }

  // Cleanup methods
  async cleanupOldBackups(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const categories = await fs.readdir(this.backupPath, { withFileTypes: true });
      
      for (const category of categories) {
        if (category.isDirectory()) {
          const categoryPath = path.join(this.backupPath, category.name);
          const backupFiles = await fs.readdir(categoryPath);
          
          for (const backupFile of backupFiles) {
            const backupPath = path.join(categoryPath, backupFile);
            const stats = await fs.stat(backupPath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(backupPath);
              this.logger.debug(`Cleaned up old backup: ${backupPath}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old backups:', error);
    }
  }

  async cleanupOldSnapshots(snapshotsToKeep: number = 10): Promise<void> {
    try {
      const snapshots = await this.listSnapshots();
      
      if (snapshots.length > snapshotsToKeep) {
        const snapshotsToDelete = snapshots.slice(0, snapshots.length - snapshotsToKeep);
        
        for (const snapshot of snapshotsToDelete) {
          const snapshotPath = path.join(this.snapshotPath, snapshot);
          await fs.rm(snapshotPath, { recursive: true });
          this.logger.debug(`Cleaned up old snapshot: ${snapshot}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old snapshots:', error);
    }
  }
}
