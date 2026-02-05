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
  NotFoundException,
  BadRequestException,
  Request
} from '@nestjs/common';
import { Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { StandaloneTaskTemplatesService } from './standalone-task-templates.service';
import { IntegrationConfigService } from '../integrations/services/integration-config.service';
import { 
  Task, 
  CreateTaskDto, 
  UpdateTaskDto,
  TaskFilters,
  ServiceTemplate,
  CreateServiceTemplateDto,
  UpdateServiceTemplateDto,
  StandaloneTaskTemplate,
  CreateStandaloneTaskTemplateDto
} from './interfaces/task.interface';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly standaloneTaskTemplatesService: StandaloneTaskTemplatesService,
    private readonly configService: IntegrationConfigService,
  ) {}

  private isDemoUser(req: any) {
    return req?.user?.id === 'demo-user';
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with optional filters' })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'assigneeId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAllTasks(@Request() req: any, @Query() filters: TaskFilters) {
    if (this.isDemoUser(req)) {
      return [];
    }
    return this.tasksService.findAll(filters);
  }

  @Get('with-client-details')
  @ApiOperation({ summary: 'Get tasks with client details' })
  async findTasksWithClientDetails(@Request() req: any, @Query() filters: TaskFilters) {
    if (this.isDemoUser(req)) {
      return [];
    }
    return this.tasksService.findAllWithClientDetails(filters);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get task summary statistics' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  async getTaskSummary(@Request() req: any, @Query('portfolioCode') portfolioCode?: string) {
    if (this.isDemoUser(req)) {
      return {
        totalTasks: 0,
        openTasks: 0,
        inProgressTasks: 0,
        reviewTasks: 0,
        completedTasks: 0,
        cancelledTasks: 0,
        overdueTasks: 0,
        dueSoonTasks: 0,
        tasksByPriority: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          URGENT: 0,
        },
        tasksByStatus: {
          TODO: 0,
          IN_PROGRESS: 0,
          REVIEW: 0,
          COMPLETED: 0,
          CANCELLED: 0,
        },
      };
    }
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.tasksService.getTaskSummary(portfolio);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue tasks' })
  async getOverdueTasks(@Request() req: any) {
    if (this.isDemoUser(req)) {
      return [];
    }
    return this.tasksService.findOverdue();
  }

  @Get('due-soon')
  @ApiOperation({ summary: 'Get tasks due soon' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days ahead to look (default: 7)' })
  async getTasksDueSoon(@Request() req: any, @Query('days') days?: string) {
    if (this.isDemoUser(req)) {
      return [];
    }
    const daysAhead = days ? parseInt(days) : 7;
    return this.tasksService.findDueSoon(daysAhead);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get tasks by client ID' })
  async findByClient(@Request() req: any, @Param('clientId') clientId: string) {
    if (this.isDemoUser(req)) {
      return [];
    }
    return this.tasksService.findByClient(clientId);
  }

  @Get('service/:serviceId')
  @ApiOperation({ summary: 'Get tasks by service ID' })
  async findByService(@Request() req: any, @Param('serviceId') serviceId: string) {
    if (this.isDemoUser(req)) {
      return [];
    }
    return this.tasksService.findByService(serviceId);
  }

  @Get('assignee/:assigneeId')
  @ApiOperation({ summary: 'Get tasks by assignee' })
  async findByAssignee(@Request() req: any, @Param('assigneeId') assigneeId: string) {
    if (this.isDemoUser(req)) {
      return [];
    }
    return this.tasksService.findByAssignee(assigneeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findOneTask(@Request() req: any, @Param('id') id: string) {
    if (this.isDemoUser(req)) {
      return null;
    }
    return this.tasksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  async updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(@Param('id') id: string) {
    const deleted = await this.tasksService.delete(id);
    return { deleted };
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete tasks' })
  async bulkDeleteTasks(@Request() req: any, @Body() body: { ids?: string[] }) {
    if (this.isDemoUser(req)) {
      return { deletedCount: 0 };
    }
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids array is required');
    }
    const deletedCount = await this.tasksService.deleteMany(ids);
    return { deletedCount };
  }

  // Service Template endpoints
  @Get('templates/service-templates')
  @ApiOperation({ summary: 'Get all service templates' })
  async getAllServiceTemplates() {
    return this.tasksService.getAllServiceTemplates();
  }

  @Get('templates/service-templates/:id')
  @ApiOperation({ summary: 'Get service template by id' })
  async getServiceTemplate(@Param('id') id: string) {
    return this.tasksService.findServiceTemplate(id);
  }

  @Post('templates/service-templates')
  @ApiOperation({ summary: 'Create service template' })
  async createServiceTemplate(@Body() createDto: CreateServiceTemplateDto) {
    return this.tasksService.createServiceTemplate(createDto);
  }

  @Put('templates/service-templates/:id')
  @ApiOperation({ summary: 'Update service template' })
  async updateServiceTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceTemplateDto
  ) {
    return this.tasksService.updateServiceTemplate(id, updateDto);
  }

  @Delete('templates/service-templates/:id')
  @ApiOperation({ summary: 'Delete service template' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteServiceTemplate(@Param('id') id: string) {
    const deleted = await this.tasksService.deleteServiceTemplate(id);
    return { deleted };
  }

  // Standalone Task Template endpoints
  @Get('templates/standalone')
  @ApiOperation({ summary: 'Get all standalone task templates' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'Returns all standalone task templates or filtered by category' })
  async getStandaloneTaskTemplates(
    @Query('category') category?: string,
  ): Promise<StandaloneTaskTemplate[]> {
    if (category) {
      return this.standaloneTaskTemplatesService.findByCategory(category);
    }
    return this.standaloneTaskTemplatesService.findAll();
  }

  @Get('templates/standalone/:id')
  @ApiOperation({ summary: 'Get standalone task template by ID' })
  @ApiResponse({ status: 200, description: 'Returns the standalone task template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getStandaloneTaskTemplate(
    @Param('id') id: string,
  ): Promise<StandaloneTaskTemplate> {
    const template = await this.standaloneTaskTemplatesService.findOne(id);
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  @Post('templates/standalone')
  @ApiOperation({ summary: 'Create custom standalone task template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createStandaloneTaskTemplate(
    @Body() dto: CreateStandaloneTaskTemplateDto,
  ): Promise<StandaloneTaskTemplate> {
    return this.standaloneTaskTemplatesService.create(dto);
  }

  // Task generation endpoints
  @Post('generate/service/:serviceId')
  @ApiOperation({ summary: 'Generate tasks from service template' })
  async generateTasksFromService(@Param('serviceId') serviceId: string) {
    return this.tasksService.generateTasksFromService(serviceId);
  }

  @Post('generate/all-services')
  @ApiOperation({ summary: 'Generate tasks for all active services' })
  async generateTasksForAllServices() {
    return this.tasksService.generateTasksForAllServices();
  }

  @Post('generate/client/:clientId')
  @ApiOperation({ summary: 'Generate tasks for a client\'s services' })
  async generateTasksForClient(@Param('clientId') clientId: string) {
    return this.tasksService.generateTasksForClient(clientId);
  }

  @Put('service/:serviceId/update-next-due')
  @ApiOperation({ summary: 'Update service next due date based on frequency' })
  async updateServiceNextDueDate(@Param('serviceId') serviceId: string) {
    await this.tasksService.updateServiceNextDueDate(serviceId);
    return { message: 'Service next due date updated successfully' };
  }

  // Deadline tracking and notification endpoints
  @Get('alerts/dashboard')
  @ApiOperation({ summary: 'Get dashboard alerts for overdue and upcoming tasks' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  async getDashboardAlerts(@Query('portfolioCode') portfolioCode?: string) {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.tasksService.getDashboardAlerts(portfolio);
  }

  @Get('recommendations/priority')
  @ApiOperation({ summary: 'Get priority task recommendations' })
  @ApiQuery({ name: 'assignee', required: false, type: String })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  async getPriorityTaskRecommendations(
    @Query('assignee') assignee?: string,
    @Query('portfolioCode') portfolioCode?: string
  ) {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.tasksService.getPriorityTaskRecommendations(assignee, portfolio);
  }

  @Get('compliance/deadlines')
  @ApiOperation({ summary: 'Get compliance-related deadlines' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  async getComplianceDeadlines(@Query('portfolioCode') portfolioCode?: string) {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.tasksService.getComplianceDeadlines(portfolio);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Export tasks as CSV with practice meta and filters' })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'assignee', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.csv"`)
  async exportCSV(@Query() filters: TaskFilters): Promise<string> {
    const practice = await this.configService.getPracticeSettings();
    const items = await this.tasksService.findAllWithClientDetails(filters);
    const headers = ['Title','Client Identifier','Client','Service','Priority','Status','Assignee','Due Date','Portfolio'];
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const meta = `Practice: ${practice.practiceName}\nGenerated: ${new Date().toISOString()}\nFilters: ${JSON.stringify(filters)}`;
    const rows = [headers.join(',')];
    for (const t of items) {
      rows.push([
        t.title,
        t.clientIdentifier,
        t.clientName,
        t.serviceName || '',
        t.priority,
        t.status,
        t.assignee || '',
        t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '',
        t.portfolioCode || '',
      ].map(esc).join(','));
    }
    return meta + "\n\n" + rows.join('\n');
  }

  @Get('export.xlsx')
  @ApiOperation({ summary: 'Export tasks as Excel (.xlsx if available, else .xls XML)' })
  async exportXLSX(@Query() filters: TaskFilters, @Res() res): Promise<void> {
    const items = await this.tasksService.findAllWithClientDetails(filters);
    try {
      const ExcelJS = require('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Tasks');
      ws.addRow(['Title','Client Identifier','Client','Service','Priority','Status','Assignee','Due Date','Portfolio']);
      for (const t of items) {
        ws.addRow([
          t.title,
          t.clientIdentifier,
          t.clientName,
          t.serviceName || '',
          t.priority,
          t.status,
          t.assignee || '',
          t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '',
          t.portfolioCode || ''
        ]);
      }
      const buffer: Buffer = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.xlsx"`);
      res.send(Buffer.from(buffer));
    } catch (e) {
      const headers = ['Title','Client Identifier','Client','Service','Priority','Status','Assignee','Due Date','Portfolio'];
      const cell = (v: any) => `<Cell><Data ss:Type=\"String\">${String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`;
      const rows = items.map(t => `<Row>${[
        t.title,
        t.clientIdentifier,
        t.clientName,
        t.serviceName || '',
        t.priority,
        t.status,
        t.assignee || '',
        t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '',
        t.portfolioCode || ''
      ].map(cell).join('')}</Row>`).join('');
      const headerRow = `<Row>${headers.map(cell).join('')}</Row>`;
      const xml = `<?xml version=\"1.0\"?>\n<?mso-application progid=\"Excel.Sheet\"?>\n<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n  <Worksheet ss:Name=\"Tasks\">\n    <Table>\n      ${headerRow}\n      ${rows}\n    </Table>\n  </Worksheet>\n</Workbook>`;
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.xls"`);
      res.send(xml);
    }
  }

  @Get('export.pdf')
  @ApiOperation({ summary: 'Export tasks as PDF' })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.pdf"`)
  async exportPDF(@Query() filters: TaskFilters): Promise<Buffer> {
    const items = await this.tasksService.findAllWithClientDetails(filters);
    const body = [
      [{ text: 'Title', bold: true }, { text: 'Client', bold: true }, { text: 'Service', bold: true }, { text: 'Priority', bold: true }, { text: 'Status', bold: true }, { text: 'Assignee', bold: true }, { text: 'Due', bold: true }],
      ...items.map(t => [
        t.title,
        `${t.clientIdentifier || ''} ${t.clientName || ''}`.trim(),
        t.serviceName || '',
        t.priority,
        t.status,
        t.assignee || '',
        t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : ''
      ])
    ];
    const PdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    PdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;
    const docDefinition = {
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: 'Tasks Export', style: 'header' },
        { text: new Date().toLocaleString('en-GB'), style: 'sub' },
        { text: '\n' },
        { table: { headerRows: 1, widths: ['*','*','*','auto','auto','auto','auto'], body } }
      ],
      styles: { header: { fontSize: 16, bold: true }, sub: { color: '#666' } }
    };
    return await new Promise<Buffer>((resolve, reject) => {
      const pdfDoc = PdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => buffer ? resolve(buffer) : reject(new Error('PDF failed')));
    });
  }
}
