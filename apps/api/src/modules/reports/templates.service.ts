import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  placeholders: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}

export interface TemplateInput {
  name: string;
  category: string;
  content: string;
  placeholders?: string[];
}

export type TemplateCategory = 
  | 'client_pack'
  | 'tax_strategy'
  | 'company_profile'
  | 'salary_report'
  | 'recommendations'
  | 'general';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly templatesPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    const storagePath = this.configService.get<string>('STORAGE_PATH') || '../../storage';
    this.templatesPath = path.join(storagePath, 'templates');
    this.ensureTemplatesDirectory();
    this.initializeDefaultTemplates();
  }

  private async ensureTemplatesDirectory(): Promise<void> {
    try {
      if (!existsSync(this.templatesPath)) {
        await fs.mkdir(this.templatesPath, { recursive: true });
      }
    } catch (error) {
      this.logger.error('Failed to create templates directory:', error);
    }
  }

  private async initializeDefaultTemplates(): Promise<void> {
    try {
      // Check if default templates already exist
      const templatesFile = path.join(this.templatesPath, 'templates.json');
      if (existsSync(templatesFile)) {
        return; // Templates already initialized
      }

      // Create default templates
      const defaultTemplates: ReportTemplate[] = [
        {
          id: 'default-client-pack',
          name: 'Default Client Pack',
          category: 'client_pack',
          content: this.getDefaultClientPackTemplate(),
          placeholders: ['client.companyName', 'client.companyNumber', 'client.status', 'calculations'],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'default-tax-strategy',
          name: 'Default Tax Strategy Report',
          category: 'tax_strategy',
          content: this.getDefaultTaxStrategyTemplate(),
          placeholders: ['client.companyName', 'calculations', 'scenarios', 'recommendations'],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'default-company-profile',
          name: 'Default Company Profile',
          category: 'company_profile',
          content: this.getDefaultCompanyProfileTemplate(),
          placeholders: ['client.companyName', 'client.companyNumber', 'client.registeredAddress'],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await fs.writeFile(templatesFile, JSON.stringify(defaultTemplates, null, 2));
      this.logger.log('Default templates initialized');
    } catch (error) {
      this.logger.error('Failed to initialize default templates:', error);
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(input: TemplateInput): Promise<string> {
    try {
      const id = uuidv4();
      const placeholders = input.placeholders || this.extractPlaceholders(input.content);
      
      const template: ReportTemplate = {
        id,
        name: input.name,
        category: input.category,
        content: input.content,
        placeholders,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.saveTemplate(template);
      this.logger.log(`Created template: ${template.name} (${id})`);
      return id;
    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, updates: Partial<TemplateInput>): Promise<void> {
    try {
      const template = await this.getTemplate(id);
      if (!template) {
        throw new NotFoundException(`Template ${id} not found`);
      }

      const updatedTemplate: ReportTemplate = {
        ...template,
        ...updates,
        placeholders: updates.content ? this.extractPlaceholders(updates.content) : template.placeholders,
        version: template.version + 1,
        updatedAt: new Date(),
      };

      await this.saveTemplate(updatedTemplate);
      this.logger.log(`Updated template: ${updatedTemplate.name} (${id})`);
    } catch (error) {
      this.logger.error(`Failed to update template ${id}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: string): Promise<ReportTemplate | null> {
    try {
      const templates = await this.loadTemplates();
      return templates.find(t => t.id === id) || null;
    } catch (error) {
      this.logger.error(`Failed to get template ${id}: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Get all templates, optionally filtered by category
   */
  async getAllTemplates(category?: string): Promise<ReportTemplate[]> {
    try {
      const templates = await this.loadTemplates();
      return category ? templates.filter(t => t.category === category) : templates;
    } catch (error) {
      this.logger.error(`Failed to get templates: ${error.message}`, error);
      return [];
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      const templates = await this.loadTemplates();
      const filteredTemplates = templates.filter(t => t.id !== id);
      
      if (filteredTemplates.length === templates.length) {
        throw new NotFoundException(`Template ${id} not found`);
      }

      await this.saveTemplates(filteredTemplates);
      this.logger.log(`Deleted template: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete template ${id}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Render a template with provided data
   */
  async renderTemplate(templateId: string, data: Record<string, any>): Promise<string> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new NotFoundException(`Template ${templateId} not found`);
      }

      // Update last used timestamp
      template.lastUsed = new Date();
      await this.saveTemplate(template);

      return this.replacePlaceholders(template.content, data);
    } catch (error) {
      this.logger.error(`Failed to render template ${templateId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Preview template rendering without saving
   */
  async previewTemplate(content: string, data: Record<string, any>): Promise<string> {
    return this.replacePlaceholders(content, data);
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<{
    usageCount: number;
    lastUsed: Date | null;
  }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        return { usageCount: 0, lastUsed: null };
      }

      // For now, we don't track usage count in the database
      // This could be enhanced to track actual usage
      return {
        usageCount: 0,
        lastUsed: template.lastUsed || null,
      };
    } catch (error) {
      this.logger.error(`Failed to get template stats for ${templateId}: ${error.message}`, error);
      return { usageCount: 0, lastUsed: null };
    }
  }

  /**
   * Load templates from file
   */
  private async loadTemplates(): Promise<ReportTemplate[]> {
    try {
      const templatesFile = path.join(this.templatesPath, 'templates.json');
      if (!existsSync(templatesFile)) {
        return [];
      }

      const content = await fs.readFile(templatesFile, 'utf8');
      const templates = JSON.parse(content);
      
      // Convert date strings back to Date objects
      return templates.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        lastUsed: t.lastUsed ? new Date(t.lastUsed) : undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to load templates:', error);
      return [];
    }
  }

  /**
   * Save templates to file
   */
  private async saveTemplates(templates: ReportTemplate[]): Promise<void> {
    try {
      const templatesFile = path.join(this.templatesPath, 'templates.json');
      await fs.writeFile(templatesFile, JSON.stringify(templates, null, 2));
    } catch (error) {
      this.logger.error('Failed to save templates:', error);
      throw error;
    }
  }

  /**
   * Save a single template
   */
  private async saveTemplate(template: ReportTemplate): Promise<void> {
    try {
      const templates = await this.loadTemplates();
      const existingIndex = templates.findIndex(t => t.id === template.id);
      
      if (existingIndex >= 0) {
        templates[existingIndex] = template;
      } else {
        templates.push(template);
      }

      await this.saveTemplates(templates);
    } catch (error) {
      this.logger.error('Failed to save template:', error);
      throw error;
    }
  }

  /**
   * Extract placeholders from template content
   */
  private extractPlaceholders(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const placeholders = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      placeholders.add(match[1].trim());
    }

    return Array.from(placeholders);
  }

  /**
   * Replace placeholders in content with actual values
   */
  private replacePlaceholders(content: string, data: Record<string, any>): string {
    return content.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
      const key = placeholder.trim();
      const value = this.getNestedValue(data, key);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Default client pack template
   */
  private getDefaultClientPackTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Client Pack - {{client.companyName}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .section { margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { padding: 10px; background: #f9fafb; border-radius: 4px; }
    .label { font-weight: bold; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Client Pack</h1>
    <p>{{client.companyName}}</p>
  </div>
  
  <div class="section">
    <h2>Company Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="label">Company Name</div>
        <div>{{client.companyName}}</div>
      </div>
      <div class="info-item">
        <div class="label">Company Number</div>
        <div>{{client.companyNumber}}</div>
      </div>
      <div class="info-item">
        <div class="label">Status</div>
        <div>{{client.status}}</div>
      </div>
      <div class="info-item">
        <div class="label">Client Manager</div>
        <div>{{client.clientManager}}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Default tax strategy template
   */
  private getDefaultTaxStrategyTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Tax Strategy - {{client.companyName}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .section { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Tax Strategy Report</h1>
    <p>{{client.companyName}}</p>
  </div>
  
  <div class="section">
    <h2>Tax Calculations</h2>
    <p>This report contains detailed tax strategy analysis for {{client.companyName}}.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Default company profile template
   */
  private getDefaultCompanyProfileTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Company Profile - {{client.companyName}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .section { margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { padding: 10px; background: #f9fafb; border-radius: 4px; }
    .label { font-weight: bold; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Company Profile</h1>
    <p>{{client.companyName}}</p>
  </div>
  
  <div class="section">
    <h2>Company Details</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="label">Company Name</div>
        <div>{{client.companyName}}</div>
      </div>
      <div class="info-item">
        <div class="label">Company Number</div>
        <div>{{client.companyNumber}}</div>
      </div>
      <div class="info-item">
        <div class="label">Status</div>
        <div>{{client.status}}</div>
      </div>
      <div class="info-item">
        <div class="label">Registered Address</div>
        <div>{{client.registeredAddress}}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }
}