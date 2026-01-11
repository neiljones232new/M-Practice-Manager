export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  STAFF = 'Staff',
  READONLY = 'ReadOnly',
}

export enum Permission {
  // Client permissions
  CLIENT_CREATE = 'client:create',
  CLIENT_READ = 'client:read',
  CLIENT_UPDATE = 'client:update',
  CLIENT_DELETE = 'client:delete',
  
  // Service permissions
  SERVICE_CREATE = 'service:create',
  SERVICE_READ = 'service:read',
  SERVICE_UPDATE = 'service:update',
  SERVICE_DELETE = 'service:delete',
  
  // Task permissions
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',
  
  // Document permissions
  DOCUMENT_CREATE = 'document:create',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  
  // Calendar permissions
  CALENDAR_CREATE = 'calendar:create',
  CALENDAR_READ = 'calendar:read',
  CALENDAR_UPDATE = 'calendar:update',
  CALENDAR_DELETE = 'calendar:delete',
  
  // Compliance permissions
  COMPLIANCE_CREATE = 'compliance:create',
  COMPLIANCE_READ = 'compliance:read',
  COMPLIANCE_UPDATE = 'compliance:update',
  COMPLIANCE_DELETE = 'compliance:delete',
  
  // Integration permissions
  INTEGRATION_READ = 'integration:read',
  INTEGRATION_UPDATE = 'integration:update',
  INTEGRATION_MANAGE = 'integration:manage',
  
  // Audit permissions
  AUDIT_READ = 'audit:read',
  AUDIT_MANAGE = 'audit:manage',
  
  // User management permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',
  
  // System permissions
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_MAINTENANCE = 'system:maintenance',
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
}

export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: UserRole.ADMIN,
    description: 'Full system access with user management and system administration',
    permissions: [
      // All client permissions
      Permission.CLIENT_CREATE,
      Permission.CLIENT_READ,
      Permission.CLIENT_UPDATE,
      Permission.CLIENT_DELETE,
      
      // All service permissions
      Permission.SERVICE_CREATE,
      Permission.SERVICE_READ,
      Permission.SERVICE_UPDATE,
      Permission.SERVICE_DELETE,
      
      // All task permissions
      Permission.TASK_CREATE,
      Permission.TASK_READ,
      Permission.TASK_UPDATE,
      Permission.TASK_DELETE,
      Permission.TASK_ASSIGN,
      
      // All document permissions
      Permission.DOCUMENT_CREATE,
      Permission.DOCUMENT_READ,
      Permission.DOCUMENT_UPDATE,
      Permission.DOCUMENT_DELETE,
      
      // All calendar permissions
      Permission.CALENDAR_CREATE,
      Permission.CALENDAR_READ,
      Permission.CALENDAR_UPDATE,
      Permission.CALENDAR_DELETE,
      
      // All compliance permissions
      Permission.COMPLIANCE_CREATE,
      Permission.COMPLIANCE_READ,
      Permission.COMPLIANCE_UPDATE,
      Permission.COMPLIANCE_DELETE,
      
      // All integration permissions
      Permission.INTEGRATION_READ,
      Permission.INTEGRATION_UPDATE,
      Permission.INTEGRATION_MANAGE,
      
      // All audit permissions
      Permission.AUDIT_READ,
      Permission.AUDIT_MANAGE,
      
      // All user management permissions
      Permission.USER_CREATE,
      Permission.USER_READ,
      Permission.USER_UPDATE,
      Permission.USER_DELETE,
      Permission.USER_MANAGE_ROLES,
      
      // All system permissions
      Permission.SYSTEM_SETTINGS,
      Permission.SYSTEM_BACKUP,
      Permission.SYSTEM_MAINTENANCE,
    ],
  },
  {
    role: UserRole.MANAGER,
    description: 'Management access with client and service oversight, limited user management',
    permissions: [
      // All client permissions
      Permission.CLIENT_CREATE,
      Permission.CLIENT_READ,
      Permission.CLIENT_UPDATE,
      Permission.CLIENT_DELETE,
      
      // All service permissions
      Permission.SERVICE_CREATE,
      Permission.SERVICE_READ,
      Permission.SERVICE_UPDATE,
      Permission.SERVICE_DELETE,
      
      // All task permissions
      Permission.TASK_CREATE,
      Permission.TASK_READ,
      Permission.TASK_UPDATE,
      Permission.TASK_DELETE,
      Permission.TASK_ASSIGN,
      
      // All document permissions
      Permission.DOCUMENT_CREATE,
      Permission.DOCUMENT_READ,
      Permission.DOCUMENT_UPDATE,
      Permission.DOCUMENT_DELETE,
      
      // All calendar permissions
      Permission.CALENDAR_CREATE,
      Permission.CALENDAR_READ,
      Permission.CALENDAR_UPDATE,
      Permission.CALENDAR_DELETE,
      
      // All compliance permissions
      Permission.COMPLIANCE_CREATE,
      Permission.COMPLIANCE_READ,
      Permission.COMPLIANCE_UPDATE,
      Permission.COMPLIANCE_DELETE,
      
      // Limited integration permissions
      Permission.INTEGRATION_READ,
      Permission.INTEGRATION_UPDATE,
      
      // Audit read access
      Permission.AUDIT_READ,
      
      // Limited user management
      Permission.USER_READ,
      Permission.USER_UPDATE,
    ],
  },
  {
    role: UserRole.STAFF,
    description: 'Standard user access for day-to-day operations',
    permissions: [
      // Limited client permissions (no delete)
      Permission.CLIENT_CREATE,
      Permission.CLIENT_READ,
      Permission.CLIENT_UPDATE,
      
      // Limited service permissions (no delete)
      Permission.SERVICE_CREATE,
      Permission.SERVICE_READ,
      Permission.SERVICE_UPDATE,
      
      // All task permissions
      Permission.TASK_CREATE,
      Permission.TASK_READ,
      Permission.TASK_UPDATE,
      Permission.TASK_DELETE,
      
      // All document permissions
      Permission.DOCUMENT_CREATE,
      Permission.DOCUMENT_READ,
      Permission.DOCUMENT_UPDATE,
      Permission.DOCUMENT_DELETE,
      
      // All calendar permissions
      Permission.CALENDAR_CREATE,
      Permission.CALENDAR_READ,
      Permission.CALENDAR_UPDATE,
      Permission.CALENDAR_DELETE,
      
      // Limited compliance permissions (no delete)
      Permission.COMPLIANCE_CREATE,
      Permission.COMPLIANCE_READ,
      Permission.COMPLIANCE_UPDATE,
      
      // Integration read only
      Permission.INTEGRATION_READ,
    ],
  },
  {
    role: UserRole.READONLY,
    description: 'Read-only access for viewing data and reports',
    permissions: [
      // Read-only permissions
      Permission.CLIENT_READ,
      Permission.SERVICE_READ,
      Permission.TASK_READ,
      Permission.DOCUMENT_READ,
      Permission.CALENDAR_READ,
      Permission.COMPLIANCE_READ,
      Permission.INTEGRATION_READ,
    ],
  },
];

export interface PortfolioAccess {
  userId: string;
  portfolioCodes: number[];
  allPortfolios: boolean;
}

export interface UserPermissions {
  userId: string;
  role: UserRole;
  permissions: Permission[];
  portfolioAccess: PortfolioAccess;
}