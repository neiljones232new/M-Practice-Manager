import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { 
  CalendarEvent, 
  CalendarEventFilters, 
  CreateCalendarEventDto, 
  UpdateCalendarEventDto,
  CalendarView,
  CalendarSummary
} from './interfaces/calendar.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CalendarService {
  private readonly CALENDAR_DIR = 'calendar';
  private readonly EVENTS_DIR = 'calendar/events';
  private readonly INDEX_FILE = 'calendar/index.json';

  constructor(private readonly fileStorage: FileStorageService) {}

  async createEvent(data: CreateCalendarEventDto): Promise<CalendarEvent> {
    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const event: CalendarEvent = {
      id: uuidv4(),
      ...data,
      allDay: data.allDay ?? false,
      status: data.status ?? 'SCHEDULED',
      attendees: data.attendees ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save event to file
    await this.fileStorage.writeJson('calendar/events', event.id, event);

    // Update index
    await this.updateIndex();

    return event;
  }

  async getEvents(filters: CalendarEventFilters = {}): Promise<CalendarEvent[]> {
    const allEvents = await this.getAllEvents();
    
    return this.filterEvents(allEvents, filters);
  }

  async getEventById(id: string): Promise<CalendarEvent> {
    const event = await this.fileStorage.readJson<CalendarEvent>('calendar/events', id);
    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }
    return event;
  }

  async updateEvent(id: string, data: UpdateCalendarEventDto): Promise<CalendarEvent> {
    const existingEvent = await this.getEventById(id);

    // Validate dates if provided
    const startDate = data.startDate ?? existingEvent.startDate;
    const endDate = data.endDate ?? existingEvent.endDate;
    
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      ...data,
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('calendar/events', id, updatedEvent);
    await this.updateIndex();

    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    // Check if event exists
    await this.getEventById(id);

    await this.fileStorage.deleteJson('calendar/events', id);
    await this.updateIndex();
  }

  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const filters: CalendarEventFilters = {
      dateRange: { start: startDate, end: endDate }
    };
    
    return this.getEvents(filters);
  }

  async getCalendarView(startDate: Date, endDate: Date, filters: CalendarEventFilters = {}): Promise<CalendarView> {
    const dateRangeFilters: CalendarEventFilters = {
      ...filters,
      dateRange: { start: startDate, end: endDate }
    };

    const events = await this.getEvents(dateRangeFilters);

    return {
      events,
      totalCount: events.length,
      dateRange: { start: startDate, end: endDate }
    };
  }

  async getCalendarSummary(portfolioCode?: number): Promise<CalendarSummary> {
    const filters: CalendarEventFilters = portfolioCode ? { portfolioCode } : {};
    const events = await this.getEvents(filters);
    const now = new Date();

    const summary: CalendarSummary = {
      totalEvents: events.length,
      upcomingEvents: events.filter(e => e.startDate > now && e.status !== 'CANCELLED').length,
      overdueEvents: events.filter(e => e.endDate < now && e.status === 'SCHEDULED').length,
      eventsByType: {},
      eventsByStatus: {}
    };

    // Count by type
    events.forEach(event => {
      summary.eventsByType[event.type] = (summary.eventsByType[event.type] || 0) + 1;
      summary.eventsByStatus[event.status] = (summary.eventsByStatus[event.status] || 0) + 1;
    });

    return summary;
  }

  private async getAllEvents(): Promise<CalendarEvent[]> {
    try {
      const eventFiles = await this.fileStorage.listFiles('calendar/events');
      const events: CalendarEvent[] = [];

      for (const eventFile of eventFiles) {
        const eventId = eventFile.replace('.json', '');
        try {
          const event = await this.fileStorage.readJson<CalendarEvent>('calendar/events', eventId);
          if (event) {
            events.push(event);
          }
        } catch (error) {
          // Skip missing files and continue
          console.warn(`Calendar event file ${eventId}.json not found, skipping`);
        }
      }

      return events;
    } catch (error) {
      // If directory doesn't exist, return empty array
      return [];
    }
  }

  private filterEvents(events: CalendarEvent[], filters: CalendarEventFilters): CalendarEvent[] {
    let filtered = [...events];

    if (filters.clientId) {
      filtered = filtered.filter(event => event.clientId === filters.clientId);
    }

    if (filters.taskId) {
      filtered = filtered.filter(event => event.taskId === filters.taskId);
    }

    if (filters.type) {
      filtered = filtered.filter(event => event.type === filters.type);
    }

    if (filters.status) {
      filtered = filtered.filter(event => event.status === filters.status);
    }

    if (filters.dateRange) {
      filtered = filtered.filter(event => 
        event.startDate <= filters.dateRange!.end && 
        event.endDate >= filters.dateRange!.start
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(event => event.startDate >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(event => event.endDate <= filters.endDate!);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        (event.description && event.description.toLowerCase().includes(searchLower)) ||
        (event.location && event.location.toLowerCase().includes(searchLower))
      );
    }

    // Sort by start date
    filtered.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Apply pagination
    if (filters.offset !== undefined) {
      filtered = filtered.slice(filters.offset);
    }

    if (filters.limit !== undefined) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  private async updateIndex(): Promise<void> {
    // Index is automatically maintained by FileStorageService, no need for manual updates
  }
}