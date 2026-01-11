import { Module, forwardRef } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { SearchService } from './search.service';
import { FilterService } from './filter.service';
import { IndexingService } from './indexing.service';
import { CacheService } from './cache.service';
import { CompressionService } from './compression.service';
import { CleanupService } from './cleanup.service';
import { FileAuditService } from './file-audit.service';
import { FileCleanupService } from './file-cleanup.service';
import { PerformanceController } from './performance.controller';
import { FileAuditController } from './file-audit.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    forwardRef(() => DatabaseModule),
  ],
  controllers: [
    PerformanceController,
    FileAuditController,
  ],
  providers: [
    FileStorageService,
    SearchService,
    FilterService,
    IndexingService,
    CacheService,
    CompressionService,
    CleanupService,
    FileAuditService,
    FileCleanupService,
  ],
  exports: [
    FileStorageService,
    SearchService,
    FilterService,
    IndexingService,
    CacheService,
    CompressionService,
    CleanupService,
    FileAuditService,
    FileCleanupService,
  ],
})
export class FileStorageModule {}