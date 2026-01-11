import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { FileStorageService } from '../file-storage/file-storage.service';

describe('AuditService', () => {
  let service: AuditService;
  let fileStorageService: jest.Mocked<FileStorageService>;

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      listFiles: jest.fn(),
      deleteJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    fileStorageService = module.get(FileStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logEvent', () => {
    it('should log an audit event successfully', async () => {
      fileStorageService.readJson.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.logEvent({
        actor: 'user123',
        actorType: 'USER',
        action: 'CREATE',
        entity: 'CLIENT',
        entityId: 'client123',
        entityRef: '1A001',
        severity: 'MEDIUM',
        category: 'DATA',
      });

      expect(fileStorageService.writeJson).toHaveBeenCalledTimes(2); // Monthly file + recent cache
    });

    it('should handle file storage errors gracefully', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('File not found'));
      fileStorageService.writeJson.mockRejectedValue(new Error('Write failed'));

      // Should not throw
      await expect(service.logEvent({
        actor: 'user123',
        actorType: 'USER',
        action: 'CREATE',
        entity: 'CLIENT',
        severity: 'MEDIUM',
        category: 'DATA',
      })).resolves.toBeUndefined();
    });
  });

  describe('logDataChange', () => {
    it('should log data changes with calculated differences', async () => {
      fileStorageService.readJson.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const oldData = { name: 'Old Name', status: 'ACTIVE' };
      const newData = { name: 'New Name', status: 'ACTIVE', email: 'test@example.com' };

      await service.logDataChange(
        'user123',
        'USER',
        'UPDATE',
        'CLIENT',
        'client123',
        '1A001',
        oldData,
        newData
      );

      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful authentication', async () => {
      fileStorageService.readJson.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.logAuthEvent(
        'user123',
        'LOGIN',
        true,
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });

    it('should log failed authentication with high severity', async () => {
      fileStorageService.readJson.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.logAuthEvent(
        'user123',
        'LOGIN',
        false,
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    it('should return filtered events', async () => {
      const mockEvents = [
        {
          id: '1',
          timestamp: new Date('2024-01-15'),
          actor: 'user123',
          actorType: 'USER',
          action: 'CREATE',
          entity: 'CLIENT',
          severity: 'MEDIUM',
          category: 'DATA',
        },
        {
          id: '2',
          timestamp: new Date('2024-01-16'),
          actor: 'user456',
          actorType: 'USER',
          action: 'UPDATE',
          entity: 'CLIENT',
          severity: 'MEDIUM',
          category: 'DATA',
        },
      ];

      fileStorageService.readJson.mockResolvedValue(mockEvents);

      const result = await service.getEvents({
        actor: 'user123',
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].actor).toBe('user123');
    });

    it('should handle missing files gracefully', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      const result = await service.getEvents();

      expect(result).toEqual([]);
    });
  });

  describe('getSummary', () => {
    it('should return audit summary statistics', async () => {
      const mockEvents = [
        {
          id: '1',
          timestamp: new Date(),
          actor: 'user123',
          actorType: 'USER',
          action: 'CREATE',
          entity: 'CLIENT',
          severity: 'MEDIUM',
          category: 'DATA',
        },
        {
          id: '2',
          timestamp: new Date(),
          actor: 'user123',
          actorType: 'USER',
          action: 'UPDATE',
          entity: 'CLIENT',
          severity: 'HIGH',
          category: 'DATA',
        },
      ];

      fileStorageService.readJson.mockResolvedValue(mockEvents);

      const summary = await service.getSummary();

      expect(summary.totalEvents).toBe(2);
      expect(summary.eventsByCategory.DATA).toBe(2);
      expect(summary.eventsBySeverity.MEDIUM).toBe(1);
      expect(summary.eventsBySeverity.HIGH).toBe(1);
      expect(summary.topActors[0].actor).toBe('user123');
      expect(summary.topActors[0].count).toBe(2);
    });
  });

  describe('cleanupOldEvents', () => {
    it('should delete old audit files', async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 25); // 25 months ago
      
      const oldMonthKey = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}`;
      
      fileStorageService.listFiles.mockResolvedValue([
        `${oldMonthKey}.json`,
        '2024-01.json',
      ]);
      fileStorageService.deleteJson.mockResolvedValue(undefined);

      await service.cleanupOldEvents(24);

      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('events', oldMonthKey);
    });
  });
});