import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from './file-storage.service';
import { DatabaseService } from '../database/database.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as crypto from 'crypto';

export interface FileAuditResult {
  category: string;
  filePath: string;
  fileName: string;
  status: 'connected' | 'disconnected' | 'orphaned' | 'corrupted';
  reason: string;
  size: number;
  lastModified: Date;
  checksum: string;
  hasBackup: boolean;
  migrationRecommendation: 'migrate' | 'backup_and_remove' | 'remove' | 'keep';
}

export interface AuditSummary {
  totalFiles: number;
  connectedFiles: number;
  disconnectedFiles: number;
  orphanedFiles: number;
  corruptedFiles: number;
  totalSize: number;
  categories: Record<string, {
    total: number;
    connected: number;
    disconnected: number;
    orphaned: number;
    corrupted: number;
  }>;
  recommendations: {
    migrate: number;
    backupAndRemove: number;
    remove: number;
    keep: number;
  };
}

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  filesBackedUp: string[];
  errors: string[];
}

export interface CleanupResult {
  success: boolean;
  filesRemoved: string[];
  filesBackedUp: string[];
  spaceFreed: number;
  errors: string[];
}

@Injectable()
export class FileAuditService {
  private readonly logger = new Logger(FileAuditService.name);
  private readonly storagePath: string;
  private readonly backupPath: string;

  constructor(
    private configService: ConfigService,
    private fileStorageService: FileStorageService,
    private databaseService: DatabaseService
  ) {
    this.storagePath = this.configService.get<string>('STORAGE_PATH') || '../../storage';
    this.backupPath = path.join(this.storagePath, 'audit-backups');
  }

  /**
   * Performs a comprehensive audit of all JSON files in the storage system
   * Identifies connected vs disconnected files and provides migration recommendations
   */
  async auditAllFiles(): Promise<{ results: FileAuditResult[]; summary: AuditSummary }> {
    this.logger.log('Starting comprehensive file system audit...');

    const results: FileAuditResult[] = [];
    const summary: AuditSummary = {
      totalFiles: 0,
      connectedFiles: 0,
      disconnectedFiles: 0,
      orphanedFiles: 0,
      corruptedFiles: 0,
      totalSize: 0,
      categories: {},
      recommendations: {
        migrate: 0,
        backupAndRemove: 0,
        remove: 0,
        keep: 0
      }
    };

    try {
      // Define storage categories to audit
      const categories = [
        'clients', 'people', 'client-parties', 'services', 'tasks',
        'service-templates', 'task-templates', 'calendar', 'documents',
        'compliance', 'events', 'config', 'templates', 'tax-calculations',
        'users', 'indexes'
      ];

      for (const category of categories) {
        this.logger.debug(`Auditing category: ${category}`);
        const categoryResults = await this.auditCategory(category);
        results.push(...categoryResults);

        // Update summary
        const categoryStats = {
          total: categoryResults.length,
          connected: categoryResults.filter(r => r.status === 'connected').length,
          disconnected: categoryResults.filter(r => r.status === 'disconnected').length,
          orphaned: categoryResults.filter(r => r.status === 'orphaned').length,
          corrupted: categoryResults.filter(r => r.status === 'corrupted').length
        };

        summary.categories[category] = categoryStats;
        summary.totalFiles += categoryStats.total;
        summary.connectedFiles += categoryStats.connected;
        summary.disconnectedFiles += categoryStats.disconnected;
        summary.orphanedFiles += categoryStats.orphaned;
        summary.corruptedFiles += categoryStats.corrupted;
      }

      // Calculate total size and recommendations
      for (const result of results) {
        summary.totalSize += result.size;
        
        // Convert snake_case to camelCase for recommendations
        const recommendationKey = result.migrationRecommendation === 'backup_and_remove' 
          ? 'backupAndRemove' 
          : result.migrationRecommendation;
        
        summary.recommendations[recommendationKey]++;
      }

      this.logger.log(`File audit completed: ${summary.totalFiles} files analyzed`);
      return { results, summary };

    } catch (error) {
      this.logger.error('File audit failed:', error);
      throw error;
    }
  }

