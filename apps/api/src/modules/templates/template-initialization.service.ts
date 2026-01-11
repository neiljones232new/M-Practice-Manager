import { Injectable, Logger } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplateCategory, CreateTemplateDto } from './interfaces';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

interface TemplateDefinition {
  fileName: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fileFormat: 'DOCX' | 'MD';
  tags: string[];
}

@Injectable()
export class TemplateInitializationService {
  private readonly logger = new Logger(TemplateInitializationService.name);

  constructor(private readonly templatesService: TemplatesService) {}

  async initializeTemplates(): Promise<void> {
    try {
      this.logger.log('Starting template initialization...');

      // Define templates to import
      const templateDefinitions: TemplateDefinition[] = [
        {
          fileName: 'CT600_Cover_Letter.docx',
          name: 'CT600 Cover Letter',
          description: 'Cover letter for CT600 Corporation Tax Return submissions to HMRC',
          category: TemplateCategory.TAX,
          fileFormat: 'DOCX',
          tags: ['tax', 'ct600', 'hmrc', 'corporation-tax'],
        },
        {
          fileName: 'CT600_Cover_Letter.md',
          name: 'CT600 Cover Letter (Markdown)',
          description: 'Cover letter for CT600 Corporation Tax Return submissions to HMRC (Markdown format)',
          category: TemplateCategory.TAX,
          fileFormat: 'MD',
          tags: ['tax', 'ct600', 'hmrc', 'corporation-tax'],
        },
        {
          fileName: 'HMRC_Chaser_Letter.docx',
          name: 'HMRC Chaser Letter',
          description: 'Follow-up letter to chase HMRC for responses or outstanding matters',
          category: TemplateCategory.HMRC,
          fileFormat: 'DOCX',
          tags: ['hmrc', 'chaser', 'follow-up'],
        },
        {
          fileName: 'HMRC_Chaser_Letter.md',
          name: 'HMRC Chaser Letter (Markdown)',
          description: 'Follow-up letter to chase HMRC for responses or outstanding matters (Markdown format)',
          category: TemplateCategory.HMRC,
          fileFormat: 'MD',
          tags: ['hmrc', 'chaser', 'follow-up'],
        },
        {
          fileName: 'VAT_Return_Summary.docx',
          name: 'VAT Return Summary',
          description: 'Summary letter for VAT return submissions',
          category: TemplateCategory.VAT,
          fileFormat: 'DOCX',
          tags: ['vat', 'return', 'summary'],
        },
        {
          fileName: 'VAT_Return_Summary.md',
          name: 'VAT Return Summary (Markdown)',
          description: 'Summary letter for VAT return submissions (Markdown format)',
          category: TemplateCategory.VAT,
          fileFormat: 'MD',
          tags: ['vat', 'return', 'summary'],
        },
        {
          fileName: 'Complaint_Escalation_Letter.docx',
          name: 'Complaint Escalation Letter',
          description: 'Letter for escalating complaints to HMRC or other authorities',
          category: TemplateCategory.GENERAL,
          fileFormat: 'DOCX',
          tags: ['complaint', 'escalation', 'hmrc'],
        },
        {
          fileName: 'Complaint_Escalation_Letter.md',
          name: 'Complaint Escalation Letter (Markdown)',
          description: 'Letter for escalating complaints to HMRC or other authorities (Markdown format)',
          category: TemplateCategory.GENERAL,
          fileFormat: 'MD',
          tags: ['complaint', 'escalation', 'hmrc'],
        },
        {
          fileName: 'R&D_Amendment_Report.docx',
          name: 'R&D Amendment Report',
          description: 'Report for R&D tax credit amendments and submissions',
          category: TemplateCategory.TAX,
          fileFormat: 'DOCX',
          tags: ['r&d', 'tax-credit', 'amendment'],
        },
        {
          fileName: 'R&D_Amendment_Report.md',
          name: 'R&D Amendment Report (Markdown)',
          description: 'Report for R&D tax credit amendments and submissions (Markdown format)',
          category: TemplateCategory.TAX,
          fileFormat: 'MD',
          tags: ['r&d', 'tax-credit', 'amendment'],
        },
        {
          fileName: 'Task_Tracker.docx',
          name: 'Task Tracker',
          description: 'Document for tracking client tasks and deliverables',
          category: TemplateCategory.GENERAL,
          fileFormat: 'DOCX',
          tags: ['task', 'tracker', 'deliverables'],
        },
        {
          fileName: 'Task_Tracker.md',
          name: 'Task Tracker (Markdown)',
          description: 'Document for tracking client tasks and deliverables (Markdown format)',
          category: TemplateCategory.GENERAL,
          fileFormat: 'MD',
          tags: ['task', 'tracker', 'deliverables'],
        },
        // New MDJ-Branded Handlebars Templates
        {
          fileName: 'client-onboarding-welcome.md',
          name: 'Client Onboarding Welcome Letter',
          description: 'Professional welcome letter for new clients with service overview and next steps',
          category: TemplateCategory.CLIENT,
          fileFormat: 'MD',
          tags: ['client', 'onboarding', 'welcome', 'handlebars', 'mdj-branded'],
        },
        {
          fileName: 'annual-review-letter.md',
          name: 'Annual Review Letter',
          description: 'Year-end service summary with fees, compliance achievements, and recommendations',
          category: TemplateCategory.CLIENT,
          fileFormat: 'MD',
          tags: ['client', 'annual-review', 'fees', 'handlebars', 'mdj-branded'],
        },
        {
          fileName: 'deadline-reminder.md',
          name: 'Deadline Reminder Letter',
          description: 'Urgent deadline alerts with required documents, penalties, and action steps',
          category: TemplateCategory.COMPLIANCE,
          fileFormat: 'MD',
          tags: ['deadline', 'reminder', 'compliance', 'urgent', 'handlebars', 'mdj-branded'],
        },
        {
          fileName: 'service-proposal.md',
          name: 'Service Proposal Letter',
          description: 'Professional proposal for additional services with benefits, pricing, and implementation plan',
          category: TemplateCategory.CLIENT,
          fileFormat: 'MD',
          tags: ['service', 'proposal', 'upsell', 'pricing', 'handlebars', 'mdj-branded'],
        },
      ];

      // Check if templates already exist
      const existingTemplates = await this.templatesService.getTemplates();
      if (existingTemplates.length > 0) {
        this.logger.log(`Templates already initialized (${existingTemplates.length} templates found)`);
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
      const storagePath = this.templatesService['fileStorageService']['storagePath'];
      const targetDir = path.join(storagePath, 'templates/files');

      if (!existsSync(sourceDir)) {
        this.logger.warn(`Source template directory not found: ${sourceDir}`);
        return;
      }

      // Ensure target directory exists
      if (!existsSync(targetDir)) {
        await fs.mkdir(targetDir, { recursive: true });
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

          // Copy file to storage
          const targetPath = path.join(targetDir, templateDef.fileName);
          await fs.copyFile(sourcePath, targetPath);

          // Create template metadata
          const createDto: CreateTemplateDto = {
            name: templateDef.name,
            description: templateDef.description,
            category: templateDef.category,
            fileName: templateDef.fileName,
            fileFormat: templateDef.fileFormat,
            placeholders: [], // Will be populated by parser service later
            isActive: true,
            createdBy: 'system',
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
    } catch (error) {
      this.logger.error('Failed to initialize templates:', error);
      throw error;
    }
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
