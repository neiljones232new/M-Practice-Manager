import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationConfigService } from './services/integration-config.service';
import { IntegrationHealthService } from './services/integration-health.service';
import { IntegrationMonitoringService } from './services/integration-monitoring.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [FileStorageModule, SecurityModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationConfigService,
    IntegrationHealthService,
    IntegrationMonitoringService,
  ],
  exports: [
    IntegrationConfigService,
    IntegrationHealthService,
    IntegrationMonitoringService,
  ],
})
export class IntegrationsModule {}