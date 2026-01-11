export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  clientId?: string;
  clientRef?: string;  // Client reference (e.g., "1A001")
  clientName?: string; // Client name for display
  taskId?: string;
  type: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'APPOINTMENT' | 'FILING';
  location?: string;
  attendees?: string[];
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEventFilters {
  clientId?: string;
  taskId?: string;
  type?: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'APPOINTMENT' | 'FILING';
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
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
  endDate: Date;
  allDay?: boolean;
  clientId?: string;
  clientRef?: string;  // Client reference (e.g., "1A001")
  clientName?: string; // Client name for display
  taskId?: string;
  type: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'APPOINTMENT' | 'FILING';
  location?: string;
  attendees?: string[];
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

export interface UpdateCalendarEventDto {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  allDay?: boolean;
  clientId?: string;
  clientRef?: string;  // Client reference (e.g., "1A001")
  clientName?: string; // Client name for display
  taskId?: string;
  type?: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'APPOINTMENT' | 'FILING';
  location?: string;
  attendees?: string[];
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
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
  eventsByStatus: Record<string, number>;
}