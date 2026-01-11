import { Controller, Post, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MigrationService, MigrationStats } from './migration.service';
import { DatabaseService } from './database.service';

@ApiTags('Migration')
@Controller('migration')
export class MigrationController {
  private readonly logger = new Logger(MigrationController.name);

  constructor(
    private migrationService: MigrationService,
    private databaseService: DatabaseService
  ) {}

  @Post('migrate-all')
  @ApiOperation({ summary: 'Migrate all data from JSON to SQLite' })
  @ApiResponse({ status: 200, description: 'Migration completed successfully' })
  @ApiResponse({ status: 500, description: 'Migration failed' })
  async migrateAllData(): Promise<{
    success: boolean;
    message: string;
    stats?: MigrationStats;
    error?: string;
  }> {
    this.logger.log('Starting full data migration...');
    
    try {
      const stats = await this.migrationService.migrateAllData();
      return {
        success: true,
        message: 'Migration completed successfully',
        stats
      };
    } catch (error) {
      this.logger.error('Migration failed:', error);
      return {
        success: false,
        message: 'Migration failed',
        error: error.message
      };
    }
  }

  @Get('audit-files')
  @ApiOperation({ summary: 'Audit JSON files to identify connected vs disconnected files' })
  @ApiResponse({ status: 200, description: 'File audit completed' })
  async auditFiles() {
    try {
      const audit = await this.migrationService.auditJsonFiles();
      return {
        success: true,
        message: 'File audit completed',
        audit
      };
    } catch (error) {
      this.logger.error('File audit failed:', error);
      return {
        success: false,
        message: 'File audit failed',
        error: error.message
      };
    }
  }

  @Post('cleanup-files')
  @ApiOperation({ summary: 'Clean up disconnected JSON files' })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean, description: 'Perform dry run without actually removing files' })
  @ApiResponse({ status: 200, description: 'File cleanup completed' })
  async cleanupFiles(@Query('dryRun') dryRun: string = 'true') {
    const isDryRun = dryRun !== 'false';
    
    try {
      const result = await this.migrationService.cleanupDisconnectedFiles(isDryRun);
      return {
        success: true,
        message: isDryRun ? 'Dry run completed' : 'File cleanup completed',
        dryRun: isDryRun,
        result
      };
    } catch (error) {
      this.logger.error('File cleanup failed:', error);
      return {
        success: false,
        message: 'File cleanup failed',
        error: error.message
      };
    }
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify migration integrity' })
  @ApiResponse({ status: 200, description: 'Migration verification completed' })
  async verifyMigration() {
    try {
      const result = await this.migrationService.verifyMigration();
      return result;
    } catch (error) {
      this.logger.error('Migration verification failed:', error);
      return {
        success: false,
        message: 'Migration verification failed',
        error: error.message
      };
    }
  }

  @Get('test-connection')
  @ApiOperation({ summary: 'Test database connection' })
  @ApiResponse({ status: 200, description: 'Database connection test completed' })
  async testConnection() {
    try {
      const result = await this.databaseService.testConnection();
      return result;
    } catch (error) {
      this.logger.error('Database connection test failed:', error);
      return {
        success: false,
        message: 'Database connection test failed',
        error: error.message
      };
    }
  }
}