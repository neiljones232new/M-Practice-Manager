import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditFilters, AuditEvent, AuditSummary } from './interfaces/audit.interface';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('events')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  async getEvents(@Query() query: any): Promise<{
    items: AuditEvent[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const page = query.page ? parseInt(query.page) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize) : 25;
    const offset = (page - 1) * pageSize;

    const filters: AuditFilters = {
      startDate: query.startDate || query.start ? new Date(query.startDate || query.start) : undefined,
      endDate: query.endDate || query.end ? new Date(query.endDate || query.end) : undefined,
      actor: query.actor,
      action: query.action,
      entity: query.entity,
      entityId: query.entityId,
      severity: query.severity,
      category: query.category,
      portfolioCode: query.portfolioCode ? parseInt(query.portfolioCode) : undefined,
      limit: pageSize,
      offset: offset,
    };

    // Get total count without pagination
    const allEvents = await this.auditService.getEvents({ ...filters, limit: undefined, offset: undefined });
    const total = allEvents.length;

    // Get paginated events
    const events = await this.auditService.getEvents(filters);

    return {
      items: events,
      page,
      pageSize,
      total,
    };
  }

  @Get('summary')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  async getSummary(@Query() query: any): Promise<AuditSummary> {
    const filters: AuditFilters = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      portfolioCode: query.portfolioCode ? parseInt(query.portfolioCode) : undefined,
    };

    return this.auditService.getSummary(filters);
  }

  @Get('entity/:entity/:entityId')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  async getEntityEvents(
    @Query('entity') entity: string,
    @Query('entityId') entityId: string,
    @Query('limit') limit?: string
  ): Promise<AuditEvent[]> {
    return this.auditService.getEntityEvents(
      entity,
      entityId,
      limit ? parseInt(limit) : 50
    );
  }

  @Post('test')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  async createTestEvent(): Promise<{ message: string }> {
    await this.auditService.logEvent({
      actor: 'Test User',
      actorType: 'USER',
      action: 'TEST',
      entity: 'AUDIT',
      severity: 'LOW',
      category: 'SYSTEM',
      metadata: { test: true, timestamp: new Date().toISOString() }
    });
    return { message: 'Test audit event created' };
  }

  @Post('cleanup')
  @Roles('ADMIN')
  async cleanupEvents(
    @Query('retentionMonths') retentionMonths?: string,
    @Query('maxPerMonth') maxPerMonth?: string,
  ): Promise<{ message: string; removedEvents: number; prunedFiles: number }> {
    const retention = retentionMonths ? parseInt(retentionMonths, 10) : 24;
    const max = maxPerMonth ? parseInt(maxPerMonth, 10) : undefined;

    await this.auditService.cleanupOldEvents(retention);
    const result = await this.auditService.pruneExcessEvents(max);
    return {
      message: 'Audit cleanup completed',
      removedEvents: result.removedEvents,
      prunedFiles: result.prunedFiles,
    };
  }

  @Post('clear')
  @Roles('ADMIN')
  async clearEvents(): Promise<{ message: string; deletedFiles: number }> {
    const result = await this.auditService.clearAllEvents();
    return {
      message: 'All audit events cleared',
      deletedFiles: result.deletedFiles,
    };
  }
}
