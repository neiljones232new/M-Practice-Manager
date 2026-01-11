import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { MigrationService, MigrationStats } from './migration.service';
import { DatabaseService } from './database.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { Client, TaxCalculationResult, OperationResult } from './interfaces/database.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * **Feature: practice-manager-upgrade, Property 5: Data Migration Integrity**
 * 
 * Property-based tests for data migration integrity.
 * Validates Requirements 2.2, 6.2, 6.4 from the specification.
 */
describe('MigrationService Property Tests', () => {
  let service: MigrationService;
  let databaseService: DatabaseService;
  let fileStorageService: FileStorageService;
  let testStoragePath: string;
  let testDbPath: string;

  beforeAll(async () => {
    // Create unique test storage and database paths
    const testDir = path.join(__dirname, '../../../../../test-storage');
    await fs.mkdir(testDir, { recursive: true });
    
    testStoragePath = path.join(testDir, `migration-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    testDbPath = path.join(testStoragePath, 'test-migration.db');
    
    await fs.mkdir(testStoragePath, { recursive: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        DatabaseService,
        FileStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STORAGE_PATH') {
                return testStoragePath;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MigrationService>(MigrationService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
    
    // Override the database path for testing
    (databaseService as any).dbPath = testDbPath;
    
    // Initialize the test database
    await databaseService.onModuleInit();
  });

  afterAll(async () => {
    // Clean up test files and database
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
      await fs.unlink(testDbPath).catch(() => {});
      await fs.unlink(`${testDbPath}-shm`).catch(() => {});
      await fs.unlink(`${testDbPath}-wal`).catch(() => {});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // Generators for property-based testing
  const companyNumberArbitrary = fc.string({ minLength: 8, maxLength: 8 }).map(s => 
    s.replace(/[^A-Z0-9]/g, '0').toUpperCase()
  );

  const companyNameArbitrary = fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0);

  const clientDataArbitrary = fc.record({
    companyNumber: companyNumberArbitrary,
    companyName: companyNameArbitrary,
    status: fc.constantFrom('active', 'dissolved', 'liquidation'),
    companyType: fc.option(fc.constantFrom('ltd', 'plc', 'llp')),
    clientManager: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
    telephone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
    email: fc.option(fc.emailAddress()),
    monthlyFee: fc.option(fc.float({ min: 0, max: 10000 })),
    annualFee: fc.option(fc.float({ min: 0, max: 50000 })),
    corporationTaxUtr: fc.option(fc.string({ minLength: 10, maxLength: 10 })),
    vatNumber: fc.option(fc.string({ minLength: 9, maxLength: 12 })),
    payeReference: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
    notes: fc.option(fc.string({ maxLength: 500 })),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });

  const taxCalculationArbitrary = fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    clientId: companyNumberArbitrary,
    calculationType: fc.constantFrom('SALARY_OPTIMIZATION', 'SCENARIO_COMPARISON', 'CORPORATION_TAX'),
    taxYear: fc.constantFrom('2023-24', '2024-25', '2025-26'),
    optimizedSalary: fc.option(fc.float({ min: 0, max: 100000 })),
    optimizedDividend: fc.option(fc.float({ min: 0, max: 500000 })),
    totalTakeHome: fc.option(fc.float({ min: 0, max: 400000 })),
    totalTaxLiability: fc.option(fc.float({ min: 0, max: 200000 })),
    estimatedSavings: fc.option(fc.float({ min: 0, max: 50000 })),
    parameters: fc.object(),
    recommendations: fc.array(fc.object()),
    calculatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    calculatedBy: fc.string({ minLength: 2, maxLength: 50 }),
    notes: fc.option(fc.string({ maxLength: 500 }))
  });

  /**
   * Property 5: Data Migration Integrity
   * For any data migration operation, the system should preserve all valuable data 
   * while correctly identifying and handling redundant files, maintaining backup 
   * copies until verification is complete
   */
  describe('Property 5: Data Migration Integrity', () => {
    it('should preserve all client data during migration from JSON to SQLite', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(clientDataArbitrary, { minLength: 1, maxLength: 10 }),
          async (clientsData) => {
            // Setup: Create JSON files for clients
            const clientsDir = path.join(testStoragePath, 'clients');
            await fs.mkdir(clientsDir, { recursive: true });
            
            const originalClients: any[] = [];
            
            for (const [index, clientData] of clientsData.entries()) {
              const uniqueClientData = {
                ...clientData,
                companyNumber: `${clientData.companyNumber}${Date.now()}${index}`,
                id: `${clientData.companyNumber}${Date.now()}${index}` // Add legacy id field
              };
              
              const clientFilePath = path.join(clientsDir, `${uniqueClientData.companyNumber}.json`);
              await fs.writeFile(clientFilePath, JSON.stringify(uniqueClientData, null, 2));
              originalClients.push(uniqueClientData);
            }

            // Execute migration
            const migrationStats = await service.migrateAllData();
            
            // Verify: All clients should be preserved in database
            for (const originalClient of originalClients) {
              const migratedClient = await databaseService.getClientByNumber(originalClient.companyNumber);
              
              expect(migratedClient).not.toBeNull();
              expect(migratedClient?.companyNumber).toBe(originalClient.companyNumber);
              expect(migratedClient?.companyName).toBe(originalClient.companyName);
              
              // Verify practice fields are preserved
              if (originalClient.corporationTaxUtr) {
                expect(migratedClient?.corporationTaxUtr).toBe(originalClient.corporationTaxUtr);
              }
              if (originalClient.vatNumber) {
                expect(migratedClient?.vatNumber).toBe(originalClient.vatNumber);
              }
              if (originalClient.monthlyFee) {
                expect(migratedClient?.monthlyFee).toBe(originalClient.monthlyFee);
              }
            }
            
            // Verify migration stats reflect successful migration
            expect(migrationStats.clientsMigrated).toBeGreaterThan(0);
            expect(migrationStats.errors.length).toBe(0);
            
            // Cleanup for next iteration
            await fs.rm(clientsDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve all tax calculation data during migration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            clients: fc.array(clientDataArbitrary, { minLength: 1, maxLength: 3 }),
            calculations: fc.array(taxCalculationArbitrary, { minLength: 1, maxLength: 5 })
          }),
          async ({ clients, calculations }) => {
            // Setup: Create client files first to satisfy foreign key constraints
            const clientsDir = path.join(testStoragePath, 'clients');
            const calculationsDir = path.join(testStoragePath, 'tax-calculations');
            await fs.mkdir(clientsDir, { recursive: true });
            await fs.mkdir(calculationsDir, { recursive: true });
            
            const originalClients: any[] = [];
            const originalCalculations: any[] = [];
            
            // Create client files first
            for (const [index, clientData] of clients.entries()) {
              const uniqueClientData = {
                ...clientData,
                companyNumber: `CALC${Date.now()}${index}`,
                id: `CALC${Date.now()}${index}`
              };
              
              const clientFilePath = path.join(clientsDir, `${uniqueClientData.companyNumber}.json`);
              await fs.writeFile(clientFilePath, JSON.stringify(uniqueClientData, null, 2));
              originalClients.push(uniqueClientData);
            }
            
            // Create calculation files that reference existing clients
            for (const [index, calculationData] of calculations.entries()) {
              const clientIndex = index % originalClients.length;
              const uniqueCalculationData = {
                ...calculationData,
                id: `calc_${Date.now()}_${index}`,
                clientId: originalClients[clientIndex].companyNumber // Reference existing client
              };
              
              const calcFilePath = path.join(calculationsDir, `${uniqueCalculationData.id}.json`);
              await fs.writeFile(calcFilePath, JSON.stringify(uniqueCalculationData, null, 2));
              originalCalculations.push(uniqueCalculationData);
            }

            // Execute migration
            const migrationStats = await service.migrateAllData();
            
            // Verify: All calculations should be preserved in database
            for (const originalCalc of originalCalculations) {
              const result = await databaseService.executeQuery(
                'SELECT * FROM tax_calculations WHERE id = ?',
                [originalCalc.id]
              );
              
              expect(result.success).toBe(true);
              expect(result.data?.length).toBe(1);
              
              const migratedCalc = result.data?.[0];
              expect(migratedCalc.id).toBe(originalCalc.id);
              expect(migratedCalc.client_id).toBe(originalCalc.clientId);
              expect(migratedCalc.calculation_type).toBe(originalCalc.calculationType);
              expect(migratedCalc.tax_year).toBe(originalCalc.taxYear);
              
              // Verify numerical data is preserved
              if (originalCalc.optimizedSalary) {
                expect(migratedCalc.optimized_salary).toBe(originalCalc.optimizedSalary);
              }
              if (originalCalc.totalTakeHome) {
                expect(migratedCalc.total_take_home).toBe(originalCalc.totalTakeHome);
              }
            }
            
            // Verify migration stats
            expect(migrationStats.calculationsMigrated).toBeGreaterThan(0);
            expect(migrationStats.clientsMigrated).toBeGreaterThan(0);
            
            // Cleanup for next iteration
            await fs.rm(clientsDir, { recursive: true, force: true });
            await fs.rm(calculationsDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should correctly identify and handle redundant files during audit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            validFiles: fc.array(clientDataArbitrary, { minLength: 1, maxLength: 5 }),
            invalidFiles: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 3 })
          }),
          async ({ validFiles, invalidFiles }) => {
            // Setup: Create both valid and invalid JSON files
            const clientsDir = path.join(testStoragePath, 'clients');
            await fs.mkdir(clientsDir, { recursive: true });
            
            const validFileNames: string[] = [];
            const invalidFileNames: string[] = [];
            
            // Create valid client files
            for (const [index, clientData] of validFiles.entries()) {
              const uniqueClientData = {
                ...clientData,
                companyNumber: `VALID${Date.now()}${index}`,
                id: `VALID${Date.now()}${index}`
              };
              
              const fileName = `${uniqueClientData.companyNumber}.json`;
              const filePath = path.join(clientsDir, fileName);
              await fs.writeFile(filePath, JSON.stringify(uniqueClientData, null, 2));
              validFileNames.push(filePath);
            }
            
            // Create invalid/corrupted files
            for (const [index, invalidContent] of invalidFiles.entries()) {
              const fileName = `INVALID${Date.now()}${index}.json`;
              const filePath = path.join(clientsDir, fileName);
              await fs.writeFile(filePath, invalidContent); // Invalid JSON content
              invalidFileNames.push(filePath);
            }
            
            // Execute audit
            const auditResult = await service.auditJsonFiles();
            
            // Verify: Audit should correctly classify files
            expect(auditResult.totalFiles).toBe(validFiles.length + invalidFiles.length);
            expect(auditResult.connectedFiles.length).toBeGreaterThan(0);
            expect(auditResult.disconnectedFiles.length).toBeGreaterThan(0);
            
            // All valid files should be in connected files
            const connectedBasenames = auditResult.connectedFiles.map(f => path.basename(f));
            const validBasenames = validFileNames.map(f => path.basename(f));
            
            for (const validBasename of validBasenames) {
              expect(connectedBasenames).toContain(validBasename);
            }
            
            // Invalid files should be in disconnected files
            const disconnectedBasenames = auditResult.disconnectedFiles.map(f => path.basename(f));
            const invalidBasenames = invalidFileNames.map(f => path.basename(f));
            
            for (const invalidBasename of invalidBasenames) {
              expect(disconnectedBasenames).toContain(invalidBasename);
            }
            
            // Cleanup for next iteration
            await fs.rm(clientsDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain backup copies during cleanup operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          async (fileContents) => {
            // Setup: Create files to be cleaned up
            const testDir = path.join(testStoragePath, 'cleanup-test');
            await fs.mkdir(testDir, { recursive: true });
            
            const filePaths: string[] = [];
            
            for (const [index, content] of fileContents.entries()) {
              const fileName = `cleanup_test_${Date.now()}_${index}.json`;
              const filePath = path.join(testDir, fileName);
              await fs.writeFile(filePath, content);
              filePaths.push(filePath);
            }
            
            // Mock the audit to return these files as disconnected
            jest.spyOn(service, 'auditJsonFiles').mockResolvedValue({
              connectedFiles: [],
              disconnectedFiles: filePaths,
              totalFiles: filePaths.length
            });
            
            // Execute cleanup (not dry run)
            const cleanupResult = await service.cleanupDisconnectedFiles(false);
            
            // Verify: All files should be backed up
            expect(cleanupResult.filesBackedUp.length).toBe(filePaths.length);
            expect(cleanupResult.filesRemoved.length).toBe(filePaths.length);
            expect(cleanupResult.errors.length).toBe(0);
            
            // Verify backup files exist and contain original content
            for (const [index, backupPath] of cleanupResult.filesBackedUp.entries()) {
              expect(existsSync(backupPath)).toBe(true);
              const backupContent = await fs.readFile(backupPath, 'utf-8');
              expect(backupContent).toBe(fileContents[index]);
            }
            
            // Verify original files are removed
            for (const originalPath of filePaths) {
              expect(existsSync(originalPath)).toBe(false);
            }
            
            // Cleanup for next iteration
            await fs.rm(testDir, { recursive: true, force: true });
            
            // Restore original method
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 8 }
      );
    });

    it('should verify migration integrity after completion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            clients: fc.array(clientDataArbitrary, { minLength: 1, maxLength: 5 }),
            calculations: fc.array(taxCalculationArbitrary, { minLength: 0, maxLength: 3 })
          }),
          async ({ clients, calculations }) => {
            // Setup: Create test data files
            const clientsDir = path.join(testStoragePath, 'clients');
            const calculationsDir = path.join(testStoragePath, 'tax-calculations');
            await fs.mkdir(clientsDir, { recursive: true });
            await fs.mkdir(calculationsDir, { recursive: true });
            
            const originalClients: any[] = [];
            
            // Create client files
            for (const [index, clientData] of clients.entries()) {
              const uniqueClientData = {
                ...clientData,
                companyNumber: `VERIFY${Date.now()}${index}`,
                id: `VERIFY${Date.now()}${index}`
              };
              
              const filePath = path.join(clientsDir, `${uniqueClientData.companyNumber}.json`);
              await fs.writeFile(filePath, JSON.stringify(uniqueClientData, null, 2));
              originalClients.push(uniqueClientData);
            }
            
            // Create calculation files that reference existing clients
            for (const [index, calculationData] of calculations.entries()) {
              const clientIndex = index % originalClients.length;
              const uniqueCalculationData = {
                ...calculationData,
                id: `verify_calc_${Date.now()}_${index}`,
                clientId: originalClients[clientIndex].companyNumber // Reference existing client
              };
              
              const filePath = path.join(calculationsDir, `${uniqueCalculationData.id}.json`);
              await fs.writeFile(filePath, JSON.stringify(uniqueCalculationData, null, 2));
            }
            
            // Execute migration
            await service.migrateAllData();
            
            // Execute verification
            const verificationResult = await service.verifyMigration();
            
            // Verify: Migration verification should succeed
            expect(verificationResult.success).toBe(true);
            expect(verificationResult.message).toContain('migrated successfully');
            
            // Verify the message contains correct counts
            expect(verificationResult.message).toContain(`${clients.length} clients`);
            if (calculations.length > 0) {
              expect(verificationResult.message).toContain(`${calculations.length} calculations`);
            }
            
            // Cleanup for next iteration
            await fs.rm(clientsDir, { recursive: true, force: true });
            await fs.rm(calculationsDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle concurrent migration operations safely', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(clientDataArbitrary, { minLength: 2, maxLength: 8 }),
          async (clientsData) => {
            // Setup: Create client files
            const clientsDir = path.join(testStoragePath, 'clients');
            await fs.mkdir(clientsDir, { recursive: true });
            
            const uniqueClients = clientsData.map((client, index) => ({
              ...client,
              companyNumber: `CONCURRENT${Date.now()}${index}`,
              id: `CONCURRENT${Date.now()}${index}`
            }));
            
            for (const client of uniqueClients) {
              const filePath = path.join(clientsDir, `${client.companyNumber}.json`);
              await fs.writeFile(filePath, JSON.stringify(client, null, 2));
            }
            
            // Execute multiple migration operations concurrently
            const [migrationStats, auditResult, verificationResult] = await Promise.all([
              service.migrateAllData(),
              service.auditJsonFiles(),
              service.verifyMigration()
            ]);
            
            // Verify: All operations should complete successfully
            expect(migrationStats.errors.length).toBe(0);
            expect(auditResult.totalFiles).toBeGreaterThanOrEqual(uniqueClients.length);
            expect(verificationResult.success).toBe(true);
            
            // Verify data integrity is maintained
            for (const originalClient of uniqueClients) {
              const migratedClient = await databaseService.getClientByNumber(originalClient.companyNumber);
              expect(migratedClient).not.toBeNull();
              expect(migratedClient?.companyNumber).toBe(originalClient.companyNumber);
            }
            
            // Cleanup for next iteration
            await fs.rm(clientsDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should preserve data relationships during migration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            client: clientDataArbitrary,
            relatedCalculations: fc.array(taxCalculationArbitrary, { minLength: 1, maxLength: 3 })
          }),
          async ({ client, relatedCalculations }) => {
            // Setup: Create client and related calculations
            const clientsDir = path.join(testStoragePath, 'clients');
            const calculationsDir = path.join(testStoragePath, 'tax-calculations');
            await fs.mkdir(clientsDir, { recursive: true });
            await fs.mkdir(calculationsDir, { recursive: true });
            
            const uniqueClient = {
              ...client,
              companyNumber: `RELATION${Date.now()}`,
              id: `RELATION${Date.now()}`
            };
            
            // Create client file
            const clientFilePath = path.join(clientsDir, `${uniqueClient.companyNumber}.json`);
            await fs.writeFile(clientFilePath, JSON.stringify(uniqueClient, null, 2));
            
            // Create related calculation files
            const uniqueCalculations = relatedCalculations.map((calc, index) => ({
              ...calc,
              id: `relation_calc_${Date.now()}_${index}`,
              clientId: uniqueClient.companyNumber // Link to the client
            }));
            
            for (const calculation of uniqueCalculations) {
              const calcFilePath = path.join(calculationsDir, `${calculation.id}.json`);
              await fs.writeFile(calcFilePath, JSON.stringify(calculation, null, 2));
            }
            
            // Execute migration
            await service.migrateAllData();
            
            // Verify: Client exists in database
            const migratedClient = await databaseService.getClientByNumber(uniqueClient.companyNumber);
            expect(migratedClient).not.toBeNull();
            
            // Verify: All related calculations exist and maintain relationship
            for (const originalCalc of uniqueCalculations) {
              const calcResult = await databaseService.executeQuery(
                'SELECT * FROM tax_calculations WHERE id = ? AND client_id = ?',
                [originalCalc.id, uniqueClient.companyNumber]
              );
              
              expect(calcResult.success).toBe(true);
              expect(calcResult.data?.length).toBe(1);
              
              const migratedCalc = calcResult.data?.[0];
              expect(migratedCalc.client_id).toBe(uniqueClient.companyNumber);
              expect(migratedCalc.id).toBe(originalCalc.id);
            }
            
            // Verify: Foreign key relationships are maintained
            const relatedCalcsResult = await databaseService.executeQuery(
              'SELECT COUNT(*) as count FROM tax_calculations WHERE client_id = ?',
              [uniqueClient.companyNumber]
            );
            
            expect(relatedCalcsResult.success).toBe(true);
            expect(relatedCalcsResult.data?.[0]?.count).toBe(uniqueCalculations.length);
            
            // Cleanup for next iteration
            await fs.rm(clientsDir, { recursive: true, force: true });
            await fs.rm(calculationsDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 8 }
      );
    });
  });
});