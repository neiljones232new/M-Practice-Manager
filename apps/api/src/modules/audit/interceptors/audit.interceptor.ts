import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AUDIT_METADATA_KEY, AuditOptions } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditOptions>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditOptions || auditOptions.skipAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const body = request.body;
    const params = request.params;
    const query = request.query;

    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        // Log successful operation
        this.logAuditEvent(
          auditOptions,
          user,
          method,
          url,
          body,
          params,
          query,
          response,
          null,
          Date.now() - startTime,
          request,
        );
      }),
      catchError((error) => {
        // Log failed operation
        this.logAuditEvent(
          auditOptions,
          user,
          method,
          url,
          body,
          params,
          query,
          null,
          error,
          Date.now() - startTime,
          request,
        );
        throw error;
      }),
    );
  }

  private async logAuditEvent(
    options: AuditOptions,
    user: any,
    method: string,
    url: string,
    body: any,
    params: any,
    query: any,
    response: any,
    error: any,
    duration: number,
    request: any,
  ): Promise<void> {
    try {
      const actor = user?.id || user?.email || 'anonymous';
      const actorType = user ? 'USER' : 'API';
      
      // Extract entity ID from params or body
      const entityId = params?.id || body?.id || body?.ref || query?.id;
      const entityRef = body?.ref || params?.ref || query?.ref;

      // Determine if operation was successful
      const success = !error;
      const severity = error ? 'HIGH' : (options.severity || 'MEDIUM');

      await this.auditService.logEvent({
        actor,
        actorType,
        action: options.action,
        entity: options.entity,
        entityId,
        entityRef,
        metadata: {
          method,
          url,
          success,
          duration,
          error: error ? {
            message: error.message,
            status: error.status,
          } : undefined,
          requestSize: JSON.stringify(body || {}).length,
          responseSize: response ? JSON.stringify(response).length : 0,
        },
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
        sessionId: request.sessionID,
        portfolioCode: user?.portfolioCode,
        severity,
        category: options.category || 'DATA',
      });
    } catch (auditError) {
      // Don't let audit logging break the application
      console.error('Failed to log audit event:', auditError);
    }
  }
}