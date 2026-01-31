import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { QueryResult, OperationResult, Client } from './interfaces/database.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * **Feature: practice-manager-upgrade, Property 4: Database Operation Consistency**
 * 
 * Property-based tests for database operation consistency.
 * Validates Requirements 2.3, 2.4 from the specification.
 */
describe('DatabaseService Property Tests', () => {
  let service: DatabaseService;
  let testDbPath: string;

  beforeAll(async () => {
    // Create a unique test database path
    const testDir = path.join(__dirname, '../../../../../test-storage');
    await fs.mkdir(testDir, { recursive: true });
    testDbPath = path.join(testDir, `test-db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STORAGE_PATH') {
                return path.dirname(testDbPath);
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    
    // Override the database path for testing
    (service as any).dbPath = testDbPath;
    
    // Initialize the test database
    await service.onModuleInit();
  });

  afterAll(async () => {
    // Clean up test database
    try {
      await fs.unlink(testDbPath);
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

  const clientArbitrary = fc.record({
    companyNumber: companyNumberArbitrary,
    companyName: companyNameArbitrary,
    status: fc.constantFrom('active', 'dissolved', 'liquidation'),
    companyType: fc.option(fc.constantFrom('ltd', 'plc', 'llp')),
    clientManager: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
    telephone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
    email: fc.option(fc.emailAddress()),
    monthlyFee: fc.option(fc.float({ min: 0, max: 10000 })),
    annualFee: fc.option(fc.float({ min: 0, max: 50000 })),
  });

  /**
   * Property 4: Database Operation Consistency
   * For any database operation, the system should return properly structured 
   * QueryResult objects with consistent success/error status and user-friendly error messages
   */
  describe('Property 4: Database Operation Consistency', () => {
    it('should return consistent QueryResult structure for all SELECT queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (searchTerm) => {
            const result = await service.searchClientsByName(searchTerm);
            
            // Result should always be an array
            expect(Array.isArray(result)).toBe(true);
            
            // Each client in result should have required fields
            result.forEach(client => {
              expect(client).toHaveProperty('companyNumber');
              expect(client).toHaveProperty('companyName');
              expect(typeof client.companyNumber).toBe('string');
              expect(typeof client.companyName).toBe('string');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent OperationResult structure for all INSERT operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          clientArbitrary,
          async (clientData) => {
            // Ensure unique company number for each test
            const uniqueClient = {
              ...clientData,
              companyNumber: `${clientData.companyNumber}${Date.now()}${Math.random().toString(36).substr(2, 3)}`
            };

            const result = await service.addClient(uniqueClient);
            
            // Result should always have success boolean and message
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('message');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
            
            // If successful, should have id
            if (result.success) {
              expect(result).toHaveProperty('id');
              expect(result.id).toBe(uniqueClient.companyNumber);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return consistent OperationResult structure for all UPDATE operations', async () => {
      // First, add a client to update
      const testClient = {
        companyNumber: `TEST${Date.now()}`,
        companyName: 'Test Company for Updates',
        status: 'active'
      };
      
      await service.addClient(testClient);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            clientManager: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
            telephone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
            email: fc.option(fc.emailAddress()),
            monthlyFee: fc.option(fc.float({ min: 0, max: 10000 })),
          }),
          async (updates) => {
            const result = await service.updateClient(testClient.companyNumber, updates);
            
            // Result should always have success boolean and message
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('message');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide user-friendly error messages for constraint violations', async () => {
      await fc.assert(
        fc.asyncProperty(
          clientArbitrary,
          async (clientData) => {
            // First add the client
            const result1 = await service.addClient(clientData);
            
            if (result1.success) {
              // Try to add the same client again (should fail with constraint violation)
              const result2 = await service.addClient(clientData);
              
              expect(result2.success).toBe(false);
              expect(result2.message).toBeDefined();
              expect(typeof result2.message).toBe('string');
              expect(result2.message.length).toBeGreaterThan(0);
              
              // Message should be user-friendly, not a raw SQL error
              expect(result2.message).not.toMatch(/SQLITE_/);
              expect(result2.message).not.toMatch(/constraint failed/i);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle empty or invalid input gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant(null),
            fc.constant(undefined),
            fc.string({ maxLength: 0 })
          ),
          async (invalidInput) => {
            const result = await service.addClient({ 
              companyNumber: invalidInput as any,
              companyName: 'Test Company'
            });
            
            expect(result.success).toBe(false);
            expect(result.message).toBeDefined();
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
            
            // Should provide meaningful error message
            expect(result.message.toLowerCase()).toContain('required');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain data consistency across concurrent operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(clientArbitrary, { minLength: 2, maxLength: 5 }),
          async (clients) => {
            // Make company numbers unique
            const uniqueClients = clients.map((client, index) => ({
              ...client,
              companyNumber: `${client.companyNumber}${Date.now()}${index}`
            }));

            // Execute multiple operations concurrently
            const results = await Promise.all(
              uniqueClients.map(client => service.addClient(client))
            );

            // All operations should return consistent result structure
            results.forEach(result => {
              expect(result).toHaveProperty('success');
              expect(result).toHaveProperty('message');
              expect(typeof result.success).toBe('boolean');
              expect(typeof result.message).toBe('string');
            });

            // Verify all successful operations actually stored data
            const successfulResults = results.filter(r => r.success);
            for (const result of successfulResults) {
              if (result.id) {
                const storedClient = await service.getClientByNumber(result.id);
                expect(storedClient).not.toBeNull();
                expect(storedClient?.companyNumber).toBe(result.id);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return consistent structure for database connection tests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No input needed for connection test
          async () => {
            const result = await service.testConnection();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('message');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
            
            // Connection test should succeed for our test database
            expect(result.success).toBe(true);
            expect(result.message).toContain('connection successful');
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});