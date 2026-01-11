import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServerLifecycleService } from './server-lifecycle.service';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';

// Mock fs and child_process modules
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

describe('ServerLifecycleService', () => {
  let service: ServerLifecycleService;
  let configService: jest.Mocked<ConfigService>;

  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
  const mockExec = exec as jest.MockedFunction<typeof exec>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'STORAGE_PATH') return './test-data';
        if (key === 'PORT') return 3001;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerLifecycleService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ServerLifecycleService>(ServerLifecycleService);
    configService = module.get(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('STORAGE_PATH');
    });
  });

  describe('Server Status', () => {
    it('should get basic server status', async () => {
      mockExistsSync.mockReturnValue(false); // No docker-compose.yml

      const status = await service.getServerStatus();

      expect(status.isOnline).toBe(true);
      expect(status.mode).toBe('native');
      expect(status.services.api.status).toBe('running');
      expect(status.services.api.port).toBe(3001);
      expect(status.services.api.pid).toBe(process.pid);
      expect(typeof status.uptime).toBe('number');
    });

    it('should detect hybrid mode when docker-compose.yml exists', async () => {
      mockExistsSync.mockReturnValue(true);
      mockExec.mockImplementation((command: string, options: any, callback: any) => {
        if (command.includes('docker-compose ps -q postgres')) {
          callback(null, { stdout: 'container123\n', stderr: '' });
        } else if (command.includes('docker inspect')) {
          callback(null, { stdout: '/postgres_container,true\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any; // Return mock ChildProcess
      });

      const status = await service.getServerStatus();

      expect(status.mode).toBe('hybrid');
      expect(status.services.database).toBeDefined();
      expect(status.services.database?.status).toBe('running');
      expect(status.services.database?.container).toBe('postgres_container');
    });

    it('should include snapshot information when available', async () => {
      mockExistsSync.mockReturnValueOnce(false); // No docker-compose.yml
      mockExistsSync.mockReturnValueOnce(true); // Snapshot exists
      mockFs.stat.mockResolvedValue({ mtime: new Date('2024-01-01') } as any);

      const status = await service.getServerStatus();

      expect(status.lastSnapshot).toEqual(new Date('2024-01-01'));
    });
  });

  describe('Docker Service Management', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true); // docker-compose.yml exists
    });

    it('should start Docker services successfully', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: any) => {
        callback(null, { stdout: 'Creating postgres...', stderr: 'Creating postgres...' });
        return {} as any;
      });

      const result = await service.startDockerServices();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Docker services started successfully');
      expect(mockExec).toHaveBeenCalledWith(
        'docker-compose up -d',
        expect.objectContaining({ timeout: 60000 }),
        expect.any(Function)
      );
    });

    it('should handle Docker start errors', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: any) => {
        callback(new Error('Docker not found'), null);
        return {} as any;
      });

      const result = await service.startDockerServices();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to start Docker services');
    });

    it('should stop Docker services successfully', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: any) => {
        callback(null, { stdout: 'Stopping postgres...', stderr: 'Stopping postgres...' });
        return {} as any;
      });

      const result = await service.stopDockerServices();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Docker services stopped successfully');
      expect(mockExec).toHaveBeenCalledWith(
        'docker-compose down',
        expect.objectContaining({ timeout: 30000 }),
        expect.any(Function)
      );
    });

    it('should handle Docker stop errors', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: any) => {
        callback(new Error('Docker error'), null);
        return {} as any;
      });

      const result = await service.stopDockerServices();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to stop Docker services');
    });

    it('should restart Docker services', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: any) => {
        callback(null, { stdout: 'Success', stderr: '' });
        return {} as any;
      });

      const result = await service.restartDockerServices();

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledTimes(2); // Stop and start
    });

    it('should fail to start services when docker-compose.yml is missing', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await service.startDockerServices();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Docker Compose file not found');
    });
  });

  describe('Snapshot Management', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);
    });

    it('should create snapshot successfully', async () => {
      mockFs.readdir.mockResolvedValue(['client1.json', 'client2.json'] as any);
      mockFs.readFile.mockResolvedValue('{"id": "test"}');

      const result = await service.createSnapshot();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Snapshot created successfully');
      expect(result.path).toBeDefined();
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // snapshot file + latest.json
    });

    it('should handle snapshot creation errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await service.createSnapshot();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create snapshot');
    });

    it('should load snapshot successfully', async () => {
      const mockSnapshotData = {
        timestamp: '2024-01-01T00:00:00Z',
        data: { clients: [], tasks: [] },
      };
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSnapshotData));

      const result = await service.loadSnapshot();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Snapshot loaded successfully');
      expect(result.data).toEqual(mockSnapshotData);
    });

    it('should handle missing snapshot file', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await service.loadSnapshot();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Snapshot file not found');
    });

    it('should handle snapshot loading errors', async () => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockRejectedValue(new Error('Read error'));

      const result = await service.loadSnapshot();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to load snapshot');
    });

    it('should load specific snapshot path', async () => {
      const customPath = './custom-snapshot.json';
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue('{"test": true}');

      const result = await service.loadSnapshot(customPath);

      expect(result.success).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledWith(customPath, 'utf-8');
    });
  });

  describe('Data File Reading', () => {
    it('should read data files from category', async () => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readdir.mockResolvedValue(['client1.json', 'client2.json', 'index.json'] as any);
      mockFs.readFile.mockResolvedValue('{"id": "test-client"}');

      const result = await service['readDataFiles']('clients');

      expect(result).toHaveLength(2); // Should exclude index.json
      expect(result[0]).toEqual({ id: 'test-client' });
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should handle missing category directory', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await service['readDataFiles']('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle file read errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readdir.mockResolvedValue(['client1.json'] as any);
      mockFs.readFile.mockRejectedValue(new Error('Read error'));

      const result = await service['readDataFiles']('clients');

      expect(result).toEqual([]);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readdir.mockResolvedValue(['client1.json'] as any);
      mockFs.readFile.mockResolvedValue('invalid json');

      const result = await service['readDataFiles']('clients');

      expect(result).toEqual([]);
    });
  });

  describe('Docker Container Checking', () => {
    it('should check running container', async () => {
      mockExec
        .mockImplementationOnce((command: string, options: any, callback: any) => {
          // docker-compose ps -q
          callback(null, { stdout: 'container123\n', stderr: '' });
          return {} as any;
        })
        .mockImplementationOnce((command: string, options: any, callback: any) => {
          // docker inspect
          callback(null, { stdout: '/postgres_container,true\n', stderr: '' });
          return {} as any;
        });

      const result = await service['checkDockerContainer']('postgres');

      expect(result).toEqual({
        name: 'postgres_container',
        running: true,
      });
    });

    it('should handle non-existent container', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await service['checkDockerContainer']('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle Docker command errors', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: any) => {
        callback(new Error('Docker error'), null);
        return {} as any;
      });

      const result = await service['checkDockerContainer']('postgres');

      expect(result).toBeNull();
    });
  });

  describe('Snapshot Cleanup', () => {
    it('should clean up old snapshots', async () => {
      const mockFiles = [
        'snapshot-2024-01-01T00-00-00-000Z.json',
        'snapshot-2024-01-02T00-00-00-000Z.json',
        'snapshot-2024-01-03T00-00-00-000Z.json',
        // ... more files to exceed the limit of 10
      ];
      
      // Create 15 mock files
      for (let i = 4; i <= 15; i++) {
        mockFiles.push(`snapshot-2024-01-${i.toString().padStart(2, '0')}T00-00-00-000Z.json`);
      }

      mockFs.readdir.mockResolvedValue(mockFiles as any);
      mockFs.unlink.mockResolvedValue(undefined);

      await service['cleanupOldSnapshots']('./snapshots');

      // Should delete 5 files (15 - 10 = 5)
      expect(mockFs.unlink).toHaveBeenCalledTimes(5);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Read error'));

      // Should not throw
      await expect(service['cleanupOldSnapshots']('./snapshots')).resolves.toBeUndefined();
    });

    it('should not delete files when under limit', async () => {
      const mockFiles = [
        'snapshot-2024-01-01T00-00-00-000Z.json',
        'snapshot-2024-01-02T00-00-00-000Z.json',
      ];

      mockFs.readdir.mockResolvedValue(mockFiles as any);

      await service['cleanupOldSnapshots']('./snapshots');

      expect(mockFs.unlink).not.toHaveBeenCalled();
    });
  });
});