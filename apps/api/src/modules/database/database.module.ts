import { Module, forwardRef } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [forwardRef(() => FileStorageModule)],
  providers: [DatabaseService, MigrationService],
  controllers: [MigrationController],
  exports: [DatabaseService, MigrationService],
})
export class DatabaseModule {}