import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query,
  HttpCode,
  HttpStatus,
  Header,
  Res,
  NotFoundException,
  Inject,
  forwardRef
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { IntegrationConfigService } from '../integrations/services/integration-config.service';
import { TasksService } from '../tasks/tasks.service';
import { ComplianceService } from '../filings/compliance.service';
import { 
  Service, 
  CreateServiceDto, 
  UpdateServiceDto,
  ServiceFilters,
  ServiceSummary
} from './interfaces/service.interface';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly configService: IntegrationConfigService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => ComplianceService))
    private readonly complianceService: ComplianceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all services with optional filters' })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiQuery({ name: 'kind', required: false, type: String })
  @ApiQuery({ name: 'frequency', required: false, enum: ['ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAllServices(@Query() filters: ServiceFilters) {
    return this.servicesService.findAll(filters);
  }

  @Get('with-client-details')
  @ApiOperation({ summary: 'Get services with client details' })
  async getServicesWithClientDetails(@Query() filters: ServiceFilters) {
    return this.servicesService.getServicesWithClientDetails(filters);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get services by client ID' })
  async findByClient(@Param('clientId') clientId: string) {
    return this.servicesService.findByClient(clientId);
  }

  @Get('kind/:kind')
  @ApiOperation({ summary: 'Get services by kind' })
  async findByKind(@Param('kind') kind: string) {
    return this.servicesService.findByKind(kind);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search services' })
  @ApiQuery({ name: 'q', required: true, type: String })
  async searchServices(
    @Query('q') query: string,
    @Query() filters: ServiceFilters
  ) {
    return this.servicesService.search(query, filters);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get service summary statistics' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  async getServiceSummary(@Query('portfolioCode') portfolioCode?: string): Promise<ServiceSummary> {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.servicesService.getServiceSummary(portfolio);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Get service details with related tasks and compliance items' })
  @ApiResponse({ status: 200, description: 'Service details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceDetails(@Param('id') id: string) {
    const service = await this.servicesService.findOne(id);
    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }

    // Get related tasks
    const tasks = await this.tasksService.findByService(id);

    // Get related compliance items
    const complianceItems = await this.complianceService.findByService(id);

    // Calculate summary statistics
    const summary = {
      totalTasks: tasks.length,
      openTasks: tasks.filter(t => t.status === 'OPEN').length,
      inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
      cancelledTasks: tasks.filter(t => t.status === 'CANCELLED').length,
      overdueTasks: tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < new Date() && 
        t.status !== 'COMPLETED' && 
        t.status !== 'CANCELLED'
      ).length,
      pendingCompliance: complianceItems.filter(c => c.status === 'PENDING').length,
      filedCompliance: complianceItems.filter(c => c.status === 'FILED').length,
      overdueCompliance: complianceItems.filter(c => c.status === 'OVERDUE').length,
      exemptCompliance: complianceItems.filter(c => c.status === 'EXEMPT').length,
      totalCompliance: complianceItems.length,
    };

    return {
      service,
      tasks,
      complianceItems,
      summary,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  async findOneService(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new service' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  async createService(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update service' })
  async updateService(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update service status' })
  async updateServiceStatus(
    @Param('id') id: string, 
    @Body() body: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }
  ) {
    return this.servicesService.updateStatus(id, body.status);
  }

  @Put(':id/next-due')
  @ApiOperation({ summary: 'Update service next due date' })
  async updateNextDueDate(
    @Param('id') id: string, 
    @Body() body: { nextDue: string }
  ) {
    return this.servicesService.updateNextDueDate(id, new Date(body.nextDue));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete service' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteService(@Param('id') id: string) {
    const deleted = await this.servicesService.delete(id);
    return { deleted };
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Export services as CSV with practice meta and filters' })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiQuery({ name: 'kind', required: false, type: String })
  @ApiQuery({ name: 'frequency', required: false, enum: ['ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="services-${new Date().toISOString().slice(0,10)}.csv"`)
  async exportCSV(@Query() filters: ServiceFilters): Promise<string> {
    const practice = await this.configService.getPracticeSettings();
    const items = await this.servicesService.getServicesWithClientDetails(filters);
    const headers = [
      'Client Ref','Client','Service','Frequency','Fee','Annual','Status','Next Due','Portfolio'
    ];
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const meta = `Practice: ${practice.practiceName}\nGenerated: ${new Date().toISOString()}\nFilters: ${JSON.stringify(filters)}`;
    const rows = [headers.join(',')];
    for (const s of items) {
      rows.push([
        s.clientRef,
        s.clientName,
        s.kind,
        s.frequency,
        s.fee,
        s.annualized,
        s.status,
        s.nextDue ? new Date(s.nextDue).toISOString().slice(0,10) : '',
        s.portfolioCode,
      ].map(esc).join(','));
    }
    return meta + "\n\n" + rows.join('\n');
  }

  @Get('export.xlsx')
  @ApiOperation({ summary: 'Export services as Excel (.xlsx if available, else .xls XML)' })
  async exportXLSX(@Query() filters: ServiceFilters, @Res() res): Promise<void> {
    const items = await this.servicesService.getServicesWithClientDetails(filters);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ExcelJS = require('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Services');
      ws.addRow(['Client Ref','Client','Service','Frequency','Fee','Annual','Status','Next Due','Portfolio']);
      for (const s of items) {
        ws.addRow([
          s.clientRef,
          s.clientName,
          s.kind,
          s.frequency,
          s.fee,
          s.annualized,
          s.status,
          s.nextDue ? new Date(s.nextDue).toISOString().slice(0,10) : '',
          s.portfolioCode,
        ]);
      }
      const buffer: Buffer = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="services-${new Date().toISOString().slice(0,10)}.xlsx"`);
      res.send(Buffer.from(buffer));
    } catch (e) {
      const headers = ['Client Ref','Client','Service','Frequency','Fee','Annual','Status','Next Due','Portfolio'];
      const cell = (v: any) => `<Cell><Data ss:Type=\"String\">${String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`;
      const rows = items.map(s =>
        `<Row>${[
          s.clientRef,
          s.clientName,
          s.kind,
          s.frequency,
          s.fee,
          s.annualized,
          s.status,
          s.nextDue ? new Date(s.nextDue).toISOString().slice(0,10) : '',
          s.portfolioCode,
        ].map(cell).join('')}</Row>`
      ).join('');
      const headerRow = `<Row>${headers.map(cell).join('')}</Row>`;
      const xml = `<?xml version=\"1.0\"?>\n<?mso-application progid=\"Excel.Sheet\"?>\n<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n  <Worksheet ss:Name=\"Services\">\n    <Table>\n      ${headerRow}\n      ${rows}\n    </Table>\n  </Worksheet>\n</Workbook>`;
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="services-${new Date().toISOString().slice(0,10)}.xls"`);
      res.send(xml);
    }
  }

  @Get('export.pdf')
  @ApiOperation({ summary: 'Export services as PDF' })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', `attachment; filename="services-${new Date().toISOString().slice(0,10)}.pdf"`)
  async exportPDF(@Query() filters: ServiceFilters): Promise<Buffer> {
    const items = await this.servicesService.getServicesWithClientDetails(filters);
    const body = [
      [{ text: 'Client Ref', bold: true }, { text: 'Client', bold: true }, { text: 'Service', bold: true }, { text: 'Frequency', bold: true }, { text: 'Fee', bold: true }, { text: 'Annual', bold: true }, { text: 'Status', bold: true }, { text: 'Next Due', bold: true }],
      ...items.map(s => [
        s.clientRef,
        s.clientName,
        s.kind,
        s.frequency,
        String(s.fee),
        String(s.annualized),
        s.status,
        s.nextDue ? new Date(s.nextDue).toLocaleDateString('en-GB') : ''
      ])
    ];
    const PdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    PdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;
    const docDefinition = {
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: 'Services Export', style: 'header' },
        { text: new Date().toLocaleString('en-GB'), style: 'sub' },
        { text: '\n' },
        { table: { headerRows: 1, widths: ['*','*','*','auto','auto','auto','auto','auto'], body } }
      ],
      styles: { header: { fontSize: 16, bold: true }, sub: { color: '#666' } }
    };
    return await new Promise<Buffer>((resolve, reject) => {
      const pdfDoc = PdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => buffer ? resolve(buffer) : reject(new Error('PDF failed')));
    });
  }
}
