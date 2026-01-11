import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PermissionsService } from '../services/permissions.service';
import { UserRole } from '../interfaces/roles.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionsService: jest.Mocked<PermissionsService>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockPermissionsService = {
      getUserPermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
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

    guard = module.get<RolesGuard>(RolesGuard);
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

    it('should allow access when no roles are required', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when user is not present', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      mockRequest.user = null;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should allow access when user has required role', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Manager']);
      permissionsService.getUserPermissions.mockResolvedValue({
        userId: 'user123',
        role: UserRole.ADMIN,
        permissions: [],
        portfolioAccess: { userId: 'user123', portfolioCodes: [], allPortfolios: true },
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access when user has higher role than required', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Staff']);
      permissionsService.getUserPermissions.mockResolvedValue({
        userId: 'user123',
        role: UserRole.MANAGER,
        permissions: [],
        portfolioAccess: { userId: 'user123', portfolioCodes: [], allPortfolios: true },
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when user has lower role than required', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      permissionsService.getUserPermissions.mockResolvedValue({
        userId: 'user123',
        role: UserRole.STAFF,
        permissions: [],
        portfolioAccess: { userId: 'user123', portfolioCodes: [], allPortfolios: true },
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should allow access when user meets minimum required role from multiple options', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin', 'Manager', 'Staff']);
      permissionsService.getUserPermissions.mockResolvedValue({
        userId: 'user123',
        role: UserRole.STAFF,
        permissions: [],
        portfolioAccess: { userId: 'user123', portfolioCodes: [], allPortfolios: true },
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when permissions service throws error', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      permissionsService.getUserPermissions.mockRejectedValue(new Error('Service error'));

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should handle ReadOnly role correctly', async () => {
      reflector.getAllAndOverride.mockReturnValue(['ReadOnly']);
      permissionsService.getUserPermissions.mockResolvedValue({
        userId: 'user123',
        role: UserRole.READONLY,
        permissions: [],
        portfolioAccess: { userId: 'user123', portfolioCodes: [], allPortfolios: false },
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny ReadOnly user access to higher role endpoints', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Staff']);
      permissionsService.getUserPermissions.mockResolvedValue({
        userId: 'user123',
        role: UserRole.READONLY,
        permissions: [],
        portfolioAccess: { userId: 'user123', portfolioCodes: [], allPortfolios: false },
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });
  });
});