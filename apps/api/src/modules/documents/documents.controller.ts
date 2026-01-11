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
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { ReportsService, ReportOptions } from './reports.service';
import {
  Document,
  DocumentCategory,
  DocumentFilters,
  CreateDocumentDto,
  UpdateDocumentDto,
  BulkDocumentOperation
} from './interfaces/document.interface';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly reportsService: ReportsService
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: any,
    @Body() createDocumentDto: CreateDocumentDto
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const documentDto: CreateDocumentDto = {
      filename: file.filename || file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      clientId: createDocumentDto.clientId,
      serviceId: createDocumentDto.serviceId,
      taskId: createDocumentDto.taskId,
      category: createDocumentDto.category || DocumentCategory.OTHER,
      tags: createDocumentDto.tags ? JSON.parse(createDocumentDto.tags as any) : [],
      description: createDocumentDto.description,
      uploadedBy: createDocumentDto.uploadedBy || 'system'
    };

    const result = await this.documentsService.uploadDocument(file.buffer, documentDto);
    
    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return {
      success: true,
      data: result.document,
      message: 'Document uploaded successfully'
    };
  }

  @Get()
  async getDocuments(@Query() filters: DocumentFilters) {
    // Parse date filters
    if (filters.dateFrom) {
      filters.dateFrom = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      filters.dateTo = new Date(filters.dateTo);
    }

    // Parse tags if provided as string
    if (filters.tags && typeof filters.tags === 'string') {
      (filters as any).tags = (filters.tags as string).split(',').map(tag => tag.trim());
    }

    const documents = await this.documentsService.getDocuments(filters);
    
    return {
      success: true,
      data: documents,
      total: documents.length
    };
  }

  @Get('search')
  async searchDocuments(
    @Query('q') query: string,
    @Query() filters: DocumentFilters
  ) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }

    // Parse filters similar to getDocuments
    if (filters.dateFrom) {
      filters.dateFrom = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      filters.dateTo = new Date(filters.dateTo);
    }
    if (filters.tags && typeof filters.tags === 'string') {
      (filters as any).tags = (filters.tags as string).split(',').map(tag => tag.trim());
    }

    const results = await this.documentsService.searchDocuments(query, filters);
    
    return {
      success: true,
      data: results,
      total: results.length
    };
  }

  @Get('stats')
  async getDocumentStats() {
    const stats = await this.documentsService.getDocumentStats();
    
    return {
      success: true,
      data: stats
    };
  }

  @Get('client/:clientId')
  async getDocumentsByClient(@Param('clientId') clientId: string) {
    const documents = await this.documentsService.getDocumentsByClient(clientId);
    
    return {
      success: true,
      data: documents,
      total: documents.length
    };
  }

  @Get('service/:serviceId')
  async getDocumentsByService(@Param('serviceId') serviceId: string) {
    const documents = await this.documentsService.getDocumentsByService(serviceId);
    
    return {
      success: true,
      data: documents,
      total: documents.length
    };
  }

  @Get('task/:taskId')
  async getDocumentsByTask(@Param('taskId') taskId: string) {
    const documents = await this.documentsService.getDocumentsByTask(taskId);
    
    return {
      success: true,
      data: documents,
      total: documents.length
    };
  }

  @Get(':id')
  async getDocument(@Param('id') id: string) {
    const document = await this.documentsService.getDocument(id);
    
    return {
      success: true,
      data: document
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
    
    // For preview, we set inline disposition
    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `inline; filename="${document.originalName}"`,
      'Content-Length': document.size.toString(),
    });
    
    res.send(buffer);
  }

  @Put(':id')
  async updateDocument(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto
  ) {
    const document = await this.documentsService.updateDocument(id, updateDocumentDto);
    
    return {
      success: true,
      data: document,
      message: 'Document updated successfully'
    };
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    await this.documentsService.deleteDocument(id);
    
    return {
      success: true,
      message: 'Document deleted successfully'
    };
  }

  @Post('bulk')
  async bulkOperation(@Body() operation: BulkDocumentOperation) {
    if (!operation.documentIds || operation.documentIds.length === 0) {
      throw new BadRequestException('Document IDs are required');
    }

    const result = await this.documentsService.bulkOperation(operation);
    
    return {
      success: true,
      data: result,
      message: `Bulk operation completed: ${result.success} successful, ${result.failed} failed`
    };
  }

  @Post(':id/archive')
  async archiveDocument(@Param('id') id: string) {
    const document = await this.documentsService.updateDocument(id, { isArchived: true });
    
    return {
      success: true,
      data: document,
      message: 'Document archived successfully'
    };
  }

  @Post(':id/unarchive')
  async unarchiveDocument(@Param('id') id: string) {
    const document = await this.documentsService.updateDocument(id, { isArchived: false });
    
    return {
      success: true,
      data: document,
      message: 'Document unarchived successfully'
    };
  }

  @Post(':id/tags')
  async addTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    if (!tags || tags.length === 0) {
      throw new BadRequestException('Tags are required');
    }

    const document = await this.documentsService.getDocument(id);
    const newTags = [...new Set([...document.tags, ...tags])];
    const updatedDocument = await this.documentsService.updateDocument(id, { tags: newTags });
    
    return {
      success: true,
      data: updatedDocument,
      message: 'Tags added successfully'
    };
  }

  @Delete(':id/tags')
  async removeTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    if (!tags || tags.length === 0) {
      throw new BadRequestException('Tags are required');
    }

    const document = await this.documentsService.getDocument(id);
    const filteredTags = document.tags.filter(tag => !tags.includes(tag));
    const updatedDocument = await this.documentsService.updateDocument(id, { tags: filteredTags });
    
    return {
      success: true,
      data: updatedDocument,
      message: 'Tags removed successfully'
    };
  }

  /**
   * Generate and return a client report as HTML.
   * This endpoint returns a fully styled HTML document that can be viewed in a browser.
   * 
   * @param clientId - The ID of the client to generate the report for
   * @param options - Query parameters for report customization
   * @param options.includeCompaniesHouseData - Include Companies House data (default: false)
   * @param options.includeServices - Include services section (default: false)
   * @param options.includeParties - Include parties section (default: false)
   * @param options.includeDocuments - Include documents section (default: false)
   * @param res - Express response object
   * @returns HTML document with Content-Type: text/html
   * @throws {BadRequestException} If report generation fails
   * @example
   * GET /documents/reports/client/client-123/html?includeServices=true&includeCompaniesHouseData=true
   */
  @Get('reports/client/:clientId/html')
  async getClientReportHTML(
    @Param('clientId') clientId: string,
    @Query() options: Partial<ReportOptions>,
    @Res() res: Response
  ) {
    try {
      const reportOptions: ReportOptions = {
        clientId,
        includeCompaniesHouseData: options.includeCompaniesHouseData === true || (options.includeCompaniesHouseData as any) === 'true',
        includeServices: options.includeServices === true || (options.includeServices as any) === 'true',
        includeParties: options.includeParties === true || (options.includeParties as any) === 'true',
        includeDocuments: options.includeDocuments === true || (options.includeDocuments as any) === 'true',
        customSections: options.customSections ? options.customSections.toString().split(',') : undefined
      };

      const html = await this.reportsService.generateClientReportHTML(reportOptions);
      
      res.set({
        'Content-Type': 'text/html',
      });
      
      res.send(html);
    } catch (error) {
      throw new BadRequestException(`Failed to generate HTML report: ${error.message}`);
    }
  }

  /**
   * Preview a client report as HTML in the browser.
   * This endpoint returns HTML with inline Content-Disposition for browser preview.
   * 
   * @param clientId - The ID of the client to generate the report for
   * @param options - Query parameters for report customization
   * @param options.includeCompaniesHouseData - Include Companies House data (default: false)
   * @param options.includeServices - Include services section (default: false)
   * @param options.includeParties - Include parties section (default: false)
   * @param options.includeDocuments - Include documents section (default: false)
   * @param res - Express response object
   * @returns HTML document with Content-Disposition: inline for browser viewing
   * @throws {BadRequestException} If report generation fails
   * @example
   * GET /documents/reports/client/client-123/preview?includeServices=true
   */
  @Get('reports/client/:clientId/preview')
  async previewClientReport(
    @Param('clientId') clientId: string,
    @Query() options: Partial<ReportOptions>,
    @Res() res: Response
  ) {
    try {
      const reportOptions: ReportOptions = {
        clientId,
        includeCompaniesHouseData: options.includeCompaniesHouseData === true || (options.includeCompaniesHouseData as any) === 'true',
        includeServices: options.includeServices === true || (options.includeServices as any) === 'true',
        includeParties: options.includeParties === true || (options.includeParties as any) === 'true',
        includeDocuments: options.includeDocuments === true || (options.includeDocuments as any) === 'true',
        customSections: options.customSections ? options.customSections.toString().split(',') : undefined
      };

      const html = await this.reportsService.generateClientReportHTML(reportOptions);
      
      res.set({
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="client-report-preview-${clientId}.html"`,
      });
      
      res.send(html);
    } catch (error) {
      throw new BadRequestException(`Failed to generate report preview: ${error.message}`);
    }
  }

  /**
   * Generate and download a client report as PDF.
   * This endpoint converts the HTML report to PDF using Puppeteer and returns it as a downloadable file.
   * 
   * @param clientId - The ID of the client to generate the report for
   * @param options - Request body with report customization options
   * @param options.includeCompaniesHouseData - Include Companies House data (default: true)
   * @param options.includeServices - Include services section (default: true)
   * @param options.includeParties - Include parties section (default: true)
   * @param options.includeDocuments - Include documents section (default: true)
   * @param options.customSections - Array of custom section names to include
   * @param options.dateRange - Optional date range filter
   * @param res - Express response object
   * @returns PDF file with Content-Type: application/pdf and Content-Disposition: attachment
   * @throws {BadRequestException} If PDF generation fails
   * @example
   * POST /documents/reports/client/client-123
   * Body: { "includeCompaniesHouseData": true, "includeServices": true }
   */
  @Post('reports/client/:clientId')
  async generateClientReport(
    @Param('clientId') clientId: string,
    @Body() options: Partial<ReportOptions>,
    @Res() res: Response
  ) {
    try {
      const reportOptions: ReportOptions = {
        clientId,
        includeCompaniesHouseData: options.includeCompaniesHouseData ?? true,
        includeServices: options.includeServices ?? true,
        includeParties: options.includeParties ?? true,
        includeDocuments: options.includeDocuments ?? true,
        customSections: options.customSections,
        dateRange: options.dateRange
      };

      const pdfBuffer = await this.reportsService.generateClientReportPDF(reportOptions);
      
      // Ensure we have a valid buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF buffer is empty');
      }

      // Generate simple filename: report-CLIENTID.pdf
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `report-${clientId}.pdf`;
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });
      
      res.end(pdfBuffer, 'binary');
    } catch (error) {
      throw new BadRequestException(`Failed to generate report: ${error.message}`);
    }
  }
}
