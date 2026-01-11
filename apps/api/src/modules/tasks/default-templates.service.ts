import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateServiceTemplateDto } from './interfaces/task.interface';

@Injectable()
export class DefaultTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(DefaultTemplatesService.name);

  constructor(private tasksService: TasksService) {}

  async onModuleInit() {
    await this.initializeDefaultTemplates();
  }

  private async initializeDefaultTemplates() {
    const defaultTemplates: CreateServiceTemplateDto[] = [
      // Annual Accounts Templates
      {
        serviceKind: 'Annual Accounts',
        frequency: 'ANNUAL',
        taskTemplates: [
          {
            title: 'Request client records',
            description: 'Contact client to request annual accounting records and supporting documents',
            daysBeforeDue: 60,
            priority: 'HIGH',
            tags: ['preparation', 'client-contact'],
          },
          {
            title: 'Review and prepare accounts',
            description: 'Review client records and prepare annual accounts',
            daysBeforeDue: 30,
            priority: 'HIGH',
            tags: ['preparation', 'accounts'],
          },
          {
            title: 'Client review and approval',
            description: 'Send draft accounts to client for review and approval',
            daysBeforeDue: 14,
            priority: 'MEDIUM',
            tags: ['client-review', 'approval'],
          },
          {
            title: 'File annual accounts',
            description: 'File approved annual accounts with Companies House',
            daysBeforeDue: 3,
            priority: 'URGENT',
            tags: ['filing', 'companies-house'],
          },
        ],
      },
      
      // VAT Returns Templates
      {
        serviceKind: 'VAT Returns',
        frequency: 'QUARTERLY',
        taskTemplates: [
          {
            title: 'Collect VAT records',
            description: 'Gather sales and purchase records for VAT return preparation',
            daysBeforeDue: 21,
            priority: 'HIGH',
            tags: ['preparation', 'records'],
          },
          {
            title: 'Prepare VAT return',
            description: 'Calculate VAT liability and prepare return',
            daysBeforeDue: 14,
            priority: 'HIGH',
            tags: ['preparation', 'calculation'],
          },
          {
            title: 'Client review',
            description: 'Send VAT return to client for review and approval',
            daysBeforeDue: 7,
            priority: 'MEDIUM',
            tags: ['client-review'],
          },
          {
            title: 'Submit VAT return',
            description: 'Submit approved VAT return to HMRC',
            daysBeforeDue: 2,
            priority: 'URGENT',
            tags: ['filing', 'hmrc'],
          },
        ],
      },

      // Monthly VAT Returns
      {
        serviceKind: 'VAT Returns',
        frequency: 'MONTHLY',
        taskTemplates: [
          {
            title: 'Collect monthly VAT records',
            description: 'Gather monthly sales and purchase records',
            daysBeforeDue: 14,
            priority: 'HIGH',
            tags: ['preparation', 'records'],
          },
          {
            title: 'Prepare monthly VAT return',
            description: 'Calculate monthly VAT liability and prepare return',
            daysBeforeDue: 7,
            priority: 'HIGH',
            tags: ['preparation', 'calculation'],
          },
          {
            title: 'Submit monthly VAT return',
            description: 'Submit VAT return to HMRC',
            daysBeforeDue: 2,
            priority: 'URGENT',
            tags: ['filing', 'hmrc'],
          },
        ],
      },

      // Payroll Services Templates
      {
        serviceKind: 'Payroll Services',
        frequency: 'MONTHLY',
        taskTemplates: [
          {
            title: 'Collect payroll data',
            description: 'Gather employee hours, overtime, and other payroll information',
            daysBeforeDue: 10,
            priority: 'HIGH',
            tags: ['preparation', 'data-collection'],
          },
          {
            title: 'Process payroll',
            description: 'Calculate wages, deductions, and prepare payslips',
            daysBeforeDue: 5,
            priority: 'HIGH',
            tags: ['processing', 'calculation'],
          },
          {
            title: 'Submit RTI to HMRC',
            description: 'Submit Real Time Information to HMRC',
            daysBeforeDue: 2,
            priority: 'URGENT',
            tags: ['filing', 'hmrc', 'rti'],
          },
        ],
      },

      // Corporation Tax Templates
      {
        serviceKind: 'Corporation Tax',
        frequency: 'ANNUAL',
        taskTemplates: [
          {
            title: 'Prepare corporation tax computation',
            description: 'Calculate corporation tax liability based on annual accounts',
            daysBeforeDue: 90,
            priority: 'HIGH',
            tags: ['preparation', 'computation'],
          },
          {
            title: 'Review tax planning opportunities',
            description: 'Review potential tax planning strategies and reliefs',
            daysBeforeDue: 60,
            priority: 'MEDIUM',
            tags: ['planning', 'optimization'],
          },
          {
            title: 'Prepare CT600 return',
            description: 'Complete corporation tax return form CT600',
            daysBeforeDue: 30,
            priority: 'HIGH',
            tags: ['preparation', 'ct600'],
          },
          {
            title: 'Submit corporation tax return',
            description: 'File CT600 return with HMRC',
            daysBeforeDue: 7,
            priority: 'URGENT',
            tags: ['filing', 'hmrc'],
          },
        ],
      },

      // Self Assessment Templates
      {
        serviceKind: 'Self Assessment',
        frequency: 'ANNUAL',
        taskTemplates: [
          {
            title: 'Request client information',
            description: 'Contact client for income, expenses, and other tax information',
            daysBeforeDue: 60,
            priority: 'HIGH',
            tags: ['preparation', 'client-contact'],
          },
          {
            title: 'Prepare self assessment return',
            description: 'Complete SA100 tax return based on client information',
            daysBeforeDue: 21,
            priority: 'HIGH',
            tags: ['preparation', 'sa100'],
          },
          {
            title: 'Client review and approval',
            description: 'Send draft return to client for review',
            daysBeforeDue: 14,
            priority: 'MEDIUM',
            tags: ['client-review'],
          },
          {
            title: 'Submit self assessment return',
            description: 'File approved return with HMRC',
            daysBeforeDue: 3,
            priority: 'URGENT',
            tags: ['filing', 'hmrc'],
          },
        ],
      },

      // Bookkeeping Templates
      {
        serviceKind: 'Bookkeeping',
        frequency: 'MONTHLY',
        taskTemplates: [
          {
            title: 'Collect monthly records',
            description: 'Gather invoices, receipts, and bank statements',
            daysBeforeDue: 15,
            priority: 'MEDIUM',
            tags: ['preparation', 'records'],
          },
          {
            title: 'Update bookkeeping records',
            description: 'Enter transactions and reconcile accounts',
            daysBeforeDue: 7,
            priority: 'MEDIUM',
            tags: ['processing', 'reconciliation'],
          },
          {
            title: 'Prepare monthly reports',
            description: 'Generate profit & loss and balance sheet reports',
            daysBeforeDue: 3,
            priority: 'LOW',
            tags: ['reporting'],
          },
        ],
      },

      // Management Accounts Templates
      {
        serviceKind: 'Management Accounts',
        frequency: 'MONTHLY',
        taskTemplates: [
          {
            title: 'Prepare management accounts',
            description: 'Compile monthly management accounts and KPI reports',
            daysBeforeDue: 10,
            priority: 'MEDIUM',
            tags: ['preparation', 'reporting'],
          },
          {
            title: 'Analysis and commentary',
            description: 'Prepare analysis and commentary on financial performance',
            daysBeforeDue: 5,
            priority: 'MEDIUM',
            tags: ['analysis', 'commentary'],
          },
          {
            title: 'Client presentation',
            description: 'Present management accounts to client',
            daysBeforeDue: 2,
            priority: 'LOW',
            tags: ['presentation', 'client-meeting'],
          },
        ],
      },
    ];

    for (const template of defaultTemplates) {
      try {
        // Check if template already exists
        const existing = await this.tasksService.findServiceTemplate(
          template.serviceKind, 
          template.frequency
        );
        
        if (!existing) {
          await this.tasksService.createServiceTemplate(template);
          this.logger.log(`Created default template: ${template.serviceKind} (${template.frequency})`);
        }
      } catch (error) {
        this.logger.error(`Failed to create template ${template.serviceKind} (${template.frequency}):`, error);
      }
    }
  }
}