import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService, ReportOptions } from './reports.service';

@ApiTags('Documents Reports')
@Controller('documents/reports')
@UseGuards(JwtAuthGuard)
export class DocumentsReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private parseBoolean(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined;
    return value === 'true';
  }

  private buildOptions(clientId: string, source: Partial<ReportOptions>): ReportOptions {
    return {
      clientId,
      includeCompaniesHouseData: source.includeCompaniesHouseData ?? true,
      includeServices: source.includeServices ?? true,
      includeParties: source.includeParties ?? true,
      includeDocuments: source.includeDocuments ?? true,
      includeTaxCalculations: source.includeTaxCalculations ?? false,
      includeComplianceAlerts: source.includeComplianceAlerts ?? false,
      customSections: source.customSections ?? [],
    };
  }

  @Get('client/:clientId/html')
  @ApiOperation({ summary: 'Generate client report HTML' })
  @Header('Content-Type', 'text/html; charset=utf-8')
  async generateClientReportHtml(
    @Param('clientId') clientId: string,
    @Query() query: Record<string, string>,
  ): Promise<string> {
    const options = this.buildOptions(clientId, {
      includeCompaniesHouseData: this.parseBoolean(query.includeCompaniesHouseData),
      includeServices: this.parseBoolean(query.includeServices),
      includeParties: this.parseBoolean(query.includeParties),
      includeDocuments: this.parseBoolean(query.includeDocuments),
    });

    return this.reportsService.generateClientReportHTML(options);
  }

  @Get('client/:clientId/preview')
  @ApiOperation({ summary: 'Preview client report HTML' })
  @Header('Content-Type', 'text/html; charset=utf-8')
  async previewClientReportHtml(
    @Param('clientId') clientId: string,
    @Query() query: Record<string, string>,
  ): Promise<string> {
    const options = this.buildOptions(clientId, {
      includeCompaniesHouseData: this.parseBoolean(query.includeCompaniesHouseData),
      includeServices: this.parseBoolean(query.includeServices),
      includeParties: this.parseBoolean(query.includeParties),
      includeDocuments: this.parseBoolean(query.includeDocuments),
    });

    return this.reportsService.generateClientReportHTML(options);
  }

  @Post('client/:clientId')
  @ApiOperation({ summary: 'Generate client report PDF' })
  async generateClientReportPdf(
    @Param('clientId') clientId: string,
    @Body() body: Partial<ReportOptions>,
    @Res() res: Response,
  ): Promise<void> {
    const options = this.buildOptions(clientId, body ?? {});
    const pdf = await this.reportsService.generateClientReportPDF(options);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="client-report-${clientId}-${new Date().toISOString().slice(0, 10)}.pdf"`,
    );
    res.send(pdf);
  }
}
