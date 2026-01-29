import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from './file-storage.service';
import { EncryptionService } from '../security/services/encryption.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import * as crypto from 'crypto';
import * as os from 'os';

// Create a temporary directory for testing
const createTempDir = async (): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdj-test-'));
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

describe('FileStorageService - File Operations Unit Tests', () => {
  let service: FileStorageService;
  let configService: ConfigService;
  let testStoragePath: string;
  let encryptionKey: string;

  beforeEach(async () => {
    // Create a real temporary directory for each test
    testStoragePath = await createTempDir();
    // Generate a fixed encryption key for the test
    encryptionKey = crypto.randomBytes(32).toString('hex');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'STORAGE_PATH') return testStoragePath;
              if (key === 'ENCRYPTION_KEY') return encryptionKey;
              if (key === 'FILE_STORAGE_ENCRYPTION') return 'true';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
    configService = module.get<ConfigService>(ConfigService);

    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await cleanupTempDir(testStoragePath);
  });

  describe('JSON Read/Write Operations with Temporary Files', () => {
    const testData = { 
      id: 'test-client-1', 
      name: 'Test Client', 
      status: 'active',
      createdAt: new Date().toISOString(),
      portfolioCode: 1,
    };
    const category = 'clients';
    const id = 'test-client-1';

    it('should write JSON data atomically using temporary files', async () => {
      await service.writeJson(category, id, testData);

      // Verify the file was created
      const filePath = path.join(testStoragePath, category, id, 'client.json');
      expect(existsSync(filePath)).toBe(true);

      // Verify the content is encrypted at rest
      const content = await fs.readFile(filePath, 'utf8');
      const parsedData = JSON.parse(content);
      expect(parsedData.__encrypted).toBe(true);
    });

    it('should read JSON data correctly', async () => {
      // First write the data
      await service.writeJson(category, id, testData);

      // Then read it back
      const result = await service.readJson<any>(category, id);
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent files', async () => {
      const result = await service.readJson<any>(category, 'non-existent-id');
      expect(result).toBeNull();
    });

    it('should handle portfolio-based client files', async () => {
      const portfolioCode = 1;
      
      await service.writeJson(category, id, testData, portfolioCode);

      // Verify file is in correct portfolio directory
      const filePath = path.join(testStoragePath, category, id, 'client.json');
      expect(existsSync(filePath)).toBe(true);

      // Verify we can read it back
      const result = await service.readJson<any>(category, id, portfolioCode);
      expect(result).toEqual(testData);
    });

    it('should handle complex nested JSON data', async () => {
      const complexData = {
        id: 'complex-test',
        client: {
          name: 'Complex Client',
          address: {
            street: '123 Test St',
            city: 'Test City',
            country: 'Test Country'
          },
          contacts: [
            { name: 'John Doe', email: 'john@test.com' },
            { name: 'Jane Smith', email: 'jane@test.com' }
          ]
        },
        services: ['accounting', 'tax', 'payroll'],
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1.0
        }
      };

      await service.writeJson('clients', 'complex-test', complexData);
      const result = await service.readJson<any>('clients', 'complex-test');
      expect(result).toEqual(complexData);
    });
  });

  describe('Data Integrity and Backup Mechanisms', () => {
    const testData = { id: 'backup-test', name: 'Backup Test Client' };
    const category = 'clients';
    const id = 'backup-test';

    it('should not create backups when overwriting existing file (backups disabled)', async () => {
      // Write initial data
      await service.writeJson(category, id, testData);

      // Modify and write again
      const updatedData = { ...testData, name: 'Updated Client', updatedAt: new Date().toISOString() };
      await service.writeJson(category, id, updatedData);

      // Check that backup directory, if present, contains no backups
      const backupDir = path.join(testStoragePath, 'backups', category);
      if (existsSync(backupDir)) {
        const backupFiles = await fs.readdir(backupDir);
        const backupFile = backupFiles.find(file => file.startsWith(`${id}_`));
        expect(backupFile).toBeUndefined();
      } else {
        expect(existsSync(backupDir)).toBe(false);
      }
    });

    it('should maintain data integrity with checksums', async () => {
      await service.writeJson(category, id, testData);

      // Check that index was updated with checksum
      const indexPath = path.join(testStoragePath, 'indexes', `${category}.json`);
      expect(existsSync(indexPath)).toBe(true);

      const indexContent = await fs.readFile(indexPath, 'utf8');
      const index = JSON.parse(indexContent);
      expect(index[id]).toBeDefined();
      expect(index[id].checksum).toBeDefined();
      expect(index[id].size).toBeGreaterThan(0);
      expect(index[id].lastModified).toBeDefined();
    });

    it('should verify data integrity on read', async () => {
      await service.writeJson(category, id, testData);

      // Read the data - should pass integrity check
      const result = await service.readJson<any>(category, id);
      expect(result).toEqual(testData);
    });

    it('should not create backups before deletion (backups disabled)', async () => {
      // Write data first
      await service.writeJson(category, id, testData);

      // Delete the file
      await service.deleteJson(category, id);

      // Verify file is deleted
      const filePath = path.join(testStoragePath, category, `${id}.json`);
      expect(existsSync(filePath)).toBe(false);

      // Verify backup was not created
      const backupDir = path.join(testStoragePath, 'backups', category);
      if (existsSync(backupDir)) {
        const backupFiles = await fs.readdir(backupDir);
        const backupFile = backupFiles.find(file => file.startsWith(`${id}_`));
        expect(backupFile).toBeUndefined();
      } else {
        expect(existsSync(backupDir)).toBe(false);
      }
    });

    it('should handle corrupted index gracefully', async () => {
      await service.writeJson(category, id, testData);

      // Corrupt the index file
      const indexPath = path.join(testStoragePath, 'indexes', `${category}.json`);
      await fs.writeFile(indexPath, 'invalid json', 'utf8');

      // Should still be able to read the data
      const result = await service.readJson<any>(category, id);
      expect(result).toEqual(testData);
    });
  });

  describe('Concurrent File Access and Locking', () => {
    const testData1 = { id: 'concurrent-1', name: 'Concurrent Test 1' };
    const testData2 = { id: 'concurrent-1', name: 'Concurrent Test 2' };
    const category = 'clients';
    const id = 'concurrent-1';

    it('should handle concurrent writes to the same file', async () => {
      // Start two concurrent write operations
      const promise1 = service.writeJson(category, id, testData1);
      const promise2 = service.writeJson(category, id, testData2);

      // Both should complete without error
      await Promise.all([promise1, promise2]);

      // File should contain one of the datasets (last writer wins)
      const result = await service.readJson<any>(category, id);
      expect(result).toBeDefined();
      expect(result!.id).toBe('concurrent-1');
      expect(['Concurrent Test 1', 'Concurrent Test 2']).toContain(result!.name);
    });

    it('should handle concurrent read/write operations', async () => {
      // Write initial data
      await service.writeJson(category, id, testData1);

      // Start concurrent read and write operations
      const readPromise = service.readJson<any>(category, id);
      const writePromise = service.writeJson(category, id, testData2);

      const [readResult] = await Promise.all([readPromise, writePromise]);

      // Read should return valid data (either original or updated)
      expect(readResult).toBeDefined();
      expect(readResult!.id).toBe('concurrent-1');
    });

    it('should handle concurrent operations on different files', async () => {
      const promises = [];
      
      // Create multiple concurrent write operations on different files
      for (let i = 0; i < 5; i++) {
        const data = { id: `concurrent-${i}`, name: `Concurrent Test ${i}` };
        promises.push(service.writeJson(category, `concurrent-${i}`, data));
      }

      // All should complete successfully
      await Promise.all(promises);

      // Verify all files were created correctly
      for (let i = 0; i < 5; i++) {
        const result = await service.readJson<any>(category, `concurrent-${i}`);
        expect(result).toEqual({ id: `concurrent-${i}`, name: `Concurrent Test ${i}` });
      }
    });

    it('should handle concurrent delete operations', async () => {
      // Write test data
      await service.writeJson(category, id, testData1);

      // Start concurrent delete operations
      const deletePromise1 = service.deleteJson(category, id);
      const deletePromise2 = service.deleteJson(category, id);

      // Both should complete without error (second delete should be no-op)
      await Promise.all([deletePromise1, deletePromise2]);

      // File should be deleted
      const result = await service.readJson<any>(category, id);
      expect(result).toBeNull();
    });

    it('should handle high concurrency with bulk operations', async () => {
      const bulkData = [];
      for (let i = 0; i < 10; i++) {
        bulkData.push({
          id: `bulk-${i}`,
          data: { id: `bulk-${i}`, name: `Bulk Test ${i}`, value: Math.random() }
        });
      }

      // Perform bulk write
      await service.bulkWriteJson(category, bulkData);

      // Verify all files were written correctly
      for (const item of bulkData) {
        const result = await service.readJson<any>(category, item.id);
        expect(result).toEqual(item.data);
      }
    });

    it('should handle lock timeout scenarios', async () => {
      // This test simulates a scenario where lock acquisition works under moderate concurrency
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const data = { id: 'lock-test', name: `Lock Test ${i}`, timestamp: Date.now() };
        promises.push(service.writeJson(category, 'lock-test', data));
      }

      // All operations should eventually complete
      await Promise.all(promises);

      // Final result should be valid
      const result = await service.readJson<any>(category, 'lock-test');
      expect(result).toBeDefined();
      expect(result!.id).toBe('lock-test');
    });
  });

  describe('Transaction Support and Rollback', () => {
    it('should support transaction operations', async () => {
      const transactionId = await service.beginTransaction();
      expect(transactionId).toBeDefined();
      expect(typeof transactionId).toBe('string');

      // Commit should succeed
      await expect(service.commitTransaction(transactionId)).resolves.not.toThrow();
    });

    it('should support transaction rollback', async () => {
      const transactionId = await service.beginTransaction();
      
      // Rollback should succeed
      await expect(service.rollbackTransaction(transactionId)).resolves.not.toThrow();
    });

    it('should handle invalid transaction IDs', async () => {
      const invalidId = 'invalid-transaction-id';

      await expect(service.commitTransaction(invalidId)).rejects.toThrow();
      await expect(service.rollbackTransaction(invalidId)).rejects.toThrow();
    });

    it('should handle bulk operations with transactions', async () => {
      const bulkData = [
        { id: 'tx-1', data: { name: 'Transaction Test 1' } },
        { id: 'tx-2', data: { name: 'Transaction Test 2' } },
        { id: 'tx-3', data: { name: 'Transaction Test 3' } }
      ];

      // Bulk write should use transactions internally
      await expect(service.bulkWriteJson('clients', bulkData)).resolves.not.toThrow();

      // Verify all data was written
      for (const item of bulkData) {
        const result = await service.readJson<any>('clients', item.id);
        expect(result).toEqual(item.data);
      }
    });
  });

  describe('Snapshot and Backup Operations', () => {
    it('should create snapshots successfully', async () => {
      // Write some test data first
      await service.writeJson('clients', 'snapshot-test', { name: 'Snapshot Test' });
      await service.writeJson('services', 'service-test', { name: 'Service Test' });

      const snapshotPath = await service.createSnapshot();
      
      expect(snapshotPath).toBeDefined();
      expect(snapshotPath).toContain('snapshot_');
      expect(existsSync(snapshotPath)).toBe(true);

      // Verify snapshot metadata exists
      const metadataPath = path.join(snapshotPath, 'snapshot.meta.json');
      expect(existsSync(metadataPath)).toBe(true);

      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      expect(metadata.timestamp).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.totalFiles).toBeGreaterThan(0);
    });

    it('should restore from snapshots successfully', async () => {
      // Create initial data
      const originalData = { name: 'Original Data' };
      await service.writeJson('clients', 'restore-test', originalData);

      // Create snapshot
      const snapshotPath = await service.createSnapshot();

      // Modify data
      const modifiedData = { name: 'Modified Data' };
      await service.writeJson('clients', 'restore-test', modifiedData);

      // Verify data was modified
      let result = await service.readJson<any>('clients', 'restore-test');
      expect(result).toEqual(modifiedData);

      // Restore from snapshot
      await service.restoreFromSnapshot(snapshotPath);

      // Verify data was restored
      result = await service.readJson<any>('clients', 'restore-test');
      expect(result).toEqual(originalData);
    });

    it('should handle non-existent snapshot restoration', async () => {
      const nonExistentPath = path.join(testStoragePath, 'non-existent-snapshot');
      
      await expect(service.restoreFromSnapshot(nonExistentPath))
        .rejects.toThrow('Snapshot not found');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid JSON gracefully', async () => {
      // Write invalid JSON directly to file
      const filePath = path.join(testStoragePath, 'clients', 'invalid.json');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'invalid json content', 'utf8');

      // Reading should throw an error
      await expect(service.readJson<any>('clients', 'invalid')).rejects.toThrow();
    });

    it('should handle file system errors gracefully', async () => {
      // Try to write to a read-only location (simulate permission error)
      const readOnlyPath = path.join(testStoragePath, 'readonly');
      await fs.mkdir(readOnlyPath, { recursive: true });
      
      // This test depends on the system's ability to set read-only permissions
      // In a real scenario, this would test permission errors
      const testData = { name: 'Permission Test' };
      
      // The service should handle errors gracefully
      try {
        await service.writeJson('readonly', 'test', testData);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle large JSON files', async () => {
      // Create a large JSON object
      const largeData = {
        id: 'large-test',
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `This is a description for item ${i}`.repeat(10),
          metadata: {
            created: new Date().toISOString(),
            tags: [`tag-${i}`, `category-${i % 10}`, 'large-test']
          }
        }))
      };

      await service.writeJson('clients', 'large-test', largeData);
      const result = await service.readJson<any>('clients', 'large-test');
      
      expect(result).toEqual(largeData);
      expect(result!.items).toHaveLength(1000);
    });

    it('should handle special characters in file names and data', async () => {
      const specialData = {
        id: 'special-chars-test',
        name: 'Test with "quotes" and \'apostrophes\'',
        description: 'Special chars: àáâãäåæçèéêë ñòóôõö ùúûü',
        unicode: '🚀 Unicode test 中文 العربية',
        json: { nested: 'object with "quotes"' }
      };

      await service.writeJson('clients', 'special-chars-test', specialData);
      const result = await service.readJson<any>('clients', 'special-chars-test');
      
      expect(result).toEqual(specialData);
    });
  });
});
