import { Injectable, Logger } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { AuditEvent, AuditFilters, AuditSummary, AuditChange } from './interfaces/audit.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditPath = 'events';
  private readonly maxEventsPerMonth = Number(process.env.AUDIT_MAX_EVENTS_PER_MONTH || 100);

  constructor(private readonly fileStorage: FileStorageService) {}

  /**
   * Log an audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEvent: AuditEvent = {
        id: uuidv4(),
        timestamp: new Date(),
        ...event,
      };

      // Store in monthly files for better organization
      const monthKey = this.getMonthKey(auditEvent.timestamp);
      const monthlyEvents = await this.getMonthlyEvents(monthKey);
      monthlyEvents.push(auditEvent);

      if (monthlyEvents.length > this.maxEventsPerMonth) {
        monthlyEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        monthlyEvents.splice(this.maxEventsPerMonth);
      }

      await this.fileStorage.writeJson(
        this.auditPath,
        monthKey,
        monthlyEvents
      );

      // Also maintain a recent events cache for quick access
      await this.updateRecentEventsCache(auditEvent);

      this.logger.log(`Audit event logged: ${event.action} on ${event.entity} by ${event.actor}`);
    } catch (error) {
      this.logger.error('Failed to log audit event', error);
      // Don't throw - audit logging should not break application flow
    }
  }

  /**
   * Log data changes with before/after comparison
   */
  async logDataChange(
    actor: string,
    actorType: 'USER' | 'SYSTEM' | 'API',
    action: string,
    entity: string,
    entityId: string,
    entityRef: string,
    oldData: any,
    newData: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    const changes = this.calculateChanges(oldData, newData);
    
    await this.logEvent({
      actor,
      actorType,
      action,
      entity,
      entityId,
      entityRef,
      changes,
      metadata,
      severity: this.determineSeverity(action, entity, changes),
      category: 'DATA',
    });
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    actor: string,
    action: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      actor,
      actorType: 'USER',
      action,
      entity: 'AUTH',
      metadata: { success, ...metadata },
      ipAddress,
      userAgent,
      severity: success ? 'LOW' : 'HIGH',
      category: 'AUTH',
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    action: string,
    entity: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      actor: 'SYSTEM',
      actorType: 'SYSTEM',
      action,
      entity,
      metadata,
      severity: 'MEDIUM',
      category: 'SYSTEM',
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    actor: string,
    action: string,
    entity: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      actor,
      actorType: 'USER',
      action,
      entity,
      metadata,
      severity,
      category: 'SECURITY',
    });
  }

  /**
   * Get audit events with filtering
   */
  async getEvents(filters: AuditFilters = {}): Promise<AuditEvent[]> {
    try {
      const events: AuditEvent[] = [];
      const monthKeys = this.getMonthKeysInRange(filters.startDate, filters.endDate);

      for (const monthKey of monthKeys) {
        const monthlyEvents = await this.getMonthlyEvents(monthKey);
        events.push(...monthlyEvents);
      }

      // Apply filters
      let filteredEvents = events.filter(event => this.matchesFilters(event, filters));

      // Sort by timestamp descending
      filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      if (filters.offset) {
        filteredEvents = filteredEvents.slice(filters.offset);
      }
      if (filters.limit) {
        filteredEvents = filteredEvents.slice(0, filters.limit);
      }

      return filteredEvents;
    } catch (error) {
      this.logger.error('Failed to get audit events', error);
      return [];
    }
  }

  /**
   * Get audit summary statistics
   */
  async getSummary(filters: AuditFilters = {}): Promise<AuditSummary> {
    const events = await this.getEvents({ ...filters, limit: undefined, offset: undefined });

    const eventsByCategory: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const actorCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};

    events.forEach(event => {
      // Count by category
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      
      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      // Count by actor
      actorCounts[event.actor] = (actorCounts[event.actor] || 0) + 1;
      
      // Count by action
      actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
    });

    const topActors = Object.entries(actorCounts)
      .map(([actor, count]) => ({ actor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: events.length,
      eventsByCategory,
      eventsBySeverity,
      topActors,
      topActions,
      recentEvents: events.slice(0, 20),
    };
  }

  /**
   * Get events for a specific entity
   */
  async getEntityEvents(entity: string, entityId: string, limit = 50): Promise<AuditEvent[]> {
    return this.getEvents({
      entity,
      entityId,
      limit,
    });
  }

  /**
   * Clean up old audit events (retention policy)
   */
  async cleanupOldEvents(retentionMonths = 24): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

      const files = await this.fileStorage.listFiles(this.auditPath);
      
      for (const file of files) {
        const monthKey = file.replace('.json', '');
        if (monthKey === 'recent') continue;
        const [year, month] = monthKey.split('-').map(Number);
        const fileDate = new Date(year, month - 1);

        if (fileDate < cutoffDate) {
          await this.fileStorage.deleteJson(this.auditPath, file.replace('.json', ''));
          this.logger.log(`Deleted old audit file: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old audit events', error);
    }
  }

  private async getMonthlyEvents(monthKey: string): Promise<AuditEvent[]> {
    try {
      return await this.fileStorage.readJson(this.auditPath, monthKey) || [];
    } catch (error) {
      return [];
    }
  }

  async pruneExcessEvents(maxPerMonth = this.maxEventsPerMonth): Promise<{ prunedFiles: number; removedEvents: number }> {
    const files = await this.fileStorage.listFiles(this.auditPath);
    let prunedFiles = 0;
    let removedEvents = 0;

    for (const file of files) {
      const monthKey = file.replace('.json', '');
      if (monthKey === 'recent') continue;
      const monthlyEvents = await this.getMonthlyEvents(monthKey);
      if (monthlyEvents.length <= maxPerMonth) continue;

      monthlyEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const pruned = monthlyEvents.slice(0, maxPerMonth);
      removedEvents += monthlyEvents.length - pruned.length;
      prunedFiles += 1;
      await this.fileStorage.writeJson(this.auditPath, monthKey, pruned);
    }

    await this.rebuildRecentEventsCache();

    return { prunedFiles, removedEvents };
  }

  async clearAllEvents(): Promise<{ deletedFiles: number }> {
    const files = await this.fileStorage.listFiles(this.auditPath);
    let deletedFiles = 0;
    for (const file of files) {
      const key = file.replace('.json', '');
      await this.fileStorage.deleteJson(this.auditPath, key);
      deletedFiles += 1;
    }
    return { deletedFiles };
  }

  private async rebuildRecentEventsCache(): Promise<void> {
    try {
      const files = await this.fileStorage.listFiles(this.auditPath);
      const monthKeys = files
        .map((file) => file.replace('.json', ''))
        .filter((key) => key !== 'recent')
        .sort()
        .reverse();

      const recent: AuditEvent[] = [];
      for (const monthKey of monthKeys) {
        const events = await this.getMonthlyEvents(monthKey);
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        for (const event of events) {
          recent.push(event);
          if (recent.length >= 100) break;
        }
        if (recent.length >= 100) break;
      }

      await this.fileStorage.writeJson(this.auditPath, 'recent', recent);
    } catch (error) {
      this.logger.error('Failed to rebuild recent events cache', error);
    }
  }

  private async updateRecentEventsCache(event: AuditEvent): Promise<void> {
    try {
      const recentEvents = (await this.fileStorage.readJson<AuditEvent[]>(this.auditPath, 'recent')) || [];
      recentEvents.unshift(event);
      
      // Keep only last 100 events in cache
      if (recentEvents.length > 100) {
        recentEvents.splice(100);
      }

      await this.fileStorage.writeJson(this.auditPath, 'recent', recentEvents);
    } catch (error) {
      this.logger.error('Failed to update recent events cache', error);
    }
  }

  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getMonthKeysInRange(startDate?: Date, endDate?: Date): string[] {
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default to 90 days ago
    const end = endDate || new Date();
    
    const monthKeys: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
      monthKeys.push(this.getMonthKey(current));
      current.setMonth(current.getMonth() + 1);
    }
    
    // Always include current month if not already included
    const currentMonthKey = this.getMonthKey(new Date());
    if (!monthKeys.includes(currentMonthKey)) {
      monthKeys.push(currentMonthKey);
    }
    
    return monthKeys;
  }

  private matchesFilters(event: AuditEvent, filters: AuditFilters): boolean {
    if (filters.startDate && new Date(event.timestamp) < filters.startDate) return false;
    if (filters.endDate && new Date(event.timestamp) > filters.endDate) return false;
    if (filters.actor && event.actor !== filters.actor) return false;
    if (filters.action && event.action !== filters.action) return false;
    if (filters.entity && event.entity !== filters.entity) return false;
    if (filters.entityId && event.entityId !== filters.entityId) return false;
    if (filters.severity && event.severity !== filters.severity) return false;
    if (filters.category && event.category !== filters.category) return false;
    if (filters.portfolioCode && event.portfolioCode !== filters.portfolioCode) return false;
    
    return true;
  }

  private calculateChanges(oldData: any, newData: any): AuditChange[] {
    const changes: AuditChange[] = [];
    
    if (!oldData && newData) {
      // New entity created
      Object.keys(newData).forEach(key => {
        if (newData[key] !== undefined && newData[key] !== null) {
          changes.push({
            field: key,
            newValue: newData[key],
            operation: 'ADD',
          });
        }
      });
    } else if (oldData && !newData) {
      // Entity deleted
      Object.keys(oldData).forEach(key => {
        changes.push({
          field: key,
          oldValue: oldData[key],
          operation: 'REMOVE',
        });
      });
    } else if (oldData && newData) {
      // Entity modified
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      
      allKeys.forEach(key => {
        const oldValue = oldData[key];
        const newValue = newData[key];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          if (oldValue === undefined) {
            changes.push({
              field: key,
              newValue,
              operation: 'ADD',
            });
          } else if (newValue === undefined) {
            changes.push({
              field: key,
              oldValue,
              operation: 'REMOVE',
            });
          } else {
            changes.push({
              field: key,
              oldValue,
              newValue,
              operation: 'MODIFY',
            });
          }
        }
      });
    }
    
    return changes;
  }

  private determineSeverity(action: string, entity: string, changes: AuditChange[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Critical actions
    if (action === 'DELETE' || action === 'PURGE') return 'CRITICAL';
    
    // High severity for sensitive entities or bulk changes
    if (entity === 'USER' || entity === 'AUTH' || entity === 'INTEGRATION') return 'HIGH';
    if (changes && changes.length > 10) return 'HIGH';
    
    // Medium for modifications
    if (action === 'UPDATE' || action === 'MODIFY') return 'MEDIUM';
    
    // Low for reads and creates
    return 'LOW';
  }
}
