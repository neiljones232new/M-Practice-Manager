import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { PortfolioGuard } from './portfolio.guard';
import { PermissionsService } from '../services/permissions.service';

describe('PortfolioGuard', () => {
  let guard: PortfolioGuard;
  let permissionsService: jest.Mocked<PermissionsService>;

  beforeEach(async () => {
    const mockPermissionsService = {
      hasPortfolioAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioGuard,
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    guard = module.get<PortfolioGuard>(PortfolioGuard);
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
        query: {},
        params: {},
        body: {},
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;
    });

    it('should deny access when user is not present', async () => {
      mockRequest.user = null;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should allow access when no portfolio code is specified', async () => {
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access when user has portfolio access via query parameter', async () => {
      mockRequest.query.portfolioCode = '1';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 1);
    });

    it('should deny access when user lacks portfolio access via query parameter', async () => {
      mockRequest.query.portfolioCode = '2';
      permissionsService.hasPortfolioAccess.mockResolvedValue(false);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 2);
    });

    it('should extract portfolio code from route parameters', async () => {
      mockRequest.params.portfolioCode = '3';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 3);
    });

    it('should extract portfolio code from request body', async () => {
      mockRequest.body.portfolioCode = '4';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 4);
    });

    it('should extract portfolio code from client reference in params', async () => {
      mockRequest.params.ref = '1A001';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 1);
    });

    it('should extract portfolio code from client reference in body', async () => {
      mockRequest.body.ref = '2B005';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 2);
    });

    it('should extract portfolio code from client reference in query', async () => {
      mockRequest.query.ref = '3C010';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 3);
    });

    it('should handle invalid client reference format', async () => {
      mockRequest.params.ref = 'INVALID_REF';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true); // No portfolio code extracted, so allow access
      expect(permissionsService.hasPortfolioAccess).not.toHaveBeenCalled();
    });

    it('should prioritize query parameter over other sources', async () => {
      mockRequest.query.portfolioCode = '1';
      mockRequest.params.portfolioCode = '2';
      mockRequest.body.portfolioCode = '3';
      mockRequest.params.ref = '4A001';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 1);
    });

    it('should prioritize route parameter over body and ref', async () => {
      mockRequest.params.portfolioCode = '2';
      mockRequest.body.portfolioCode = '3';
      mockRequest.params.ref = '4A001';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 2);
    });

    it('should prioritize body parameter over ref', async () => {
      mockRequest.body.portfolioCode = '3';
      mockRequest.params.ref = '4A001';
      permissionsService.hasPortfolioAccess.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionsService.hasPortfolioAccess).toHaveBeenCalledWith('user123', 3);
    });

    it('should handle permissions service error gracefully', async () => {
      mockRequest.query.portfolioCode = '1';
      permissionsService.hasPortfolioAccess.mockRejectedValue(new Error('Service error'));

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should handle non-numeric portfolio codes', async () => {
      mockRequest.query.portfolioCode = 'invalid';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true); // NaN portfolio code, so allow access
      expect(permissionsService.hasPortfolioAccess).not.toHaveBeenCalled();
    });
  });
});