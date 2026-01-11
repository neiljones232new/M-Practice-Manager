import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileAuditService, FileAuditResult, CleanupResult } from './file-audit.service';
import { DatabaseService } from '../database/database.service';
import { MigrationService } from '../database/migration.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

export interface CleanupPlan {
  filesToMigrate: FileAuditResult[];
  filesToBackupAndRemove: FileAuditResult[];
  filesToRemove: FileAuditResult[];
  filesToKeep: FileAuditResult[];
  estimatedSpaceFreed: number;
  migrationRequired: boolean;
}

export interface CleanupOptions {
  dryRun?: boolean;
  createBackup?: boolean;
  verifyBeforeDelete?: boolean;
  migrateBeforeCleanup?: boolean;
  batchSize?: number;
}

export interface CleanupProgress {
  phase: 'planning' | 'backup' | 'migration' | 'cleanup' | 'verification' | 'complete';
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);
  private readonly storagePath: string;

  constructor(
    private configService: ConfigService,
    private fileAuditService: FileAuditService,
    private databaseService: DatabaseService,
    private migrationService: MigrationService
  ) {
    this.storagePath = this.configService.get<string>('STORAGE_PATH') || '../../storage';
  }

  /**
   * Creates a comprehensive cleanup plan based on audit results
   */
  async createCleanupPlan(auditResults: FileAuditResult[]): Promise<CleanupPlan> {
    this.logger.log('Creating cleanup plan...');

    const plan: CleanupPlan = {
      filesToMigrate: [],
      filesToBackupAndRemove: [],
      filesToRemove: [],
      filesToKeep: [],
      estimatedSpaceFreed: 0,
      migrationRequired: false
    };

    for (const result of auditResults) {
      switch (result.migrationRecommendation) {
        case 'migrate':
          plan.filesToMigrate.push(result);
          plan.migrationRequired = true;
          break;
        case 'backup_and_remove':
          plan.filesToBackupAndRemove.push(result);
          plan.estimatedSpaceFreed += result.size;
          break;
        case 'remove':
          plan.filesToRemove.push(result);
          plan.estimatedSpaceFreed += result.size;
          break;
        case 'keep':
          plan.filesToKeep.push(result);
          break;
      }
    }

    this.logger.log(`Cleanup plan created: ${plan.filesToMigrate.length} to migrate, ${plan.filesToBackupAndRemove.length} to backup and remove, ${plan.filesToRemove.length} to remove, ${plan.filesToKeep.length} to keep`);
    
    return plan;
  }

  /**
   * Executes the cleanup plan with progress tracking
   */
  async executeCleanupPlan(
    plan: CleanupPlan,
    options: CleanupOptions = {},
    progressCallback?: (progress: CleanupProgress) => void
  ): Promise<{
    success: boolean;
    results: {
      migrationResult?: any;
      backupResult?: any;
      cleanupResult: CleanupResult;
      verificationResult?: any;
    };
    finalProgress: CleanupProgress;
  }> {
    const {
      dryRun = false,
      createBackup = true,
      verifyBeforeDelete = true,
      migrateBeforeCleanup = true,
      batchSize = 50
    } = options;

    const totalFiles = plan.filesToMigrate.length + 
                      plan.filesToBackupAndRemove.length + 
                      plan.filesToRemove.length;

    const progress: CleanupProgress = {
      phase: 'planning',
      totalFiles,
      processedFiles: 0,
      errors: [],
      warnings: []
    };

    const results: any = {
      cleanupResult: {
        success: false,
        filesRemoved: [],
        filesBackedUp: [],
        spaceFreed: 0,
        errors: []
      }
    };

    try {
      // Phase 1: Migration (if required and requested)
      if (plan.migrationRequired && migrateBeforeCleanup && !dryRun) {
        progress.phase = 'migration';
        progressCallback?.(progress);

        this.logger.log('Starting data migration before cleanup...');
        
        try {
          results.migrationResult = await this.migrationService.migrateAllData();
          progress.processedFiles += plan.filesToMigrate.length;
          progressCallback?.(progress);
        } catch (error) {
          progress.errors.push(`Migration failed: ${error.message}`);
          this.logger.error('Migration failed, aborting cleanup:', error);
          return { success: false, results, finalProgress: progress };
        }
      }

      // Phase 2: Create backups
      if (createBackup && (plan.filesToBackupAndRemove.length > 0 || plan.filesToRemove.length > 0)) {
        progress.phase = 'backup';
        progressCallback?.(progress);

        const filesToBackup = [...plan.filesToBackupAndRemove, ...plan.filesToRemove];
        
        if (!dryRun) {
          results.backupResult = await this.fileAuditService.createBackup(
            filesToBackup,
            `cleanup-${new Date().toISOString().split('T')[0]}`
          );

          if (!results.backupResult.success) {
            progress.errors.push(...results.backupResult.errors);
            this.logger.error('Backup failed, aborting cleanup');
            return { success: false, results, finalProgress: progress };
          }
        }
      }

      // Phase 3: Cleanup files
      progress.phase = 'cleanup';
      progressCallback?.(progress);

      const filesToCleanup = [...plan.filesToBackupAndRemove, ...plan.filesToRemove];
      
      if (dryRun) {
        this.logger.log('DRY RUN: Cleanup simulation');
        results.cleanupResult = {
          success: true,
          filesRemoved: filesToCleanup.map(f => f.filePath),
          filesBackedUp: createBackup ? filesToCleanup.map(f => f.filePath) : [],
          spaceFreed: plan.estimatedSpaceFreed,
          errors: []
        };
      } else {
        results.cleanupResult = await this.performBatchCleanup(
          filesToCleanup,
          { verifyBeforeDelete, batchSize },
          (processed) => {
            progress.processedFiles = (plan.filesToMigrate.length || 0) + processed;
            progress.currentFile = filesToCleanup[processed - 1]?.fileName;
            progressCallback?.(progress);
          }
        );
      }

      // Phase 4: Verification
      if (!dryRun && results.cleanupResult.success) {
        progress.phase = 'verification';
        progressCallback?.(progress);

        results.verificationResult = await this.fileAuditService.verifyCleanup(results.cleanupResult);
        
        if (!results.verificationResult.success) {
          progress.warnings.push(results.verificationResult.message);
        }
      }

      // Phase 5: Complete
      progress.phase = 'complete';
      progress.processedFiles = totalFiles;
      progressCallback?.(progress);

      const success = results.cleanupResult.success && 
                     (results.migrationResult?.clientsMigrated >= 0 || !plan.migrationRequired) &&
                     (results.verificationResult?.success !== false);

      this.logger.log(`Cleanup execution completed. Success: ${success}`);
      
      return { success, results, finalProgress: progress };

    } catch (error) {
      progress.errors.push(`Cleanup execution failed: ${error.message}`);
      this.logger.error('Cleanup execution failed:', error);
      return { success: false, results, finalProgress: progress };
    }
  }

  /**
   * Performs cleanup in batches to avoid overwhelming the system
   */
  private async performBatchCleanup(
    files: FileAuditResult[],
    options: { verifyBeforeDelete: boolean; batchSize: number },
    progressCallback?: (processed: number) => void
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: false,
      filesRemoved: [],
      filesBackedUp: [],
      spaceFreed: 0,
      errors: []
    };

    const { verifyBeforeDelete, batchSize } = options;
    let processed = 0;

    try {
      // Process files in batches
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        for (const file of batch) {
          try {
            // Verify file still exists and matches checksum if requested
            if (verifyBeforeDelete) {
              if (!existsSync(file.filePath)) {
                this.logger.warn(`File ${file.filePath} no longer exists, skipping`);
                processed++;
                progressCallback?.(processed);
                continue;
              }

              const currentContent = await fs.readFile(file.filePath, 'utf8');
              const currentChecksum = require('crypto')
                .createHash('sha256')
                .update(currentContent)
                .digest('hex');
              
              if (currentChecksum !== file.checksum) {
                result.errors.push(`File ${file.filePath} has changed since audit, skipping deletion`);
                processed++;
                progressCallback?.(processed);
                continue;
              }
            }

            // Delete the file
            await fs.unlink(file.filePath);
            result.filesRemoved.push(file.filePath);
            result.spaceFreed += file.size;

            this.logger.debug(`Removed file: ${file.filePath}`);

          } catch (error) {
            result.errors.push(`Failed to remove ${file.filePath}: ${error.message}`);
          }

          processed++;
          progressCallback?.(processed);
        }

        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Batch cleanup failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Performs a safe cleanup with comprehensive verification
   */
  async performSafeCleanup(
    auditResults: FileAuditResult[],
    options: CleanupOptions = {}
  ): Promise<{
    success: boolean;
    plan: CleanupPlan;
    executionResult: any;
    report: string;
  }> {
    this.logger.log('Starting safe cleanup process...');

    try {
      // Create cleanup plan
      const plan = await this.createCleanupPlan(auditResults);
      
      // Execute cleanup with progress tracking
      const executionResult = await this.executeCleanupPlan(plan, options);
      
      // Generate cleanup report
      const report = await this.generateCleanupReport(plan, executionResult);
      
      return {
        success: executionResult.success,
        plan,
        executionResult,
        report
      };

    } catch (error) {
      this.logger.error('Safe cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Generates a comprehensive cleanup report
   */
  private async generateCleanupReport(
    plan: CleanupPlan,
    executionResult: any
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    
    let report = `# File System Cleanup Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Status:** ${executionResult.success ? 'SUCCESS' : 'FAILED'}\n\n`;

    // Plan summary
    report += `## Cleanup Plan\n\n`;
    report += `- **Files to Migrate:** ${plan.filesToMigrate.length}\n`;
    report += `- **Files to Backup and Remove:** ${plan.filesToBackupAndRemove.length}\n`;
    report += `- **Files to Remove:** ${plan.filesToRemove.length}\n`;
    report += `- **Files to Keep:** ${plan.filesToKeep.length}\n`;
    report += `- **Estimated Space to Free:** ${this.formatBytes(plan.estimatedSpaceFreed)}\n\n`;

    // Execution results
    report += `## Execution Results\n\n`;
    
    if (executionResult.results.migrationResult) {
      const migration = executionResult.results.migrationResult;
      report += `### Migration\n`;
      report += `- **Clients Migrated:** ${migration.clientsMigrated}\n`;
      report += `- **Calculations Migrated:** ${migration.calculationsMigrated}\n`;
      report += `- **Files Processed:** ${migration.filesProcessed}\n`;
      report += `- **Files Skipped:** ${migration.filesSkipped}\n`;
      if (migration.errors.length > 0) {
        report += `- **Errors:** ${migration.errors.length}\n`;
      }
      report += `\n`;
    }

    if (executionResult.results.cleanupResult) {
      const cleanup = executionResult.results.cleanupResult;
      report += `### Cleanup\n`;
      report += `- **Files Removed:** ${cleanup.filesRemoved.length}\n`;
      report += `- **Files Backed Up:** ${cleanup.filesBackedUp.length}\n`;
      report += `- **Space Freed:** ${this.formatBytes(cleanup.spaceFreed)}\n`;
      if (cleanup.errors.length > 0) {
        report += `- **Errors:** ${cleanup.errors.length}\n`;
      }
      report += `\n`;
    }

    if (executionResult.results.verificationResult) {
      const verification = executionResult.results.verificationResult;
      report += `### Verification\n`;
      report += `- **Status:** ${verification.success ? 'PASSED' : 'FAILED'}\n`;
      report += `- **Message:** ${verification.message}\n`;
      
      if (verification.verificationResults) {
        const vr = verification.verificationResults;
        if (vr.filesStillExist.length > 0) {
          report += `- **Files Still Exist:** ${vr.filesStillExist.length}\n`;
        }
        if (vr.backupsVerified.length > 0) {
          report += `- **Backups Verified:** ${vr.backupsVerified.length}\n`;
        }
        if (vr.backupsMissing.length > 0) {
          report += `- **Backups Missing:** ${vr.backupsMissing.length}\n`;
        }
      }
      report += `\n`;
    }

    // Errors and warnings
    if (executionResult.finalProgress.errors.length > 0) {
      report += `## Errors\n\n`;
      executionResult.finalProgress.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += `\n`;
    }

    if (executionResult.finalProgress.warnings.length > 0) {
      report += `## Warnings\n\n`;
      executionResult.finalProgress.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += `\n`;
    }

    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (executionResult.success) {
      report += `- Cleanup completed successfully\n`;
      report += `- Monitor system performance after cleanup\n`;
      report += `- Consider running periodic audits to maintain system health\n`;
    } else {
      report += `- Review errors and warnings above\n`;
      report += `- Check backup integrity before retrying\n`;
      report += `- Consider running cleanup in smaller batches\n`;
    }

    if (plan.filesToKeep.length > 0) {
      report += `- ${plan.filesToKeep.length} files were kept and may need manual review\n`;
    }

    return report;
  }

  /**
   * Validates the cleanup plan before execution
   */
  async validateCleanupPlan(plan: CleanupPlan): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if migration is required but database is not ready
      if (plan.migrationRequired) {
        const dbTest = await this.databaseService.testConnection();
        if (!dbTest.success) {
          issues.push('Database connection required for migration but not available');
        }
      }

      // Check for files that might be currently in use
      for (const file of [...plan.filesToBackupAndRemove, ...plan.filesToRemove]) {
        if (file.category === 'config' && file.fileName === 'integrations.json') {
          warnings.push('Configuration file will be removed - ensure system can recreate it');
        }
        
        if (file.category === 'users' && file.status === 'connected') {
          warnings.push(`User file ${file.fileName} marked for removal but appears to be active`);
        }
      }

      // Check available disk space for backups
      const totalSizeToBackup = [...plan.filesToBackupAndRemove, ...plan.filesToRemove]
        .reduce((sum, file) => sum + file.size, 0);
      
      if (totalSizeToBackup > 0) {
        try {
          const stats = await fs.stat(this.storagePath);
          // This is a simplified check - in production you'd want to check actual available space
          if (totalSizeToBackup > 1024 * 1024 * 1024) { // 1GB
            warnings.push('Large backup size may require significant disk space');
          }
        } catch (error) {
          warnings.push('Could not verify available disk space for backups');
        }
      }

      return {
        valid: issues.length === 0,
        issues,
        warnings
      };

    } catch (error) {
      issues.push(`Plan validation failed: ${error.message}`);
      return { valid: false, issues, warnings };
    }
  }

  /**
   * Formats bytes into human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Estimates cleanup time based on file count and sizes
   */
  estimateCleanupTime(plan: CleanupPlan): {
    estimatedMinutes: number;
    breakdown: {
      migration: number;
      backup: number;
      cleanup: number;
      verification: number;
    };
  } {
    const breakdown = {
      migration: 0,
      backup: 0,
      cleanup: 0,
      verification: 0
    };

    // Rough estimates based on file operations
    if (plan.migrationRequired) {
      breakdown.migration = Math.max(1, Math.ceil(plan.filesToMigrate.length / 10)); // ~10 files per minute
    }

    const filesToBackup = plan.filesToBackupAndRemove.length + plan.filesToRemove.length;
    if (filesToBackup > 0) {
      breakdown.backup = Math.max(1, Math.ceil(filesToBackup / 20)); // ~20 files per minute
    }

    const filesToDelete = plan.filesToBackupAndRemove.length + plan.filesToRemove.length;
    if (filesToDelete > 0) {
      breakdown.cleanup = Math.max(1, Math.ceil(filesToDelete / 50)); // ~50 files per minute
    }

    if (filesToDelete > 0) {
      breakdown.verification = Math.max(1, Math.ceil(filesToDelete / 100)); // ~100 files per minute
    }

    const estimatedMinutes = Object.values(breakdown).reduce((sum, time) => sum + time, 0);

    return { estimatedMinutes, breakdown };
  }
}