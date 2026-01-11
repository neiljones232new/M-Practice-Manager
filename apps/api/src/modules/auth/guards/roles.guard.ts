import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../services/permissions.service';
import { UserRole } from '../interfaces/roles.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }

    try {
      const userPermissions = await this.permissionsService.getUserPermissions(user.id);
      
      // Role hierarchy: Admin > Manager > Staff > ReadOnly
      const roleHierarchy = {
        [UserRole.READONLY]: 1,
        [UserRole.STAFF]: 2,
        [UserRole.MANAGER]: 3,
        [UserRole.ADMIN]: 4,
      };

      const userRoleLevel = roleHierarchy[userPermissions.role] || 0;
      const requiredRoleLevel = Math.min(...requiredRoles.map(role => roleHierarchy[role as UserRole] || 0));

      return userRoleLevel >= requiredRoleLevel;
    } catch (error) {
      return false;
    }
  }
}