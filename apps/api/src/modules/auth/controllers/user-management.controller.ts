import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { PermissionsService } from '../services/permissions.service';
import { AuditService } from '../../audit/audit.service';
import { UserRole, Permission, UserPermissions } from '../interfaces/roles.interface';

interface SetUserRoleDto {
  role: UserRole;
}

interface SetPortfolioAccessDto {
  portfolioCodes: number[];
  allPortfolios: boolean;
}

@ApiTags('User Management')
@Controller('user-management')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UserManagementController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('users')
  @Roles('Admin', 'Manager')
  @RequirePermissions(Permission.USER_READ)
  async getAllUsers(): Promise<UserPermissions[]> {
    return this.permissionsService.getAllUserPermissions();
  }

  @Get('users/:userId')
  @Roles('Admin', 'Manager')
  @RequirePermissions(Permission.USER_READ)
  async getUserPermissions(@Param('userId') userId: string): Promise<UserPermissions> {
    return this.permissionsService.getUserPermissions(userId);
  }

  @Put('users/:userId/role')
  @Roles('Admin')
  @RequirePermissions(Permission.USER_MANAGE_ROLES)
  async setUserRole(
    @Param('userId') userId: string,
    @Body() dto: SetUserRoleDto,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    const oldPermissions = await this.permissionsService.getUserPermissions(userId);
    
    await this.permissionsService.setUserRole(userId, dto.role, req.user.id);
    
    // Log the role change
    await this.auditService.logDataChange(
      req.user.id,
      'USER',
      'UPDATE_ROLE',
      'USER',
      userId,
      userId,
      { role: oldPermissions.role },
      { role: dto.role },
      { targetUser: userId }
    );

    return { success: true };
  }

  @Put('users/:userId/portfolio-access')
  @Roles('Admin', 'Manager')
  @RequirePermissions(Permission.USER_UPDATE)
  async setPortfolioAccess(
    @Param('userId') userId: string,
    @Body() dto: SetPortfolioAccessDto,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    const oldAccess = await this.permissionsService.getPortfolioAccess(userId);
    
    await this.permissionsService.setPortfolioAccess(
      userId, 
      dto.portfolioCodes, 
      dto.allPortfolios,
      req.user.id
    );
    
    // Log the access change
    await this.auditService.logDataChange(
      req.user.id,
      'USER',
      'UPDATE_PORTFOLIO_ACCESS',
      'USER',
      userId,
      userId,
      oldAccess,
      { portfolioCodes: dto.portfolioCodes, allPortfolios: dto.allPortfolios },
      { targetUser: userId }
    );

    return { success: true };
  }

  @Delete('users/:userId')
  @Roles('Admin')
  @RequirePermissions(Permission.USER_DELETE)
  async removeUser(
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    const userPermissions = await this.permissionsService.getUserPermissions(userId);
    
    await this.permissionsService.removeUserPermissions(userId);
    
    // Log the user removal
    await this.auditService.logDataChange(
      req.user.id,
      'USER',
      'DELETE',
      'USER',
      userId,
      userId,
      userPermissions,
      null,
      { targetUser: userId }
    );

    return { success: true };
  }

  @Get('roles')
  @Roles('Admin', 'Manager')
  @RequirePermissions(Permission.USER_READ)
  async getAvailableRoles(): Promise<{ role: UserRole; description: string }[]> {
    return [
      { role: UserRole.ADMIN, description: 'Full system access with user management' },
      { role: UserRole.MANAGER, description: 'Management access with limited user management' },
      { role: UserRole.STAFF, description: 'Standard user access for day-to-day operations' },
      { role: UserRole.READONLY, description: 'Read-only access for viewing data and reports' },
    ];
  }

  @Get('permissions')
  @Roles('Admin')
  @RequirePermissions(Permission.USER_READ)
  async getAvailablePermissions(): Promise<{ permission: Permission; description: string }[]> {
    // Return a list of all available permissions with descriptions
    return Object.values(Permission).map(permission => ({
      permission,
      description: this.getPermissionDescription(permission),
    }));
  }

  @Post('initialize-admin')
  @Roles('Admin')
  async initializeAdmin(@Request() req: any): Promise<{ success: boolean }> {
    await this.permissionsService.initializeDefaultAdmin(req.user.id);
    
    await this.auditService.logSystemEvent(
      'INITIALIZE_ADMIN',
      'USER',
      { adminUserId: req.user.id }
    );

    return { success: true };
  }

  private getPermissionDescription(permission: Permission): string {
    const descriptions: Record<Permission, string> = {
      [Permission.CLIENT_CREATE]: 'Create new clients',
      [Permission.CLIENT_READ]: 'View client information',
      [Permission.CLIENT_UPDATE]: 'Update client information',
      [Permission.CLIENT_DELETE]: 'Delete clients',
      [Permission.SERVICE_CREATE]: 'Create new services',
      [Permission.SERVICE_READ]: 'View service information',
      [Permission.SERVICE_UPDATE]: 'Update service information',
      [Permission.SERVICE_DELETE]: 'Delete services',
      [Permission.TASK_CREATE]: 'Create new tasks',
      [Permission.TASK_READ]: 'View task information',
      [Permission.TASK_UPDATE]: 'Update task information',
      [Permission.TASK_DELETE]: 'Delete tasks',
      [Permission.TASK_ASSIGN]: 'Assign tasks to users',
      [Permission.DOCUMENT_CREATE]: 'Upload new documents',
      [Permission.DOCUMENT_READ]: 'View documents',
      [Permission.DOCUMENT_UPDATE]: 'Update document metadata',
      [Permission.DOCUMENT_DELETE]: 'Delete documents',
      [Permission.CALENDAR_CREATE]: 'Create calendar events',
      [Permission.CALENDAR_READ]: 'View calendar events',
      [Permission.CALENDAR_UPDATE]: 'Update calendar events',
      [Permission.CALENDAR_DELETE]: 'Delete calendar events',
      [Permission.COMPLIANCE_CREATE]: 'Create compliance items',
      [Permission.COMPLIANCE_READ]: 'View compliance information',
      [Permission.COMPLIANCE_UPDATE]: 'Update compliance items',
      [Permission.COMPLIANCE_DELETE]: 'Delete compliance items',
      [Permission.INTEGRATION_READ]: 'View integration settings',
      [Permission.INTEGRATION_UPDATE]: 'Update integration settings',
      [Permission.INTEGRATION_MANAGE]: 'Manage all integrations',
      [Permission.AUDIT_READ]: 'View audit logs',
      [Permission.AUDIT_MANAGE]: 'Manage audit settings',
      [Permission.USER_CREATE]: 'Create new users',
      [Permission.USER_READ]: 'View user information',
      [Permission.USER_UPDATE]: 'Update user information',
      [Permission.USER_DELETE]: 'Delete users',
      [Permission.USER_MANAGE_ROLES]: 'Manage user roles and permissions',
      [Permission.SYSTEM_SETTINGS]: 'Manage system settings',
      [Permission.SYSTEM_BACKUP]: 'Create and manage backups',
      [Permission.SYSTEM_MAINTENANCE]: 'Perform system maintenance',
    };

    return descriptions[permission] || 'Unknown permission';
  }
}
