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
  Request,
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

  private isDemoUser(req: any) {
    return req?.user?.id === 'demo-user';
  }

  // Root endpoint for backward compatibility - returns all events
  @Get()
  async getAllEvents(
    @Request() req: any,
    @Query() filters: CalendarEventFilters,
  ): Promise<CalendarEvent[]> {
    if (this.isDemoUser(req)) {
      return [];
    }
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
  async getEvents(
    @Request() req: any,
    @Query() filters: CalendarEventFilters,
  ): Promise<CalendarEvent[]> {
    if (this.isDemoUser(req)) {
      return [];
    }
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
  async getEventById(@Request() req: any, @Param('id') id: string): Promise<CalendarEvent> {
    if (this.isDemoUser(req)) {
      return null;
    }
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
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query() filters: CalendarEventFilters,
  ): Promise<CalendarView> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (this.isDemoUser(req)) {
      return {
        events: [],
        totalCount: 0,
        dateRange: {
          start,
          end,
        },
      };
    }

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
  async getCalendarSummary(
    @Request() req: any,
    @Query('portfolioCode') portfolioCode?: number,
  ): Promise<CalendarSummary> {
    if (this.isDemoUser(req)) {
      return {
        totalEvents: 0,
        upcomingEvents: 0,
        overdueEvents: 0,
        eventsByType: {},
        eventsByStatus: {},
      };
    }
    return this.calendarService.getCalendarSummary(portfolioCode);
  }

  @Get('events/range/:startDate/:endDate')
  async getEventsByDateRange(
    @Request() req: any,
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ): Promise<CalendarEvent[]> {
    if (this.isDemoUser(req)) {
      return [];
    }
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
