import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationConfigService } from './services/integration-config.service';
import { IntegrationHealthService } from './services/integration-health.service';
import { IntegrationMonitoringService } from './services/integration-monitoring.service';
import { EncryptionService } from './services/encryption.service';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationConfigService,
    IntegrationHealthService,
    IntegrationMonitoringService,
    EncryptionService,
  ],
  exports: [
    IntegrationConfigService,
    IntegrationHealthService,
    IntegrationMonitoringService,
    EncryptionService,
  ],
})
export class IntegrationsModule {}