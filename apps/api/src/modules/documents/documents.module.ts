import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ReportsService } from './reports.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { ClientsModule } from '../clients/clients.module';
import { ServicesModule } from '../services/services.module';
import { CompaniesHouseModule } from '../companies-house/companies-house.module';
import { TaxCalculationsModule } from '../tax-calculations/tax-calculations.module';

@Module({
  imports: [
    FileStorageModule,
    ClientsModule,
    ServicesModule,
    CompaniesHouseModule,
    forwardRef(() => TaxCalculationsModule),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, ReportsService],
  exports: [DocumentsService, ReportsService],
})
export class DocumentsModule {}