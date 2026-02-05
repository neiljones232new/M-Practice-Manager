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

      return (this.prisma as any).template.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get templates:', error);
      throw error;
    }
  }

  async getTemplate(id: string): Promise<Template> {
    try {
      const template = await (this.prisma as any).template.findUnique({ where: { id } });
      if (!template) {
        this.errorHandler.handleTemplateNotFound(id);
      }
      return template;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get template ${id}:`, error);
      this.errorHandler.handleGenericError('retrieving template', error as Error, { templateId: id });
    }
  }

  async createTemplate(dto: CreateTemplateDto): Promise<Template> {
    try {
      const template = await (this.prisma as any).template.create({
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

      return template;
    } catch (error) {
      this.logger.error('Failed to create template:', error);
      this.errorHandler.handleGenericError('creating template', error as Error, { templateName: dto.name });
    }
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string = 'system'): Promise<Template> {
    try {
      await this.getTemplate(id);

      const updatedTemplate = await (this.prisma as any).template.update({
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

      return updatedTemplate;
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
}
