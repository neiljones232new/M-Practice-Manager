# Design Document: Separate Service and Task Templates

## Overview

This design adds standalone task templates to the MDJ Practice Manager system while keeping existing service templates unchanged. Currently, both the Services and Tasks pages show the same service templates (which include workflow task definitions). This design adds a new set of standalone task templates specifically for the Tasks page, allowing users to quickly create common actionable tasks.

Key changes:
- Add standalone task template data model and storage
- Create comprehensive default task templates organized by category
- Update template drawer to show appropriate templates based on context
- Maintain full backward compatibility with existing service templates

## Architecture

### Current Template System

The existing system has service templates with embedded task templates:

```typescript
interface ServiceTemplate {
  serviceKind: string;           // 'Annual Accounts', 'VAT Returns', etc.
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  taskTemplates: TaskTemplateDefinition[];  // Workflow steps for this service
}

interface TaskTemplateDefinition {
  title: string;
  description: string;
  daysBeforeDue: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
}
```

This works well for Services but doesn't provide standalone task templates.

### New Standalone Task Template Model

Add a new standalone task template model:

```typescript
interface StandaloneTaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;              // 'Client Communication', 'Billing', etc.
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface CreateStandaloneTaskTemplateDto {
  title: string;
  description: string;
  category: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
}
```

### Template Categories

Organize standalone task templates into categories:

```typescript
enum TaskTemplateCategory {
  CLIENT_COMMUNICATION = 'Client Communication',
  BILLING_CREDIT_CONTROL = 'Billing & Credit Control',
  PRACTICE_ADMIN = 'Practice Administration',
  EMAIL_CORRESPONDENCE = 'Email & Correspondence',
  CLIENT_JOB_WORKFLOW = 'Client Job Workflow',
  INTERNAL_OPERATIONS = 'Internal Operations',
  MARKETING_GROWTH = 'Marketing & Growth',
}
```

## Components and Interfaces

### Backend Changes

#### 1. Create Standalone Task Template Interface

**File**: `apps/api/src/modules/tasks/interfaces/task.interface.ts`

Add new interfaces:

```typescript
export interface StandaloneTaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStandaloneTaskTemplateDto {
  title: string;
  description: string;
  category: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
}
```

#### 2. Add Standalone Task Templates Service

