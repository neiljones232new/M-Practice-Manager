import { Module, forwardRef } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { PersonService } from './services/person.service';
import { ClientPartyService } from './services/client-party.service';
import { ReferenceGeneratorService } from './services/reference-generator.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { DatabaseModule } from '../database/database.module';
import { ServicesModule } from '../services/services.module';
import { TasksModule } from '../tasks/tasks.module';
import { FilingsModule } from '../filings/filings.module';

@Module({
  imports: [
    FileStorageModule,
    DatabaseModule,
    forwardRef(() => ServicesModule),
    forwardRef(() => TasksModule),
    forwardRef(() => FilingsModule),
  ],
  controllers: [ClientsController],
  providers: [
    ClientsService,
    PersonService,
    ClientPartyService,
    ReferenceGeneratorService,
  ],
  exports: [
    ClientsService, // ← absolutely essential
    PersonService,
    ClientPartyService,
    ReferenceGeneratorService,
  ],
})
export class ClientsModule {}
