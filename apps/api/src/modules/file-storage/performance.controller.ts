import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CacheService } from './cache.service';
import { CompressionService } from './compression.service';
import { CleanupService } from './cleanup.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Performance')
@Controller('performance')
@UseGuards(JwtAuthGuard)
export class PerformanceController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly compressionService: CompressionService,
    private readonly cleanupService: CleanupService,
    private readonly configService: ConfigService,
  ) {}

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  getCacheStats() {
    return this.cacheService.getStats();
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear all cache entries' })
  clearCache() {
    this.cacheService.clear();
    return { message: 'Cache cleared successfully' };
  }

  @Post('cache/cleanup')
  @ApiOperation({ summary: 'Clean up expired cache entries' })
  cleanupCache() {
    this.cacheService.cleanup();
    return { message: 'Cache cleanup completed' };
  }

  @Get('compression/stats')
  @ApiOperation({ summary: 'Get compression statistics' })
  @ApiQuery({ name: 'path', required: false, description: 'Directory path to analyze' })
  async getCompressionStats(@Query('path') path?: string) {
    const dataDir = path || this.configService.get('DATA_DIR', './mdj-data');
    return this.compressionService.getCompressionStats(dataDir);
  }

  @Post('compression/compress')
  @ApiOperation({ summary: 'Compress data directory' })
  @ApiQuery({ name: 'path', required: false, description: 'Directory path to compress' })
  async compressDirectory(@Query('path') path?: string) {
    const dataDir = path || this.configService.get('DATA_DIR', './mdj-data');
    
    await this.compressionService.compressDirectory(dataDir, {
      extensions: ['.json', '.log', '.txt'],
      minSize: 1024, // 1KB
      excludePatterns: ['node_modules', '.git', 'compressed', 'snapshots']
    });

    return { message: 'Directory compression completed' };
  }

  @Get('cleanup/stats')
  @ApiOperation({ summary: 'Get cleanup statistics' })
  @ApiQuery({ name: 'path', required: false, description: 'Directory path to analyze' })
  async getCleanupStats(@Query('path') path?: string) {
    const dataDir = path || this.configService.get('DATA_DIR', './mdj-data');
    return this.cleanupService.getCleanupStats(dataDir);
  }

  @Post('cleanup/old-files')
  @ApiOperation({ summary: 'Clean up old files' })
  @ApiQuery({ name: 'path', required: false, description: 'Directory path to clean' })
  @ApiQuery({ name: 'maxAge', required: false, description: 'Maximum age in days' })
  async cleanupOldFiles(
    @Query('path') path?: string,
    @Query('maxAge') maxAge?: number
  ) {
    const dataDir = path || this.configService.get('DATA_DIR', './mdj-data');
    const maxAgeMs = (maxAge || 30) * 24 * 60 * 60 * 1000;

    await this.cleanupService.cleanupOldFiles(dataDir, {
      maxAge: maxAgeMs,
      patterns: ['*.log', '*.tmp', '*.bak']
    });

    return { message: 'Old files cleanup completed' };
  }

  @Post('cleanup/large-files')
  @ApiOperation({ summary: 'Clean up large files' })
  @ApiQuery({ name: 'path', required: false, description: 'Directory path to clean' })
  @ApiQuery({ name: 'maxSize', required: false, description: 'Maximum size in MB' })
  async cleanupLargeFiles(
    @Query('path') path?: string,
    @Query('maxSize') maxSize?: number
  ) {
    const dataDir = path || this.configService.get('DATA_DIR', './mdj-data');
    const maxSizeBytes = (maxSize || 100) * 1024 * 1024;

    await this.cleanupService.cleanupLargeFiles(dataDir, {
      maxSize: maxSizeBytes,
      patterns: ['*.log', '*.tmp']
    });

    return { message: 'Large files cleanup completed' };
  }

  @Post('cleanup/excess-files')
  @ApiOperation({ summary: 'Clean up excess backup files' })
  @ApiQuery({ name: 'path', required: false, description: 'Directory path to clean' })
  @ApiQuery({ name: 'keepCount', required: false, description: 'Number of files to keep' })
  async cleanupExcessFiles(
    @Query('path') path?: string,
    @Query('keepCount') keepCount?: number
  ) {
    const dataDir = path || this.configService.get('DATA_DIR', './mdj-data');

    await this.cleanupService.cleanupExcessFiles(dataDir, {
      keepCount: keepCount || 10,
      patterns: ['*.bak', '*.snapshot', '*.gz']
    });

    return { message: 'Excess files cleanup completed' };
  }

  @Post('cleanup/empty-directories')
  @ApiOperation({ summary: 'Clean up empty directories' })
  @ApiQuery({ name: 'path', required: false, description: 'Directory path to clean' })
  async cleanupEmptyDirectories(@Query('path') path?: string) {
    const dataDir = path || this.configService.get('DATA_DIR', './mdj-data');
    await this.cleanupService.cleanupEmptyDirectories(dataDir);
    return { message: 'Empty directories cleanup completed' };
  }

  @Post('cleanup/full')
  @ApiOperation({ summary: 'Perform full cleanup' })
  @ApiQuery({ name: 'path', required: false, description: 'Directory path to clean' })
  async performFullCleanup(@Query('path') path?: string) {
    const dataDir = path || this.configService.get('DATA_DIR', './mdj-data');
    
    await this.cleanupService.performFullCleanup(dataDir, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxSize: 100 * 1024 * 1024, // 100MB
      keepCount: 10,
      patterns: ['*.log', '*.tmp', '*.bak', '*.snapshot']
    });

    return { message: 'Full cleanup completed' };
  }

  @Get('system/stats')
  @ApiOperation({ summary: 'Get system performance statistics' })
  async getSystemStats() {
    const dataDir = this.configService.get('DATA_DIR', './mdj-data');
    
    const [cacheStats, compressionStats, cleanupStats] = await Promise.all([
      this.cacheService.getStats(),
      this.compressionService.getCompressionStats(dataDir),
      this.cleanupService.getCleanupStats(dataDir)
    ]);

    return {
      cache: cacheStats,
      compression: compressionStats,
      cleanup: cleanupStats,
      timestamp: new Date().toISOString()
    };
  }
}