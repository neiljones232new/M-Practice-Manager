import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/roles.interface';
import { TemplatesService } from './templates.service';
import { TemplateValidationService } from './template-validation.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFilters,
} from './interfaces';

/**
 * Controller for template management endpoints
 * Read operations require JWT authentication
 * Write operations (create, update, delete) require Admin role
 * Security: All endpoints protected by JWT authentication, admin operations require Admin role
 */
@ApiTags('Templates')
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly validationService: TemplateValidationService,
  ) {}

  /**
   * Search templates by query string
   * Requirements: 1.3, 1.4
   * Note: This must come before :id route to avoid conflicts
   */
  @Get('search')
  async searchTemplates(
    @Query('q') query: string,
    @Query('category') category?: string,
  ) {
    if (category) {
      // Filter by category if provided
      return this.templatesService.getTemplates({ 
        category: category as any,
        search: query 
      });
    }
    return this.templatesService.searchTemplates(query);
  }

  /**
   * Get all templates with optional filtering
   * Requirements: 1.1, 1.2
   */
  @Get()
  async getTemplates(@Query() filters: TemplateFilters) {
    return this.templatesService.getTemplates(filters);
  }

  /**
   * Get a specific template by ID
   * Requirements: 1.2
   */
  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplate(id);
  }

  /**
   * Get template preview with content and placeholder information
   * Requirements: 1.5
   */
  @Get(':id/preview')
  async previewTemplate(@Param('id') id: string) {
    const template = await this.templatesService.getTemplate(id);
    const content = await this.templatesService.getTemplateContent(id);
    
    return {
      template,
      content,
      placeholders: template.placeholders,
      metadata: {
        totalPlaceholders: template.placeholders.length,
        requiredPlaceholders: template.placeholders.filter(p => p.required).length,
        optionalPlaceholders: template.placeholders.filter(p => !p.required).length,
      },
    };
  }

  /**
   * Create a new template (admin only)
   * Requirements: 6.1, 6.2
   * Security: Validates and sanitizes all input data
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() dto: CreateTemplateDto) {
    // Validate and sanitize input
    this.validationService.validateCreateTemplate(dto);
    return this.templatesService.createTemplate(dto);
  }

  /**
   * Update an existing template (admin only)
   * Requirements: 6.2, 6.4
   * Security: Validates and sanitizes all input data
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Req() req: any) {
    // Validate and sanitize input
    this.validationService.validateUpdateTemplate(dto);
    const userId = req.user?.id || 'system';
    return this.templatesService.updateTemplate(id, dto, userId);
  }

  /**
   * Delete a template (admin only)
   * Requirements: 6.6
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system';
    await this.templatesService.deleteTemplate(id, userId);
  }


}
