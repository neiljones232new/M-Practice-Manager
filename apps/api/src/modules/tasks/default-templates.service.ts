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
      {
        serviceKind: 'Annual Accounts',
        appliesTo: ['Company', 'LLP'],
        frequency: 'ANNUAL',
        complianceImpact: true,
        pricingModel: 'per_period',
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
      {
        serviceKind: 'Corporation Tax Return',
        appliesTo: ['Company'],
        frequency: 'ANNUAL',
        complianceImpact: true,
        pricingModel: 'per_period',
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
      {
        serviceKind: 'Self Assessment Tax Return',
        appliesTo: ['Individual', 'Sole Trader', 'Director'],
        frequency: 'ANNUAL',
        complianceImpact: true,
        pricingModel: 'per_period',
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
      {
        serviceKind: 'VAT Returns (Quarterly)',
        appliesTo: ['Company', 'Individual'],
        frequency: 'QUARTERLY',
        complianceImpact: true,
        pricingModel: 'per_period',
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
      {
        serviceKind: 'VAT Returns (Monthly)',
        appliesTo: ['Company', 'Individual'],
        frequency: 'MONTHLY',
        complianceImpact: true,
        pricingModel: 'per_period',
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
      {
        serviceKind: 'Payroll Services',
        appliesTo: ['Company'],
        frequency: 'MONTHLY',
        complianceImpact: true,
        pricingModel: 'per_period',
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
      {
        serviceKind: 'Bookkeeping',
        appliesTo: ['Company', 'Individual'],
        frequency: 'MONTHLY',
        complianceImpact: false,
        pricingModel: 'per_period',
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
      {
        serviceKind: 'Management Accounts',
        appliesTo: ['Company'],
        frequency: 'MONTHLY',
        complianceImpact: false,
        pricingModel: 'per_period',
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
      {
        serviceKind: 'Company Secretarial',
        appliesTo: ['Company'],
        frequency: 'ANNUAL',
        complianceImpact: true,
        pricingModel: 'per_period',
        taskTemplates: [
          {
            title: 'Prepare confirmation statement',
            description: 'Draft annual confirmation statement for company.',
            daysBeforeDue: 30,
            priority: 'HIGH',
            tags: ['companies-house', 'preparation'],
          },
          {
            title: 'Client approval of confirmation',
            description: 'Send confirmation statement to client for approval.',
            daysBeforeDue: 14,
            priority: 'MEDIUM',
            tags: ['client-review'],
          },
          {
            title: 'File confirmation statement',
            description: 'Submit CS01 form to Companies House.',
            daysBeforeDue: 5,
            priority: 'URGENT',
            tags: ['filing'],
          },
        ],
      },
      {
        serviceKind: 'Tax Planning & Advisory',
        appliesTo: ['Company', 'Individual'],
        frequency: 'ANNUAL',
        complianceImpact: false,
        pricingModel: 'per_service',
        taskTemplates: [
          {
            title: 'Initial tax review',
            description: 'Review client data for current tax position.',
            daysBeforeDue: 30,
            priority: 'MEDIUM',
            tags: ['planning', 'review'],
          },
          {
            title: 'Strategy meeting',
            description: 'Conduct advisory session to discuss tax strategy.',
            daysBeforeDue: 14,
            priority: 'MEDIUM',
            tags: ['client-meeting'],
          },
          {
            title: 'Deliver tax recommendations',
            description: 'Send client tax planning recommendations.',
            daysBeforeDue: 7,
            priority: 'LOW',
            tags: ['advisory'],
          },
        ],
      },
      {
        serviceKind: 'R&D Tax Credits',
        appliesTo: ['Company'],
        frequency: 'ANNUAL',
        complianceImpact: true,
        pricingModel: 'per_service',
        taskTemplates: [
          {
            title: 'Identify R&D activities',
            description: 'Review business activities to identify R&D eligibility.',
            daysBeforeDue: 60,
            priority: 'HIGH',
            tags: ['eligibility', 'planning'],
          },
          {
            title: 'Prepare R&D claim',
            description: 'Compile R&D expenditure and prepare claim.',
            daysBeforeDue: 30,
            priority: 'HIGH',
            tags: ['preparation', 'claim'],
          },
          {
            title: 'Submit R&D claim',
            description: 'Submit R&D claim with CT600 to HMRC.',
            daysBeforeDue: 10,
            priority: 'URGENT',
            tags: ['filing', 'hmrc'],
          },
        ],
      },
      {
        serviceKind: 'Dividend Planning',
        appliesTo: ['Company', 'Director'],
        frequency: 'QUARTERLY',
        complianceImpact: false,
        pricingModel: 'per_period',
        taskTemplates: [
          {
            title: 'Assess profit availability',
            description: 'Review financials to determine dividend capacity.',
            daysBeforeDue: 15,
            priority: 'MEDIUM',
            tags: ['review'],
          },
          {
            title: 'Calculate tax impact',
            description: 'Model dividend tax liabilities for shareholders.',
            daysBeforeDue: 10,
            priority: 'MEDIUM',
            tags: ['planning'],
          },
          {
            title: 'Prepare dividend vouchers',
            description: 'Generate dividend paperwork and update records.',
            daysBeforeDue: 5,
            priority: 'HIGH',
            tags: ['documentation'],
          },
        ],
      },
      {
        serviceKind: 'Director Payroll',
        appliesTo: ['Company'],
        frequency: 'MONTHLY',
        complianceImpact: true,
        pricingModel: 'per_period',
        taskTemplates: [
          {
            title: 'Prepare director payslip',
            description: 'Run monthly payroll for directors.',
            daysBeforeDue: 5,
            priority: 'HIGH',
            tags: ['payroll'],
          },
          {
            title: 'Submit RTI',
            description: 'Submit RTI return to HMRC.',
            daysBeforeDue: 3,
            priority: 'URGENT',
            tags: ['filing', 'hmrc'],
          },
        ],
      },
      {
        serviceKind: 'Company Formation',
        appliesTo: ['Company'],
        frequency: 'ONE_OFF',
        complianceImpact: true,
        pricingModel: 'one_off',
        taskTemplates: [
          {
            title: 'Gather incorporation details',
            description: 'Collect info needed for company registration.',
            daysBeforeDue: 5,
            priority: 'HIGH',
            tags: ['setup'],
          },
          {
            title: 'Register company',
            description: 'Submit incorporation documents to Companies House.',
            daysBeforeDue: 0,
            priority: 'URGENT',
            tags: ['filing'],
          },
        ],
      },
      {
        serviceKind: 'VAT Registration / Deregistration',
        appliesTo: ['Company', 'Individual'],
        frequency: 'ONE_OFF',
        complianceImpact: true,
        pricingModel: 'one_off',
        taskTemplates: [
          {
            title: 'Collect VAT registration data',
            description: 'Gather info for VAT (de)registration.',
            daysBeforeDue: 5,
            priority: 'HIGH',
            tags: ['setup', 'vat'],
          },
          {
            title: 'Submit (de)registration to HMRC',
            description: 'Register or deregister business for VAT.',
            daysBeforeDue: 0,
            priority: 'URGENT',
            tags: ['filing', 'hmrc'],
          },
        ],
      },
      {
        serviceKind: 'CIS Registration',
        appliesTo: ['Company', 'Individual'],
        frequency: 'ONE_OFF',
        complianceImpact: true,
        pricingModel: 'one_off',
        taskTemplates: [
          {
            title: 'Collect subcontractor details',
            description: 'Prepare information for CIS registration.',
            daysBeforeDue: 3,
            priority: 'HIGH',
            tags: ['setup', 'cis'],
          },
          {
            title: 'Register for CIS',
            description: 'Submit CIS registration with HMRC.',
            daysBeforeDue: 0,
            priority: 'URGENT',
            tags: ['filing'],
          },
        ],
      },
      {
        serviceKind: 'CIS Returns',
        appliesTo: ['Company'],
        frequency: 'MONTHLY',
        complianceImpact: true,
        pricingModel: 'per_period',
        taskTemplates: [
          {
            title: 'Collect CIS records',
            description: 'Gather subcontractor payment details and verification records.',
            daysBeforeDue: 10,
            priority: 'HIGH',
            tags: ['preparation', 'cis'],
          },
          {
            title: 'Prepare CIS return',
            description: 'Compile CIS monthly return for submission.',
            daysBeforeDue: 5,
            priority: 'HIGH',
            tags: ['preparation', 'cis'],
          },
          {
            title: 'Submit CIS return',
            description: 'File CIS return with HMRC.',
            daysBeforeDue: 2,
            priority: 'URGENT',
            tags: ['filing', 'hmrc', 'cis'],
          },
        ],
      },
      {
        serviceKind: 'HMRC Enquiry / Investigation Support',
        appliesTo: ['Company', 'Individual'],
        frequency: 'ONE_OFF',
        complianceImpact: true,
        pricingModel: 'per_service',
        taskTemplates: [
          {
            title: 'Review enquiry scope',
            description: 'Assess HMRC request and identify response strategy.',
            daysBeforeDue: 2,
            priority: 'HIGH',
            tags: ['hmrc', 'review'],
          },
          {
            title: 'Collate supporting documents',
            description: 'Gather records for response to HMRC.',
            daysBeforeDue: 1,
            priority: 'URGENT',
            tags: ['documentation'],
          },
          {
            title: 'Submit response',
            description: 'Reply to HMRC with compiled documentation.',
            daysBeforeDue: 0,
            priority: 'URGENT',
            tags: ['filing'],
          },
        ],
      },
    ];

    const getLegacyKinds = (serviceKind: string, frequency: string): string[] => {
      if (serviceKind === 'VAT Returns (Quarterly)' && frequency === 'QUARTERLY') return ['VAT Returns'];
      if (serviceKind === 'VAT Returns (Monthly)' && frequency === 'MONTHLY') return ['VAT Returns'];
      if (serviceKind === 'Corporation Tax Return') return ['Corporation Tax'];
      if (serviceKind === 'Self Assessment Tax Return') return ['Self Assessment'];
      if (serviceKind === 'Payroll Services') return ['Payroll'];
      return [];
    };

    for (const template of defaultTemplates) {
      try {
        let existing = await this.tasksService.findServiceTemplate(
          template.serviceKind,
          template.frequency
        );

        if (!existing) {
          const legacyKinds = getLegacyKinds(template.serviceKind, template.frequency);
          for (const legacyKind of legacyKinds) {
            existing = await this.tasksService.findServiceTemplate(legacyKind, template.frequency);
            if (existing) break;
          }
        }

        if (!existing) {
          await this.tasksService.createServiceTemplate(template);
          this.logger.log(`Created default template: ${template.serviceKind} (${template.frequency})`);
          continue;
        }

        await this.tasksService.updateServiceTemplate(existing.id, {
          serviceKind: template.serviceKind,
          frequency: template.frequency,
          appliesTo: template.appliesTo,
          complianceImpact: template.complianceImpact,
          pricingModel: template.pricingModel,
        });
        this.logger.log(`Updated default template: ${template.serviceKind} (${template.frequency})`);
      } catch (error) {
        this.logger.error(`Failed to create template ${template.serviceKind} (${template.frequency}):`, error);
      }
    }
  }
}
