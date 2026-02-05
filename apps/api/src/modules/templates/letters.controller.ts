import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioGuard } from '../auth/guards/portfolio.guard';
import { LetterGenerationService } from './letter-generation.service';
import { TemplateValidationService } from './template-validation.service';
import {
  GenerateLetterDto,
  LetterFilters,
  GeneratedLetter,
} from './interfaces';

/**
 * Controller for letter generation and management endpoints
 * All endpoints require JWT authentication and portfolio-based access control
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 5.1, 5.2, 5.3, 5.4, 7.1, 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5, 11.4
 * Security: All endpoints protected by JWT authentication and portfolio access control, all inputs validated and sanitized
 */
@ApiTags('Letters')
@Controller('letters')
@UseGuards(JwtAuthGuard, PortfolioGuard)
export class LettersController {
  constructor(
    private readonly letterGenerationService: LetterGenerationService,
    private readonly validationService: TemplateValidationService,
  ) {}

  /**
   * Generate a single letter from a template
   * Requirements: 2.1, 2.2, 2.3, 2.6
   * Security: Validates and sanitizes all input data including placeholder values
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateLetter(
    @Body() dto: GenerateLetterDto,
    @Req() req: Request,
  ): Promise<GeneratedLetter> {
    // Validate and sanitize input
    this.validationService.validateGenerateLetter(dto);
    const userId = (req.user as any)?.id || 'system';
    return this.letterGenerationService.generateLetter(dto, userId);
  }

  /**
   * Generate a preview of a letter without saving
   * Requirements: 2.5
   * Security: Validates and sanitizes all input data including placeholder values
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewLetter(
    @Body() dto: GenerateLetterDto,
    @Req() req: Request,
  ): Promise<{ preview: string }> {
    try {
      console.log('Preview letter request received:', JSON.stringify(dto, null, 2));
      
      // Validate and sanitize input
      this.validationService.validateGenerateLetter(dto);
      console.log('Validation passed');
      
      const userId = (req.user as any)?.id || 'system';
      console.log('User ID:', userId);
      
      const preview = await this.letterGenerationService.previewLetter(dto, userId);
      console.log('Preview generated, length:', preview?.length || 0);
      
      return { preview };
    } catch (error) {
      console.error('Preview letter error:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Debug endpoint to test if letters controller is working
   */
  @Get('debug/test')
  async debugTest(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'Letters controller is working',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Search for generated letters across all clients
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   * Note: This must come before :id route to avoid conflicts
   */
  @Get('search')
  async searchLetters(@Query() filters: LetterFilters): Promise<GeneratedLetter[]> {
    return this.letterGenerationService.getGeneratedLetters(filters);
  }

  /**
   * Get all letters for a specific client
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  @Get('client/:clientId')
  async getLettersByClient(@Param('clientId') clientId: string): Promise<GeneratedLetter[]> {
    return this.letterGenerationService.getLettersByClient(clientId);
  }

  /**
   * Get all letters for a specific service
   * Requirements: 11.4
   */
  @Get('service/:serviceId')
  async getLettersByService(@Param('serviceId') serviceId: string): Promise<GeneratedLetter[]> {
    return this.letterGenerationService.getLettersByService(serviceId);
  }

  /**
   * Get all generated letters with optional filtering
   * Requirements: 5.1, 5.2
   */
  @Get()
  async getLetters(@Query() filters: LetterFilters): Promise<GeneratedLetter[]> {
    return this.letterGenerationService.getGeneratedLetters(filters);
  }

  /**
   * Download a generated letter in the specified format
   * Requirements: 8.1, 8.2, 8.3, 8.5
   */
  @Get(':id/download')
  async downloadLetter(
    @Param('id') id: string,
    @Query('format') format: 'PDF' | 'DOCX',
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    // Validate format parameter
    if (!format || (format !== 'PDF' && format !== 'DOCX')) {
      throw new BadRequestException('Format parameter must be either PDF or DOCX');
    }

    const userId = (req.user as any)?.id || 'system';
    const result = await this.letterGenerationService.downloadLetter(id, format, userId);

    // Set response headers
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);

    // Send the file
    res.send(result.buffer);
  }

  /**
   * Get a specific generated letter by ID
   * Requirements: 5.1
   */
  @Get(':id')
  async getLetter(@Param('id') id: string): Promise<GeneratedLetter> {
    return this.letterGenerationService.getGeneratedLetter(id);
  }
}
