import { Module, forwardRef } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceTaskIntegrationService } from './compliance-task-integration.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { ClientsModule } from '../clients/clients.module';
import { ServicesModule } from '../services/services.module';
import { TasksModule } from '../tasks/tasks.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    FileStorageModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => TasksModule),     // ✅ if compliance creates or updates tasks
    forwardRef(() => DashboardModule), // ✅ allows dashboard↔filings circular reference
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceTaskIntegrationService],
  exports: [ComplianceService, ComplianceTaskIntegrationService],
})
export class FilingsModule {}
