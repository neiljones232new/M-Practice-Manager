import { Controller, Get, Post, Body, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileAuditService, FileAuditResult, AuditSummary } from './file-audit.service';
import { FileCleanupService, CleanupOptions, CleanupPlan } from './file-cleanup.service';

@ApiTags('File System Audit')
@Controller('file-audit')
@UseGuards(JwtAuthGuard)
export class FileAuditController {
  private readonly logger = new Logger(FileAuditController.name);

  constructor(
    private fileAuditService: FileAuditService,
    private fileCleanupService: FileCleanupService
  ) {}

  @Get('audit')
  @ApiOperation({ 
    summary: 'Perform comprehensive file system audit',
    description: 'Analyzes all JSON files in the storage system to identify connected vs disconnected files and provide migration recommendations'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Audit completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              filePath: { type: 'string' },
              fileName: { type: 'string' },
              status: { type: 'string', enum: ['connected', 'disconnected', 'orphaned', 'corrupted'] },
              reason: { type: 'string' },
              size: { type: 'number' },
              lastModified: { type: 'string', format: 'date-time' },
              checksum: { type: 'string' },
              hasBackup: { type: 'boolean' },
              migrationRecommendation: { type: 'string', enum: ['migrate', 'backup_and_remove', 'remove', 'keep'] }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalFiles: { type: 'number' },
            connectedFiles: { type: 'number' },
            disconnectedFiles: { type: 'number' },
            orphanedFiles: { type: 'number' },
            corruptedFiles: { type: 'number' },
            totalSize: { type: 'number' },
            categories: { type: 'object' },
            recommendations: { type: 'object' }
          }
        }
      }
    }
  })
  async performAudit(): Promise<{
    success: boolean;
    results: FileAuditResult[];
    summary: AuditSummary;
    message: string;
  }> {
    try {
      this.logger.log('Starting file system audit via API');
      
      const { results, summary } = await this.fileAuditService.auditAllFiles();
      
      return {
        success: true,
        results,
        summary,
        message: `Audit completed: ${summary.totalFiles} files analyzed, ${summary.disconnectedFiles + summary.orphanedFiles + summary.corruptedFiles} files need attention`
      };
    } catch (error) {
      this.logger.error('File audit failed:', error);
      return {
        success: false,
        results: [],
        summary: {
          totalFiles: 0,
          connectedFiles: 0,
          disconnectedFiles: 0,
          orphanedFiles: 0,
          corruptedFiles: 0,
          totalSize: 0,
          categories: {},
          recommendations: { migrate: 0, backupAndRemove: 0, remove: 0, keep: 0 }
        },
        message: `Audit failed: ${error.message}`
      };
    }
  }

  @Get('audit/summary')
  @ApiOperation({ 
    summary: 'Get audit summary only',
    description: 'Returns a summary of the file system audit without detailed file information'
  })
  @ApiResponse({ status: 200, description: 'Audit summary retrieved successfully' })
  async getAuditSummary(): Promise<{
    success: boolean;
    summary: AuditSummary;
    message: string;
  }> {
    try {
      const { summary } = await this.fileAuditService.auditAllFiles();
      
      return {
        success: true,
        summary,
        message: 'Audit summary generated successfully'
      };
    } catch (error) {
      this.logger.error('Failed to get audit summary:', error);
      return {
        success: false,
        summary: {
          totalFiles: 0,
          connectedFiles: 0,
          disconnectedFiles: 0,
          orphanedFiles: 0,
          corruptedFiles: 0,
          totalSize: 0,
          categories: {},
          recommendations: { migrate: 0, backupAndRemove: 0, remove: 0, keep: 0 }
        },
        message: `Failed to get audit summary: ${error.message}`
      };
    }
  }

  @Post('cleanup/plan')
  @ApiOperation({ 
    summary: 'Create cleanup plan',
    description: 'Creates a detailed cleanup plan based on audit results without executing it'
  })
  @ApiBody({
    description: 'Audit results to create cleanup plan from',
    schema: {
      type: 'object',
      properties: {
        auditResults: {
          type: 'array',
          items: { type: 'object' }
        }
      },
      required: ['auditResults']
    }
  })
  @ApiResponse({ status: 200, description: 'Cleanup plan created successfully' })
  async createCleanupPlan(@Body() body: { auditResults: FileAuditResult[] }): Promise<{
    success: boolean;
    plan: CleanupPlan;
    validation: any;
    timeEstimate: any;
    message: string;
  }> {
    try {
      const { auditResults } = body;
      
      if (!auditResults || !Array.isArray(auditResults)) {
        return {
          success: false,
          plan: {
            filesToMigrate: [],
            filesToBackupAndRemove: [],
            filesToRemove: [],
            filesToKeep: [],
            estimatedSpaceFreed: 0,
            migrationRequired: false
          },
          validation: { valid: false, issues: ['Invalid audit results provided'], warnings: [] },
          timeEstimate: { estimatedMinutes: 0, breakdown: {} },
          message: 'Invalid audit results provided'
        };
      }

      const plan = await this.fileCleanupService.createCleanupPlan(auditResults);
      const validation = await this.fileCleanupService.validateCleanupPlan(plan);
      const timeEstimate = this.fileCleanupService.estimateCleanupTime(plan);

      return {
        success: true,
        plan,
        validation,
        timeEstimate,
        message: `Cleanup plan created: ${plan.filesToMigrate.length + plan.filesToBackupAndRemove.length + plan.filesToRemove.length} files to process`
      };
    } catch (error) {
      this.logger.error('Failed to create cleanup plan:', error);
      return {
        success: false,
        plan: {
          filesToMigrate: [],
          filesToBackupAndRemove: [],
          filesToRemove: [],
          filesToKeep: [],
          estimatedSpaceFreed: 0,
          migrationRequired: false
        },
        validation: { valid: false, issues: [error.message], warnings: [] },
        timeEstimate: { estimatedMinutes: 0, breakdown: {} },
        message: `Failed to create cleanup plan: ${error.message}`
      };
    }
  }

  @Post('cleanup/execute')
  @ApiOperation({ 
    summary: 'Execute cleanup plan',
    description: 'Executes a cleanup plan with specified options. Use with caution as this will modify/delete files.'
  })
  @ApiBody({
    description: 'Cleanup execution parameters',
    schema: {
      type: 'object',
      properties: {
        auditResults: {
          type: 'array',
          items: { type: 'object' }
        },
        options: {
          type: 'object',
          properties: {
            dryRun: { type: 'boolean', default: true },
            createBackup: { type: 'boolean', default: true },
            verifyBeforeDelete: { type: 'boolean', default: true },
            migrateBeforeCleanup: { type: 'boolean', default: true },
            batchSize: { type: 'number', default: 50 }
          }
        }
      },
      required: ['auditResults']
    }
  })
  @ApiResponse({ status: 200, description: 'Cleanup executed successfully' })
  async executeCleanup(@Body() body: { 
    auditResults: FileAuditResult[]; 
    options?: CleanupOptions;
  }): Promise<{
    success: boolean;
    plan: CleanupPlan;
    executionResult: any;
    report: string;
    message: string;
  }> {
    try {
      const { auditResults, options = { dryRun: true } } = body;
      
      if (!auditResults || !Array.isArray(auditResults)) {
        return {
          success: false,
          plan: {
            filesToMigrate: [],
            filesToBackupAndRemove: [],
            filesToRemove: [],
            filesToKeep: [],
            estimatedSpaceFreed: 0,
            migrationRequired: false
          },
          executionResult: null,
          report: '',
          message: 'Invalid audit results provided'
        };
      }

      // Safety check: ensure dry run is enabled by default
      const safeOptions = { 
        dryRun: true, 
        createBackup: true, 
        verifyBeforeDelete: true,
        ...options 
      };

      this.logger.log(`Executing cleanup with options: ${JSON.stringify(safeOptions)}`);

      const result = await this.fileCleanupService.performSafeCleanup(auditResults, safeOptions);

      return {
        success: result.success,
        plan: result.plan,
        executionResult: result.executionResult,
        report: result.report,
        message: result.success ? 'Cleanup completed successfully' : 'Cleanup completed with errors'
      };
    } catch (error) {
      this.logger.error('Cleanup execution failed:', error);
      return {
        success: false,
        plan: {
          filesToMigrate: [],
          filesToBackupAndRemove: [],
          filesToRemove: [],
          filesToKeep: [],
          estimatedSpaceFreed: 0,
          migrationRequired: false
        },
        executionResult: null,
        report: '',
        message: `Cleanup execution failed: ${error.message}`
      };
    }
  }

  @Post('backup')
  @ApiOperation({ 
    summary: 'Create backup of files',
    description: 'Creates a backup of specified files before cleanup'
  })
  @ApiBody({
    description: 'Files to backup',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'object' }
        },
        backupName: { type: 'string' }
      },
      required: ['files']
    }
  })
  @ApiResponse({ status: 200, description: 'Backup created successfully' })
  async createBackup(@Body() body: { 
    files: FileAuditResult[]; 
    backupName?: string;
  }): Promise<{
    success: boolean;
    backupPath?: string;
    filesBackedUp: string[];
    errors: string[];
    message: string;
  }> {
    try {
      const { files, backupName } = body;
      
      if (!files || !Array.isArray(files)) {
        return {
          success: false,
          filesBackedUp: [],
          errors: ['Invalid files provided'],
          message: 'Invalid files provided for backup'
        };
      }

      const result = await this.fileAuditService.createBackup(files, backupName);

      return {
        success: result.success,
        backupPath: result.backupPath,
        filesBackedUp: result.filesBackedUp,
        errors: result.errors,
        message: result.success 
          ? `Backup created successfully: ${result.filesBackedUp.length} files backed up`
          : `Backup failed with ${result.errors.length} errors`
      };
    } catch (error) {
      this.logger.error('Backup creation failed:', error);
      return {
        success: false,
        filesBackedUp: [],
        errors: [error.message],
        message: `Backup creation failed: ${error.message}`
      };
    }
  }

  @Get('report')
  @ApiOperation({ 
    summary: 'Generate audit report',
    description: 'Generates a comprehensive audit report in markdown format'
  })
  @ApiQuery({ name: 'includeDetails', required: false, type: Boolean, description: 'Include detailed file information' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  async generateReport(@Query('includeDetails') includeDetails: boolean = true): Promise<{
    success: boolean;
    report: string;
    message: string;
  }> {
    try {
      const { results, summary } = await this.fileAuditService.auditAllFiles();
      
      const report = await this.fileAuditService.generateAuditReport(
        includeDetails ? results : [],
        summary
      );

      return {
        success: true,
        report,
        message: 'Audit report generated successfully'
      };
    } catch (error) {
      this.logger.error('Report generation failed:', error);
      return {
        success: false,
        report: '',
        message: `Report generation failed: ${error.message}`
      };
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Check file system health',
    description: 'Performs a quick health check of the file storage system'
  })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async checkHealth(): Promise<{
    success: boolean;
    health: {
      storageAccessible: boolean;
      totalFiles: number;
      problematicFiles: number;
      lastAuditTime?: string;
    };
    message: string;
  }> {
    try {
      // Quick health check without full audit
      const { summary } = await this.fileAuditService.auditAllFiles();
      
      const problematicFiles = summary.disconnectedFiles + 
                              summary.orphanedFiles + 
                              summary.corruptedFiles;

      return {
        success: true,
        health: {
          storageAccessible: true,
          totalFiles: summary.totalFiles,
          problematicFiles,
          lastAuditTime: new Date().toISOString()
        },
        message: `File system health: ${summary.totalFiles} total files, ${problematicFiles} need attention`
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        success: false,
        health: {
          storageAccessible: false,
          totalFiles: 0,
          problematicFiles: 0
        },
        message: `Health check failed: ${error.message}`
      };
    }
  }
}