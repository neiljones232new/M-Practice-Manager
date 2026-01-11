import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { AuditService } from '../audit/audit.service';
import { TemplateErrorHandlerService } from './template-error-handler.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as crypto from 'crypto';
import {
  Template,
  TemplateFilters,
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateCategory,
} from './interfaces';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly STORAGE_CATEGORY = 'templates';
  private readonly TEMPLATE_FILES_DIR = 'templates/files';
  private readonly TEMPLATE_METADATA_DIR = 'templates/metadata';

  constructor(
    private readonly fileStorageService: FileStorageService,
    private readonly auditService: AuditService,
    private readonly errorHandler: TemplateErrorHandlerService,
  ) {
    this.initializeTemplateStorage();
  }

  private async initializeTemplateStorage() {
    try {
      const storagePath = this.fileStorageService['storagePath'];
      const filesDir = path.join(storagePath, this.TEMPLATE_FILES_DIR);
      const metadataDir = path.join(storagePath, this.TEMPLATE_METADATA_DIR);

      if (!existsSync(filesDir)) {
        await fs.mkdir(filesDir, { recursive: true });
        this.logger.log(`Created template files directory: ${filesDir}`);
      }

      if (!existsSync(metadataDir)) {
        await fs.mkdir(metadataDir, { recursive: true });
        this.logger.log(`Created template metadata directory: ${metadataDir}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize template storage:', error);
    }
  }

  async getTemplates(filters?: TemplateFilters): Promise<Template[]> {
    try {
      const storagePath = this.fileStorageService['storagePath'];
      const metadataDir = path.join(storagePath, this.TEMPLATE_METADATA_DIR);

      if (!existsSync(metadataDir)) {
        return [];
      }

      const files = await fs.readdir(metadataDir);
      const templates: Template[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(metadataDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const template = JSON.parse(content) as Template;

          // Apply filters
          if (this.matchesFilters(template, filters)) {
            templates.push(template);
          }
        }
      }

      // Sort by name
      templates.sort((a, b) => a.name.localeCompare(b.name));

      return templates;
    } catch (error) {
      this.logger.error('Failed to get templates:', error);
      throw error;
    }
  }

  async getTemplate(id: string): Promise<Template> {
    try {
      const storagePath = this.fileStorageService['storagePath'];
      const metadataPath = path.join(storagePath, this.TEMPLATE_METADATA_DIR, `${id}.json`);

      if (!existsSync(metadataPath)) {
        this.errorHandler.handleTemplateNotFound(id);
      }

      const content = await fs.readFile(metadataPath, 'utf8');
      const template = JSON.parse(content) as Template;

      return template;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get template ${id}:`, error);
      this.errorHandler.handleGenericError('retrieving template', error as Error, { templateId: id });
    }
  }

  async createTemplate(dto: CreateTemplateDto): Promise<Template> {
    try {
      const id = this.generateTemplateId();
      const storagePath = this.fileStorageService['storagePath'];

      // Create template metadata
      const template: Template = {
        id,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        fileName: dto.fileName,
        filePath: path.join(this.TEMPLATE_FILES_DIR, dto.fileName),
        fileFormat: dto.fileFormat,
        placeholders: dto.placeholders || [],
        version: 1,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: dto.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: dto.metadata || {},
      };

      // Save metadata
      const metadataPath = path.join(storagePath, this.TEMPLATE_METADATA_DIR, `${id}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(template, null, 2), 'utf8');

      this.logger.log(`Created template: ${template.name} (${id})`);

      // Audit log
      await this.auditService.logEvent({
        actor: dto.createdBy,
        actorType: 'USER',
        action: 'CREATE_TEMPLATE',
        entity: 'TEMPLATE',
        entityId: id,
        entityRef: template.name,
        metadata: {
          category: template.category,
          fileFormat: template.fileFormat,
          placeholderCount: template.placeholders.length,
        },
        severity: 'MEDIUM',
        category: 'DATA',
      });

      return template;
    } catch (error) {
      this.logger.error('Failed to create template:', error);
      this.errorHandler.handleTemplateUploadError(error as Error, dto.fileName);
    }
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string = 'system'): Promise<Template> {
    try {
      const template = await this.getTemplate(id);
      const storagePath = this.fileStorageService['storagePath'];

      // Create version history entry before updating
      await this.createVersionHistory(template);

      // Update template fields
      const updatedTemplate: Template = {
        ...template,
        name: dto.name !== undefined ? dto.name : template.name,
        description: dto.description !== undefined ? dto.description : template.description,
        category: dto.category !== undefined ? dto.category : template.category,
        placeholders: dto.placeholders !== undefined ? dto.placeholders : template.placeholders,
        isActive: dto.isActive !== undefined ? dto.isActive : template.isActive,
        metadata: dto.metadata !== undefined ? { ...template.metadata, ...dto.metadata } : template.metadata,
        version: template.version + 1,
        updatedAt: new Date(),
      };

      // Save updated metadata
      const metadataPath = path.join(storagePath, this.TEMPLATE_METADATA_DIR, `${id}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(updatedTemplate, null, 2), 'utf8');

      this.logger.log(`Updated template: ${updatedTemplate.name} (${id}) to version ${updatedTemplate.version}`);

      // Audit log with change tracking
      await this.auditService.logDataChange(
        userId,
        'USER',
        'UPDATE_TEMPLATE',
        'TEMPLATE',
        id,
        template.name,
        template,
        updatedTemplate,
        {
          oldVersion: template.version,
          newVersion: updatedTemplate.version,
        },
      );

      return updatedTemplate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update template ${id}:`, error);
      throw error;
    }
  }

  async deleteTemplate(id: string, userId: string = 'system'): Promise<void> {
    try {
      const template = await this.getTemplate(id);
      const storagePath = this.fileStorageService['storagePath'];

      // Create backup before deletion
      await this.createVersionHistory(template);

      // Delete metadata file
      const metadataPath = path.join(storagePath, this.TEMPLATE_METADATA_DIR, `${id}.json`);
      if (existsSync(metadataPath)) {
        await fs.unlink(metadataPath);
      }

      // Note: We don't delete the template file itself to preserve it for historical records
      // Only the metadata is removed, making the template inaccessible

      this.logger.log(`Deleted template: ${template.name} (${id})`);

      // Audit log
      await this.auditService.logEvent({
        actor: userId,
        actorType: 'USER',
        action: 'DELETE_TEMPLATE',
        entity: 'TEMPLATE',
        entityId: id,
        entityRef: template.name,
        metadata: {
          category: template.category,
          version: template.version,
          wasActive: template.isActive,
        },
        severity: 'HIGH',
        category: 'DATA',
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete template ${id}:`, error);
      throw error;
    }
  }

  async getTemplatesByCategory(category: TemplateCategory): Promise<Template[]> {
    return this.getTemplates({ category });
  }

  async searchTemplates(query: string): Promise<Template[]> {
    try {
      const allTemplates = await this.getTemplates();

      if (!query || query.trim() === '') {
        return allTemplates;
      }

      const searchTerm = query.toLowerCase();

      return allTemplates.filter(template => {
        return (
          template.name.toLowerCase().includes(searchTerm) ||
          template.description.toLowerCase().includes(searchTerm) ||
          template.category.toLowerCase().includes(searchTerm) ||
          (template.metadata?.tags && template.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
      });
    } catch (error) {
      this.logger.error('Failed to search templates:', error);
      throw error;
    }
  }

  async getTemplateFilePath(id: string): Promise<string> {
    const template = await this.getTemplate(id);
    const storagePath = this.fileStorageService['storagePath'];
    return path.join(storagePath, template.filePath);
  }

  async getTemplateContent(id: string): Promise<string> {
    try {
      const filePath = await this.getTemplateFilePath(id);

      if (!existsSync(filePath)) {
        this.errorHandler.handleTemplateFileNotFound(id, filePath);
      }

      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get template content for ${id}:`, error);
      this.errorHandler.handleGenericError('reading template content', error as Error, { templateId: id });
    }
  }

  async saveTemplateFile(id: string, fileBuffer: Buffer, fileName: string): Promise<void> {
    try {
      const storagePath = this.fileStorageService['storagePath'];
      const filePath = path.join(storagePath, this.TEMPLATE_FILES_DIR, fileName);

      await fs.writeFile(filePath, fileBuffer);

      this.logger.log(`Saved template file: ${fileName} for template ${id}`);
    } catch (error) {
      this.logger.error(`Failed to save template file for ${id}:`, error);
      throw error;
    }
  }

  private matchesFilters(template: Template, filters?: TemplateFilters): boolean {
    if (!filters) {
      return true;
    }

    if (filters.category && template.category !== filters.category) {
      return false;
    }

    if (filters.isActive !== undefined && template.isActive !== filters.isActive) {
      return false;
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm);

      if (!matchesSearch) {
        return false;
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      const templateTags = template.metadata?.tags || [];
      const hasMatchingTag = filters.tags.some(tag => templateTags.includes(tag));

      if (!hasMatchingTag) {
        return false;
      }
    }

    if (filters.createdBy && template.createdBy !== filters.createdBy) {
      return false;
    }

    if (filters.dateFrom && new Date(template.createdAt) < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && new Date(template.createdAt) > filters.dateTo) {
      return false;
    }

    return true;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private async createVersionHistory(template: Template): Promise<void> {
    try {
      const storagePath = this.fileStorageService['storagePath'];
      const historyDir = path.join(storagePath, 'templates/history', template.id);

      if (!existsSync(historyDir)) {
        await fs.mkdir(historyDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const historyPath = path.join(historyDir, `v${template.version}_${timestamp}.json`);

      await fs.writeFile(historyPath, JSON.stringify(template, null, 2), 'utf8');

      this.logger.debug(`Created version history for template ${template.id} version ${template.version}`);
    } catch (error) {
      this.logger.warn(`Failed to create version history for template ${template.id}:`, error);
    }
  }

  async getTemplateVersionHistory(id: string): Promise<Template[]> {
    try {
      const storagePath = this.fileStorageService['storagePath'];
      const historyDir = path.join(storagePath, 'templates/history', id);

      if (!existsSync(historyDir)) {
        return [];
      }

      const files = await fs.readdir(historyDir);
      const versions: Template[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(historyDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const version = JSON.parse(content) as Template;
          versions.push(version);
        }
      }

      // Sort by version number descending
      versions.sort((a, b) => b.version - a.version);

      return versions;
    } catch (error) {
      this.logger.error(`Failed to get version history for template ${id}:`, error);
      return [];
    }
  }

  async rollbackToVersion(id: string, version: number): Promise<Template> {
    try {
      const versions = await this.getTemplateVersionHistory(id);
      const targetVersion = versions.find(v => v.version === version);

      if (!targetVersion) {
        throw new NotFoundException(`Version ${version} not found for template ${id}`);
      }

      // Create a new version based on the target version
      const currentTemplate = await this.getTemplate(id);
      const rolledBackTemplate: Template = {
        ...targetVersion,
        version: currentTemplate.version + 1,
        updatedAt: new Date(),
      };

      const storagePath = this.fileStorageService['storagePath'];
      const metadataPath = path.join(storagePath, this.TEMPLATE_METADATA_DIR, `${id}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(rolledBackTemplate, null, 2), 'utf8');

      this.logger.log(`Rolled back template ${id} to version ${version} (new version: ${rolledBackTemplate.version})`);

      return rolledBackTemplate;
    } catch (error) {
      this.logger.error(`Failed to rollback template ${id} to version ${version}:`, error);
      throw error;
    }
  }
}