  /**
   * Audits files in a specific category
   */
  private async auditCategory(category: string): Promise<FileAuditResult[]> {
    const results: FileAuditResult[] = [];
    const categoryPath = path.join(this.storagePath, category);

    if (!existsSync(categoryPath)) {
      this.logger.debug(`Category ${category} does not exist, skipping`);
      return results;
    }

    try {
      const files = await this.findJsonFiles(categoryPath);
      
      for (const filePath of files) {
        try {
          const auditResult = await this.auditFile(category, filePath);
          results.push(auditResult);
        } catch (error) {
          this.logger.warn(`Failed to audit file ${filePath}:`, error);
          
          // Create a corrupted file result
          const stats = await fs.stat(filePath);
          results.push({
            category,
            filePath,
            fileName: path.basename(filePath),
            status: 'corrupted',
            reason: `Audit failed: ${error.message}`,
            size: stats.size,
            lastModified: stats.mtime,
            checksum: '',
            hasBackup: false,
            migrationRecommendation: 'backup_and_remove'
          });
        }
      }

    } catch (error) {
      this.logger.error(`Failed to audit category ${category}:`, error);
    }

    return results;
  }

  /**
   * Audits a single file to determine its connection status
   */
  private async auditFile(category: string, filePath: string): Promise<FileAuditResult> {
    const fileName = path.basename(filePath);
    const fileId = path.basename(filePath, '.json');
    
    // Get file stats
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    let status: FileAuditResult['status'] = 'disconnected';
    let reason = 'File not actively referenced by application';
    let migrationRecommendation: FileAuditResult['migrationRecommendation'] = 'backup_and_remove';

    try {
      // Parse JSON to check if it's valid
      const data = JSON.parse(content);

      // Check if file is connected based on category-specific logic
      const connectionCheck = await this.checkFileConnection(category, fileId, data);
      status = connectionCheck.status;
      reason = connectionCheck.reason;
      migrationRecommendation = connectionCheck.recommendation;

    } catch (parseError) {
      status = 'corrupted';
      reason = `Invalid JSON: ${parseError.message}`;
      migrationRecommendation = 'backup_and_remove';
    }

    // Check if backup exists
    const hasBackup = await this.checkBackupExists(category, fileId);

    return {
      category,
      filePath,
      fileName,
      status,
      reason,
      size: stats.size,
      lastModified: stats.mtime,
      checksum,
      hasBackup,
      migrationRecommendation
    };
  }

  /**
   * Checks if a file is connected to the application based on category-specific logic
   */
  private async checkFileConnection(
    category: string, 
    fileId: string, 
    data: any
  ): Promise<{
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  }> {
    switch (category) {
      case 'clients':
        return await this.checkClientConnection(fileId, data);
      
      case 'tax-calculations':
        return await this.checkTaxCalculationConnection(fileId, data);
      
      case 'config':
        return this.checkConfigConnection(fileId, data);
      
      case 'templates':
        return await this.checkTemplateConnection(fileId, data);
      
      case 'indexes':
        return this.checkIndexConnection(fileId, data);
      
      case 'users':
        return await this.checkUserConnection(fileId, data);
      
      case 'service-templates':
      case 'task-templates':
        return this.checkTemplateFileConnection(fileId, data);
      
      case 'events':
        return this.checkEventConnection(fileId, data);
      
      default:
        return this.checkGenericConnection(category, fileId, data);
    }
  }

  private async checkClientConnection(fileId: string, data: any): Promise<{
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  }> {
    // Check if client exists in database (migrated)
    const companyNumber = data.companyNumber || data.company_number || fileId;
    if (companyNumber) {
      const dbClient = await this.databaseService.getClientByNumber(companyNumber);
      if (dbClient) {
        return {
          status: 'disconnected',
          reason: 'Client already migrated to database',
          recommendation: 'backup_and_remove'
        };
      }
    }

    // Check if client data is valid and complete
    if (!data.companyNumber && !data.company_number) {
      return {
        status: 'orphaned',
        reason: 'Missing required company number',
        recommendation: 'backup_and_remove'
      };
    }

    if (!data.companyName && !data.company_name && !data.name) {
      return {
        status: 'orphaned',
        reason: 'Missing required company name',
        recommendation: 'backup_and_remove'
      };
    }

    // Client file is valid and not yet migrated
    return {
      status: 'connected',
      reason: 'Valid client data pending migration',
      recommendation: 'migrate'
    };
  }

