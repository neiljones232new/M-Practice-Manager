import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard to prevent demo users from accessing certain endpoints
 * Use @AllowDemoUser() decorator to allow demo users on specific endpoints
 */
@Injectable()
export class DemoUserGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if endpoint explicitly allows demo users
    const allowDemoUser = this.reflector.getAllAndOverride<boolean>('allowDemoUser', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowDemoUser) {
      return true;
    }

    // If user is demo user, block access
    if (user?.id === 'demo-user') {
      throw new ForbiddenException('Demo users cannot access this resource');
    }

    return true;
  }
}
