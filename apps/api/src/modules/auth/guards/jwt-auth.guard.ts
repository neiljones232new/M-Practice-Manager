import { Injectable, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    if (user?.id === 'demo-user') {
      const request = context.switchToHttp().getRequest();
      const path = String(request?.originalUrl || request?.path || request?.url || '');
      const method = String(request?.method || '').toUpperCase();
      if (method !== 'GET') {
        throw new ForbiddenException('Demo access is read-only and cannot modify data.');
      }
      const allowlist = [
        '/api/v1/auth/me',
        '/api/v1/auth/logout',
        '/api/v1/dashboard',
        '/api/v1/clients',
        '/api/v1/services',
        '/api/v1/tasks',
        '/api/v1/calendar',
        '/api/v1/people',
        '/api/v1/portfolios',
        '/auth/me',
        '/auth/logout',
        '/dashboard',
        '/clients',
        '/services',
        '/tasks',
        '/calendar',
        '/people',
        '/portfolios',
      ];
      const allowed = allowlist.some((entry) => path.includes(entry));
      if (!allowed) {
        throw new ForbiddenException('Demo access is limited to avoid exposing local client data.');
      }
    }
    return user;
  }
}
