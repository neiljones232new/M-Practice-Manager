import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PermissionsService } from '../services/permissions.service';

@Injectable()
export class PortfolioGuard implements CanActivate {
  constructor(private permissionsService: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return true;
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }
    
    if (!user) {
      return false;
    }

    // Extract portfolio code from request
    const portfolioCode = this.extractPortfolioCode(request);
    
    if (!portfolioCode) {
      // If no portfolio code is specified, allow access
      return true;
    }

    try {
      return await this.permissionsService.hasPortfolioAccess(user.id, portfolioCode);
    } catch (error) {
      return false;
    }
  }

  private extractPortfolioCode(request: any): number | null {
    // Try to extract portfolio code from various sources
    
    // 1. From query parameters
    if (request.query?.portfolioCode) {
      return parseInt(request.query.portfolioCode);
    }
    
    // 2. From route parameters
    if (request.params?.portfolioCode) {
      return parseInt(request.params.portfolioCode);
    }
    
    // 3. From request body
    if (request.body?.portfolioCode) {
      return parseInt(request.body.portfolioCode);
    }
    
    // 4. From client reference (extract portfolio from client ref like "1A001")
    const clientRef = request.params?.ref || request.body?.ref || request.query?.ref;
    if (clientRef && typeof clientRef === 'string') {
      const match = clientRef.match(/^(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    // 5. From client ID in body or params (would need to look up client)
    // This would require additional database lookup, implement if needed
    
    return null;
  }
}