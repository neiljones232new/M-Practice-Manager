import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface CleanupOptions {
  maxAge?: number; // in milliseconds
  maxSize?: number; // in bytes
  keepCount?: number; // number of files to keep
  patterns?: string[]; // file patterns to clean
}

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  async cleanupOldFiles(dirPath: string, options: CleanupOptions = {}): Promise<void> {
    const {
      maxAge = 30 * 24 * 60 * 60 * 1000, // 30 days
      patterns = ['*.log', '*.tmp', '*.bak']
    } = options;

    try {
      if (!fs.existsSync(dirPath)) {
        return;
      }

      const files = await this.getFilesRecursively(dirPath);
      const now = Date.now();
      let deletedCount = 0;
      let deletedSize = 0;

      for (const file of files) {
        if (!this.matchesPatterns(file, patterns)) {
          continue;
        }

        try {
          const stats = await fs.promises.stat(file);
          const age = now - stats.mtime.getTime();

          if (age > maxAge) {
            deletedSize += stats.size;
            await fs.promises.unlink(file);
            deletedCount++;
            this.logger.debug(`Deleted old file: ${file}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to delete file ${file}:`, error.message);
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old files, freed ${this.formatBytes(deletedSize)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old files in ${dirPath}:`, error);
      throw error;
    }
  }

  async cleanupLargeFiles(dirPath: string, options: CleanupOptions = {}): Promise<void> {
    const {
      maxSize = 100 * 1024 * 1024, // 100MB
      patterns = ['*.log', '*.tmp']
    } = options;

    try {
      if (!fs.existsSync(dirPath)) {
        return;
      }

      const files = await this.getFilesRecursively(dirPath);
      let deletedCount = 0;
      let deletedSize = 0;

      for (const file of files) {
        if (!this.matchesPatterns(file, patterns)) {
          continue;
        }

        try {
          const stats = await fs.promises.stat(file);

          if (stats.size > maxSize) {
            deletedSize += stats.size;
            await fs.promises.unlink(file);
            deletedCount++;
            this.logger.debug(`Deleted large file: ${file} (${this.formatBytes(stats.size)})`);
          }
        } catch (error) {
          this.logger.warn(`Failed to delete file ${file}:`, error.message);
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} large files, freed ${this.formatBytes(deletedSize)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup large files in ${dirPath}:`, error);
      throw error;
    }
  }

  async cleanupExcessFiles(dirPath: string, options: CleanupOptions = {}): Promise<void> {
    const {
      keepCount = 10,
      patterns = ['*.bak', '*.snapshot']
    } = options;

    try {
      if (!fs.existsSync(dirPath)) {
        return;
      }

      const files = await this.getFilesRecursively(dirPath);
      const matchingFiles = files.filter(file => this.matchesPatterns(file, patterns));

      if (matchingFiles.length <= keepCount) {
        return;
      }

      // Sort by modification time (newest first)
      const filesWithStats = await Promise.all(
        matchingFiles.map(async file => ({
          path: file,
          stats: await fs.promises.stat(file)
        }))
      );

      filesWithStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Delete excess files
      const filesToDelete = filesWithStats.slice(keepCount);
      let deletedCount = 0;
      let deletedSize = 0;

      for (const { path: file, stats } of filesToDelete) {
        try {
          deletedSize += stats.size;
          await fs.promises.unlink(file);
          deletedCount++;
          this.logger.debug(`Deleted excess file: ${file}`);
        } catch (error) {
          this.logger.warn(`Failed to delete file ${file}:`, error.message);
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} excess files, freed ${this.formatBytes(deletedSize)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup excess files in ${dirPath}:`, error);
      throw error;
    }
  }

  async cleanupEmptyDirectories(dirPath: string): Promise<void> {
    try {
      if (!fs.existsSync(dirPath)) {
        return;
      }

      const directories = await this.getDirectoriesRecursively(dirPath);
      // Sort by depth (deepest first) to avoid deleting parent before child
      directories.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

      let deletedCount = 0;

      for (const dir of directories) {
        try {
          const items = await fs.promises.readdir(dir);
          if (items.length === 0) {
            await fs.promises.rmdir(dir);
            deletedCount++;
            this.logger.debug(`Deleted empty directory: ${dir}`);
          }
        } catch (error) {
          // Directory might not be empty or might not exist anymore
          this.logger.debug(`Could not delete directory ${dir}:`, error.message);
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} empty directories`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup empty directories in ${dirPath}:`, error);
      throw error;
    }
  }

  async performFullCleanup(dirPath: string, options: CleanupOptions = {}): Promise<void> {
    this.logger.log(`Starting full cleanup of ${dirPath}`);

    await this.cleanupOldFiles(dirPath, options);
    await this.cleanupLargeFiles(dirPath, options);
    await this.cleanupExcessFiles(dirPath, options);
    await this.cleanupEmptyDirectories(dirPath);

    this.logger.log(`Completed full cleanup of ${dirPath}`);
  }

  async getCleanupStats(dirPath: string): Promise<{
    totalFiles: number;
    totalSize: number;
    oldFiles: number;
    largeFiles: number;
    emptyDirectories: number;
  }> {
    if (!fs.existsSync(dirPath)) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldFiles: 0,
        largeFiles: 0,
        emptyDirectories: 0
      };
    }

    const files = await this.getFilesRecursively(dirPath);
    const directories = await this.getDirectoriesRecursively(dirPath);
    
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const maxSize = 100 * 1024 * 1024; // 100MB

    let totalSize = 0;
    let oldFiles = 0;
    let largeFiles = 0;

    for (const file of files) {
      try {
        const stats = await fs.promises.stat(file);
        totalSize += stats.size;

        const age = now - stats.mtime.getTime();
        if (age > maxAge) {
          oldFiles++;
        }

        if (stats.size > maxSize) {
          largeFiles++;
        }
      } catch (error) {
        // File might have been deleted
      }
    }

    let emptyDirectories = 0;
    for (const dir of directories) {
      try {
        const items = await fs.promises.readdir(dir);
        if (items.length === 0) {
          emptyDirectories++;
        }
      } catch (error) {
        // Directory might not exist
      }
    }

    return {
      totalFiles: files.length,
      totalSize,
      oldFiles,
      largeFiles,
      emptyDirectories
    };
  }

  private async getFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          files.push(...await this.getFilesRecursively(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return files;
  }

  private async getDirectoriesRecursively(dir: string): Promise<string[]> {
    const directories: string[] = [];
    
    try {
      const items = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          const fullPath = path.join(dir, item.name);
          directories.push(fullPath);
          directories.push(...await this.getDirectoriesRecursively(fullPath));
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return directories;
  }

  private matchesPatterns(filePath: string, patterns: string[]): boolean {
    const fileName = path.basename(filePath);
    
    return patterns.some(pattern => {
      // Convert glob pattern to regex
      const regex = new RegExp(
        pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
      );
      
      return regex.test(fileName);
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}