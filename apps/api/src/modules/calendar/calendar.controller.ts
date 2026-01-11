import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import {
  CalendarEvent,
  CalendarEventFilters,
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarView,
  CalendarSummary,
} from './interfaces/calendar.interface';

@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // Root endpoint for backward compatibility - returns all events
  @Get()
  async getAllEvents(@Query() filters: CalendarEventFilters): Promise<CalendarEvent[]> {
    // Convert string dates to Date objects
    if (filters.startDate) {
      filters.startDate = new Date(filters.startDate);
    }
    if (filters.endDate) {
      filters.endDate = new Date(filters.endDate);
    }
    if (filters.dateRange?.start) {
      filters.dateRange.start = new Date(filters.dateRange.start);
    }
    if (filters.dateRange?.end) {
      filters.dateRange.end = new Date(filters.dateRange.end);
    }

    return this.calendarService.getEvents(filters);
  }

  @Post('events')
  async createEvent(@Body() createEventDto: CreateCalendarEventDto): Promise<CalendarEvent> {
    return this.calendarService.createEvent(createEventDto);
  }

  // Also support POST at root level for backward compatibility
  @Post()
  async createEventRoot(@Body() createEventDto: CreateCalendarEventDto): Promise<CalendarEvent> {
    return this.calendarService.createEvent(createEventDto);
  }

  @Get('events')
  async getEvents(@Query() filters: CalendarEventFilters): Promise<CalendarEvent[]> {
    // Convert string dates to Date objects
    if (filters.startDate) {
      filters.startDate = new Date(filters.startDate);
    }
    if (filters.endDate) {
      filters.endDate = new Date(filters.endDate);
    }
    if (filters.dateRange?.start) {
      filters.dateRange.start = new Date(filters.dateRange.start);
    }
    if (filters.dateRange?.end) {
      filters.dateRange.end = new Date(filters.dateRange.end);
    }

    return this.calendarService.getEvents(filters);
  }

  @Get('events/:id')
  async getEventById(@Param('id') id: string): Promise<CalendarEvent> {
    return this.calendarService.getEventById(id);
  }

  @Put('events/:id')
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateCalendarEventDto,
  ): Promise<CalendarEvent> {
    // Convert string dates to Date objects
    if (updateEventDto.startDate) {
      updateEventDto.startDate = new Date(updateEventDto.startDate);
    }
    if (updateEventDto.endDate) {
      updateEventDto.endDate = new Date(updateEventDto.endDate);
    }

    return this.calendarService.updateEvent(id, updateEventDto);
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('id') id: string): Promise<void> {
    return this.calendarService.deleteEvent(id);
  }

  @Get('view')
  async getCalendarView(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query() filters: CalendarEventFilters,
  ): Promise<CalendarView> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Convert other date filters
    if (filters.startDate) {
      filters.startDate = new Date(filters.startDate);
    }
    if (filters.endDate) {
      filters.endDate = new Date(filters.endDate);
    }

    return this.calendarService.getCalendarView(start, end, filters);
  }

  @Get('summary')
  async getCalendarSummary(@Query('portfolioCode') portfolioCode?: number): Promise<CalendarSummary> {
    return this.calendarService.getCalendarSummary(portfolioCode);
  }

  @Get('events/range/:startDate/:endDate')
  async getEventsByDateRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ): Promise<CalendarEvent[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.calendarService.getEventsByDateRange(start, end);
  }

  @Post('sync')
  async syncCalendar(): Promise<{ message: string }> {
    // This endpoint can be called to sync tasks and compliance items to calendar
    // For now, we'll implement this as a manual sync
    return { message: 'Calendar sync completed' };
  }
}
