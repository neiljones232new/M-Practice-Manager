import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { ReportsService } from './reports.service';
import {
  Document,
  DocumentCategory,
  DocumentFilters,
  CreateDocumentDto,
  UpdateDocumentDto,
  BulkDocumentOperation,
} from './interfaces/document.interface';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly reportsService: ReportsService,
  ) {}

  private assertNoForbiddenFields(payload: Record<string, any> | undefined, context: string) {
    if (!payload || typeof payload !== 'object') return;
    const forbidden = ['tags', 'description'];
    const present = forbidden.filter((field) => Object.prototype.hasOwnProperty.call(payload, field));
    if (present.length > 0) {
      throw new BadRequestException(`${context} does not support fields: ${present.join(', ')}`);
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: any, @Body() createDocumentDto: CreateDocumentDto) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    this.assertNoForbiddenFields(createDocumentDto as any, 'Document upload');

    const documentDto: CreateDocumentDto = {
      filename: file.filename || file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      clientId: createDocumentDto.clientId,
      category: createDocumentDto.category || DocumentCategory.OTHER,
      uploadedById: createDocumentDto.uploadedById,
    };

    const result = await this.documentsService.uploadDocument(file.buffer, documentDto);

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return {
      success: true,
      data: result.document,
      message: 'Document uploaded successfully',
    };
  }

  @Get()
  async getDocuments(@Query() filters: DocumentFilters) {
    this.assertNoForbiddenFields(filters as any, 'Document filters');
    if (filters.dateFrom) {
      filters.dateFrom = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      filters.dateTo = new Date(filters.dateTo);
    }

    const documents = await this.documentsService.getDocuments(filters);

    return {
      success: true,
      data: documents,
      total: documents.length,
    };
  }

  @Get('search')
  async searchDocuments(@Query('q') query: string, @Query() filters: DocumentFilters) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    this.assertNoForbiddenFields(filters as any, 'Document filters');

    if (filters.dateFrom) {
      filters.dateFrom = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      filters.dateTo = new Date(filters.dateTo);
    }

    const results = await this.documentsService.searchDocuments(query, filters);

    return {
      success: true,
      data: results,
      total: results.length,
    };
  }

  @Get('stats')
  async getDocumentStats() {
    const stats = await this.documentsService.getDocumentStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('client/:clientId')
  async getDocumentsByClient(@Param('clientId') clientId: string) {
    const documents = await this.documentsService.getDocumentsByClient(clientId);

    return {
      success: true,
      data: documents,
      total: documents.length,
    };
  }

  @Get(':id')
  async getDocument(@Param('id') id: string) {
    const document = await this.documentsService.getDocument(id);

    return {
      success: true,
      data: document,
    };
  }

  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const { buffer, document } = await this.documentsService.getDocumentFile(id);

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.originalName}"`,
      'Content-Length': document.size.toString(),
    });

    res.send(buffer);
  }

  @Get(':id/preview')
  async previewDocument(@Param('id') id: string, @Res() res: Response) {
    const { buffer, document } = await this.documentsService.getDocumentFile(id);

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `inline; filename="${document.originalName}"`,
      'Content-Length': document.size.toString(),
    });

    res.send(buffer);
  }

  @Put(':id')
  async updateDocument(@Param('id') id: string, @Body() updateDto: UpdateDocumentDto) {
    this.assertNoForbiddenFields(updateDto as any, 'Document update');
    const document = await this.documentsService.updateDocument(id, updateDto);

    return {
      success: true,
      data: document,
    };
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    await this.documentsService.deleteDocument(id);

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  @Post('bulk')
  async bulkOperation(@Body() operation: BulkDocumentOperation) {
    const result = await this.documentsService.bulkOperation(operation);

    return {
      success: true,
      data: result,
    };
  }
}
