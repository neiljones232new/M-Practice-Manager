import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { TaxCalculationsModule } from '../tax-calculations/tax-calculations.module';
import { DatabaseModule } from '../database/database.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [DocumentsModule, TaxCalculationsModule, DatabaseModule],
  controllers: [ReportsController],
  providers: [ReportsService, TemplatesService],
  exports: [ReportsService, TemplatesService]
})
export class ReportsModule {}