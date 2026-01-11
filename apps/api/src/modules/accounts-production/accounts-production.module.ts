import { Module } from '@nestjs/common';
import { AccountsProductionController } from './accounts-production.controller';
import { AccountsProductionService } from './accounts-production.service';
import { AccountsSetValidationService } from './accounts-set-validation.service';
import { FinancialCalculationService } from './financial-calculation.service';
import { AccountsOutputService } from './accounts-output.service';
import { ClientsModule } from '../clients/clients.module';
import { CompaniesHouseModule } from '../companies-house/companies-house.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { TemplatesModule } from '../templates/templates.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ClientsModule,
    CompaniesHouseModule,
    FileStorageModule,
    TemplatesModule,
    AuditModule,
    AuthModule,
    DatabaseModule,
  ],
  controllers: [AccountsProductionController],
  providers: [
    AccountsProductionService,
    AccountsSetValidationService,
    FinancialCalculationService,
    AccountsOutputService,
  ],
  exports: [
    AccountsProductionService,
    AccountsSetValidationService,
    FinancialCalculationService,
    AccountsOutputService,
  ],
})
export class AccountsProductionModule {}