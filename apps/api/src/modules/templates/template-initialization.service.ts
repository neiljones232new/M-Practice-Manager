import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplateCategory, TemplateType, CreateTemplateDto } from './interfaces';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

interface TemplateDefinition {
  fileName: string;
  name: string;
  description: string;
  category: TemplateCategory;
  type: TemplateType;
  tags: string[];
}

@Injectable()
export class TemplateInitializationService implements OnModuleInit {
  private readonly logger = new Logger(TemplateInitializationService.name);

  constructor(private readonly templatesService: TemplatesService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.initializeTemplates();
    } catch (error) {
      this.logger.error('Template auto-initialization failed:', error);
    }
  }

  async initializeTemplates(): Promise<void> {
    try {
      this.logger.log('Starting template initialization...');

      // Define templates to import
      const templateDefinitions: TemplateDefinition[] = [
        {
          fileName: 'CT600_Cover_Letter.md',
          name: 'CT600 Cover Letter (Markdown)',
          description: 'Cover letter for CT600 Corporation Tax Return submissions to HMRC (Markdown format)',
          category: TemplateCategory.TAX,
          type: TemplateType.DOCUMENT,
          tags: ['tax', 'ct600', 'hmrc', 'corporation-tax'],
        },
        {
          fileName: 'HMRC_Chaser_Letter.md',
          name: 'HMRC Chaser Letter (Markdown)',
          description: 'Follow-up letter to chase HMRC for responses or outstanding matters (Markdown format)',
          category: TemplateCategory.HMRC,
          type: TemplateType.DOCUMENT,
          tags: ['hmrc', 'chaser', 'follow-up'],
        },
        {
          fileName: 'VAT_Return_Summary.md',
          name: 'VAT Return Summary (Markdown)',
          description: 'Summary letter for VAT return submissions (Markdown format)',
          category: TemplateCategory.VAT,
          type: TemplateType.DOCUMENT,
          tags: ['vat', 'return', 'summary'],
        },
        {
          fileName: 'Complaint_Escalation_Letter.md',
          name: 'Complaint Escalation Letter (Markdown)',
          description: 'Letter for escalating complaints to HMRC or other authorities (Markdown format)',
          category: TemplateCategory.GENERAL,
          type: TemplateType.DOCUMENT,
          tags: ['complaint', 'escalation', 'hmrc'],
        },
        {
          fileName: 'R&D_Amendment_Report.md',
          name: 'R&D Amendment Report (Markdown)',
          description: 'Report for R&D tax credit amendments and submissions (Markdown format)',
          category: TemplateCategory.TAX,
          type: TemplateType.DOCUMENT,
          tags: ['r&d', 'tax-credit', 'amendment'],
        },
        {
          fileName: 'Task_Tracker.md',
          name: 'Task Tracker (Markdown)',
          description: 'Document for tracking client tasks and deliverables (Markdown format)',
          category: TemplateCategory.GENERAL,
          type: TemplateType.DOCUMENT,
          tags: ['task', 'tracker', 'deliverables'],
        },
        // New MDJ-Branded Handlebars Templates
        {
          fileName: 'client-onboarding-welcome.md',
          name: 'Client Onboarding Welcome Letter',
          description: 'Professional welcome letter for new clients with service overview and next steps',
          category: TemplateCategory.CLIENT,
          type: TemplateType.DOCUMENT,
          tags: ['client', 'onboarding', 'welcome', 'handlebars', 'mdj-branded'],
        },
        {
          fileName: 'annual-review-letter.md',
          name: 'Annual Review Letter',
          description: 'Year-end service summary with fees, compliance achievements, and recommendations',
          category: TemplateCategory.CLIENT,
          type: TemplateType.DOCUMENT,
          tags: ['client', 'annual-review', 'fees', 'handlebars', 'mdj-branded'],
        },
        {
          fileName: 'deadline-reminder.md',
          name: 'Deadline Reminder Letter',
          description: 'Urgent deadline alerts with required documents, penalties, and action steps',
          category: TemplateCategory.COMPLIANCE,
          type: TemplateType.DOCUMENT,
          tags: ['deadline', 'reminder', 'compliance', 'urgent', 'handlebars', 'mdj-branded'],
        },
        {
          fileName: 'service-proposal.md',
          name: 'Service Proposal Letter',
          description: 'Professional proposal for additional services with benefits, pricing, and implementation plan',
          category: TemplateCategory.CLIENT,
          type: TemplateType.DOCUMENT,
          tags: ['service', 'proposal', 'upsell', 'pricing', 'handlebars', 'mdj-branded'],
        },
      ];

      // Check if templates already exist
      const existingTemplates = await this.templatesService.getTemplates();
      if (existingTemplates.length > 0) {
        this.logger.log(`Templates already initialized (${existingTemplates.length} templates found)`);
        await this.ensureAccountancyServiceTemplates(existingTemplates);
        return;
      }

      // Copy templates from source directory
      const cwd = process.cwd();
      const repoRoot = cwd.endsWith(path.join('apps', 'api')) ? path.resolve(cwd, '..', '..') : cwd;
      const sourceCandidates = [
        path.join(repoRoot, 'MDJ_Template_Pack_Branded'),
        path.join(repoRoot, 'apps', 'api', 'MDJ_Template_Pack_Branded'),
      ];
      const sourceDir = sourceCandidates.find((candidate) => existsSync(candidate)) ?? sourceCandidates[0];
      if (!existsSync(sourceDir)) {
        this.logger.warn(`Source template directory not found: ${sourceDir}`);
        await this.seedFallbackTemplates();
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const templateDef of templateDefinitions) {
        try {
          const sourcePath = path.join(sourceDir, templateDef.fileName);

          if (!existsSync(sourcePath)) {
            this.logger.warn(`Template file not found: ${templateDef.fileName}`);
            errorCount++;
            continue;
          }

          if (!templateDef.fileName.toLowerCase().endsWith('.md')) {
            this.logger.warn(`Skipping non-Markdown template: ${templateDef.fileName}`);
            continue;
          }

          const content = await fs.readFile(sourcePath, 'utf8');

          // Create template metadata
          const createDto: CreateTemplateDto = {
            name: templateDef.name,
            description: templateDef.description,
            category: templateDef.category,
            type: templateDef.type,
            content,
            placeholders: [], // Will be populated by parser service later
            createdById: undefined,
            metadata: {
              tags: templateDef.tags,
              author: 'MDJ Consultants',
              usageCount: 0,
            },
          };

          await this.templatesService.createTemplate(createDto);
          successCount++;

          this.logger.log(`Initialized template: ${templateDef.name}`);
        } catch (error) {
          this.logger.error(`Failed to initialize template ${templateDef.fileName}:`, error);
          errorCount++;
        }
      }

      this.logger.log(
        `Template initialization complete: ${successCount} successful, ${errorCount} errors`,
      );

      // Ensure first-run environments always have at least a small usable set.
      if (successCount === 0) {
        await this.seedFallbackTemplates();
      }
      await this.ensureAccountancyServiceTemplates();
    } catch (error) {
      this.logger.error('Failed to initialize templates:', error);
      throw error;
    }
  }

  private buildA4Template(title: string, subtitle: string, body: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 16mm 12mm 16mm 12mm; }
    body { font-family: Arial, sans-serif; margin: 0; color: #111827; line-height: 1.55; }
    .title { font-size: 28px; font-weight: 700; margin: 0; color: #0f1f52; }
    .subtitle { margin: 6px 0 0 0; color: #475569; font-size: 14px; }
    .block { margin: 18px 0; padding: 14px; border: 1px solid #dbe5f4; border-radius: 8px; background: #f8fbff; }
    .section { margin-top: 24px; font-size: 18px; font-weight: 700; color: #0f1f52; border-left: 4px solid #0f1f52; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #dbe5f4; padding: 9px; text-align: left; font-size: 13px; }
    th { background: #eef4ff; color: #0f1f52; }
  </style>
</head>
<body>
  <h1 class="title">${title}</h1>
  <p class="subtitle">${subtitle}</p>
  ${body}
</body>
</html>`;
  }

  private getAccountancyTemplatePack(): CreateTemplateDto[] {
    const pack: Array<{
      name: string;
      description: string;
      category: TemplateCategory;
      tags: string[];
      placeholders: any[];
      body: string;
    }> = [
      {
        name: 'Annual Accounts Approval Pack',
        description: 'Cover and approval letter for annual accounts sign-off.',
        category: TemplateCategory.COMPLIANCE,
        tags: ['accounts', 'annual-accounts', 'approval'],
        placeholders: [
          { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT' },
          { key: 'companyNumber', label: 'Company Number', type: 'TEXT', required: false, source: 'CLIENT' },
          { key: 'yearEnd', label: 'Year End', type: 'DATE', required: false, source: 'CLIENT' },
          { key: 'currentDate', label: 'Date', type: 'DATE', required: true, source: 'SYSTEM' },
        ],
        body: `
          <p>Date: {{currentDate}}</p>
          <p>Dear {{clientName}},</p>
          <div class="block">
            Please review and approve your annual accounts for the period ending <strong>{{yearEnd}}</strong>.
            Company number: <strong>{{companyNumber}}</strong>.
          </div>
          <h2 class="section">Approval Checklist</h2>
          <table><tr><th>Item</th><th>Status</th></tr>
            <tr><td>Directors' report reviewed</td><td>Pending</td></tr>
            <tr><td>Financial statements approved</td><td>Pending</td></tr>
            <tr><td>Submission authority confirmed</td><td>Pending</td></tr>
          </table>
          <p>Kind regards,<br>{{practiceName}}</p>`,
      },
      {
        name: 'Corporation Tax Return Cover Letter',
        description: 'CT600 submission summary and client confirmation request.',
        category: TemplateCategory.TAX,
        tags: ['ct600', 'corporation-tax', 'submission'],
        placeholders: [
          { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT' },
          { key: 'utrNumber', label: 'UTR', type: 'TEXT', required: false, source: 'CLIENT' },
          { key: 'currentDate', label: 'Date', type: 'DATE', required: true, source: 'SYSTEM' },
        ],
        body: `<p>Date: {{currentDate}}</p><p>Dear {{clientName}},</p>
          <div class="block">Your Corporation Tax Return (CT600) has been prepared and is ready for submission. UTR: <strong>{{utrNumber}}</strong>.</div>
          <h2 class="section">Before Submission</h2>
          <ul><li>Confirm final taxable profit.</li><li>Confirm relief claims included are complete.</li><li>Approve electronic filing to HMRC.</li></ul>
          <p>Kind regards,<br>{{practiceName}}</p>`,
      },
      {
        name: 'VAT Return Submission Notice',
        description: 'VAT filing confirmation and payment instruction notice.',
        category: TemplateCategory.VAT,
        tags: ['vat', 'mtd', 'submission'],
        placeholders: [
          { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT' },
          { key: 'vatNumber', label: 'VAT Number', type: 'TEXT', required: false, source: 'CLIENT' },
          { key: 'dueDate', label: 'Due Date', type: 'DATE', required: false, source: 'SERVICE' },
          { key: 'currentDate', label: 'Date', type: 'DATE', required: true, source: 'SYSTEM' },
        ],
        body: `<p>Date: {{currentDate}}</p><p>Dear {{clientName}},</p>
          <div class="block">Your VAT return has been prepared under MTD. VAT number: <strong>{{vatNumber}}</strong>. Filing/payment deadline: <strong>{{dueDate}}</strong>.</div>
          <h2 class="section">Actions Required</h2>
          <ul><li>Approve return values.</li><li>Ensure funds are available for HMRC collection.</li><li>Notify us of any late purchase/sales adjustments.</li></ul>
          <p>Kind regards,<br>{{practiceName}}</p>`,
      },
      {
        name: 'Payroll Year-End Client Instructions',
        description: 'Client instruction pack for payroll year-end tasks.',
        category: TemplateCategory.COMPLIANCE,
        tags: ['payroll', 'p60', 'year-end'],
        placeholders: [
          { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT' },
          { key: 'payeReference', label: 'PAYE Ref', type: 'TEXT', required: false, source: 'CLIENT' },
          { key: 'currentDate', label: 'Date', type: 'DATE', required: true, source: 'SYSTEM' },
        ],
        body: `<p>Date: {{currentDate}}</p><p>Dear {{clientName}},</p>
          <div class="block">Payroll year-end has started. PAYE reference: <strong>{{payeReference}}</strong>.</div>
          <h2 class="section">Required Information</h2>
          <ul><li>Final pay run confirmation.</li><li>Benefits and expenses records.</li><li>Starter/leaver verification.</li></ul>
          <p>Kind regards,<br>{{practiceName}}</p>`,
      },
      {
        name: 'Bookkeeping Records Request',
        description: 'Monthly/quarterly bookkeeping records chase.',
        category: TemplateCategory.CLIENT,
        tags: ['bookkeeping', 'records', 'monthly'],
        placeholders: [
          { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT' },
          { key: 'serviceName', label: 'Service Name', type: 'TEXT', required: false, source: 'SERVICE' },
          { key: 'dueDate', label: 'Due Date', type: 'DATE', required: false, source: 'SERVICE' },
        ],
        body: `<p>Dear {{clientName}},</p>
          <div class="block">Please send your bookkeeping records for <strong>{{serviceName}}</strong> by <strong>{{dueDate}}</strong>.</div>
          <h2 class="section">Required Items</h2>
          <ul><li>Bank statements.</li><li>Sales invoices and credit notes.</li><li>Purchase invoices and receipts.</li><li>Payroll summaries.</li></ul>
          <p>Kind regards,<br>{{practiceName}}</p>`,
      },
      {
        name: 'Self Assessment Tax Return Request',
        description: 'Information request and timeline for SA100 preparation.',
        category: TemplateCategory.TAX,
        tags: ['self-assessment', 'sa100', 'tax-return'],
        placeholders: [
          { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT' },
          { key: 'clientIdentifier', label: 'Client Identifier', type: 'TEXT', required: false, source: 'CLIENT' },
          { key: 'currentDate', label: 'Date', type: 'DATE', required: true, source: 'SYSTEM' },
        ],
        body: `<p>Date: {{currentDate}}</p><p>Dear {{clientName}},</p>
          <div class="block">We are preparing your Self Assessment Tax Return. Client reference: <strong>{{clientIdentifier}}</strong>.</div>
          <h2 class="section">Please Provide</h2>
          <ul><li>Employment/P60/P11D information.</li><li>Dividend and bank interest statements.</li><li>Property and other income details.</li><li>Relief and pension contribution evidence.</li></ul>
          <p>Kind regards,<br>{{practiceName}}</p>`,
      },
      {
        name: 'Company Secretarial Confirmation Statement Letter',
        description: 'CS01 data check and filing authority request.',
        category: TemplateCategory.COMPLIANCE,
        tags: ['cs01', 'confirmation-statement', 'companies-house'],
        placeholders: [
          { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT' },
          { key: 'companyNumber', label: 'Company Number', type: 'TEXT', required: false, source: 'CLIENT' },
          { key: 'dueDate', label: 'Due Date', type: 'DATE', required: false, source: 'SERVICE' },
        ],
        body: `<p>Dear {{clientName}},</p>
          <div class="block">Your Confirmation Statement (CS01) is due by <strong>{{dueDate}}</strong> for company <strong>{{companyNumber}}</strong>.</div>
          <h2 class="section">Data to Confirm</h2>
          <ul><li>Registered office and SIC codes.</li><li>PSC details.</li><li>Share capital and shareholders.</li><li>Director details and service addresses.</li></ul>
          <p>Kind regards,<br>{{practiceName}}</p>`,
      },
      {
        name: 'R&D Tax Relief Information Request',
        description: 'Checklist and narrative request for R&D claim support.',
        category: TemplateCategory.TAX,
        tags: ['r&d', 'tax-relief', 'claim'],
        placeholders: [
          { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT' },
          { key: 'companyName', label: 'Company Name', type: 'TEXT', required: false, source: 'CLIENT' },
          { key: 'currentDate', label: 'Date', type: 'DATE', required: true, source: 'SYSTEM' },
        ],
        body: `<p>Date: {{currentDate}}</p><p>Dear {{clientName}},</p>
          <div class="block">We are preparing an R&D tax relief claim for <strong>{{companyName}}</strong>. Please provide project and cost evidence.</div>
          <h2 class="section">Evidence Required</h2>
          <ul><li>Project technical narratives.</li><li>Staffing and subcontractor cost schedules.</li><li>Consumables/software costs.</li><li>Apportionment methodology.</li></ul>
          <p>Kind regards,<br>{{practiceName}}</p>`,
      },
    ];

    return pack.map((item) => ({
      name: item.name,
      description: item.description,
      category: item.category,
      type: TemplateType.DOCUMENT,
      content: this.buildA4Template(item.name, 'Accountancy Service Letter', item.body),
      placeholders: item.placeholders,
      createdById: undefined,
      metadata: {
        tags: Array.from(new Set([...item.tags, 'accountancy'])),
        author: 'M Practice Manager',
        usageCount: 0,
        notes: 'Accountancy service template with A4-ready HTML layout.',
      },
    }));
  }

  private async ensureAccountancyServiceTemplates(existingTemplates?: any[]): Promise<void> {
    const all = existingTemplates ?? (await this.templatesService.getTemplates());
    const byName = new Map(all.map((t: any) => [String(t.name).toLowerCase(), t]));
    const pack = this.getAccountancyTemplatePack();

    let created = 0;
    let updated = 0;

    for (const template of pack) {
      const existing = byName.get(template.name.toLowerCase());
      try {
        if (!existing) {
          await this.templatesService.createTemplate(template);
          created += 1;
          continue;
        }

        const shouldUpgrade =
          !existing?.metadata?.tags?.includes('accountancy') &&
          !String(existing?.metadata?.notes || '').includes('A4-ready HTML');
        if (shouldUpgrade) {
          await this.templatesService.updateTemplate(existing.id, {
            description: template.description,
            category: template.category,
            type: template.type,
            content: template.content,
            placeholders: template.placeholders,
            metadata: {
              ...(existing.metadata || {}),
              ...(template.metadata || {}),
              tags: Array.from(new Set([...(existing.metadata?.tags || []), ...((template.metadata as any)?.tags || []), 'accountancy'])),
            },
          }, 'system');
          updated += 1;
        }
      } catch (error) {
        this.logger.warn(`Accountancy template ensure failed for ${template.name}`);
      }
    }

    this.logger.log(`Accountancy templates ensured: created=${created}, updated=${updated}`);
  }

  private async seedFallbackTemplates(): Promise<void> {
    const fallback: CreateTemplateDto[] = [
      {
        name: 'General Client Update',
        description: 'Simple reusable client update letter.',
        category: TemplateCategory.CLIENT,
        type: TemplateType.DOCUMENT,
        content:
          '# {{practiceName}}\n\nDate: {{currentDate}}\n\nDear {{clientName}},\n\nWe are writing to provide an update on your account.\n\nKind regards,\n{{senderName}}',
        placeholders: [],
        createdById: undefined,
        metadata: { tags: ['client', 'general', 'fallback'], author: 'system', usageCount: 0 },
      },
      {
        name: 'Deadline Reminder',
        description: 'Simple deadline reminder for compliance milestones.',
        category: TemplateCategory.COMPLIANCE,
        type: TemplateType.DOCUMENT,
        content:
          '# Deadline Reminder\n\nDate: {{currentDate}}\n\nDear {{clientName}},\n\nThis is a reminder that {{deadlineType}} is due on {{deadlineDate}}.\n\nPlease contact us if you need support.\n\nKind regards,\n{{senderName}}',
        placeholders: [],
        createdById: undefined,
        metadata: { tags: ['deadline', 'compliance', 'fallback'], author: 'system', usageCount: 0 },
      },
    ];

    for (const item of fallback) {
      try {
        await this.templatesService.createTemplate(item);
      } catch (error) {
        this.logger.warn(`Failed fallback template seed: ${item.name}`);
      }
    }
    this.logger.log('Fallback templates seeded');
  }

  async reinitializeTemplates(force: boolean = false): Promise<void> {
    if (!force) {
      const existingTemplates = await this.templatesService.getTemplates();
      if (existingTemplates.length > 0) {
        throw new Error(
          'Templates already exist. Use force=true to reinitialize and overwrite existing templates.',
        );
      }
    }

    await this.initializeTemplates();
  }
}
