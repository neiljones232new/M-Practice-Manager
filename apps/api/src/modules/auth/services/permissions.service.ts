import { Injectable, Logger } from '@nestjs/common';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { 
  UserRole, 
  Permission, 
  ROLE_PERMISSIONS, 
  PortfolioAccess, 
  UserPermissions 
} from '../interfaces/roles.interface';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly permissionsCategory = 'config';
  private readonly permissionsId = 'permissions';
  private readonly portfolioAccessId = 'portfolio-access';

  constructor(private readonly fileStorage: FileStorageService) {}

  /**
   * Get permissions for a user role
   */
  getRolePermissions(role: UserRole): Permission[] {
    const roleConfig = ROLE_PERMISSIONS.find(r => r.role === role);
    return roleConfig ? roleConfig.permissions : [];
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.permissions.includes(permission);
    } catch (error) {
      this.logger.error(`Error checking permission for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if a user has access to a specific portfolio
   */
  async hasPortfolioAccess(userId: string, portfolioCode: number): Promise<boolean> {
    try {
      const portfolioAccess = await this.getPortfolioAccess(userId);
      
      if (portfolioAccess.allPortfolios) {
        return true;
      }
      
      return portfolioAccess.portfolioCodes.includes(portfolioCode);
    } catch (error) {
      this.logger.error(`Error checking portfolio access for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    try {
      const permissionsData = await this.fileStorage.readJson(this.permissionsCategory, this.permissionsId) || {};
      const userPermission = permissionsData[userId];
      
      if (!userPermission) {
        // Default to ReadOnly role for new users
        const defaultRole = UserRole.READONLY;
        const defaultPermissions = this.getRolePermissions(defaultRole);
        const defaultPortfolioAccess = await this.getPortfolioAccess(userId);
        
        return {
          userId,
          role: defaultRole,
          permissions: defaultPermissions,
          portfolioAccess: defaultPortfolioAccess,
        };
      }
      
      const rolePermissions = this.getRolePermissions(userPermission.role);
      const portfolioAccess = await this.getPortfolioAccess(userId);
      
      return {
        userId,
        role: userPermission.role,
        permissions: rolePermissions,
        portfolioAccess,
      };
    } catch (error) {
      this.logger.error(`Error getting user permissions for ${userId}:`, error);
      
      // Return minimal permissions on error
      return {
        userId,
        role: UserRole.READONLY,
        permissions: this.getRolePermissions(UserRole.READONLY),
        portfolioAccess: {
          userId,
          portfolioCodes: [],
          allPortfolios: false,
        },
      };
    }
  }

  /**
   * Set user role
   */
  async setUserRole(userId: string, role: UserRole, assignedBy: string): Promise<void> {
    try {
      const permissionsData = await this.fileStorage.readJson(this.permissionsCategory, this.permissionsId) || {};
      
      permissionsData[userId] = {
        role,
        assignedBy,
        assignedAt: new Date().toISOString(),
      };
      
      await this.fileStorage.writeJson(this.permissionsCategory, this.permissionsId, permissionsData);
      
      this.logger.log(`User ${userId} role set to ${role} by ${assignedBy}`);
    } catch (error) {
      this.logger.error(`Error setting user role for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get portfolio access for a user
   */
  async getPortfolioAccess(userId: string): Promise<PortfolioAccess> {
    try {
      const portfolioData = await this.fileStorage.readJson(this.permissionsCategory, this.portfolioAccessId) || {};
      const userAccess = portfolioData[userId];
      
      if (!userAccess) {
        // Default to no portfolio access for new users
        return {
          userId,
          portfolioCodes: [],
          allPortfolios: false,
        };
      }
      
      return {
        userId,
        portfolioCodes: userAccess.portfolioCodes || [],
        allPortfolios: userAccess.allPortfolios || false,
      };
    } catch (error) {
      this.logger.error(`Error getting portfolio access for ${userId}:`, error);
      return {
        userId,
        portfolioCodes: [],
        allPortfolios: false,
      };
    }
  }

  /**
   * Set portfolio access for a user
   */
  async setPortfolioAccess(
    userId: string, 
    portfolioCodes: number[], 
    allPortfolios: boolean,
    assignedBy: string
  ): Promise<void> {
    try {
      const portfolioData = await this.fileStorage.readJson(this.permissionsCategory, this.portfolioAccessId) || {};
      
      portfolioData[userId] = {
        portfolioCodes,
        allPortfolios,
        assignedBy,
        assignedAt: new Date().toISOString(),
      };
      
      await this.fileStorage.writeJson(this.permissionsCategory, this.portfolioAccessId, portfolioData);
      
      this.logger.log(`Portfolio access updated for user ${userId} by ${assignedBy}`);
    } catch (error) {
      this.logger.error(`Error setting portfolio access for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all user permissions (for admin management)
   */
  async getAllUserPermissions(): Promise<UserPermissions[]> {
    try {
      const permissionsData = await this.fileStorage.readJson(this.permissionsCategory, this.permissionsId) || {};
      const userPermissions: UserPermissions[] = [];
      
      for (const userId of Object.keys(permissionsData)) {
        const permissions = await this.getUserPermissions(userId);
        userPermissions.push(permissions);
      }
      
      return userPermissions;
    } catch (error) {
      this.logger.error('Error getting all user permissions:', error);
      return [];
    }
  }

  /**
   * Remove user permissions
   */
  async removeUserPermissions(userId: string): Promise<void> {
    try {
      const permissionsData = await this.fileStorage.readJson(this.permissionsCategory, this.permissionsId) || {};
      const portfolioData = await this.fileStorage.readJson(this.permissionsCategory, this.portfolioAccessId) || {};
      
      delete permissionsData[userId];
      delete portfolioData[userId];
      
      await Promise.all([
        this.fileStorage.writeJson(this.permissionsCategory, this.permissionsId, permissionsData),
        this.fileStorage.writeJson(this.permissionsCategory, this.portfolioAccessId, portfolioData),
      ]);
      
      this.logger.log(`Permissions removed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error removing permissions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(permission => userPermissions.permissions.includes(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(permission => userPermissions.permissions.includes(permission));
  }

  /**
   * Get available portfolios for a user
   */
  async getAvailablePortfolios(userId: string): Promise<number[]> {
    try {
      const portfolioAccess = await this.getPortfolioAccess(userId);
      
      if (portfolioAccess.allPortfolios) {
        // Return all available portfolios
        const portfoliosConfig = await this.fileStorage.readJson('config', 'portfolios') || {};
        return Object.keys(portfoliosConfig).map(Number);
      }
      
      return portfolioAccess.portfolioCodes;
    } catch (error) {
      this.logger.error(`Error getting available portfolios for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Initialize default admin user
   */
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
}