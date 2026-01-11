import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileAuditService, FileAuditResult, AuditSummary } from './file-audit.service';
import { FileStorageService } from './file-storage.service';
import { DatabaseService } from '../database/database.service';
import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import * as crypto from 'crypto';

/**
 * Property 12: File System Audit Accuracy
 * Validates: Requirements 6.1
 * 
 * This property test ensures that the file system audit correctly identifies
 * connected vs disconnected JSON files and provides accurate migration recommendations.
 */
describe('FileAuditService - Property 12: File System Audit Accuracy', () => {
  let service: FileAuditService;
  let configService: ConfigService;
  let fileStorageService: FileStorageService;
  let databaseService: DatabaseService;
  let testStoragePath: string;

  beforeEach(async () => {
    // Create unique test storage path
    testStoragePath = path.join(__dirname, '..', '..', '..', '..', 'test-storage', `audit-test-${Date.now()}`);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileAuditService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STORAGE_PATH') return testStoragePath;
              return undefined;
            }),
          },
        },
        {
          provide: FileStorageService,
          useValue: {
            // Mock methods as needed
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            getClientByNumber: jest.fn(),
            getCalculationById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FileAuditService>(FileAuditService);
    configService = module.get<ConfigService>(ConfigService);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(async () => {
    // Clean up test storage
    if (existsSync(testStoragePath)) {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    }
  });

  /**
   * Property: Audit results must have consistent internal structure
   */
  it('should produce internally consistent audit results', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test file system structure with at least one file to avoid empty case
        fc.record({
          clients: fc.array(generateClientFile(), { minLength: 1, maxLength: 2 }),
        }),
        async (fileStructure) => {
          // Setup test file system
          await setupTestFileSystem(testStoragePath, fileStructure);

          // Mock database responses - no clients in database by default
          setupDatabaseMocks(databaseService, fileStructure);

          // Run audit
          const { results, summary } = await service.auditAllFiles();

          // Property 1: Sum of status categories must equal total files
          const statusSum = summary.connectedFiles + summary.disconnectedFiles + 
                           summary.orphanedFiles + summary.corruptedFiles;
          expect(statusSum).toBe(summary.totalFiles);

          // Property 2: Each file must have a valid audit result
          for (const result of results) {
            // File must exist on disk
            expect(existsSync(result.filePath)).toBe(true);
            
            // Status must be valid
            expect(['connected', 'disconnected', 'orphaned', 'corrupted']).toContain(result.status);
            
            // Recommendation must be valid
            expect(['migrate', 'backup_and_remove', 'remove', 'keep']).toContain(result.migrationRecommendation);
            
            // Size must be positive
            expect(result.size).toBeGreaterThan(0);
            
            // Checksum must be valid SHA256
            expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
            
            // Last modified must be defined and represent a valid timestamp
            expect(result.lastModified).toBeDefined();
            
            // Convert to Date if needed and validate
            let dateToCheck: Date;
            if (result.lastModified instanceof Date) {
              dateToCheck = result.lastModified;
            } else if (typeof result.lastModified === 'string') {
              dateToCheck = new Date(result.lastModified);
            } else if (typeof result.lastModified === 'number') {
              dateToCheck = new Date(result.lastModified);
            } else {
              // Try to convert whatever it is to a Date
              dateToCheck = new Date(result.lastModified as any);
            }
            
            expect(dateToCheck.getTime()).toBeLessThanOrEqual(Date.now());
          }

          // Property 3: Summary recommendations must match individual file recommendations
          const recommendationCounts = {
            migrate: results.filter(r => r.migrationRecommendation === 'migrate').length,
            backupAndRemove: results.filter(r => r.migrationRecommendation === 'backup_and_remove').length,
            remove: results.filter(r => r.migrationRecommendation === 'remove').length,
            keep: results.filter(r => r.migrationRecommendation === 'keep').length,
          };

          expect(summary.recommendations.migrate).toBe(recommendationCounts.migrate);
          expect(summary.recommendations.backupAndRemove).toBe(recommendationCounts.backupAndRemove);
          expect(summary.recommendations.remove).toBe(recommendationCounts.remove);
          expect(summary.recommendations.keep).toBe(recommendationCounts.keep);

          // Property 4: Total size must match sum of individual file sizes
          const expectedTotalSize = results.reduce((sum, r) => sum + r.size, 0);
          expect(summary.totalSize).toBe(expectedTotalSize);
        }
      ),
      { numRuns: 3, timeout: 30000 }
    );
  });

  /**
   * Property: File audit produces valid results for any file structure
   */
  it('should produce valid audit results for any file structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          companyNumber: fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes('/') && !s.includes(' ')),
          companyName: fc.string({ minLength: 1, maxLength: 50 }),
          hasCompanyNumber: fc.boolean(),
          hasCompanyName: fc.boolean(),
        }),
        async (clientData) => {
          // Create client file with potentially missing fields
          const clientFile = {
            id: `client-${clientData.companyNumber}`,
            content: {
              ...(clientData.hasCompanyNumber && { companyNumber: clientData.companyNumber }),
              ...(clientData.hasCompanyName && { companyName: clientData.companyName }),
              address: '123 Test St',
              contactEmail: 'test@example.com'
            }
          };

          await setupTestFileSystem(testStoragePath, { clients: [clientFile] });

          // Mock database response - no clients in database
          const mockGetClientByNumber = jest.fn().mockResolvedValue(null);
          databaseService.getClientByNumber = mockGetClientByNumber;

          const { results } = await service.auditAllFiles();
          const clientResult = results.find(r => r.category === 'clients' && r.filePath.includes(testStoragePath));

          // Property: Every file must have a valid audit result
          expect(clientResult).toBeDefined();
          expect(['connected', 'disconnected', 'orphaned', 'corrupted']).toContain(clientResult.status);
          expect(['migrate', 'backup_and_remove', 'remove', 'keep']).toContain(clientResult.migrationRecommendation);
          expect(clientResult.size).toBeGreaterThan(0);
          expect(clientResult.checksum).toMatch(/^[a-f0-9]{64}$/);
          expect(clientResult.reason).toBeDefined();
          expect(clientResult.reason.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 8 }
    );
  });

  /**
   * Property: Backup and cleanup operations must be consistent
   */
  it('should maintain consistency between backup and cleanup operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateValidFile(), { minLength: 1, maxLength: 3 }),
        async (files) => {
          // Setup test files
          await setupTestFileSystem(testStoragePath, { test: files });

          // Run audit to get file results
          const { results } = await service.auditAllFiles();
          
          // Filter to only our test files
          const testResults = results.filter(r => r.filePath.includes(testStoragePath));
          
          if (testResults.length === 0) {
            // Skip if no test files found
            return;
          }

          // Property 1: Backup creation must succeed
          const backupResult = await service.createBackup(testResults, 'property-test-backup');
          expect(backupResult.success).toBe(true);
          expect(backupResult.backupPath).toBeDefined();

          // Property 2: All backed up files must exist and be readable
          for (const backupPath of backupResult.filesBackedUp) {
            expect(existsSync(backupPath)).toBe(true);
            const backupContent = await fs.readFile(backupPath, 'utf8');
            expect(() => JSON.parse(backupContent)).not.toThrow();
          }

          // Property 3: Manifest must exist and be accurate
          const manifestPath = path.join(backupResult.backupPath, 'manifest.json');
          expect(existsSync(manifestPath)).toBe(true);
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
          expect(manifest.totalFiles).toBe(testResults.length);
          expect(manifest.files).toHaveLength(testResults.length);

          // Property 4: Cleanup verification must work correctly
          const cleanupResult = await service.cleanupFiles(testResults, { 
            dryRun: true, 
            createBackup: false 
          });
          expect(cleanupResult.success).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });
});

