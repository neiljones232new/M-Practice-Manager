import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { 
  StandaloneTaskTemplate, 
  CreateStandaloneTaskTemplateDto,
  UpdateStandaloneTaskTemplateDto,
  TASK_TEMPLATE_CATEGORIES
} from './interfaces/task.interface';

@Injectable()
export class StandaloneTaskTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(StandaloneTaskTemplatesService.name);

  constructor(private fileStorage: FileStorageService) {}

  async onModuleInit() {
    await this.initializeDefaultTemplates();
  }

  /**
   * Retrieve all standalone task templates
   */
  async findAll(): Promise<StandaloneTaskTemplate[]> {
    return this.fileStorage.searchFiles<StandaloneTaskTemplate>(
      'task-templates',
      () => true
    );
  }

  /**
   * Filter templates by category
   */
  async findByCategory(category: string): Promise<StandaloneTaskTemplate[]> {
    return this.fileStorage.searchFiles<StandaloneTaskTemplate>(
      'task-templates',
      (template) => template.category === category
    );
  }

  /**
   * Get a single template by ID
   */
  async findOne(id: string): Promise<StandaloneTaskTemplate | null> {
    try {
      return await this.fileStorage.readJson<StandaloneTaskTemplate>('task-templates', id);
    } catch (error) {
      this.logger.warn(`Failed to read template ${id}:`, error);
      return null;
    }
  }

  /**
   * Create a new standalone task template
   */
  async create(dto: CreateStandaloneTaskTemplateDto): Promise<StandaloneTaskTemplate> {
    const id = this.generateId();
    const now = new Date();

    const template: StandaloneTaskTemplate = {
      id,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority: dto.priority || 'MEDIUM',
      tags: dto.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('task-templates', id, template);
    this.logger.log(`Created standalone task template: ${template.title} (${template.id})`);

    return template;
  }

  /**
   * Update an existing template
   */
  async update(id: string, dto: UpdateStandaloneTaskTemplateDto): Promise<StandaloneTaskTemplate> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    const updated: StandaloneTaskTemplate = {
      ...existing,
      ...dto,
      id: existing.id, // Ensure ID cannot be changed
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('task-templates', id, updated);
    this.logger.log(`Updated standalone task template: ${updated.title} (${updated.id})`);

    return updated;
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) {
      return false;
    }

    await this.fileStorage.deleteJson('task-templates', id);
    this.logger.log(`Deleted standalone task template: ${existing.title} (${existing.id})`);

    return true;
  }

  /**
   * Initialize default task templates on module startup
   */
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
        // Check if template already exists by title to avoid duplicates
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

    this.logger.log('Default standalone task templates initialization complete');
  }

  /**
   * Generate a unique ID for templates
   */
  private generateId(): string {
    return `task_template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
