import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TemplateErrorHandlerService } from './template-error-handler.service';
import {
  Template,
  TemplateFilters,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './interfaces';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly errorHandler: TemplateErrorHandlerService,
  ) {}

  async getTemplates(filters?: TemplateFilters): Promise<Template[]> {
    try {
      const where: any = {};
      if (filters?.category) where.category = filters.category;
      if (filters?.type) where.type = filters.type;
      if (filters?.createdById) where.createdById = filters.createdById;
      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const rows = await (this.prisma as any).template.findMany({
        where,
        include: {
          fields: {
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return rows.map((row: any) => this.normalizeTemplate(row));
    } catch (error) {
      this.logger.error('Failed to get templates:', error);
      throw error;
    }
  }

  async getTemplate(id: string): Promise<Template> {
    try {
      const template = await (this.prisma as any).template.findUnique({
        where: { id },
        include: {
          fields: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
      if (!template) {
        this.errorHandler.handleTemplateNotFound(id);
      }
      return this.normalizeTemplate(template);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get template ${id}:`, error);
      this.errorHandler.handleGenericError('retrieving template', error as Error, { templateId: id });
    }
  }

  async createTemplate(dto: CreateTemplateDto): Promise<Template> {
    try {
      const template = await (this.prisma as any).$transaction(async (tx: any) => {
        const created = await tx.template.create({
          data: {
            name: dto.name,
            description: dto.description,
            category: dto.category,
            type: dto.type,
            content: dto.content,
            placeholders: dto.placeholders as any,
            metadata: dto.metadata as any,
            createdById: dto.createdById,
          },
        });

        const normalized = this.normalizePlaceholders(dto.placeholders);
        if (normalized.length > 0) {
          await tx.templateField.createMany({
            data: normalized.map((p: any, idx: number) => ({
              templateId: created.id,
              key: p.key,
              label: p.label,
              type: p.type || 'TEXT',
              required: !!p.required,
              defaultValue: p.defaultValue ?? null,
              format: p.format ?? null,
              source: p.source ?? null,
              sourcePath: p.sourcePath ?? null,
              validation: p.validation ?? null,
              displayOrder: idx,
            })),
          });
        }

        return tx.template.findUnique({
          where: { id: created.id },
          include: { fields: { orderBy: { displayOrder: 'asc' } } },
        });
      });

      this.logger.log(`Created template: ${template.name} (${template.id})`);

      await this.auditService.logEvent({
        actor: dto.createdById || 'system',
        actorType: 'USER',
        action: 'CREATE_TEMPLATE',
        entity: 'TEMPLATE',
        entityId: template.id,
        entityRef: template.name,
        metadata: {
          category: template.category,
          type: template.type,
        },
        severity: 'MEDIUM',
        category: 'DATA',
      });

      return this.normalizeTemplate(template);
    } catch (error) {
      this.logger.error('Failed to create template:', error);
      this.errorHandler.handleGenericError('creating template', error as Error, { templateName: dto.name });
    }
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string = 'system'): Promise<Template> {
    try {
      await this.getTemplate(id);

      const updatedTemplate = await (this.prisma as any).$transaction(async (tx: any) => {
        const updated = await tx.template.update({
          where: { id },
          data: {
            name: dto.name,
            description: dto.description,
            category: dto.category,
            type: dto.type,
            content: dto.content,
            placeholders: dto.placeholders as any,
            metadata: dto.metadata as any,
          },
        });

        if (dto.placeholders) {
          await tx.templateField.deleteMany({ where: { templateId: id } });
          const normalized = this.normalizePlaceholders(dto.placeholders);
          if (normalized.length > 0) {
            await tx.templateField.createMany({
              data: normalized.map((p: any, idx: number) => ({
                templateId: id,
                key: p.key,
                label: p.label,
                type: p.type || 'TEXT',
                required: !!p.required,
                defaultValue: p.defaultValue ?? null,
                format: p.format ?? null,
                source: p.source ?? null,
                sourcePath: p.sourcePath ?? null,
                validation: p.validation ?? null,
                displayOrder: idx,
              })),
            });
          }
        }

        return tx.template.findUnique({
          where: { id: updated.id },
          include: { fields: { orderBy: { displayOrder: 'asc' } } },
        });
      });

      this.logger.log(`Updated template: ${updatedTemplate.name} (${id})`);

      await this.auditService.logEvent({
        actor: userId,
        actorType: 'USER',
        action: 'UPDATE_TEMPLATE',
        entity: 'TEMPLATE',
        entityId: updatedTemplate.id,
        entityRef: updatedTemplate.name,
        metadata: {
          category: updatedTemplate.category,
          type: updatedTemplate.type,
        },
        severity: 'MEDIUM',
        category: 'DATA',
      });

      return this.normalizeTemplate(updatedTemplate);
    } catch (error) {
      this.logger.error(`Failed to update template ${id}:`, error);
      this.errorHandler.handleGenericError('updating template', error as Error, { templateId: id });
    }
  }

  async deleteTemplate(id: string, userId: string = 'system'): Promise<void> {
    try {
      const template = await this.getTemplate(id);
      await (this.prisma as any).template.delete({ where: { id } });

      await this.auditService.logEvent({
        actor: userId,
        actorType: 'USER',
        action: 'DELETE_TEMPLATE',
        entity: 'TEMPLATE',
        entityId: id,
        entityRef: template.name,
        severity: 'MEDIUM',
        category: 'DATA',
      });

      this.logger.log(`Deleted template: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete template ${id}:`, error);
      this.errorHandler.handleGenericError('deleting template', error as Error, { templateId: id });
    }
  }

  async searchTemplates(query: string): Promise<Template[]> {
    return this.getTemplates({ search: query } as TemplateFilters);
  }

  async getTemplateContent(id: string): Promise<string> {
    const template = await this.getTemplate(id);
    if (!template.content) {
      throw new BadRequestException('Template content is empty');
    }
    return template.content;
  }

  private normalizeTemplate(raw: any): Template {
    const relationalPlaceholders = Array.isArray(raw?.fields)
      ? raw.fields.map((f: any) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: !!f.required,
          defaultValue: f.defaultValue ?? undefined,
          format: f.format ?? undefined,
          source: f.source ?? undefined,
          sourcePath: f.sourcePath ?? undefined,
          validation: f.validation ?? undefined,
        }))
      : [];
    const placeholders = relationalPlaceholders.length > 0
      ? this.normalizePlaceholders(relationalPlaceholders)
      : this.normalizePlaceholders(raw?.placeholders);
    const metadata = (raw?.metadata && typeof raw.metadata === 'object') ? raw.metadata : {};
    const version = typeof metadata?.version === 'number'
      ? metadata.version
      : Number.parseInt(String(metadata?.version ?? '1'), 10) || 1;

    return {
      ...raw,
      placeholders,
      metadata,
      isActive: raw?.isActive ?? true,
      version,
      fileFormat: (raw?.fileFormat || 'MD') as 'DOCX' | 'MD',
      fileName: raw?.fileName || `${String(raw?.name || 'template').replace(/\s+/g, '-').toLowerCase()}.md`,
      createdBy: raw?.createdBy || raw?.createdById || 'system',
    } as Template;
  }

  private normalizePlaceholders(value: any): any[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((p) => p && typeof p === 'object')
      .map((p: any) => ({
        ...p,
        type: typeof p.type === 'string' ? p.type.toUpperCase() : p.type,
        source: typeof p.source === 'string' ? p.source.toUpperCase() : p.source,
      }));
  }
}
