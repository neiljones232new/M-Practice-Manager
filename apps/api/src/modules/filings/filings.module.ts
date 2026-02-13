import { Module, forwardRef } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceTaskIntegrationService } from './compliance-task-integration.service';
import { ClientsModule } from '../clients/clients.module';
import { ServicesModule } from '../services/services.module';
import { TasksModule } from '../tasks/tasks.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    forwardRef(() => ClientsModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => TasksModule),     // ✅ if compliance creates or updates tasks
    forwardRef(() => DashboardModule), // ✅ allows dashboard↔filings circular reference
    PrismaModule,
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceTaskIntegrationService],
  exports: [ComplianceService, ComplianceTaskIntegrationService],
})
export class FilingsModule {}
