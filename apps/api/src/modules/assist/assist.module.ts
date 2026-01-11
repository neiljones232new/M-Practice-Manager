import { Module, forwardRef } from '@nestjs/common';
import { AssistController } from './assist.controller';
import { AssistService } from './assist.service';
import { ServerLifecycleService } from './server-lifecycle.service';
import { QueryTemplatesService } from './query-templates.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { ClientsModule } from '../clients/clients.module';
import { TasksModule } from '../tasks/tasks.module';
import { ServicesModule } from '../services/services.module';
import { FilingsModule } from '../filings/filings.module';

@Module({
  imports: [
    forwardRef(() => FileStorageModule),
    forwardRef(() => ClientsModule),
    forwardRef(() => TasksModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => FilingsModule),
  ],
  controllers: [AssistController],
  providers: [AssistService, ServerLifecycleService, QueryTemplatesService],
  exports: [AssistService, ServerLifecycleService, QueryTemplatesService],
})
export class AssistModule {}