# Design Document: Service-Task-Compliance Relationship Fix

## Overview

This design addresses the confusion between Services, Tasks, and Compliance Items in the MDJ Practice Manager system. The current implementation has the correct data structures in place, but lacks clear enforcement of the hierarchy and relationships. This design clarifies:

1. **Services** are the primary entity representing accounting services offered to clients
2. **Tasks** are workflow action items that belong to services (via `serviceId`)
3. **Compliance Items** are regulatory filings tracked when a related service exists

The key changes involve:
- Adding a `serviceId` field to compliance items to link them to services
- Enforcing that tasks should reference a service when they're part of service delivery
- Updating UI components to clearly distinguish between these entities
- Adding service detail views that show related tasks and compliance items
- Improving task generation from service templates

## Architecture

### Current Data Model

The existing data model already supports the correct hierarchy:

```typescript
// Service (primary entity)
interface Service {
  id: string;
  clientId: string;
  kind: string;              // 'Annual Accounts', 'VAT Returns', etc.
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  fee: number;
  annualized: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  nextDue?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Task (workflow action item)
interface Task {
  id: string;
  clientId: string;
  serviceId?: string;        // ✅ Already links to service
  title: string;
  description?: string;
  dueDate?: Date;
  assignee?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Compliance Item (regulatory filing)
interface ComplianceItem {
  id: string;
  clientId: string;
  serviceId?: string;        // ❌ MISSING - needs to be added
  type: string;
  description: string;
  dueDate?: Date;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Enhanced Data Model

**Add `serviceId` to ComplianceItem**:

```typescript
interface ComplianceItem {
  id: string;
  clientId: string;
  serviceId?: string;        // NEW: Link to related service
  type: string;
  description: string;
  dueDate?: Date;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Relationship Diagram

```
Client
  └─> Service (Annual Accounts, VAT Returns, etc.)
       ├─> Task (Call client, Chase records, Prepare documents)
       ├─> Task (Review draft, Submit to client)
       └─> ComplianceItem (Companies House filing, HMRC submission)
```

## Components and Interfaces

### Backend Changes

#### 1. Update ComplianceItem Interface

**File**: `apps/api/src/modules/companies-house/interfaces/companies-house.interface.ts`

Add `serviceId` field:

```typescript
export interface ComplianceItem {
  id: string;
  clientId: string;
  serviceId?: string;  // NEW: Link to related service
  type: string;
  description: string;
  dueDate?: Date;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplianceItemDto {
  clientId: string;
  serviceId?: string;  // NEW
  type: string;
  description: string;
  dueDate?: Date;
  status?: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
}
```

#### 2. Add Service-Compliance Integration Service

**File**: `apps/api/src/modules/services/service-compliance-integration.service.ts` (NEW)

This service handles the automatic creation of compliance items when services are created:

```typescript
@Injectable()
export class ServiceComplianceIntegrationService {
  constructor(
    private servicesService: ServicesService,
    private complianceService: ComplianceService,
  ) {}

  async createComplianceItemsForService(serviceId: string): Promise<ComplianceItem[]> {
    const service = await this.servicesService.findOne(serviceId);
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    const complianceItems: ComplianceItem[] = [];

    // Map service types to compliance item types
    const complianceMapping = this.getComplianceMapping(service.kind);
    
    for (const complianceType of complianceMapping) {
      const item = await this.complianceService.createComplianceItem({
        clientId: service.clientId,
        serviceId: service.id,
        type: complianceType.type,
        description: complianceType.description,
        dueDate: service.nextDue,
        source: complianceType.source,
        status: 'PENDING',
      });
      complianceItems.push(item);
    }

    return complianceItems;
  }

  private getComplianceMapping(serviceKind: string): Array<{
    type: string;
    description: string;
    source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  }> {
    const mappings: Record<string, any[]> = {
      'Annual Accounts': [
        {
          type: 'ANNUAL_ACCOUNTS',
          description: 'Companies House Annual Accounts Filing',
          source: 'COMPANIES_HOUSE',
        },
      ],
      'Confirmation Statement': [
        {
          type: 'CONFIRMATION_STATEMENT',
          description: 'Companies House Confirmation Statement',
          source: 'COMPANIES_HOUSE',
        },
      ],
      'VAT Returns': [
        {
          type: 'VAT_RETURN',
          description: 'HMRC VAT Return',
          source: 'HMRC',
        },
      ],
      'Corporation Tax': [
        {
          type: 'CT600',
          description: 'HMRC Corporation Tax Return',
          source: 'HMRC',
        },
      ],
    };

    return mappings[serviceKind] || [];
  }

  async syncServiceAndComplianceDates(serviceId: string): Promise<void> {
    const service = await this.servicesService.findOne(serviceId);
    if (!service || !service.nextDue) {
      return;
    }

    // Update related compliance items
    const complianceItems = await this.complianceService.findAll({
      clientId: service.clientId,
    });

    for (const item of complianceItems) {
      if (item.serviceId === serviceId) {
        await this.complianceService.updateComplianceItem(item.id, {
          dueDate: service.nextDue,
        });
      }
    }
  }
}
```

#### 3. Update Services Service

**File**: `apps/api/src/modules/services/services.service.ts`

Add hooks to create compliance items when services are created:

```typescript
async create(createServiceDto: CreateServiceDto): Promise<Service> {
  // ... existing creation logic ...
  
  const service = await this.fileStorage.writeJson('services', id, serviceData);
  
  // NEW: Create compliance items if applicable
  if (this.shouldCreateComplianceItems(service.kind)) {
    await this.serviceComplianceIntegration.createComplianceItemsForService(service.id);
  }
  
  return service;
}

async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
  // ... existing update logic ...
  
  const updatedService = await this.fileStorage.writeJson('services', id, updatedData);
  
  // NEW: Sync compliance item dates if nextDue changed
  if (updateServiceDto.nextDue) {
    await this.serviceComplianceIntegration.syncServiceAndComplianceDates(id);
  }
  
  return updatedService;
}

private shouldCreateComplianceItems(serviceKind: string): boolean {
  const complianceServices = [
    'Annual Accounts',
    'Confirmation Statement',
    'VAT Returns',
    'Corporation Tax',
  ];
  return complianceServices.includes(serviceKind);
}
```

#### 4. Add Service Detail Endpoint

**File**: `apps/api/src/modules/services/services.controller.ts`

Add endpoint to get service with related tasks and compliance items:

```typescript
@Get(':id/details')
async getServiceDetails(@Param('id') id: string) {
  const service = await this.servicesService.findOne(id);
  if (!service) {
    throw new NotFoundException(`Service ${id} not found`);
  }

  const tasks = await this.tasksService.findByService(id);
  const complianceItems = await this.complianceService.findAll({
    clientId: service.clientId,
  });
  
  // Filter compliance items for this service
  const relatedCompliance = complianceItems.filter(
    item => item.serviceId === id
  );

  return {
    service,
    tasks,
    complianceItems: relatedCompliance,
    summary: {
      totalTasks: tasks.length,
      openTasks: tasks.filter(t => t.status === 'OPEN').length,
      completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
      pendingCompliance: relatedCompliance.filter(c => c.status === 'PENDING').length,
      filedCompliance: relatedCompliance.filter(c => c.status === 'FILED').length,
    },
  };
}
```

### Frontend Changes

#### 1. Service Detail Page

**File**: `apps/web/src/app/services/[id]/page.tsx`

Create a new service detail page that shows:
- Service information
- Related tasks
- Related compliance items
- Actions (generate tasks, mark complete, etc.)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MDJShell } from '@/components/mdj-ui/MDJShell';
import api from '@/lib/api';

