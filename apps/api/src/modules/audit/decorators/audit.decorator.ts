import { SetMetadata } from '@nestjs/common';

export interface AuditOptions {
  action: string;
  entity: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'DATA' | 'AUTH' | 'SYSTEM' | 'INTEGRATION' | 'SECURITY';
  skipAudit?: boolean;
}

export const AUDIT_METADATA_KEY = 'audit';

export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_METADATA_KEY, options);