import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CalendarEvent,
  CalendarEventFilters,
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarView,
  CalendarSummary,
} from './interfaces/calendar.interface';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(data: CreateCalendarEventDto): Promise<CalendarEvent> {
    if (data.endDate && data.startDate >= data.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    return (this.prisma as any).calendarEvent.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        allDay: data.allDay ?? false,
        clientId: data.clientId,
        taskId: data.taskId,
        type: data.type || 'APPOINTMENT',
      },
    });
  }

  async getEvents(filters: CalendarEventFilters = {}): Promise<CalendarEvent[]> {
    const where: any = {};

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.taskId) where.taskId = filters.taskId;
    if (filters.type) where.type = filters.type;

    if (filters.dateRange) {
      where.startDate = { lte: filters.dateRange.end };
      where.endDate = { gte: filters.dateRange.start };
    }

    if (filters.startDate || filters.endDate) {
      where.startDate = where.startDate || {};
      if (filters.startDate) where.startDate.gte = filters.startDate;
      if (filters.endDate) where.startDate.lte = filters.endDate;
    }

    if (filters.portfolioCode) {
      const clients = await (this.prisma as any).client.findMany({
        where: { portfolioCode: filters.portfolioCode },
        select: { id: true },
      });
      const ids = clients.map((c: any) => c.id);
      where.clientId = { in: ids };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return (this.prisma as any).calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
      skip: filters.offset || 0,
      take: filters.limit || 100,
    });
  }

  async getEventById(id: string): Promise<CalendarEvent> {
    const event = await (this.prisma as any).calendarEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }
    return event;
  }

  async updateEvent(id: string, data: UpdateCalendarEventDto): Promise<CalendarEvent> {
    const existingEvent = await this.getEventById(id);

    const startDate = data.startDate ?? existingEvent.startDate;
    const endDate = data.endDate ?? existingEvent.endDate;

    if (endDate && startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    return (this.prisma as any).calendarEvent.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await this.getEventById(id);
    await (this.prisma as any).calendarEvent.delete({ where: { id } });
  }

  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    return this.getEvents({ dateRange: { start: startDate, end: endDate } });
  }

  async getCalendarView(startDate: Date, endDate: Date, filters: CalendarEventFilters = {}): Promise<CalendarView> {
    const events = await this.getEvents({ ...filters, dateRange: { start: startDate, end: endDate } });

    return {
      events,
      totalCount: events.length,
      dateRange: { start: startDate, end: endDate },
    };
  }

  async getCalendarSummary(portfolioCode?: number): Promise<CalendarSummary> {
    const filters: CalendarEventFilters = portfolioCode ? { portfolioCode } : {};
    const events = await this.getEvents(filters);
    const now = new Date();

    const summary: CalendarSummary = {
      totalEvents: events.length,
      upcomingEvents: events.filter((e) => e.startDate > now).length,
      overdueEvents: events.filter((e) => e.endDate && e.endDate < now).length,
      eventsByType: {},
    };

    events.forEach((event) => {
      summary.eventsByType[event.type] = (summary.eventsByType[event.type] || 0) + 1;
    });

    return summary;
  }
}
