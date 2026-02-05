export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  clientId?: string;
  taskId?: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEventFilters {
  clientId?: string;
  taskId?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  dateRange?: {
    start: Date;
    end: Date;
  };
  portfolioCode?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCalendarEventDto {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  clientId?: string;
  taskId?: string;
  type?: string;
}

export interface UpdateCalendarEventDto {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  allDay?: boolean;
  clientId?: string;
  taskId?: string;
  type?: string;
}

export interface CalendarView {
  events: CalendarEvent[];
  totalCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface CalendarSummary {
  totalEvents: number;
  upcomingEvents: number;
  overdueEvents: number;
  eventsByType: Record<string, number>;
}
