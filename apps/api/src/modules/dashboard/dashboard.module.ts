import { Module, forwardRef } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ClientsModule } from '../clients/clients.module';
import { ServicesModule } from '../services/services.module';
import { TasksModule } from '../tasks/tasks.module';
import { FilingsModule } from '../filings/filings.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [
    forwardRef(() => ClientsModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => TasksModule), // ✅ critical change
    forwardRef(() => FilingsModule),
    forwardRef(() => CalendarModule),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
