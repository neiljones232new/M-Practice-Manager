import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService, ReportConfig } from './reports.service';
import { GeneratedReport } from '../database/interfaces/database.interface';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Post('client-pack')
  @ApiOperation({ summary: 'Generate a client pack report' })
  @ApiResponse({ status: 201, description: 'Client pack generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async generateClientPack(@Body() config: ReportConfig): Promise<GeneratedReport> {
    try {
      this.logger.log(`Generating client pack for client: ${config.clientId}`);
      return await this.reportsService.generateClientPack(config);
    } catch (error) {
      this.logger.error(`Failed to generate client pack: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to generate client pack',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('tax-strategy')
  @ApiOperation({ summary: 'Generate a tax strategy report' })
  @ApiResponse({ status: 201, description: 'Tax strategy report generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Client or calculations not found' })
  async generateTaxStrategyReport(@Body() config: ReportConfig): Promise<GeneratedReport> {
    try {
      this.logger.log(`Generating tax strategy report for client: ${config.clientId}`);
      return await this.reportsService.generateTaxStrategyReport(config);
    } catch (error) {
      this.logger.error(`Failed to generate tax strategy report: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to generate tax strategy report',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('company-profile')
  @ApiOperation({ summary: 'Generate a company profile report' })
  @ApiResponse({ status: 201, description: 'Company profile report generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async generateCompanyProfileReport(@Body() config: ReportConfig): Promise<GeneratedReport> {
    try {
      this.logger.log(`Generating company profile report for client: ${config.clientId}`);
      return await this.reportsService.generateCompanyProfileReport(config);
    } catch (error) {
      this.logger.error(`Failed to generate company profile report: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to generate company profile report',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get all reports for a client' })
  @ApiParam({ name: 'clientId', description: 'Client company number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of reports to return' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getClientReports(
    @Param('clientId') clientId: string,
    @Query('limit') limit?: string,
  ): Promise<GeneratedReport[]> {
    try {
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      return await this.reportsService.getClientReports(clientId, limitNum);
    } catch (error) {
      this.logger.error(`Failed to get reports for client ${clientId}: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to retrieve reports',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(@Param('id') id: string): Promise<GeneratedReport> {
    try {
      return await this.reportsService.getReport(id);
    } catch (error) {
      this.logger.error(`Failed to get report ${id}: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to retrieve report',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download report file' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report file downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Report or file not found' })
  async downloadReport(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const report = await this.reportsService.getReport(id);
      
      if (!report.filePath || !fs.existsSync(report.filePath)) {
        throw new HttpException('Report file not found', HttpStatus.NOT_FOUND);
      }

      const fileName = path.basename(report.filePath);
      const mimeType = report.format === 'PDF' ? 'application/pdf' : 'text/html';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.createReadStream(report.filePath);
      fileStream.pipe(res);
    } catch (error) {
      this.logger.error(`Failed to download report ${id}: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to download report',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview report content' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report preview retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async previewReport(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const report = await this.reportsService.getReport(id);
      
      if (report.format === 'HTML' && report.filePath && fs.existsSync(report.filePath)) {
        // Serve HTML file directly
        const htmlContent = fs.readFileSync(report.filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else if (report.content && typeof report.content === 'object' && report.content.html) {
        // Serve HTML from content
        res.setHeader('Content-Type', 'text/html');
        res.send(report.content.html);
      } else {
        // Return report metadata as JSON
        res.setHeader('Content-Type', 'application/json');
        res.json({
          id: report.id,
          title: report.title,
          format: report.format,
          generatedAt: report.generatedAt,
          message: 'Preview not available for this report format'
        });
      }
    } catch (error) {
      this.logger.error(`Failed to preview report ${id}: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to preview report',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async deleteReport(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.reportsService.deleteReport(id);
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete report ${id}: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to delete report',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk-generate')
  @ApiOperation({ summary: 'Generate multiple reports for a client' })
  @ApiResponse({ status: 201, description: 'Reports generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async bulkGenerateReports(@Body() request: {
    clientId: string;
    reports: Array<{
      type: 'client-pack' | 'tax-strategy' | 'company-profile';
      title: string;
      format: 'PDF' | 'HTML';
      calculationIds?: string[];
      includeBranding?: boolean;
      includeCharts?: boolean;
    }>;
  }): Promise<GeneratedReport[]> {
    try {
      this.logger.log(`Bulk generating ${request.reports.length} reports for client: ${request.clientId}`);
      
      const results: GeneratedReport[] = [];
      
      for (const reportRequest of request.reports) {
        const config: ReportConfig = {
          clientId: request.clientId,
          title: reportRequest.title,
          format: reportRequest.format,
          calculationIds: reportRequest.calculationIds,
          includeBranding: reportRequest.includeBranding,
          includeCharts: reportRequest.includeCharts,
        };

        let report: GeneratedReport;
        
        switch (reportRequest.type) {
          case 'client-pack':
            report = await this.reportsService.generateClientPack(config);
            break;
          case 'tax-strategy':
            report = await this.reportsService.generateTaxStrategyReport(config);
            break;
          case 'company-profile':
            report = await this.reportsService.generateCompanyProfileReport(config);
            break;
          default:
            throw new Error(`Unknown report type: ${reportRequest.type}`);
        }
        
        results.push(report);
      }
      
      this.logger.log(`Successfully generated ${results.length} reports for client: ${request.clientId}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to bulk generate reports: ${error.message}`, error);
      throw new HttpException(
        error.message || 'Failed to generate reports',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get report generation statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getReportStats(): Promise<{
    totalReports: number;
    reportsByFormat: Record<string, number>;
    reportsByType: Record<string, number>;
    recentReports: GeneratedReport[];
  }> {
    try {
      // This would need to be implemented in the service
      // For now, return a placeholder response
      return {
        totalReports: 0,
        reportsByFormat: { PDF: 0, HTML: 0 },
        reportsByType: { 'client-pack': 0, 'tax-strategy': 0, 'company-profile': 0 },
        recentReports: [],
      };
    } catch (error) {
      this.logger.error(`Failed to get report statistics: ${error.message}`, error);
      throw new HttpException(
        'Failed to retrieve statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
