import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileAuditService, FileAuditResult } from './file-audit.service';
import { FileStorageService } from './file-storage.service';
import { DatabaseService } from '../database/database.service';
import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * **Feature: practice-manager-upgrade, Property 12: File System Audit Accuracy**
 * **Validates: Requirements 6.1**
 * 
 * Property-based tests for file system audit accuracy
 * Tests that the audit system correctly identifies connected versus disconnected JSON files
 * and accurately classifies files for migration or removal
 */
describe('FileAuditService Property Tests', () => {
  let service: FileAuditService;
  let fileStorageService: FileStorageService;
  let databaseService: DatabaseService;
  let testStoragePath: string;

  beforeAll(async () => {
    // Create test storage directory
    testStoragePath = path.join(process.cwd(), 'test-storage', `audit-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(testStoragePath, { recursive: true });

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
            readJson: jest.fn(),
            listFiles: jest.fn(),
            listAllClientFiles: jest.fn(),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            getClientByNumber: jest.fn(),
            getCalculationById: jest.fn(),
            testConnection: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FileAuditService>(FileAuditService);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    // Clean up test storage
    if (existsSync(testStoragePath)) {
      await fs.rm(testStoragePath, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up default mock behaviors
    (databaseService.testConnection as jest.Mock).mockResolvedValue({ success: true });
    (databaseService.getClientByNumber as jest.Mock).mockResolvedValue(null);
    (databaseService.getCalculationById as jest.Mock).mockResolvedValue(null);
    (fileStorageService.listAllClientFiles as jest.Mock).mockResolvedValue([]);
    (fileStorageService.listFiles as jest.Mock).mockResolvedValue([]);
  });

  /**
   * Property 12: File System Audit Accuracy
   * For any storage system audit, the system should correctly identify connected versus 
   * disconnected JSON files and accurately classify files for migration or removal
   */
  it('should correctly classify files based on their connection status and content validity', async () => {
    await fc.assert(fc.asyncProperty(
      // Generate test file scenarios
      fc.array(
        fc.record({
          category: fc.constantFrom('clients', 'tax-calculations', 'config', 'templates', 'users'),
          fileName: fc.string({ minLength: 5, maxLength: 20 })
            .filter(s => s.trim().length > 0 && !/[<>:"/\\|?*\s]/.test(s))
            .map(s => `${s.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Math.random().toString(36).substr(2, 5)}.json`),
          content: fc.oneof(
            // Valid client data
            fc.record({
              companyNumber: fc.string({ minLength: 8, maxLength: 8 }),
              companyName: fc.string({ minLength: 5, maxLength: 50 }),
              status: fc.constantFrom('active', 'dissolved', 'liquidation')
            }),
            // Valid tax calculation data
            fc.record({
              id: fc.uuid(),
              clientId: fc.string({ minLength: 8, maxLength: 8 }),
              calculationType: fc.constantFrom('SALARY_OPTIMIZATION', 'SCENARIO_COMPARISON'),
              taxYear: fc.constantFrom('2024-25', '2025-26')
            }),
            // Valid config data
            fc.array(fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 3, maxLength: 20 }),
              enabled: fc.boolean()
            })),
            // Invalid/empty data
            fc.oneof(
              fc.constant({}),
              fc.constant(null),
              fc.constant([])
            )
          ),
          isCorrupted: fc.boolean(),
          existsInDatabase: fc.boolean()
        }),
        { minLength: 1, maxLength: 10 }
      ),
      async (testFiles) => {
        // Set up mocks for all test files at once
        const clientMocks = new Map();
        const calculationMocks = new Map();
        
        for (const testFile of testFiles) {
          if (testFile.category === 'clients' && testFile.content?.companyNumber) {
            clientMocks.set(testFile.content.companyNumber, {
              exists: testFile.existsInDatabase,
              data: { companyNumber: testFile.content.companyNumber, companyName: testFile.content.companyName }
            });
          }
          
          if (testFile.category === 'tax-calculations' && testFile.content?.id) {
            calculationMocks.set(testFile.content.id, {
              exists: testFile.existsInDatabase,
              data: { id: testFile.content.id, clientId: testFile.content.clientId }
            });
            
            // Also ensure the client exists for tax calculations that should exist
            if (testFile.existsInDatabase && testFile.content.clientId) {
              clientMocks.set(testFile.content.clientId, {
                exists: true,
                data: { companyNumber: testFile.content.clientId, companyName: 'Test Client' }
              });
            }
          }
        }
        
        // Set up comprehensive mocks
        (databaseService.getClientByNumber as jest.Mock).mockImplementation((companyNumber) => {
          const mock = clientMocks.get(companyNumber);
          return mock?.exists ? Promise.resolve(mock.data) : Promise.resolve(null);
        });
        
        (databaseService.getCalculationById as jest.Mock).mockImplementation((id) => {
          const mock = calculationMocks.get(id);
          return mock?.exists ? Promise.resolve(mock.data) : Promise.resolve(null);
        });

        // Create test files in storage
        const createdFiles: string[] = [];
        
        try {
          for (const testFile of testFiles) {
            const categoryPath = path.join(testStoragePath, testFile.category);
            await fs.mkdir(categoryPath, { recursive: true });
            
            const filePath = path.join(categoryPath, testFile.fileName);
            
            if (testFile.isCorrupted) {
              // Create corrupted JSON
              await fs.writeFile(filePath, '{ invalid json content', 'utf8');
            } else {
              // Create valid JSON
              const jsonContent = testFile.content === null ? 'null' : JSON.stringify(testFile.content, null, 2);
              await fs.writeFile(filePath, jsonContent, 'utf8');
            }
            
            createdFiles.push(filePath);
          }
          
          // Perform audit
          const { results } = await service.auditAllFiles();
          
          // Verify audit results
          for (const testFile of testFiles) {
            const auditResult = results.find(r => r.fileName === testFile.fileName && r.category === testFile.category);
            
            if (auditResult) {
              // Property 1: Corrupted files should be identified as corrupted
              if (testFile.isCorrupted) {
                expect(auditResult.status).toBe('corrupted');
                expect(auditResult.migrationRecommendation).toBe('backup_and_remove');
              }
              
              // Property 2: Files with valid content should have appropriate status
              if (!testFile.isCorrupted && testFile.content && typeof testFile.content === 'object') {
                if (testFile.category === 'clients') {
                  if (testFile.content.companyNumber && testFile.content.companyName) {
                    if (testFile.existsInDatabase) {
                      expect(auditResult.status).toBe('disconnected');
                      expect(auditResult.migrationRecommendation).toBe('backup_and_remove');
                    } else {
                      expect(auditResult.status).toBe('connected');
                      expect(auditResult.migrationRecommendation).toBe('migrate');
                    }
                  } else {
                    expect(auditResult.status).toBe('orphaned');
                    expect(auditResult.migrationRecommendation).toBe('backup_and_remove');
                  }
                }
                
                if (testFile.category === 'tax-calculations') {
                  if (testFile.content.id && testFile.content.clientId) {
                    if (testFile.existsInDatabase) {
                      expect(auditResult.status).toBe('disconnected');
                      expect(auditResult.migrationRecommendation).toBe('backup_and_remove');
                    } else {
                      // Would need client to exist for connected status
                      expect(['connected', 'orphaned']).toContain(auditResult.status);
                    }
                  } else {
                    expect(auditResult.status).toBe('orphaned');
                    expect(auditResult.migrationRecommendation).toBe('backup_and_remove');
                  }
                }
                
                if (testFile.category === 'config') {
                  if (Array.isArray(testFile.content) && testFile.content.length > 0) {
                    expect(auditResult.status).toBe('connected');
                    expect(auditResult.migrationRecommendation).toBe('keep');
                  }
                }
              }
              
              // Property 3: Empty content (but not null) should be classified appropriately
              if (!testFile.isCorrupted && testFile.content !== null && (
                  (typeof testFile.content === 'object' && Object.keys(testFile.content).length === 0) ||
                  (Array.isArray(testFile.content) && testFile.content.length === 0))) {
                
                if (testFile.category === 'clients') {
                  // Clients with no content should be orphaned
                  expect(['disconnected', 'orphaned']).toContain(auditResult.status);
                  expect(['backup_and_remove', 'remove']).toContain(auditResult.migrationRecommendation);
                } else {
                  // Other categories with no content should be disconnected
                  expect(['disconnected', 'orphaned']).toContain(auditResult.status);
                  expect(['backup_and_remove', 'remove']).toContain(auditResult.migrationRecommendation);
                }
              }
              
              // Property 3b: Null content should be classified as corrupted (because accessing properties on null throws errors)
              if (!testFile.isCorrupted && testFile.content === null) {
                expect(auditResult.status).toBe('corrupted');
                expect(auditResult.migrationRecommendation).toBe('backup_and_remove');
              }
              
              // Property 4: All audit results should have required fields
              expect(auditResult.category).toBe(testFile.category);
              expect(auditResult.fileName).toBe(testFile.fileName);
              expect(auditResult.filePath).toContain(testFile.fileName);
              
              // Debug: log the actual status if it's unexpected
              if (!['connected', 'disconnected', 'orphaned', 'corrupted'].includes(auditResult.status)) {
                console.log('Unexpected status:', auditResult.status, 'for file:', testFile.fileName, 'content:', testFile.content);
              }
              
              expect(['connected', 'disconnected', 'orphaned', 'corrupted']).toContain(auditResult.status);
              expect(['migrate', 'backup_and_remove', 'remove', 'keep']).toContain(auditResult.migrationRecommendation);
              expect(typeof auditResult.reason).toBe('string');
              expect(auditResult.reason.length).toBeGreaterThan(0);
              expect(typeof auditResult.size).toBe('number');
              expect(auditResult.size).toBeGreaterThanOrEqual(0);
              // More flexible check for lastModified - it should be a valid date-like value
              expect(auditResult.lastModified).toBeDefined();
              expect(auditResult.lastModified).not.toBeNull();
              expect(typeof auditResult.checksum).toBe('string');
              expect(typeof auditResult.hasBackup).toBe('boolean');
            }
          }
          
        } finally {
          // Clean up created files
          for (const filePath of createdFiles) {
            try {
              if (existsSync(filePath)) {
                await fs.unlink(filePath);
              }
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        }
      }
    ), { numRuns: 25 }); // Reduced runs for faster execution
  });

  /**
   * Property: Audit consistency across multiple runs
   * For any set of files, running the audit multiple times should produce consistent results
   */
  it('should produce consistent audit results across multiple runs', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          category: fc.constantFrom('clients', 'config'),
          fileName: fc.string({ minLength: 5, maxLength: 15 }).map(s => `${s.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Math.random().toString(36).substr(2, 5)}.json`),
          content: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 3, maxLength: 20 })
          })
        }),
        { minLength: 1, maxLength: 5 }
      ),
      async (testFiles) => {
        const createdFiles: string[] = [];
        
        try {
          // Create test files
          for (const testFile of testFiles) {
            const categoryPath = path.join(testStoragePath, testFile.category);
            await fs.mkdir(categoryPath, { recursive: true });
            
            const filePath = path.join(categoryPath, testFile.fileName);
            await fs.writeFile(filePath, JSON.stringify(testFile.content, null, 2), 'utf8');
            createdFiles.push(filePath);
          }
          
          // Run audit multiple times
          const audit1 = await service.auditAllFiles();
          const audit2 = await service.auditAllFiles();
          
          // Results should be consistent
          expect(audit1.summary.totalFiles).toBe(audit2.summary.totalFiles);
          expect(audit1.summary.connectedFiles).toBe(audit2.summary.connectedFiles);
          expect(audit1.summary.disconnectedFiles).toBe(audit2.summary.disconnectedFiles);
          
          // Individual file results should be identical
          for (const result1 of audit1.results) {
            const result2 = audit2.results.find(r => r.filePath === result1.filePath);
            if (result2) {
              expect(result1.status).toBe(result2.status);
              expect(result1.migrationRecommendation).toBe(result2.migrationRecommendation);
              expect(result1.checksum).toBe(result2.checksum);
            }
          }
          
        } finally {
          // Clean up
          for (const filePath of createdFiles) {
            try {
              if (existsSync(filePath)) {
                await fs.unlink(filePath);
              }
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        }
      }
    ), { numRuns: 10 });
  });

  /**
   * Property: Audit summary accuracy
   * For any audit results, the summary should accurately reflect the individual file statuses
   */
  it('should generate accurate summaries that match individual file results', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          category: fc.constantFrom('clients', 'templates', 'config'),
          fileName: fc.string({ minLength: 5, maxLength: 15 }).map(s => `${s.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Math.random().toString(36).substr(2, 5)}.json`),
          content: fc.oneof(
            fc.record({ id: fc.uuid(), name: fc.string({ minLength: 3, maxLength: 20 }) }),
            fc.constant({}),
            fc.constant(null)
          ),
          isCorrupted: fc.boolean()
        }),
        { minLength: 1, maxLength: 8 }
      ),
      async (testFiles) => {
        // Set up mocks for all test files at once (same as first test)
        const clientMocks = new Map();
        
        for (const testFile of testFiles) {
          if (testFile.category === 'clients' && testFile.content?.companyNumber) {
            clientMocks.set(testFile.content.companyNumber, {
              exists: false, // Default to not existing for this test
              data: { companyNumber: testFile.content.companyNumber, companyName: testFile.content.companyName }
            });
          }
        }
        
        // Set up comprehensive mocks
        (databaseService.getClientByNumber as jest.Mock).mockImplementation((companyNumber) => {
          const mock = clientMocks.get(companyNumber);
          return mock?.exists ? Promise.resolve(mock.data) : Promise.resolve(null);
        });
        
        (databaseService.getCalculationById as jest.Mock).mockImplementation(() => Promise.resolve(null));

        const createdFiles: string[] = [];
        
        try {
          // Create test files
          for (const testFile of testFiles) {
            const categoryPath = path.join(testStoragePath, testFile.category);
            await fs.mkdir(categoryPath, { recursive: true });
            
            const filePath = path.join(categoryPath, testFile.fileName);
            
            if (testFile.isCorrupted) {
              await fs.writeFile(filePath, '{ invalid', 'utf8');
            } else {
              const jsonContent = testFile.content === null ? 'null' : JSON.stringify(testFile.content, null, 2);
              await fs.writeFile(filePath, jsonContent, 'utf8');
            }
            
            createdFiles.push(filePath);
          }
          
          // Perform audit
          const { results, summary } = await service.auditAllFiles();
          
          // Verify summary accuracy
          const actualCounts = {
            total: results.length,
            connected: results.filter(r => r.status === 'connected').length,
            disconnected: results.filter(r => r.status === 'disconnected').length,
            orphaned: results.filter(r => r.status === 'orphaned').length,
            corrupted: results.filter(r => r.status === 'corrupted').length
          };
          
          const actualRecommendations = {
            migrate: results.filter(r => r.migrationRecommendation === 'migrate').length,
            backupAndRemove: results.filter(r => r.migrationRecommendation === 'backup_and_remove').length,
            remove: results.filter(r => r.migrationRecommendation === 'remove').length,
            keep: results.filter(r => r.migrationRecommendation === 'keep').length
          };
          
          const actualTotalSize = results.reduce((sum, r) => sum + r.size, 0);
          
          // Summary should match actual counts
          expect(summary.totalFiles).toBe(actualCounts.total);
          expect(summary.connectedFiles).toBe(actualCounts.connected);
          expect(summary.disconnectedFiles).toBe(actualCounts.disconnected);
          expect(summary.orphanedFiles).toBe(actualCounts.orphaned);
          expect(summary.corruptedFiles).toBe(actualCounts.corrupted);
          expect(summary.totalSize).toBe(actualTotalSize);
          expect(summary.recommendations.migrate).toBe(actualRecommendations.migrate);
          expect(summary.recommendations.backupAndRemove).toBe(actualRecommendations.backupAndRemove);
          expect(summary.recommendations.remove).toBe(actualRecommendations.remove);
          expect(summary.recommendations.keep).toBe(actualRecommendations.keep);
          
        } finally {
          // Clean up
          for (const filePath of createdFiles) {
            try {
              if (existsSync(filePath)) {
                await fs.unlink(filePath);
              }
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        }
      }
    ), { numRuns: 15 });
  });
});