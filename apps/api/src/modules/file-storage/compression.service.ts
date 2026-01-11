import { Injectable, Logger } from '@nestjs/common';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class CompressionService {
  private readonly logger = new Logger(CompressionService.name);

  async compressData(data: any): Promise<Buffer> {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = await gzip(jsonString);
      
      this.logger.debug(`Compressed data: ${jsonString.length} -> ${compressed.length} bytes`);
      return compressed;
    } catch (error) {
      this.logger.error('Failed to compress data', error);
      throw error;
    }
  }

  async decompressData<T>(compressedData: Buffer): Promise<T> {
    try {
      const decompressed = await gunzip(compressedData);
      const jsonString = decompressed.toString('utf8');
      const data = JSON.parse(jsonString);
      
      this.logger.debug(`Decompressed data: ${compressedData.length} -> ${jsonString.length} bytes`);
      return data;
    } catch (error) {
      this.logger.error('Failed to decompress data', error);
      throw error;
    }
  }

  async compressFile(filePath: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(filePath);
      const compressed = await gzip(data);
      const compressedPath = `${filePath}.gz`;
      
      await fs.promises.writeFile(compressedPath, compressed);
      
      const originalSize = data.length;
      const compressedSize = compressed.length;
      const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
      
      this.logger.debug(`Compressed file: ${filePath} (${ratio}% reduction)`);
      return compressedPath;
    } catch (error) {
      this.logger.error(`Failed to compress file: ${filePath}`, error);
      throw error;
    }
  }

  async decompressFile(compressedPath: string, outputPath?: string): Promise<string> {
    try {
      const compressedData = await fs.promises.readFile(compressedPath);
      const decompressed = await gunzip(compressedData);
      
      const targetPath = outputPath || compressedPath.replace('.gz', '');
      await fs.promises.writeFile(targetPath, decompressed);
      
      this.logger.debug(`Decompressed file: ${compressedPath} -> ${targetPath}`);
      return targetPath;
    } catch (error) {
      this.logger.error(`Failed to decompress file: ${compressedPath}`, error);
      throw error;
    }
  }

  async compressDirectory(dirPath: string, options: {
    extensions?: string[];
    minSize?: number;
    excludePatterns?: string[];
  } = {}): Promise<void> {
    const {
      extensions = ['.json', '.txt', '.log'],
      minSize = 1024, // 1KB minimum
      excludePatterns = ['node_modules', '.git', 'compressed']
    } = options;

    try {
      const files = await this.getFilesRecursively(dirPath);
      let compressed = 0;
      let totalSaved = 0;

      for (const file of files) {
        // Skip if file doesn't match criteria
        if (!this.shouldCompressFile(file, extensions, minSize, excludePatterns)) {
          continue;
        }

        try {
          const originalSize = (await fs.promises.stat(file)).size;
          await this.compressFile(file);
          const compressedSize = (await fs.promises.stat(`${file}.gz`)).size;
          
          // Remove original if compression was effective
          if (compressedSize < originalSize * 0.9) {
            await fs.promises.unlink(file);
            compressed++;
            totalSaved += originalSize - compressedSize;
          } else {
            // Remove compressed version if not effective
            await fs.promises.unlink(`${file}.gz`);
          }
        } catch (error) {
          this.logger.warn(`Failed to compress ${file}:`, error.message);
        }
      }

      this.logger.log(`Compressed ${compressed} files, saved ${this.formatBytes(totalSaved)}`);
    } catch (error) {
      this.logger.error(`Failed to compress directory: ${dirPath}`, error);
      throw error;
    }
  }

  private async getFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const items = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...await this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private shouldCompressFile(
    filePath: string,
    extensions: string[],
    minSize: number,
    excludePatterns: string[]
  ): boolean {
    // Check if already compressed
    if (filePath.endsWith('.gz')) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of excludePatterns) {
      if (filePath.includes(pattern)) {
        return false;
      }
    }

    // Check extension
    const ext = path.extname(filePath);
    if (!extensions.includes(ext)) {
      return false;
    }

    // Check file size (sync for simplicity)
    try {
      const stats = fs.statSync(filePath);
      return stats.size >= minSize;
    } catch {
      return false;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getCompressionStats(dirPath: string): Promise<{
    totalFiles: number;
    compressedFiles: number;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  }> {
    const files = await this.getFilesRecursively(dirPath);
    let totalFiles = 0;
    let compressedFiles = 0;
    let originalSize = 0;
    let compressedSize = 0;

    for (const file of files) {
      const stats = await fs.promises.stat(file);
      
      if (file.endsWith('.gz')) {
        compressedFiles++;
        compressedSize += stats.size;
      } else {
        totalFiles++;
        originalSize += stats.size;
      }
    }

    const compressionRatio = originalSize > 0 ? 
      ((originalSize - compressedSize) / originalSize * 100) : 0;

    return {
      totalFiles,
      compressedFiles,
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio.toFixed(2))
    };
  }
}