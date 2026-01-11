import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from '../services/permissions.service';
import { Permission } from '../interfaces/roles.interface';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionsService: jest.Mocked<PermissionsService>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockPermissionsService = {
      hasAllPermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
    permissionsService = module.get(PermissionsService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        user: { id: 'user123' },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;
    });

    it('should allow access when no permissions are required', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access when empty permissions array is required', async () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when user is not present', async () => {
      reflector.getAllAndOverride.mockReturnValue([Permission.CLIENT_READ]);
      mockRequest.user = null;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should allow access when user has all required permissions', async () => {
      const requiredPermissions = [Permission.CLIENT_READ, Permission.CLIENT_UPDATE];
      reflector.getAllAndOverride.mockReturnValue(requiredPermissions);
      permissionsService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasAllPermissions).toHaveBeenCalledWith('user123', requiredPermissions);
    });

    it('should deny access when user lacks required permissions', async () => {
      const requiredPermissions = [Permission.CLIENT_DELETE, Permission.USER_MANAGE_ROLES];
      reflector.getAllAndOverride.mockReturnValue(requiredPermissions);
      permissionsService.hasAllPermissions.mockResolvedValue(false);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
      expect(permissionsService.hasAllPermissions).toHaveBeenCalledWith('user123', requiredPermissions);
    });

    it('should deny access when permissions service throws error', async () => {
      reflector.getAllAndOverride.mockReturnValue([Permission.CLIENT_READ]);
      permissionsService.hasAllPermissions.mockRejectedValue(new Error('Service error'));

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should handle single permission requirement', async () => {
      reflector.getAllAndOverride.mockReturnValue([Permission.AUDIT_READ]);
      permissionsService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasAllPermissions).toHaveBeenCalledWith('user123', [Permission.AUDIT_READ]);
    });

    it('should handle multiple permission requirements', async () => {
      const requiredPermissions = [
        Permission.CLIENT_CREATE,
        Permission.CLIENT_UPDATE,
        Permission.CLIENT_DELETE,
        Permission.SERVICE_CREATE,
      ];
      reflector.getAllAndOverride.mockReturnValue(requiredPermissions);
      permissionsService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasAllPermissions).toHaveBeenCalledWith('user123', requiredPermissions);
    });
  });
});