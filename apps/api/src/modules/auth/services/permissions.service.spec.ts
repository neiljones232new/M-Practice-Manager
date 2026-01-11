import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { UserRole, Permission } from '../interfaces/roles.interface';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let fileStorageService: jest.Mocked<FileStorageService>;

  beforeEach(async () => {
    const mockFileStorageService = {
      readJson: jest.fn(),
      writeJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    fileStorageService = module.get(FileStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRolePermissions', () => {
    it('should return permissions for Admin role', () => {
      const permissions = service.getRolePermissions(UserRole.ADMIN);
      expect(permissions).toContain(Permission.CLIENT_CREATE);
      expect(permissions).toContain(Permission.USER_MANAGE_ROLES);
      expect(permissions).toContain(Permission.SYSTEM_SETTINGS);
    });

    it('should return limited permissions for ReadOnly role', () => {
      const permissions = service.getRolePermissions(UserRole.READONLY);
      expect(permissions).toContain(Permission.CLIENT_READ);
      expect(permissions).not.toContain(Permission.CLIENT_CREATE);
      expect(permissions).not.toContain(Permission.USER_MANAGE_ROLES);
    });

    it('should return empty array for unknown role', () => {
      const permissions = service.getRolePermissions('UNKNOWN' as UserRole);
      expect(permissions).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      fileStorageService.readJson.mockResolvedValueOnce({
        'user123': { role: UserRole.ADMIN, assignedBy: 'system', assignedAt: '2024-01-01' }
      });
      fileStorageService.readJson.mockResolvedValueOnce({
        'user123': { portfolioCodes: [], allPortfolios: true }
      });

      const hasPermission = await service.hasPermission('user123', Permission.CLIENT_CREATE);
      expect(hasPermission).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      fileStorageService.readJson.mockResolvedValueOnce({
        'user123': { role: UserRole.READONLY, assignedBy: 'system', assignedAt: '2024-01-01' }
      });
      fileStorageService.readJson.mockResolvedValueOnce({
        'user123': { portfolioCodes: [], allPortfolios: true }
      });

      const hasPermission = await service.hasPermission('user123', Permission.CLIENT_CREATE);
      expect(hasPermission).toBe(false);
    });

    it('should handle file read errors gracefully', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('File not found'));

      const hasPermission = await service.hasPermission('user123', Permission.CLIENT_READ);
      expect(hasPermission).toBe(false);
    });
  });

  describe('hasPortfolioAccess', () => {
    it('should return true when user has all portfolios access', async () => {
      fileStorageService.readJson.mockResolvedValue({
        'user123': { portfolioCodes: [], allPortfolios: true }
      });

      const hasAccess = await service.hasPortfolioAccess('user123', 1);
      expect(hasAccess).toBe(true);
    });

    it('should return true when user has specific portfolio access', async () => {
      fileStorageService.readJson.mockResolvedValue({
        'user123': { portfolioCodes: [1, 2, 3], allPortfolios: false }
      });

      const hasAccess = await service.hasPortfolioAccess('user123', 2);
      expect(hasAccess).toBe(true);
    });

    it('should return false when user does not have portfolio access', async () => {
      fileStorageService.readJson.mockResolvedValue({
        'user123': { portfolioCodes: [1, 3], allPortfolios: false }
      });

      const hasAccess = await service.hasPortfolioAccess('user123', 2);
      expect(hasAccess).toBe(false);
    });
  });

  describe('setUserRole', () => {
    it('should set user role successfully', async () => {
      fileStorageService.readJson.mockResolvedValue({});
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.setUserRole('user123', UserRole.MANAGER, 'admin');

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'config',
        'permissions',
        expect.objectContaining({
          'user123': expect.objectContaining({
            role: UserRole.MANAGER,
            assignedBy: 'admin',
          })
        })
      );
    });
  });

  describe('setPortfolioAccess', () => {
    it('should set portfolio access successfully', async () => {
      fileStorageService.readJson.mockResolvedValue({});
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.setPortfolioAccess('user123', [1, 2], false, 'admin');

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'config',
        'portfolio-access',
        expect.objectContaining({
          'user123': expect.objectContaining({
            portfolioCodes: [1, 2],
            allPortfolios: false,
            assignedBy: 'admin',
          })
        })
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions with role and portfolio access', async () => {
      fileStorageService.readJson
        .mockResolvedValueOnce({
          'user123': { role: UserRole.STAFF, assignedBy: 'admin', assignedAt: '2024-01-01' }
        })
        .mockResolvedValueOnce({
          'user123': { portfolioCodes: [1, 2], allPortfolios: false }
        });

      const permissions = await service.getUserPermissions('user123');

      expect(permissions.userId).toBe('user123');
      expect(permissions.role).toBe(UserRole.STAFF);
      expect(permissions.permissions).toContain(Permission.CLIENT_READ);
      expect(permissions.portfolioAccess.portfolioCodes).toEqual([1, 2]);
    });

    it('should return default permissions for new user', async () => {
      fileStorageService.readJson
        .mockResolvedValueOnce({}) // No permissions file
        .mockResolvedValueOnce({}); // No portfolio access file

      const permissions = await service.getUserPermissions('newuser');

      expect(permissions.userId).toBe('newuser');
      expect(permissions.role).toBe(UserRole.READONLY);
      expect(permissions.permissions).toEqual(service.getRolePermissions(UserRole.READONLY));
      expect(permissions.portfolioAccess.allPortfolios).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', async () => {
      fileStorageService.readJson
        .mockResolvedValueOnce({
          'user123': { role: UserRole.ADMIN, assignedBy: 'system', assignedAt: '2024-01-01' }
        })
        .mockResolvedValueOnce({
          'user123': { portfolioCodes: [], allPortfolios: true }
        });

      const hasAll = await service.hasAllPermissions('user123', [
        Permission.CLIENT_READ,
        Permission.CLIENT_CREATE,
      ]);

      expect(hasAll).toBe(true);
    });

    it('should return false when user is missing some permissions', async () => {
      fileStorageService.readJson
        .mockResolvedValueOnce({
          'user123': { role: UserRole.READONLY, assignedBy: 'system', assignedAt: '2024-01-01' }
        })
        .mockResolvedValueOnce({
          'user123': { portfolioCodes: [], allPortfolios: true }
        });

      const hasAll = await service.hasAllPermissions('user123', [
        Permission.CLIENT_READ,
        Permission.CLIENT_CREATE,
      ]);

      expect(hasAll).toBe(false);
    });
  });

  describe('initializeDefaultAdmin', () => {
    it('should initialize admin user if not already admin', async () => {
      fileStorageService.readJson
        .mockResolvedValueOnce({}) // No existing permissions
        .mockResolvedValueOnce({}); // No existing portfolio access
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.initializeDefaultAdmin('admin123');

      expect(fileStorageService.writeJson).toHaveBeenCalledTimes(2); // permissions and portfolio access
    });

    it('should not modify existing admin user', async () => {
      fileStorageService.readJson
        .mockResolvedValueOnce({
          'admin123': { role: UserRole.ADMIN, assignedBy: 'system', assignedAt: '2024-01-01' }
        })
        .mockResolvedValueOnce({
          'admin123': { portfolioCodes: [], allPortfolios: true }
        });

      await service.initializeDefaultAdmin('admin123');

      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });
  });
});