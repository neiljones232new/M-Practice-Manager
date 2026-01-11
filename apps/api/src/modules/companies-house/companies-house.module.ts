import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CompaniesHouseService } from './companies-house.service';
import { CompaniesHouseController } from './companies-house.controller';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { ClientsModule } from '../clients/clients.module';
import { FilingsModule } from '../filings/filings.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    FileStorageModule,
    ClientsModule,
    FilingsModule,
    IntegrationsModule,
    forwardRef(() => ServicesModule),
  ],
  controllers: [CompaniesHouseController],
  providers: [CompaniesHouseService],
  exports: [CompaniesHouseService],
})
export class CompaniesHouseModule {}