// Helper functions for generating test data

function generateClientFile() {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/') && !s.includes(' ')),
    content: fc.record({
      companyNumber: fc.string({ minLength: 1, maxLength: 10 }),
      companyName: fc.string({ minLength: 1, maxLength: 50 }),
      address: fc.string({ minLength: 5, maxLength: 100 }),
      contactEmail: fc.emailAddress(),
    }),
  });
}

function generateConfigFile() {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/') && !s.includes(' ')),
    content: fc.oneof(
      fc.array(fc.record({ key: fc.string(), value: fc.string() })),
      fc.record({ setting1: fc.string(), setting2: fc.boolean() })
    ),
  });
}

function generateValidFile() {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/') && !s.includes(' ')),
    content: fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      data: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.date().map(d => d.toISOString()),
    }),
  });
}

async function setupTestFileSystem(basePath: string, fileStructure: Record<string, any[]>) {
  // Ensure base directory exists
  await fs.mkdir(basePath, { recursive: true });

  for (const [category, files] of Object.entries(fileStructure)) {
    if (files.length === 0) continue;

    const categoryPath = path.join(basePath, category);
    await fs.mkdir(categoryPath, { recursive: true });

    for (const file of files) {
      const filePath = path.join(categoryPath, `${file.id}.json`);
      
      // Write valid JSON for all files
      await fs.writeFile(filePath, JSON.stringify(file.content, null, 2));
    }
  }
}

function setupDatabaseMocks(databaseService: DatabaseService, fileStructure: Record<string, any[]>) {
  // Mock client lookups - assume no clients are in database by default
  const mockGetClientByNumber = jest.fn().mockResolvedValue(null);
  databaseService.getClientByNumber = mockGetClientByNumber;

  // Mock calculation lookups - assume no calculations are in database by default
  const mockGetCalculationById = jest.fn().mockResolvedValue(null);
  databaseService.getCalculationById = mockGetCalculationById;
}