  private async checkTaxCalculationConnection(fileId: string, data: any): Promise<{
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  }> {
    // Check if calculation exists in database
    if (data.id) {
      const dbCalc = await this.databaseService.getCalculationById(data.id);
      if (dbCalc) {
        return {
          status: 'disconnected',
          reason: 'Tax calculation already migrated to database',
          recommendation: 'backup_and_remove'
        };
      }
    }

    // Check if referenced client exists
    const clientId = data.clientId || data.client_id;
    if (clientId) {
      const client = await this.databaseService.getClientByNumber(clientId);
      if (!client) {
        return {
          status: 'orphaned',
          reason: 'Referenced client not found in database',
          recommendation: 'backup_and_remove'
        };
      }
    } else {
      return {
        status: 'orphaned',
        reason: 'Missing required client reference',
        recommendation: 'backup_and_remove'
      };
    }

    // Valid calculation pending migration
    return {
      status: 'connected',
      reason: 'Valid tax calculation pending migration',
      recommendation: 'migrate'
    };
  }

  private checkConfigConnection(fileId: string, data: any): {
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  } {
    // Config files are always considered connected if they contain valid data
    if (Array.isArray(data) && data.length > 0) {
      return {
        status: 'connected',
        reason: 'Active configuration file',
        recommendation: 'keep'
      };
    }

    if (typeof data === 'object' && Object.keys(data).length > 0) {
      return {
        status: 'connected',
        reason: 'Active configuration file',
        recommendation: 'keep'
      };
    }

    return {
      status: 'disconnected',
      reason: 'Empty or invalid configuration',
      recommendation: 'remove'
    };
  }

  private async checkTemplateConnection(fileId: string, data: any): Promise<{
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  }> {
    // Check if template has required fields
    if (!data.id && !data.name && !data.title) {
      return {
        status: 'orphaned',
        reason: 'Missing template identifier',
        recommendation: 'backup_and_remove'
      };
    }

    // Templates are generally kept as they may be referenced
    return {
      status: 'connected',
      reason: 'Template file with valid structure',
      recommendation: 'keep'
    };
  }

  private checkIndexConnection(fileId: string, data: any): {
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  } {
    // Index files are system-generated and can be rebuilt
    return {
      status: 'disconnected',
      reason: 'System-generated index file',
      recommendation: 'remove'
    };
  }

  private async checkUserConnection(fileId: string, data: any): Promise<{
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  }> {
    // Check if user has required fields
    if (!data.id && !data.email) {
      return {
        status: 'orphaned',
        reason: 'Missing user identifier',
        recommendation: 'backup_and_remove'
      };
    }

    // Users are kept as they contain authentication data
    return {
      status: 'connected',
      reason: 'Active user account',
      recommendation: 'keep'
    };
  }

  private checkTemplateFileConnection(fileId: string, data: any): {
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  } {
    // Template files (service/task templates) are kept if they have valid structure
    if (data.id || data.name || data.title) {
      return {
        status: 'connected',
        reason: 'Valid template definition',
        recommendation: 'keep'
      };
    }

    return {
      status: 'orphaned',
      reason: 'Invalid template structure',
      recommendation: 'backup_and_remove'
    };
  }

  private checkEventConnection(fileId: string, data: any): {
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  } {
    // Event files are time-sensitive
    if (Array.isArray(data)) {
      const now = new Date();
      const recentEvents = data.filter(event => {
        if (event.date || event.start) {
          const eventDate = new Date(event.date || event.start);
          const daysDiff = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 365; // Keep events from last year
        }
        return false;
      });

      if (recentEvents.length > 0) {
        return {
          status: 'connected',
          reason: `Contains ${recentEvents.length} recent events`,
          recommendation: 'keep'
        };
      }
    }

    return {
      status: 'disconnected',
      reason: 'No recent events found',
      recommendation: 'backup_and_remove'
    };
  }

  private checkGenericConnection(category: string, fileId: string, data: any): {
    status: FileAuditResult['status'];
    reason: string;
    recommendation: FileAuditResult['migrationRecommendation'];
  } {
    // Generic check for other categories
    if (typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
      return {
        status: 'connected',
        reason: 'Contains valid data structure',
        recommendation: 'keep'
      };
    }

    return {
      status: 'disconnected',
      reason: 'Empty or invalid data',
      recommendation: 'remove'
    };
  }

