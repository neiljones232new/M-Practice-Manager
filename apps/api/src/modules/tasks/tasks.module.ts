import { Module, forwardRef } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { DefaultTemplatesService } from './default-templates.service';
import { StandaloneTaskTemplatesService } from './standalone-task-templates.service';
import { ClientsModule } from '../clients/clients.module';
import { ServicesModule } from '../services/services.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { FilingsModule } from '../filings/filings.module'; // ✅ add this
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => DashboardModule),
    forwardRef(() => FilingsModule), // ✅ prevents circular dependency later
    IntegrationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, DefaultTemplatesService, StandaloneTaskTemplatesService],       
  exports: [TasksService, StandaloneTaskTemplatesService],
})
export class TasksModule {}
