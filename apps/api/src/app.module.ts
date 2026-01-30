import { Module } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ServicesModule } from './modules/services/services.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { FilingsModule } from './modules/filings/filings.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AssistModule } from './modules/assist/assist.module';
import { CompaniesHouseModule } from './modules/companies-house/companies-house.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { SecurityModule } from './modules/security/security.module';
import { PortfoliosModule } from './modules/portfolios/portfolios.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { TaxCalculationsModule } from './modules/tax-calculations/tax-calculations.module';
import { AccountsProductionModule } from './modules/accounts-production/accounts-production.module';
import { DatabaseModule } from './modules/database/database.module';
import { StaffModule } from './modules/staff/staff.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InternalController } from './modules/internal/internal.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? (fs.existsSync('.env.prod') ? '.env.prod' : fs.existsSync('env.prod') ? 'env.prod' : '.env')
          : [
              '.env.prod',
              '.env.local',
              // When running the API from apps/api, also consider repo-root env files.
              path.resolve(process.cwd(), '../.env.prod'),
              path.resolve(process.cwd(), '../.env.local'),
              // When running from apps/api, repo root is typically two levels up.
              path.resolve(process.cwd(), '../../.env.prod'),
              path.resolve(process.cwd(), '../../.env.local'),
            ],
      cache: true,
    }),

    // Scheduling for background tasks
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Infrastructure modules
    DatabaseModule,
    PrismaModule,
    FileStorageModule,

    // Core business modules
    AuthModule,
    ClientsModule,
    ServicesModule,
    TasksModule,
    FilingsModule,
    DocumentsModule,
    AssistModule,
    CompaniesHouseModule,
    ReportsModule,
    CalendarModule,
    DashboardModule,
    AuditModule,
    SecurityModule,
    IntegrationsModule,
    PortfoliosModule,
    TemplatesModule,
    TaxCalculationsModule,
    AccountsProductionModule,
    StaffModule,
  ],
  controllers: [AppController, InternalController],
  providers: [AppService],
})
export class AppModule {}
