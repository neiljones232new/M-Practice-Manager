import { Module, forwardRef } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarIntegrationService } from './calendar-integration.service';
import { TasksModule } from '../tasks/tasks.module';
import { FilingsModule } from '../filings/filings.module';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    forwardRef(() => FilingsModule),
  ],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarIntegrationService],
  exports: [CalendarService, CalendarIntegrationService],
})
export class CalendarModule {}
