import { Controller, Get, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DashboardService, DashboardKPIs, WeekAheadView, PriorityRecommendations } from './dashboard.service';
import { Header } from '@nestjs/common';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get dashboard KPIs and metrics' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Dashboard KPIs retrieved successfully' })
  async getDashboardKPIs(@Query('portfolioCode') portfolioCode?: string): Promise<DashboardKPIs> {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.dashboardService.getDashboardKPIs(portfolio);
  }

  @Get('week-ahead')
  @ApiOperation({ summary: 'Get week-ahead view of tasks, compliance, and events' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Week-ahead view retrieved successfully' })
  async getWeekAheadView(@Query('portfolioCode') portfolioCode?: string): Promise<WeekAheadView> {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.dashboardService.getWeekAheadView(portfolio);
  }

  @Get('priority-recommendations')
  @ApiOperation({ summary: 'Get priority recommendations and business insights' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Priority recommendations retrieved successfully' })
  async getPriorityRecommendations(@Query('portfolioCode') portfolioCode?: string): Promise<PriorityRecommendations> {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.dashboardService.getPriorityRecommendations(portfolio);
  }

  @Get('refresh')
  @ApiOperation({ summary: 'Force refresh dashboard data and clear cache' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Dashboard data refreshed successfully' })
  async refreshDashboard(@Query('portfolioCode') portfolioCode?: string): Promise<DashboardKPIs> {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.dashboardService.refreshDashboardData(portfolio);
  }

  @Get('cache/status')
  @ApiOperation({ summary: 'Get dashboard cache status' })
  @ApiResponse({ status: 200, description: 'Cache status retrieved successfully' })
  async getCacheStatus(): Promise<{ entries: number; keys: string[] }> {
    return this.dashboardService.getCacheStatus();
  }

  @Delete('cache')
  @ApiOperation({ summary: 'Clear dashboard cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache(): Promise<{ message: string }> {
    await this.dashboardService.clearCache();
    return { message: 'Dashboard cache cleared successfully' };
  }

  @Get('export.pdf')
  @ApiOperation({ summary: 'Export dashboard summary as PDF' })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', `attachment; filename="dashboard-${new Date().toISOString().slice(0,10)}.pdf"`)
  async exportDashboardPDF(@Query('portfolioCode') portfolioCode?: string): Promise<Buffer> {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    const kpis = await this.dashboardService.getDashboardKPIs(portfolio, true);
    const weekAhead = await this.dashboardService.getWeekAheadView(portfolio);
    const recommendations = await this.dashboardService.getPriorityRecommendations(portfolio);
    const PdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    PdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;
    const dueSoonRows = (weekAhead.tasks || []).slice(0, 10).map((t) => [
      t.title,
      t.clientName || '',
      t.priority,
      t.status,
      t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : ''
    ]);
    const complianceRows = (recommendations.complianceFlags || []).slice(0, 10).map((c) => [
      c.type,
      c.clientName || '',
      c.reason,
      typeof c.daysUntilDue === 'number' ? String(c.daysUntilDue) : ''
    ]);
    const content = [
      { text: 'MDJ Practice Manager — Dashboard Summary', style: 'header' },
      { text: new Date().toLocaleString('en-GB'), style: 'sub' },
      { text: '\n' },
      { text: 'Clients', style: 'section' },
      { ul: [
        `Total: ${kpis.clients.total}`,
        `Active: ${kpis.clients.active}`,
        `New This Month: ${kpis.clients.newThisMonth}`,
      ]},
      { text: 'Services', style: 'section', margin: [0,12,0,0] },
      { ul: [
        `Total: ${kpis.services.total}`,
        `Active: ${kpis.services.active}`,
        `Total Annual Fees: £${kpis.services.totalAnnualFees.toLocaleString()}`,
        `Avg Fee / Client: £${kpis.services.averageFeePerClient.toLocaleString()}`,
      ]},
      { text: 'Tasks', style: 'section', margin: [0,12,0,0] },
      { ul: [
        `Open: ${kpis.tasks.open}`,
        `In Progress: ${kpis.tasks.inProgress}`,
        `Overdue: ${kpis.tasks.overdue}`,
        `Due This Week: ${kpis.tasks.dueThisWeek}`,
        `Completion Rate: ${kpis.tasks.completionRate}%`,
      ]},
      { text: 'Compliance', style: 'section', margin: [0,12,0,0] },
      { ul: [
        `Pending: ${kpis.compliance.pending}`,
        `Overdue: ${kpis.compliance.overdue}`,
        `Due This Month: ${kpis.compliance.dueThisMonth}`,
        `Compliance Rate: ${kpis.compliance.complianceRate}%`,
      ]},
      { text: '\n' },
      { text: 'Due Soon Tasks (Top 10)', style: 'section' },
      { table: { headerRows: 1, widths: ['*','*','auto','auto','auto'], body: [
        [{ text: 'Title', bold: true }, { text: 'Client', bold: true }, { text: 'Priority', bold: true }, { text: 'Status', bold: true }, { text: 'Due', bold: true }],
        ...dueSoonRows
      ]}},
      { text: '\n' },
      { text: 'Compliance Flags (Top 10)', style: 'section' },
      { table: { headerRows: 1, widths: ['*','*','*','auto'], body: [
        [{ text: 'Type', bold: true }, { text: 'Client', bold: true }, { text: 'Reason', bold: true }, { text: 'Days', bold: true }],
        ...complianceRows
      ]}},
    ];
    const docDefinition = { content, styles: { header: { fontSize: 16, bold: true }, sub: { color: '#666' }, section: { bold: true } } };
    return await new Promise<Buffer>((resolve, reject) => {
      const pdfDoc = PdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => buffer ? resolve(buffer) : reject(new Error('PDF failed')));
    });
  }

  @Get('reports/clients')
  @ApiOperation({ summary: 'Generate client list report with fee analysis' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiResponse({ status: 200, description: 'Client report generated successfully' })
  async getClientReport(
    @Query('portfolioCode') portfolioCode?: string,
    @Query('format') format: 'json' | 'csv' = 'json'
  ) {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    const report = await this.dashboardService.generateClientListReport(portfolio);

    if (format === 'csv') {
      const csvContent = await this.dashboardService.exportToCSV(
        report.clients,
        `client-report-${new Date().toISOString().split('T')[0]}.csv`
      );
      return {
        content: csvContent,
        filename: `client-report-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
      };
    }

    return report;
  }

  @Get('reports/compliance')
  @ApiOperation({ summary: 'Generate compliance report with deadline tracking' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiResponse({ status: 200, description: 'Compliance report generated successfully' })
  async getComplianceReport(
    @Query('portfolioCode') portfolioCode?: string,
    @Query('format') format: 'json' | 'csv' = 'json'
  ) {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    const report = await this.dashboardService.generateComplianceReport(portfolio);

    if (format === 'csv') {
      const csvContent = await this.dashboardService.exportToCSV(
        report.items,
        `compliance-report-${new Date().toISOString().split('T')[0]}.csv`
      );
      return {
        content: csvContent,
        filename: `compliance-report-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
      };
    }

    return report;
  }
}
