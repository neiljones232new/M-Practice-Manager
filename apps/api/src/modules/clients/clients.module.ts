import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { PersonService } from './services/person.service';
import { ClientPartyService } from './services/client-party.service';

@Module({
  imports: [],
  controllers: [ClientsController],
  providers: [
    ClientsService,
    PersonService,
    ClientPartyService,
  ],
  exports: [
    ClientsService, // ← absolutely essential
    PersonService,
    ClientPartyService,
  ],
})
export class ClientsModule {}
