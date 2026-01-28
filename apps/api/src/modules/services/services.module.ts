import { Module, forwardRef } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServiceComplianceIntegrationService } from './service-compliance-integration.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { DatabaseModule } from '../database/database.module';
import { ClientsModule } from '../clients/clients.module';
import { TasksModule } from '../tasks/tasks.module';
import { FilingsModule } from '../filings/filings.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    FileStorageModule,
    DatabaseModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => TasksModule),
    forwardRef(() => FilingsModule),
    IntegrationsModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService, ServiceComplianceIntegrationService],
  exports: [ServicesService, ServiceComplianceIntegrationService],
})
export class ServicesModule {}