  /**
   * Recursively finds all JSON files in a directory
   */
  private async findJsonFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (!['node_modules', '.git', '.locks', 'snapshots'].includes(entry.name)) {
            const subFiles = await this.findJsonFiles(fullPath);
            files.push(...subFiles);
          }
        } else if (entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to read directory ${dirPath}:`, error);
    }

    return files;
  }

  /**
   * Checks if a backup exists for a file
   */
  private async checkBackupExists(category: string, fileId: string): Promise<boolean> {
    try {
      const backupDir = path.join(this.backupPath, category);
      if (!existsSync(backupDir)) {
        return false;
      }

      const files = await fs.readdir(backupDir);
      return files.some(file => file.startsWith(fileId));
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates backups of files before cleanup
   */
  async createBackup(
    files: FileAuditResult[],
    backupName?: string
  ): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(
      this.backupPath,
      backupName || `audit-backup-${timestamp}`
    );

    const result: BackupResult = {
      success: false,
      filesBackedUp: [],
      errors: []
    };

    try {
      // Ensure backup directory exists
      await fs.mkdir(backupDir, { recursive: true });

      // Create backup manifest
      const manifest = {
        timestamp: new Date().toISOString(),
        totalFiles: files.length,
        files: files.map(f => ({
          category: f.category,
          fileName: f.fileName,
          status: f.status,
          reason: f.reason,
          size: f.size,
          checksum: f.checksum
        }))
      };

      await fs.writeFile(
        path.join(backupDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Copy files to backup directory
      for (const file of files) {
        try {
          const categoryBackupDir = path.join(backupDir, file.category);
          await fs.mkdir(categoryBackupDir, { recursive: true });

          const backupFilePath = path.join(categoryBackupDir, file.fileName);
          await fs.copyFile(file.filePath, backupFilePath);
          
          result.filesBackedUp.push(backupFilePath);
        } catch (error) {
          result.errors.push(`Failed to backup ${file.filePath}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      result.backupPath = backupDir;

      this.logger.log(`Backup completed: ${result.filesBackedUp.length} files backed up to ${backupDir}`);
      return result;

    } catch (error) {
      this.logger.error('Backup creation failed:', error);
      result.errors.push(`Backup failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Performs cleanup of disconnected files with verification
   */
  async cleanupFiles(
    auditResults: FileAuditResult[],
    options: {
      dryRun?: boolean;
      createBackup?: boolean;
      verifyBeforeDelete?: boolean;
    } = {}
  ): Promise<CleanupResult> {
    const { dryRun = false, createBackup = true, verifyBeforeDelete = true } = options;

    const result: CleanupResult = {
      success: false,
      filesRemoved: [],
      filesBackedUp: [],
      spaceFreed: 0,
      errors: []
    };

    try {
      // Filter files that should be removed
      const filesToRemove = auditResults.filter(
        f => f.migrationRecommendation === 'remove' || 
            f.migrationRecommendation === 'backup_and_remove'
      );

      if (filesToRemove.length === 0) {
        this.logger.log('No files found for cleanup');
        result.success = true;
        return result;
      }

      this.logger.log(`Found ${filesToRemove.length} files for cleanup`);

      if (dryRun) {
        this.logger.log('DRY RUN: Would remove the following files:');
        filesToRemove.forEach(f => {
          this.logger.log(`  - ${f.filePath} (${f.reason})`);
        });
        result.success = true;
        return result;
      }

      // Create backup if requested
      if (createBackup) {
        const backupResult = await this.createBackup(filesToRemove, 'cleanup-backup');
        result.filesBackedUp = backupResult.filesBackedUp;
        
        if (!backupResult.success) {
          result.errors.push(...backupResult.errors);
          this.logger.error('Backup failed, aborting cleanup');
          return result;
        }
      }

      // Remove files
      for (const file of filesToRemove) {
        try {
          // Verify file still exists and matches checksum if requested
          if (verifyBeforeDelete) {
            if (!existsSync(file.filePath)) {
              this.logger.warn(`File ${file.filePath} no longer exists, skipping`);
              continue;
            }

            const currentContent = await fs.readFile(file.filePath, 'utf8');
            const currentChecksum = crypto.createHash('sha256').update(currentContent).digest('hex');
            
            if (currentChecksum !== file.checksum) {
              result.errors.push(`File ${file.filePath} has changed since audit, skipping deletion`);
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
      }

      result.success = result.errors.length === 0;
      
      this.logger.log(`Cleanup completed: ${result.filesRemoved.length} files removed, ${this.formatBytes(result.spaceFreed)} freed`);
      return result;

    } catch (error) {
      this.logger.error('Cleanup failed:', error);
      result.errors.push(`Cleanup failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Verifies the integrity of the cleanup process
   */
  async verifyCleanup(cleanupResult: CleanupResult): Promise<{
    success: boolean;
    verificationResults: {
      filesStillExist: string[];
      backupsVerified: string[];
      backupsMissing: string[];
    };
    message: string;
  }> {
    const verification = {
      filesStillExist: [],
      backupsVerified: [],
      backupsMissing: []
    };

    try {
      // Check that removed files no longer exist
      for (const filePath of cleanupResult.filesRemoved) {
        if (existsSync(filePath)) {
          verification.filesStillExist.push(filePath);
        }
      }

      // Verify backups exist and are readable
      for (const backupPath of cleanupResult.filesBackedUp) {
        if (existsSync(backupPath)) {
          try {
            await fs.readFile(backupPath, 'utf8');
            verification.backupsVerified.push(backupPath);
          } catch (error) {
            verification.backupsMissing.push(backupPath);
          }
        } else {
          verification.backupsMissing.push(backupPath);
        }
      }

      const success = verification.filesStillExist.length === 0 && 
                     verification.backupsMissing.length === 0;

      const message = success 
        ? `Cleanup verification successful: ${cleanupResult.filesRemoved.length} files removed, ${verification.backupsVerified.length} backups verified`
        : `Cleanup verification failed: ${verification.filesStillExist.length} files still exist, ${verification.backupsMissing.length} backups missing`;

      return { success, verificationResults: verification, message };

    } catch (error) {
      return {
        success: false,
        verificationResults: verification,
        message: `Verification failed: ${error.message}`
      };
    }
  }

  /**
   * Generates a comprehensive audit report
   */
  async generateAuditReport(
    auditResults: FileAuditResult[],
    summary: AuditSummary
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    
    let report = `# File System Audit Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Total Files Analyzed:** ${summary.totalFiles}\n`;
    report += `**Total Storage Size:** ${this.formatBytes(summary.totalSize)}\n\n`;

    // Summary section
    report += `## Summary\n\n`;
    report += `- **Connected Files:** ${summary.connectedFiles} (${((summary.connectedFiles / summary.totalFiles) * 100).toFixed(1)}%)\n`;
    report += `- **Disconnected Files:** ${summary.disconnectedFiles} (${((summary.disconnectedFiles / summary.totalFiles) * 100).toFixed(1)}%)\n`;
    report += `- **Orphaned Files:** ${summary.orphanedFiles} (${((summary.orphanedFiles / summary.totalFiles) * 100).toFixed(1)}%)\n`;
    report += `- **Corrupted Files:** ${summary.corruptedFiles} (${((summary.corruptedFiles / summary.totalFiles) * 100).toFixed(1)}%)\n\n`;

    // Recommendations section
    report += `## Migration Recommendations\n\n`;
    report += `- **Migrate:** ${summary.recommendations.migrate} files\n`;
    report += `- **Backup and Remove:** ${summary.recommendations.backupAndRemove} files\n`;
    report += `- **Remove:** ${summary.recommendations.remove} files\n`;
    report += `- **Keep:** ${summary.recommendations.keep} files\n\n`;

    // Category breakdown
    report += `## Category Breakdown\n\n`;
    for (const [category, stats] of Object.entries(summary.categories)) {
      if (stats.total > 0) {
        report += `### ${category}\n`;
        report += `- Total: ${stats.total}\n`;
        report += `- Connected: ${stats.connected}\n`;
        report += `- Disconnected: ${stats.disconnected}\n`;
        report += `- Orphaned: ${stats.orphaned}\n`;
        report += `- Corrupted: ${stats.corrupted}\n\n`;
      }
    }

    // Detailed results for problematic files
    const problematicFiles = auditResults.filter(
      f => f.status !== 'connected' || f.migrationRecommendation !== 'keep'
    );

    if (problematicFiles.length > 0) {
      report += `## Files Requiring Attention\n\n`;
      
      for (const file of problematicFiles) {
        report += `### ${file.fileName} (${file.category})\n`;
        report += `- **Status:** ${file.status}\n`;
        report += `- **Reason:** ${file.reason}\n`;
        report += `- **Recommendation:** ${file.migrationRecommendation}\n`;
        report += `- **Size:** ${this.formatBytes(file.size)}\n`;
        report += `- **Last Modified:** ${file.lastModified.toISOString()}\n`;
        report += `- **Path:** ${file.filePath}\n\n`;
      }
    }

    return report;
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
}