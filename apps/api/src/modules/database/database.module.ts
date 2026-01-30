import { Module, forwardRef } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PrismaDatabaseService } from './prisma-database.service';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [forwardRef(() => FileStorageModule)],
  providers: [{ provide: DatabaseService, useClass: PrismaDatabaseService }, MigrationService, PrismaDatabaseService],
  controllers: [MigrationController],
  exports: [DatabaseService, MigrationService],
})
export class DatabaseModule {}