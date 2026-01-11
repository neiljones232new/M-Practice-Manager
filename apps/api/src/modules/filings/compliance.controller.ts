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
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComplianceService } from './compliance.service';
import { ComplianceTaskIntegrationService } from './compliance-task-integration.service';
import { ComplianceItem, CreateComplianceItemDto } from '../companies-house/interfaces/companies-house.interface';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  private readonly logger = new Logger(ComplianceController.name);

  constructor(
    private readonly complianceService: ComplianceService,
    private readonly integrationService: ComplianceTaskIntegrationService,
  ) {}

  @Post()
  async createComplianceItem(@Body() createDto: CreateComplianceItemDto): Promise<ComplianceItem> {
    this.logger.log(`Creating compliance item for client ${createDto.clientId}`);
    return this.complianceService.createComplianceItem(createDto);
  }

  @Get()
  async getAllComplianceItems(
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('overdue') overdue?: string,
    @Query('upcoming') upcoming?: string,
    @Query('daysAhead') daysAhead?: string,
  ): Promise<ComplianceItem[]> {
    if (clientId) {
      return this.complianceService.getComplianceItemsByClient(clientId);
    }

    if (overdue === 'true') {
      return this.complianceService.getOverdueComplianceItems();
    }

    if (upcoming === 'true') {
      const days = daysAhead ? parseInt(daysAhead, 10) : 30;
      return this.complianceService.getUpcomingComplianceItems(days);
    }

    const allItems = await this.complianceService.getAllComplianceItems();
    
    if (status) {
      return allItems.filter(item => item.status === status);
    }

    return allItems;
  }

  @Get(':id')
  async getComplianceItem(@Param('id') id: string): Promise<ComplianceItem> {
    return this.complianceService.getComplianceItem(id);
  }

  @Put(':id')
  async updateComplianceItem(
    @Param('id') id: string,
    @Body() updateData: Partial<ComplianceItem>,
  ): Promise<ComplianceItem> {
    this.logger.log(`Updating compliance item ${id}`);
    return this.complianceService.updateComplianceItem(id, updateData);
  }

  @Delete(':id')
  async deleteComplianceItem(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting compliance item ${id}`);
    return this.complianceService.deleteComplianceItem(id);
  }

  @Put(':id/filed')
  async markComplianceItemFiled(
    @Param('id') id: string,
    @Body() body: { filedDate?: string },
  ): Promise<ComplianceItem> {
    this.logger.log(`Marking compliance item ${id} as filed`);
    const filedDate = body.filedDate ? new Date(body.filedDate) : undefined;
    return this.complianceService.markComplianceItemFiled(id, filedDate);
  }

  @Put(':id/overdue')
  async markComplianceItemOverdue(@Param('id') id: string): Promise<ComplianceItem> {
    this.logger.log(`Marking compliance item ${id} as overdue`);
    return this.complianceService.markComplianceItemOverdue(id);
  }

  @Post('manual')
  async createManualComplianceItem(@Body() createDto: CreateComplianceItemDto): Promise<ComplianceItem> {
    this.logger.log(`Creating manual compliance item for client ${createDto.clientId}`);
    return this.complianceService.createManualComplianceItem(createDto);
  }

  @Get('by-type/:type')
  async getComplianceItemsByType(@Param('type') type: string): Promise<ComplianceItem[]> {
    return this.complianceService.getComplianceItemsByType(type);
  }

  @Get('by-source/:source')
  async getComplianceItemsBySource(
    @Param('source') source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL',
  ): Promise<ComplianceItem[]> {
    return this.complianceService.getComplianceItemsBySource(source);
  }

  @Get('date-range')
  async getComplianceItemsByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ComplianceItem[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.complianceService.getComplianceItemsByDateRange(start, end);
  }

  @Put('bulk-update')
  async bulkUpdateComplianceStatus(
    @Body() body: { ids: string[]; status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT' },
  ): Promise<ComplianceItem[]> {
    this.logger.log(`Bulk updating ${body.ids.length} compliance items to status ${body.status}`);
    return this.complianceService.bulkUpdateComplianceStatus(body.ids, body.status);
  }

  @Get('statistics')
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  async getComplianceStatistics(@Query('portfolioCode') portfolioCode?: string): Promise<{
    total: number;
    pending: number;
    overdue: number;
    dueThisMonth: number;
    filed: number;
    totalItems: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    overdueCount: number;
    upcomingCount: number;
  }> {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.complianceService.getComplianceStatistics(portfolio);
  }

  @Post(':id/create-task')
  async createTaskFromComplianceItem(
    @Param('id') id: string,
    @Body() body: { assignee?: string },
  ): Promise<{ taskId: string }> {
    this.logger.log(`Creating task from compliance item ${id}`);
    const taskId = await this.complianceService.createTaskFromComplianceItem(id, body.assignee);
    return { taskId };
  }

  @Post('create-overdue-tasks')
  async createTasksForOverdueCompliance(
    @Body() body: { assignee?: string },
  ): Promise<{ taskIds: string[] }> {
    this.logger.log('Creating tasks for overdue compliance items');
    const taskIds = await this.complianceService.createTasksForOverdueCompliance(body.assignee);
    return { taskIds };
  }

  @Post('create-upcoming-tasks')
  async createTasksForUpcomingCompliance(
    @Body() body: { daysAhead?: number; assignee?: string },
  ): Promise<{ taskIds: string[] }> {
    const daysAhead = body.daysAhead || 30;
    this.logger.log(`Creating tasks for upcoming compliance items (${daysAhead} days ahead)`);
    const taskIds = await this.complianceService.createTasksForUpcomingCompliance(daysAhead, body.assignee);
    return { taskIds };
  }

  @Post('escalate-overdue')
  async escalateOverdueCompliance(): Promise<{ escalated: number; tasksCreated: number }> {
    this.logger.log('Escalating overdue compliance items');
    return this.complianceService.escalateOverdueCompliance();
  }

  @Get('task-relationships')
  async getComplianceTaskRelationships(): Promise<{
    complianceId: string;
    complianceType: string;
    complianceDescription: string;
    dueDate?: string;
    status: string;
    relatedTasks: any[];
  }[]> {
    return this.complianceService.getComplianceTaskRelationships();
  }

  @Get(':id/tasks')
  async getTasksForComplianceItem(@Param('id') id: string): Promise<any[]> {
    return this.complianceService.findTasksForComplianceItem(id);
  }

  @Get('dashboard/summary')
  async getComplianceSummary(): Promise<{
    total: number;
    pending: number;
    overdue: number;
    upcoming: number;
    filed: number;
  }> {
    const allItems = await this.complianceService.getAllComplianceItems();
    const overdueItems = await this.complianceService.getOverdueComplianceItems();
    const upcomingItems = await this.complianceService.getUpcomingComplianceItems(30);

    return {
      total: allItems.length,
      pending: allItems.filter(item => item.status === 'PENDING').length,
      overdue: overdueItems.length,
      upcoming: upcomingItems.length,
      filed: allItems.filter(item => item.status === 'FILED').length,
    };
  }

  @Get('dashboard/integrated')
  async getIntegratedDashboard(): Promise<{
    summary: any;
    overdueWithTasks: any[];
    upcomingWithTasks: any[];
    taskRelationships: any[];
  }> {
    return this.integrationService.getComplianceDashboardData();
  }

  @Post('integration/create-deadline-tasks')
  async createTasksForDeadlines(
    @Body() body: { daysAhead?: number; assignee?: string; portfolioCode?: number },
  ): Promise<{ created: number; skipped: number; errors: number }> {
    this.logger.log('Creating tasks for compliance deadlines via integration service');
    return this.integrationService.createTasksForComplianceDeadlines(
      body.daysAhead,
      body.assignee,
      body.portfolioCode,
    );
  }

  @Post('integration/sync-with-tasks')
  async syncComplianceWithTasks(): Promise<{ synced: number; errors: number }> {
    this.logger.log('Syncing compliance status with task status');
    return this.integrationService.syncComplianceWithTasks();
  }

  @Get('integration/priority-recommendations')
  async getPriorityRecommendations(): Promise<{
    criticalItems: any[];
    recommendations: string[];
    actionItems: any[];
  }> {
    return this.integrationService.getPriorityRecommendations();
  }

  @Post('auto-generate-from-services')
  @ApiOperation({ summary: 'Auto-generate compliance items from active services' })
  async autoGenerateFromServices(): Promise<{
    generated: number;
    skipped: number;
    errors: string[];
    debug: {
      totalServices: number;
      activeServices: number;
      clientsWithServices: number;
      servicesProcessed: number;
      clientsNotFound: number;
    };
  }> {
    this.logger.log('Auto-generating compliance items from services');
    return this.complianceService.autoGenerateFromServices();
  }

  @Post('cleanup/invalid-clients')
  @ApiOperation({ summary: 'Remove compliance items with invalid client IDs' })
  async cleanupInvalidClients(): Promise<{
    totalItems: number;
    invalidItems: number;
    removedItems: number;
    errors: string[];
  }> {
    return this.complianceService.cleanupInvalidClients();
  }

  @Post('cleanup/duplicates')
  @ApiOperation({ summary: 'Clean up duplicate compliance items' })
  async cleanupDuplicates(): Promise<{
    totalFiles: number;
    duplicatesFound: number;
    duplicatesRemoved: number;
    errors: string[];
  }> {
    this.logger.log('Starting compliance duplicates cleanup');
    
    const errors: string[] = [];
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    
    try {
      const allItems = await this.complianceService.getAllComplianceItems();
      const totalFiles = allItems.length;
      
      this.logger.log(`Found ${totalFiles} total compliance items`);
      
      // Group items by client + service + type to find duplicates
      const itemGroups = new Map<string, ComplianceItem[]>();
      
      for (const item of allItems) {
        const key = `${item.clientId}|${item.serviceId || 'no-service'}|${item.type}`;
        if (!itemGroups.has(key)) {
          itemGroups.set(key, []);
        }
        itemGroups.get(key)!.push(item);
      }
      
      // Find and remove duplicates (keep the most recent one)
      for (const [key, items] of itemGroups) {
        if (items.length > 1) {
          duplicatesFound += items.length - 1;
          
          // Sort by creation date (most recent first)
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          // Keep the first (most recent), remove the rest
          const itemsToRemove = items.slice(1);
          
          for (const itemToRemove of itemsToRemove) {
            try {
              await this.complianceService.deleteComplianceItem(itemToRemove.id);
              duplicatesRemoved++;
              this.logger.log(`Removed duplicate compliance item: ${itemToRemove.id}`);
            } catch (error) {
              errors.push(`Failed to remove duplicate ${itemToRemove.id}: ${error.message}`);
            }
          }
        }
      }
      
      this.logger.log(`Cleanup complete: ${duplicatesRemoved} duplicates removed, ${errors.length} errors`);
      
      return {
        totalFiles,
        duplicatesFound,
        duplicatesRemoved,
        errors
      };
    } catch (error) {
      this.logger.error('Cleanup duplicates error:', error);
      errors.push(`Overall cleanup error: ${error.message}`);
      
      return {
        totalFiles: 0,
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        errors
      };
    }
  }

  @Get('debug/raw-files')
  @ApiOperation({ summary: 'Get raw compliance files for debugging' })
  async debugRawFiles(): Promise<{
    totalFiles: number;
    sampleFiles: any[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const sampleFiles: any[] = [];
    
    try {
      const files = await this.complianceService['fileStorageService'].listFiles('compliance');
      const totalFiles = files.filter(f => f.endsWith('.json')).length;
      
      // Read first 3 files directly
      const filesToRead = files.filter(f => f.endsWith('.json')).slice(0, 3);
      
      for (const file of filesToRead) {
        const id = file.replace('.json', '');
        try {
          const item = await this.complianceService['fileStorageService'].readJson('compliance', id);
          sampleFiles.push(item);
        } catch (error) {
          errors.push(`Failed to read ${id}: ${error.message}`);
        }
      }
      
      return {
        totalFiles,
        sampleFiles,
        errors
      };
    } catch (error) {
      return {
        totalFiles: 0,
        sampleFiles: [],
        errors: [error.message]
      };
    }
  }

  @Get('debug/test-service')
  @ApiOperation({ summary: 'Test compliance service directly' })
  async testComplianceService(): Promise<{
    totalItems: number;
    sampleItems: any[];
    errors: string[];
  }> {
    try {
      const items = await this.complianceService.getAllComplianceItems();
      return {
        totalItems: items.length,
        sampleItems: items.slice(0, 3),
        errors: []
      };
    } catch (error) {
      return {
        totalItems: 0,
        sampleItems: [],
        errors: [error.message]
      };
    }
  }

  @Get('debug/filesystem')
  @ApiOperation({ summary: 'Debug file system - check actual directories and files' })
  async debugFileSystem(): Promise<{
    storageBasePath: string;
    complianceDir: {
      exists: boolean;
      path: string;
      totalFiles: number;
      jsonFiles: number;
      sampleFiles: string[];
    };
    recentFiles: Array<{
      name: string;
      size: number;
      created: string;
      content?: any;
    }>;
    errors: string[];
  }> {
    const errors: string[] = [];
    const fs = require('fs').promises;
    const path = require('path');
    const existsSync = require('fs').existsSync;
    
    try {
      // Get the file storage service
      const fileStorageService = this.complianceService['fileStorageService'];
      const basePath = fileStorageService['storagePath'] || '../../storage';
      const compliancePath = path.join(basePath, 'compliance');
      
      this.logger.log(`Checking file system at: ${compliancePath}`);
      
      // Check if compliance directory exists
      const complianceDirExists = existsSync(compliancePath);
      let allFiles: string[] = [];
      let jsonFiles: string[] = [];
      let recentFiles: any[] = [];
      
      if (complianceDirExists) {
        try {
          allFiles = await fs.readdir(compliancePath);
          jsonFiles = allFiles.filter(f => f.endsWith('.json'));
          this.logger.log(`Found ${allFiles.length} total files, ${jsonFiles.length} JSON files in compliance directory`);
          
          // Only process the first 3 files to avoid timeout
          const sampleFiles = jsonFiles.slice(0, 3);
          for (const fileName of sampleFiles) {
            try {
              const filePath = path.join(compliancePath, fileName);
              const stats = await fs.stat(filePath);
              const content = await fs.readFile(filePath, 'utf8');
              
              recentFiles.push({
                name: fileName,
                size: stats.size,
                created: stats.birthtime.toISOString(),
                content: JSON.parse(content)
              });
            } catch (error) {
              errors.push(`Failed to read file ${fileName}: ${error.message}`);
            }
          }
        } catch (error) {
          errors.push(`Failed to read compliance directory: ${error.message}`);
        }
      } else {
        errors.push(`Compliance directory does not exist: ${compliancePath}`);
      }
      
      return {
        storageBasePath: basePath,
        complianceDir: {
          exists: complianceDirExists,
          path: compliancePath,
          totalFiles: allFiles.length,
          jsonFiles: jsonFiles.length,
          sampleFiles: jsonFiles.slice(0, 10) // Just show first 10 file names
        },
        recentFiles,
        errors
      };
    } catch (error) {
      this.logger.error('Debug filesystem error:', error);
      errors.push(`Overall filesystem debug error: ${error.message}`);
      
      return {
        storageBasePath: 'unknown',
        complianceDir: {
          exists: false,
          path: 'unknown',
          totalFiles: 0,
          jsonFiles: 0,
          sampleFiles: []
        },
        recentFiles: [],
        errors
      };
    }
  }
}