**File**: `apps/api/src/modules/tasks/standalone-task-templates.service.ts` (NEW)

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { StandaloneTaskTemplate, CreateStandaloneTaskTemplateDto } from './interfaces/task.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StandaloneTaskTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(StandaloneTaskTemplatesService.name);

  constructor(private fileStorage: FileStorageService) {}

  async onModuleInit() {
    await this.initializeDefaultTemplates();
  }

  async findAll(): Promise<StandaloneTaskTemplate[]> {
    return this.fileStorage.searchFiles<StandaloneTaskTemplate>(
      'task-templates',
      () => true
    );
  }

  async findByCategory(category: string): Promise<StandaloneTaskTemplate[]> {
    return this.fileStorage.searchFiles<StandaloneTaskTemplate>(
      'task-templates',
      (template) => template.category === category
    );
  }

  async findOne(id: string): Promise<StandaloneTaskTemplate | null> {
    try {
      return await this.fileStorage.readJson<StandaloneTaskTemplate>('task-templates', id);
    } catch {
      return null;
    }
  }

  async create(dto: CreateStandaloneTaskTemplateDto): Promise<StandaloneTaskTemplate> {
    const template: StandaloneTaskTemplate = {
      id: uuidv4(),
      ...dto,
      priority: dto.priority || 'MEDIUM',
      tags: dto.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('task-templates', template.id, template);
    return template;
  }

  async update(id: string, dto: Partial<CreateStandaloneTaskTemplateDto>): Promise<StandaloneTaskTemplate> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }

    const updated: StandaloneTaskTemplate = {
      ...existing,
      ...dto,
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('task-templates', id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.fileStorage.deleteFile('task-templates', id);
  }

  private async initializeDefaultTemplates() {
    const defaultTemplates: CreateStandaloneTaskTemplateDto[] = [
      // Client Communication & Relationship Management
      {
        title: 'Respond to client email',
        description: 'Respond to client emails promptly',
        category: 'Client Communication',
        priority: 'MEDIUM',
        tags: ['email', 'client-contact'],
      },
      {
        title: 'Make follow-up call',
        description: 'Make follow-up calls to clients regarding outstanding information',
        category: 'Client Communication',
        priority: 'HIGH',
        tags: ['phone', 'follow-up', 'client-contact'],
      },
      {
        title: 'Chase missing records',
        description: 'Chase clients for missing bookkeeping records or documentation',
        category: 'Client Communication',
        priority: 'HIGH',
        tags: ['chase', 'records', 'client-contact'],
      },
      {
        title: 'Send deadline reminder',
        description: 'Send reminders for upcoming filing deadlines (VAT, payroll, year-end, etc.)',
        category: 'Client Communication',
        priority: 'HIGH',
        tags: ['reminder', 'deadline', 'email'],
      },
      {
        title: 'Arrange client meeting',
        description: 'Arrange client meetings (in-person or virtual)',
        category: 'Client Communication',
        priority: 'MEDIUM',
        tags: ['meeting', 'client-contact'],
      },
      {
        title: 'Send engagement letter',
        description: 'Send onboarding or engagement letters to new clients',
        category: 'Client Communication',
        priority: 'HIGH',
        tags: ['onboarding', 'engagement', 'email'],
      },
      {
        title: 'Follow up on client query',
        description: 'Follow up on client queries or pending approvals',
        category: 'Client Communication',
        priority: 'MEDIUM',
        tags: ['follow-up', 'query', 'client-contact'],
      },
      {
        title: 'Update client contact info',
        description: 'Maintain up-to-date client contact information in CRM',
        category: 'Client Communication',
        priority: 'LOW',
        tags: ['crm', 'data-maintenance'],
      },

      // Billing & Credit Control
      {
        title: 'Issue invoice',
        description: 'Issue invoices for completed work',
        category: 'Billing & Credit Control',
        priority: 'HIGH',
        tags: ['billing', 'invoice'],
      },
      {
        title: 'Send invoice reminder',
        description: 'Send invoice reminders before due dates',
        category: 'Billing & Credit Control',
        priority: 'MEDIUM',
        tags: ['billing', 'reminder', 'email'],
      },
      {
        title: 'Chase overdue payment',
        description: 'Chase overdue payments (email and phone follow-up)',
        category: 'Billing & Credit Control',
        priority: 'URGENT',
        tags: ['billing', 'chase', 'overdue'],
      },
      {
        title: 'Update debtor tracking',
        description: 'Update debtor tracking spreadsheets or accounting system',
        category: 'Billing & Credit Control',
        priority: 'MEDIUM',
        tags: ['billing', 'tracking'],
      },
      {
        title: 'Record payment received',
        description: 'Record payments received and reconcile client accounts',
        category: 'Billing & Credit Control',
        priority: 'HIGH',
        tags: ['billing', 'payment', 'reconciliation'],
      },
      {
        title: 'Prepare debtor ageing report',
        description: 'Prepare monthly debtor ageing reports',
        category: 'Billing & Credit Control',
        priority: 'MEDIUM',
        tags: ['billing', 'reporting'],
      },

      // Practice Administration
      {
        title: 'File signed documents',
        description: 'File signed documents (letters, accounts, tax returns, etc.)',
        category: 'Practice Administration',
        priority: 'MEDIUM',
        tags: ['filing', 'documents'],
      },
      {
        title: 'Maintain filing systems',
        description: 'Maintain digital and paper filing systems',
        category: 'Practice Administration',
        priority: 'LOW',
        tags: ['filing', 'organization'],
      },
      {
        title: 'Update job status',
        description: 'Update client job status on internal workflow tracker',
        category: 'Practice Administration',
        priority: 'MEDIUM',
        tags: ['workflow', 'tracking'],
      },
      {
        title: 'Allocate tasks to team',
        description: 'Allocate tasks to team members and update progress',
        category: 'Practice Administration',
        priority: 'HIGH',
        tags: ['workflow', 'team-management'],
      },
      {
        title: 'Record timesheets',
        description: 'Record staff timesheets and review chargeable hours',
        category: 'Practice Administration',
        priority: 'MEDIUM',
        tags: ['timesheets', 'billing'],
      },
      {
        title: 'Order office supplies',
        description: 'Order office supplies and manage subscriptions (software, licenses, etc.)',
        category: 'Practice Administration',
        priority: 'LOW',
        tags: ['supplies', 'procurement'],
      },
      {
        title: 'Perform data backup',
        description: 'Perform regular data backups of client and internal files',
        category: 'Practice Administration',
        priority: 'HIGH',
        tags: ['backup', 'it', 'security'],
      },

      // Email & Correspondence
      {
        title: 'Check shared inbox',
        description: 'Check and respond to general enquiries in shared inboxes (e.g. info@)',
        category: 'Email & Correspondence',
        priority: 'MEDIUM',
        tags: ['email', 'inbox'],
      },
      {
        title: 'Forward emails to staff',
        description: 'Forward relevant emails to responsible staff members',
        category: 'Email & Correspondence',
        priority: 'MEDIUM',
        tags: ['email', 'delegation'],
      },
      {
        title: 'Send bulk reminders',
        description: 'Send bulk reminders (VAT, PAYE, CT600 deadlines, etc.)',
        category: 'Email & Correspondence',
        priority: 'HIGH',
        tags: ['email', 'reminder', 'bulk'],
      },
      {
        title: 'Prepare email templates',
        description: 'Prepare professional follow-up templates for common scenarios',
        category: 'Email & Correspondence',
        priority: 'LOW',
        tags: ['email', 'templates'],
      },
      {
        title: 'Confirm document receipt',
        description: 'Confirm receipt of client information or signed documents',
        category: 'Email & Correspondence',
        priority: 'MEDIUM',
        tags: ['email', 'confirmation'],
      },

      // Client Job Workflow
      {
        title: 'Create new client job',
        description: 'Create new client jobs in practice management software',
        category: 'Client Job Workflow',
        priority: 'HIGH',
        tags: ['workflow', 'job-creation'],
      },
      {
        title: 'Update job progress',
        description: 'Update job progress (e.g., records received, draft prepared, filed)',
        category: 'Client Job Workflow',
        priority: 'MEDIUM',
        tags: ['workflow', 'tracking'],
      },
      {
        title: 'Review jobs nearing deadlines',
        description: 'Review jobs nearing deadlines and assign priorities',
        category: 'Client Job Workflow',
        priority: 'HIGH',
        tags: ['workflow', 'deadline', 'review'],
      },
      {
        title: 'Close completed job',
        description: 'Close completed jobs and record completion notes',
        category: 'Client Job Workflow',
        priority: 'MEDIUM',
        tags: ['workflow', 'completion'],
      },
      {
        title: 'Schedule periodic review',
        description: 'Schedule periodic client reviews (e.g., quarterly or annually)',
        category: 'Client Job Workflow',
        priority: 'LOW',
        tags: ['workflow', 'review', 'planning'],
      },

      // Internal Practice Operations
      {
        title: 'Review WIP report',
        description: 'Review WIP and billable time reports weekly',
        category: 'Internal Operations',
        priority: 'MEDIUM',
        tags: ['reporting', 'wip', 'billing'],
      },
      {
        title: 'Conduct team check-in',
        description: 'Conduct internal team check-ins or workflow meetings',
        category: 'Internal Operations',
        priority: 'MEDIUM',
        tags: ['meeting', 'team-management'],
      },
      {
        title: 'Review client satisfaction',
        description: 'Review client satisfaction and gather feedback',
        category: 'Internal Operations',
        priority: 'LOW',
        tags: ['feedback', 'quality'],
      },
      {
        title: 'Monitor software updates',
        description: 'Monitor software updates and renewals (QuickBooks, Xero, etc.)',
        category: 'Internal Operations',
        priority: 'LOW',
        tags: ['it', 'software'],
      },
      {
        title: 'Maintain CPD logs',
        description: 'Maintain staff CPD logs and training plans',
        category: 'Internal Operations',
        priority: 'LOW',
        tags: ['training', 'cpd', 'compliance'],
      },

      // Marketing & Growth
      {
        title: 'Send client newsletter',
        description: 'Send client newsletters or tax updates',
        category: 'Marketing & Growth',
        priority: 'LOW',
        tags: ['marketing', 'newsletter', 'email'],
      },
      {
        title: 'Post social media update',
        description: 'Post firm updates or reminders on social media',
        category: 'Marketing & Growth',
        priority: 'LOW',
        tags: ['marketing', 'social-media'],
      },
      {
        title: 'Follow up on enquiry',
        description: 'Follow up on enquiries or referrals',
        category: 'Marketing & Growth',
        priority: 'HIGH',
        tags: ['marketing', 'lead', 'follow-up'],
      },
      {
        title: 'Update firm website',
        description: 'Update firm website or online profiles',
        category: 'Marketing & Growth',
        priority: 'LOW',
        tags: ['marketing', 'website'],
      },
    ];

    for (const template of defaultTemplates) {
      try {
        // Check if template already exists by title
        const existing = await this.fileStorage.searchFiles<StandaloneTaskTemplate>(
          'task-templates',
          (t) => t.title === template.title
        );

        if (existing.length === 0) {
          await this.create(template);
          this.logger.log(`Created default task template: ${template.title}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create task template ${template.title}:`, error);
      }
    }
  }
}
```

#### 3. Add Controller Endpoints

**File**: `apps/api/src/modules/tasks/tasks.controller.ts`

Add new endpoints:

```typescript
@Get('templates/standalone')
async getStandaloneTaskTemplates(
  @Query('category') category?: string,
): Promise<StandaloneTaskTemplate[]> {
  if (category) {
    return this.standaloneTaskTemplatesService.findByCategory(category);
  }
  return this.standaloneTaskTemplatesService.findAll();
}

@Get('templates/standalone/:id')
async getStandaloneTaskTemplate(
  @Param('id') id: string,
): Promise<StandaloneTaskTemplate> {
  const template = await this.standaloneTaskTemplatesService.findOne(id);
  if (!template) {
    throw new NotFoundException(`Template ${id} not found`);
  }
  return template;
}

@Post('templates/standalone')
async createStandaloneTaskTemplate(
  @Body() dto: CreateStandaloneTaskTemplateDto,
): Promise<StandaloneTaskTemplate> {
  return this.standaloneTaskTemplatesService.create(dto);
}
```

#### 4. Update Tasks Module

**File**: `apps/api/src/modules/tasks/tasks.module.ts`

```typescript
import { StandaloneTaskTemplatesService } from './standalone-task-templates.service';

@Module({
  imports: [FileStorageModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    DefaultTemplatesService,
    StandaloneTaskTemplatesService,  // NEW
  ],
  exports: [TasksService, StandaloneTaskTemplatesService],
})
export class TasksModule {}
```

### Frontend Changes

#### 1. Update Template Drawer Component

**File**: `apps/web/src/components/mdj-ui/MDJTemplateDrawer.tsx`

Update to fetch and display appropriate templates:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface StandaloneTaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  tags: string[];
}

interface ServiceTemplate {
  serviceKind: string;
  frequency: string;
  taskTemplates: any[];
}

interface MDJTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  highlightMode: 'services' | 'tasks';
}

export function MDJTemplateDrawer({ isOpen, onClose, highlightMode }: MDJTemplateDrawerProps) {
  const router = useRouter();
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<StandaloneTaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, highlightMode]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      if (highlightMode === 'services') {
        const data = await api.get('/tasks/templates/service');
        setServiceTemplates(data);
      } else {
        const data = await api.get('/tasks/templates/standalone');
        setTaskTemplates(data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceTemplateClick = (template: ServiceTemplate) => {
    router.push(`/services/new?template=${encodeURIComponent(template.serviceKind)}&frequency=${template.frequency}`);
    onClose();
  };

  const handleTaskTemplateClick = (template: StandaloneTaskTemplate) => {
    const params = new URLSearchParams({
      title: template.title,
      description: template.description,
      priority: template.priority,
      tags: template.tags.join(','),
    });
    router.push(`/tasks/new?${params.toString()}`);
    onClose();
  };

  const categories = Array.from(new Set(taskTemplates.map(t => t.category)));

  const filteredTaskTemplates = taskTemplates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedTaskTemplates = filteredTaskTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, StandaloneTaskTemplate[]>);

  if (!isOpen) return null;

  return (
    <div className="mdj-drawer-overlay" onClick={onClose}>
      <div className="mdj-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mdj-drawer-header">
          <h2>{highlightMode === 'services' ? 'Service Templates' : 'Task Templates'}</h2>
          <button className="mdj-drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="mdj-drawer-body">
          {highlightMode === 'tasks' && (
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="mdj-input"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <select
                className="mdj-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading templates...
            </div>
          ) : highlightMode === 'services' ? (
            <div className="template-list">
              {serviceTemplates.map((template, idx) => (
                <div
                  key={idx}
                  className="template-card"
                  onClick={() => handleServiceTemplateClick(template)}
                >
                  <h4>{template.serviceKind}</h4>
                  <div className="mdj-sub">{template.frequency}</div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {template.taskTemplates.length} workflow tasks
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="template-list">
              {Object.entries(groupedTaskTemplates).map(([category, templates]) => (
                <div key={category} style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--gold)' }}>
                    {category}
                  </h3>
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="template-card"
                      onClick={() => handleTaskTemplateClick(template)}
                    >
                      <h4>{template.title}</h4>
                      <div className="mdj-sub">{template.description}</div>
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`mdj-badge mdj-badge-${
                          template.priority === 'URGENT' ? 'danger' :
                          template.priority === 'HIGH' ? 'warn' :
                          template.priority === 'MEDIUM' ? 'soft' : 'muted'
                        }`}>
                          {template.priority}
                        </span>
                        {template.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="mdj-badge mdj-badge-muted" style={{ fontSize: '0.75rem' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 2. Update Task Creation Page

**File**: `apps/web/src/app/tasks/new/page.tsx`

Update to handle template parameters:

```typescript
useEffect(() => {
  // Pre-populate from template if query params exist
  const title = searchParams.get('title');
  const description = searchParams.get('description');
  const priority = searchParams.get('priority');
  const tags = searchParams.get('tags');

  if (title) {
    setFormData(prev => ({
      ...prev,
      title,
      description: description || '',
      priority: (priority as any) || 'MEDIUM',
      tags: tags ? tags.split(',') : [],
    }));
  }
}, [searchParams]);
```

## Data Models

### Standalone Task Template

```typescript
interface StandaloneTaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Template Categories

```typescript
const TASK_TEMPLATE_CATEGORIES = [
  'Client Communication',
  'Billing & Credit Control',
  'Practice Administration',
  'Email & Correspondence',
  'Client Job Workflow',
  'Internal Operations',
  'Marketing & Growth',
];
```

## Error Handling

1. **Template Not Found**: Return 404 with clear message
2. **Invalid Category**: Validate category against allowed values
3. **Duplicate Template**: Check for existing templates by title before creating
4. **Storage Errors**: Log errors and return appropriate HTTP status codes

## Testing Strategy

### Unit Tests

1. Test standalone task template creation
2. Test template filtering by category
3. Test template search functionality
4. Test default template initialization
5. Test template CRUD operations

### Integration Tests

1. Test template drawer displays correct templates based on context
2. Test template selection navigates to correct form with pre-populated data
3. Test task creation from template
4. Test service templates remain unchanged

## Implementation Details

### File Storage Structure

```
storage/
  task-templates/
    {uuid}.json  # Standalone task templates
  service-templates/
    {serviceKind}-{frequency}.json  # Existing service templates (unchanged)
```

### Migration Strategy

No migration needed - this is purely additive:
1. Deploy new backend code with standalone task templates service
2. System will auto-create default templates on first startup
3. Deploy frontend changes to use new templates
4. Existing service templates continue to work unchanged

## Design Decisions and Rationales

### 1. Separate Storage for Standalone Task Templates

**Decision**: Store standalone task templates separately from service templates.

**Rationale**:
- Clear separation of concerns
- Service templates remain unchanged
- Easy to query appropriate templates based on context
- Allows independent management of each template type

### 2. Category-Based Organization

**Decision**: Organize standalone task templates into categories.

**Rationale**:
- Improves discoverability with 40+ templates
- Matches real-world practice management workflows
- Allows filtering and grouping in UI
- Makes template drawer more usable

### 3. Template Pre-population via Query Parameters

**Decision**: Pass template data via URL query parameters to creation forms.

**Rationale**:
- Simple implementation
- Works with existing form logic
- Allows users to modify template data before creating
- No need for complex state management

### 4. Keep Service Templates Unchanged

**Decision**: Do not modify existing service template system.

**Rationale**:
- Zero risk to existing functionality
- No migration needed
- Backward compatible
- Faster implementation

### 5. Comprehensive Default Templates

**Decision**: Include 40+ default task templates covering all practice areas.

**Rationale**:
- Provides immediate value to users
- Covers real-world accounting practice workflows
- Reduces need for custom template creation
- Based on actual user requirements

## Future Enhancements

1. **Custom Template Creation**: Allow users to create their own task templates via UI
2. **Template Sharing**: Share templates between team members or practices
3. **Template Analytics**: Track which templates are most used
4. **Template Customization**: Allow editing default templates
5. **Template Import/Export**: Import templates from other systems
6. **Smart Suggestions**: Suggest templates based on client type or context
7. **Template Versioning**: Track changes to templates over time

## Dependencies

- Existing Tasks module
- File storage service
- Template drawer component

## Security Considerations

- Validate template data before storage
- Ensure users can only access templates they have permission for
- Sanitize template content to prevent XSS
- Audit template creation and modifications

## Performance Considerations

- Cache templates in memory after first load
- Index templates by category for fast filtering
- Lazy load template details when needed
- Optimize template search with efficient filtering
