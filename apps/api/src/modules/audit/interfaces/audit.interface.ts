export interface AuditEvent {
  id: string;
  timestamp: Date;
  actor: string; // User ID or system identifier
  actorType: 'USER' | 'SYSTEM' | 'API';
  action: string; // CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT, etc.
  entity: string; // Client, Service, Task, etc.
  entityId?: string; // Specific entity identifier
  entityRef?: string; // Human-readable identifier (e.g., client identifier)
  changes?: AuditChange[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  portfolioCode?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'DATA' | 'AUTH' | 'SYSTEM' | 'INTEGRATION' | 'SECURITY';
}

export interface AuditChange {
  field: string;
  oldValue?: any;
  newValue?: any;
  operation: 'ADD' | 'MODIFY' | 'REMOVE';
}

export interface AuditFilters {
  startDate?: Date;
  endDate?: Date;
  actor?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  severity?: string;
  category?: string;
  portfolioCode?: number;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topActors: Array<{ actor: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  recentEvents: AuditEvent[];
}