interface ServiceDetails {
  service: any;
  tasks: any[];
  complianceItems: any[];
  summary: {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    pendingCompliance: number;
    filedCompliance: number;
  };
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  
  const [details, setDetails] = useState<ServiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadServiceDetails();
  }, [serviceId]);

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/services/${serviceId}/details`);
      setDetails(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MDJShell title="Service Details" subtitle="Loading...">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="mdj-sub">Loading service details...</div>
        </div>
      </MDJShell>
    );
  }

  if (error || !details) {
    return (
      <MDJShell title="Service Details" subtitle="Error">
        <div style={{ padding: '2rem' }}>
          <div className="card-mdj" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}>
            <span style={{ color: 'var(--danger)' }}>{error || 'Service not found'}</span>
          </div>
          <button className="btn-gold" onClick={() => router.back()} style={{ marginTop: '1rem' }}>
            Go Back
          </button>
        </div>
      </MDJShell>
    );
  }

  const { service, tasks, complianceItems, summary } = details;

  return (
    <MDJShell
      title={service.kind}
      subtitle={`Service Details`}
      breadcrumbs={[
        { label: 'Services', href: '/services' },
        { label: service.kind },
      ]}
    >
      {/* Service Information Card */}
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <h3 className="mdj-h3">Service Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <div className="mdj-sub">Frequency</div>
            <div>{service.frequency}</div>
          </div>
          <div>
            <div className="mdj-sub">Fee</div>
            <div>£{service.fee.toFixed(2)}</div>
          </div>
          <div>
            <div className="mdj-sub">Status</div>
            <span className={`mdj-badge-${service.status === 'ACTIVE' ? 'success' : 'muted'}`}>
              {service.status}
            </span>
          </div>
          <div>
            <div className="mdj-sub">Next Due</div>
            <div>{service.nextDue ? new Date(service.nextDue).toLocaleDateString('en-GB') : 'Not set'}</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card-mdj">
          <div className="mdj-sub">Total Tasks</div>
          <div className="mdj-h2">{summary.totalTasks}</div>
        </div>
        <div className="card-mdj">
          <div className="mdj-sub">Open Tasks</div>
          <div className="mdj-h2" style={{ color: 'var(--warning)' }}>{summary.openTasks}</div>
        </div>
        <div className="card-mdj">
          <div className="mdj-sub">Pending Compliance</div>
          <div className="mdj-h2" style={{ color: 'var(--warning)' }}>{summary.pendingCompliance}</div>
        </div>
        <div className="card-mdj">
          <div className="mdj-sub">Filed Compliance</div>
          <div className="mdj-h2" style={{ color: 'var(--success)' }}>{summary.filedCompliance}</div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="mdj-h3">Tasks</h3>
          <button className="btn-gold" onClick={() => router.push(`/tasks/new?serviceId=${serviceId}`)}>
            Add Task
          </button>
        </div>
        {tasks.length === 0 ? (
          <div className="mdj-sub">No tasks for this service</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td>
                      <span className={`mdj-badge-${task.status === 'COMPLETED' ? 'success' : task.status === 'IN_PROGRESS' ? 'warn' : 'muted'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <span className={`mdj-badge-${task.priority === 'URGENT' ? 'danger' : task.priority === 'HIGH' ? 'warn' : 'muted'}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>{task.assignee || '-'}</td>
                    <td>
                      <button className="btn-outline-gold" onClick={() => router.push(`/tasks/${task.id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compliance Items Section */}
      <div className="card-mdj">
        <h3 className="mdj-h3" style={{ marginBottom: '1rem' }}>Compliance Items</h3>
        {complianceItems.length === 0 ? (
          <div className="mdj-sub">No compliance items for this service</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {complianceItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.type.replace(/_/g, ' ')}</td>
                    <td>{item.description}</td>
                    <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td>
                      <span className={`mdj-badge-${item.status === 'FILED' ? 'success' : item.status === 'OVERDUE' ? 'danger' : 'warn'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MDJShell>
  );
}
```

#### 2. Update Services List Page

**File**: `apps/web/src/app/services/page.tsx`

Update to show service-specific information and link to detail page:

```typescript
// In the table, add a "View Details" button
<td>
  <button 
    className="btn-outline-gold" 
    onClick={() => router.push(`/services/${service.id}`)}
  >
    View Details
  </button>
</td>
```

#### 3. Update Tasks List Page

**File**: `apps/web/src/app/tasks/page.tsx`

Show the related service name for each task:

```typescript
// Add service name column
<th>Service</th>

// In tbody
<td>{task.serviceName || 'Standalone Task'}</td>
```

#### 4. Update Task Creation Form

**File**: `apps/web/src/app/tasks/new/page.tsx`

Add service selection dropdown:

```typescript
const [services, setServices] = useState([]);

useEffect(() => {
  loadServices();
}, []);

const loadServices = async () => {
  try {
    const response = await api.get('/services', {
      params: { clientId: selectedClientId, status: 'ACTIVE' },
    });
    setServices(response.data);
  } catch (err) {
    console.error('Failed to load services:', err);
  }
};

// In form
<div>
  <label className="mdj-label">Related Service (Optional)</label>
  <select
    className="mdj-input"
    value={formData.serviceId || ''}
    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value || undefined })}
  >
    <option value="">Standalone Task</option>
    {services.map(service => (
      <option key={service.id} value={service.id}>
        {service.kind} ({service.frequency})
      </option>
    ))}
  </select>
  <div className="mdj-sub">Link this task to a service if it's part of service delivery</div>
</div>
```

## Data Models

### Updated ComplianceItem Model

```typescript
interface ComplianceItem {
  id: string;
  clientId: string;
  serviceId?: string;        // NEW: Link to service
  type: string;
  description: string;
  dueDate?: Date;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Service Details Response Model

```typescript
interface ServiceDetailsResponse {
  service: Service;
  tasks: Task[];
  complianceItems: ComplianceItem[];
  summary: {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    pendingCompliance: number;
    filedCompliance: number;
  };
}
```

## Error Handling

1. **Service Not Found**: Return 404 with clear message
2. **Invalid Service-Task Link**: Validate serviceId exists before creating task
3. **Compliance Item Without Service**: Allow but log warning for audit
4. **Circular Dependencies**: Use forwardRef in NestJS to handle service-task-compliance circular dependencies

## Testing Strategy

### Unit Tests

1. Test service creation creates compliance items
2. Test task creation validates serviceId
3. Test service update syncs compliance dates
4. Test service deletion cascades to tasks
5. Test compliance item creation with serviceId

### Integration Tests

1. Test full service workflow: create service → generate tasks → create compliance items
2. Test service detail endpoint returns correct data
3. Test UI displays service-task-compliance hierarchy correctly

## Implementation Details

### Migration Strategy

Since this is a file-based storage system, migration involves:

1. **Add `serviceId` field to existing compliance items**: Run a migration script to add `serviceId: undefined` to all existing compliance items
2. **Backfill `serviceId` for existing compliance items**: Match compliance items to services based on client and type
3. **Update UI components**: Deploy frontend changes to show new relationships
4. **Update API endpoints**: Deploy backend changes to enforce relationships

### Migration Script

```typescript
// scripts/migrate-compliance-service-links.ts
async function migrateComplianceItems() {
  const complianceItems = await fileStorage.searchFiles('compliance', () => true);
  const services = await fileStorage.searchFiles('services', () => true);
  
  for (const item of complianceItems) {
    // Find matching service
    const matchingService = services.find(s => 
      s.clientId === item.clientId &&
      isMatchingServiceType(s.kind, item.type)
    );
    
    if (matchingService) {
      item.serviceId = matchingService.id;
      await fileStorage.writeJson('compliance', item.id, item);
      console.log(`Linked compliance item ${item.id} to service ${matchingService.id}`);
    }
  }
}

function isMatchingServiceType(serviceKind: string, complianceType: string): boolean {
  const mappings = {
    'Annual Accounts': 'ANNUAL_ACCOUNTS',
    'Confirmation Statement': 'CONFIRMATION_STATEMENT',
    'VAT Returns': 'VAT_RETURN',
    'Corporation Tax': 'CT600',
  };
  
  return mappings[serviceKind] === complianceType;
}
```

## Design Decisions and Rationales

### 1. Add `serviceId` to Compliance Items

**Decision**: Add optional `serviceId` field to link compliance items to services.

**Rationale**:
- Establishes clear relationship between services and regulatory filings
- Allows tracking which service is responsible for which compliance item
- Enables automatic compliance item creation when services are added
- Supports service detail view showing related compliance items
- Optional field maintains backward compatibility

### 2. Service Detail Page

**Decision**: Create dedicated service detail page showing tasks and compliance items.

**Rationale**:
- Provides complete view of service delivery workflow
- Shows relationship between service, tasks, and compliance
- Centralizes service management in one place
- Follows existing pattern of detail pages for other entities
- Improves user understanding of entity relationships

### 3. Automatic Compliance Item Creation

**Decision**: Automatically create compliance items when certain services are created.

**Rationale**:
- Reduces manual data entry
- Ensures compliance items aren't forgotten
- Maintains consistency between services and regulatory requirements
- Can be disabled for services that don't require compliance tracking
- Follows principle of automation where possible

### 4. Service Selection in Task Creation

**Decision**: Add optional service dropdown when creating tasks.

**Rationale**:
- Makes service-task relationship explicit during creation
- Allows standalone tasks (serviceId = null) for non-service work
- Provides context for task purpose
- Enables better task organization and filtering
- Improves data quality through guided input

### 5. Keep Tasks and Compliance Separate

**Decision**: Maintain separate entities for tasks and compliance items rather than merging them.

**Rationale**:
- Tasks are internal workflow steps
- Compliance items are external regulatory requirements
- Different lifecycles and purposes
- Compliance items may exist without tasks (auto-filed)
- Tasks may exist without compliance items (internal work)
- Separation of concerns improves clarity

### 6. Service-Compliance Mapping

**Decision**: Use predefined mapping between service types and compliance types.

**Rationale**:
- Ensures consistency in compliance item creation
- Reduces errors from manual entry
- Can be extended with configuration
- Supports multiple compliance items per service
- Maintains flexibility for custom services

## Future Enhancements

1. **Service Templates**: Predefined service configurations with tasks and compliance items
2. **Bulk Service Creation**: Create multiple services at once for new clients
3. **Service Completion Workflow**: Mark service complete when all tasks and compliance items are done
4. **Service Recurring**: Automatically create next period's service when current one completes
5. **Compliance Reminders**: Automated reminders based on service due dates
6. **Service Analytics**: Track time spent, profitability, completion rates per service type
7. **Custom Service-Compliance Mappings**: Allow users to define their own mappings
8. **Service Dependencies**: Define dependencies between services (e.g., accounts before tax return)

## Dependencies

- Existing Services module
- Existing Tasks module
- Existing Compliance/Filings module
- File storage service
- Clients service

## Security Considerations

- Validate serviceId references exist before creating tasks/compliance items
- Ensure users can only link tasks/compliance to services they have access to
- Maintain audit trail of service-task-compliance relationships
- Prevent orphaned records through cascade deletes

## Performance Considerations

- Index serviceId in tasks and compliance items for efficient queries
- Cache service details to reduce repeated queries
- Batch compliance item creation when creating multiple services
- Optimize service detail endpoint to minimize database queries
