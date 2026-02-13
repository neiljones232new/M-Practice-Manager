import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  PortfolioAccess,
  UserPermissions,
} from '../interfaces/roles.interface';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  getRolePermissions(role: UserRole): Permission[] {
    const roleConfig = ROLE_PERMISSIONS.find((r) => r.role === role);
    return roleConfig ? roleConfig.permissions : [];
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.permissions.includes(permission);
    } catch (error) {
      this.logger.error(`Error checking permission for user ${userId}:`, error);
      return false;
    }
  }

  async hasPortfolioAccess(userId: string, portfolioCode: number): Promise<boolean> {
    try {
      const portfolioAccess = await this.getPortfolioAccess(userId);
      if (portfolioAccess.allPortfolios) return true;
      return portfolioAccess.portfolioCodes.includes(portfolioCode);
    } catch (error) {
      this.logger.error(`Error checking portfolio access for user ${userId}:`, error);
      return false;
    }
  }

  async getUserPermissions(userId: string): Promise<UserPermissions> {
    try {
      const profile = await (this.prisma as any).userAccessProfile.findUnique({ where: { userId } });
      const dbUser = await this.prisma.user.findUnique({ where: { id: userId } });

      const role = this.resolveRole(profile?.roleOverride, dbUser?.role);
      const portfolioAccess = await this.getPortfolioAccess(userId);

      return {
        userId,
        role,
        permissions: this.getRolePermissions(role),
        portfolioAccess,
      };
    } catch (error) {
      this.logger.error(`Error getting user permissions for ${userId}:`, error);
      return {
        userId,
        role: UserRole.READONLY,
        permissions: this.getRolePermissions(UserRole.READONLY),
        portfolioAccess: { userId, portfolioCodes: [], allPortfolios: false },
      };
    }
  }

  async setUserRole(userId: string, role: UserRole, assignedBy: string): Promise<void> {
    try {
      await (this.prisma as any).userAccessProfile.upsert({
        where: { userId },
        update: {
          roleOverride: role,
          assignedBy,
          assignedAt: new Date(),
        },
        create: {
          userId,
          roleOverride: role,
          portfolioCodes: [],
          allPortfolios: false,
          assignedBy,
          assignedAt: new Date(),
        },
      });

      await this.prisma.user.update({ where: { id: userId }, data: { role: this.toPrismaRole(role) as any } });
      this.logger.log(`User ${userId} role set to ${role} by ${assignedBy}`);
    } catch (error) {
      this.logger.error(`Error setting user role for ${userId}:`, error);
      throw error;
    }
  }

  async getPortfolioAccess(userId: string): Promise<PortfolioAccess> {
    try {
      const profile = await (this.prisma as any).userAccessProfile.findUnique({ where: { userId } });
      if (!profile) return { userId, portfolioCodes: [], allPortfolios: false };

      return {
        userId,
        portfolioCodes: Array.isArray(profile.portfolioCodes) ? profile.portfolioCodes : [],
        allPortfolios: Boolean(profile.allPortfolios),
      };
    } catch (error) {
      this.logger.error(`Error getting portfolio access for ${userId}:`, error);
      return { userId, portfolioCodes: [], allPortfolios: false };
    }
  }

  async setPortfolioAccess(
    userId: string,
    portfolioCodes: number[],
    allPortfolios: boolean,
    assignedBy: string,
  ): Promise<void> {
    try {
      await (this.prisma as any).userAccessProfile.upsert({
        where: { userId },
        update: {
          portfolioCodes,
          allPortfolios,
          assignedBy,
          assignedAt: new Date(),
        },
        create: {
          userId,
          roleOverride: null,
          portfolioCodes,
          allPortfolios,
          assignedBy,
          assignedAt: new Date(),
        },
      });

      this.logger.log(`Portfolio access updated for user ${userId} by ${assignedBy}`);
    } catch (error) {
      this.logger.error(`Error setting portfolio access for ${userId}:`, error);
      throw error;
    }
  }

  async getAllUserPermissions(): Promise<UserPermissions[]> {
    try {
      const users = await this.prisma.user.findMany({ where: { isActive: true } });
      return Promise.all(users.map((u) => this.getUserPermissions(u.id)));
    } catch (error) {
      this.logger.error('Error getting all user permissions:', error);
      return [];
    }
  }

  async removeUserPermissions(userId: string): Promise<void> {
    try {
      await (this.prisma as any).userAccessProfile.deleteMany({ where: { userId } });
      this.logger.log(`Permissions removed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error removing permissions for user ${userId}:`, error);
      throw error;
    }
  }

  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some((permission) => userPermissions.permissions.includes(permission));
  }

  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every((permission) => userPermissions.permissions.includes(permission));
  }

  async getAvailablePortfolios(userId: string): Promise<number[]> {
    try {
      const portfolioAccess = await this.getPortfolioAccess(userId);
      if (!portfolioAccess.allPortfolios) return portfolioAccess.portfolioCodes;

      const portfolios = await (this.prisma as any).portfolio.findMany({ select: { code: true } });
      return portfolios.map((p: any) => p.code);
    } catch (error) {
      this.logger.error(`Error getting available portfolios for ${userId}:`, error);
      return [];
    }
  }

  async initializeDefaultAdmin(adminUserId: string): Promise<void> {
    try {
      const existingPermissions = await this.getUserPermissions(adminUserId);
      if (existingPermissions.role !== UserRole.ADMIN) {
        await this.setUserRole(adminUserId, UserRole.ADMIN, 'SYSTEM');
        await this.setPortfolioAccess(adminUserId, [], true, 'SYSTEM');
        this.logger.log(`Default admin user ${adminUserId} initialized`);
      }
    } catch (error) {
      this.logger.error(`Error initializing default admin user:`, error);
      throw error;
    }
  }

  private resolveRole(roleOverride?: string | null, dbRole?: string): UserRole {
    const candidate = roleOverride || this.mapPrismaRole(dbRole);
    if (candidate === UserRole.ADMIN || candidate === UserRole.MANAGER || candidate === UserRole.STAFF || candidate === UserRole.READONLY) {
      return candidate;
    }
    return UserRole.READONLY;
  }

  private mapPrismaRole(role?: string): UserRole {
    switch (role) {
      case 'ADMIN':
        return UserRole.ADMIN;
      case 'PARTNER':
      case 'MANAGER':
        return UserRole.MANAGER;
      case 'STAFF':
        return UserRole.STAFF;
      default:
        return UserRole.READONLY;
    }
  }

  private toPrismaRole(role: UserRole): 'ADMIN' | 'MANAGER' | 'STAFF' | 'READONLY' {
    switch (role) {
      case UserRole.ADMIN:
        return 'ADMIN';
      case UserRole.MANAGER:
        return 'MANAGER';
      case UserRole.STAFF:
        return 'STAFF';
      default:
        return 'READONLY';
    }
  }
}
