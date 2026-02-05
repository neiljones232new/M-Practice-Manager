import { Injectable, Logger } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { TasksService } from '../tasks/tasks.service';
import { ComplianceService } from '../filings/compliance.service';
import { CreateCalendarEventDto } from './interfaces/calendar.interface';
import { Task } from '../tasks/interfaces/task.interface';
import { ComplianceItem } from '../companies-house/interfaces/companies-house.interface';

@Injectable()
export class CalendarIntegrationService {
  private readonly logger = new Logger(CalendarIntegrationService.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly tasksService: TasksService,
    private readonly complianceService: ComplianceService,
  ) {}

  /**
   * Create calendar event from task due date
   */
  async createEventFromTask(task: Task): Promise<void> {
    if (!task.dueDate) {
      return; // No due date, no calendar event needed
    }

    try {
      // Check if calendar event already exists for this task
      const existingEvents = await this.calendarService.getEvents({
        taskId: task.id,
        type: 'DEADLINE',
      });

      if (existingEvents.length > 0) {
        this.logger.debug(`Calendar event already exists for task ${task.id}`);
        return;
      }

      // Create calendar event
      const eventData: CreateCalendarEventDto = {
        title: `Task Due: ${task.title}`,
        description: task.description ? `Task: ${task.description}` : undefined,
        startDate: new Date(task.dueDate),
        endDate: new Date(task.dueDate),
        allDay: true,
        clientId: task.clientId,
        taskId: task.id,
        type: 'DEADLINE',
      };

      const calendarEvent = await this.calendarService.createEvent(eventData);
      this.logger.log(`Created calendar event ${calendarEvent.id} for task ${task.id}`);
    } catch (error) {
      this.logger.error(`Failed to create calendar event for task ${task.id}:`, error);
    }
  }

  /**
   * Create calendar event from compliance deadline
   */
  async createEventFromCompliance(complianceItem: ComplianceItem): Promise<void> {
    if (!complianceItem.dueDate) {
      return; // No due date, no calendar event needed
    }

    try {
      // Check if calendar event already exists for this compliance item
      const existingEvents = await this.calendarService.getEvents({
        search: `Compliance: ${complianceItem.type}`,
        clientId: complianceItem.clientId,
        type: 'FILING',
      });

      // Check if any existing event matches this compliance item
      const matchingEvent = existingEvents.find(event => 
        event.description?.includes(complianceItem.id) ||
        (event.title.includes(complianceItem.type) && 
         event.clientId === complianceItem.clientId &&
         Math.abs(new Date(event.startDate).getTime() - new Date(complianceItem.dueDate!).getTime()) < 24 * 60 * 60 * 1000)
      );

      if (matchingEvent) {
        this.logger.debug(`Calendar event already exists for compliance item ${complianceItem.id}`);
        return;
      }

      // Create calendar event
      const eventData: CreateCalendarEventDto = {
        title: `Filing Due: ${complianceItem.type}`,
        description: `Compliance filing for ${complianceItem.type}${complianceItem.period ? ` (${complianceItem.period})` : ''}\nCompliance ID: ${complianceItem.id}`,
        startDate: new Date(complianceItem.dueDate),
        endDate: new Date(complianceItem.dueDate),
        allDay: true,
        clientId: complianceItem.clientId,
        type: 'FILING',
      };

      const calendarEvent = await this.calendarService.createEvent(eventData);
      this.logger.log(`Created calendar event ${calendarEvent.id} for compliance item ${complianceItem.id}`);
    } catch (error) {
      this.logger.error(`Failed to create calendar event for compliance item ${complianceItem.id}:`, error);
    }
  }

  /**
   * Update calendar event when task is updated
   */
  async updateEventFromTask(task: Task): Promise<void> {
    try {
      const existingEvents = await this.calendarService.getEvents({
        taskId: task.id,
        type: 'DEADLINE',
      });

      if (existingEvents.length === 0) {
        // No existing event, create one if task has due date
        if (task.dueDate) {
          await this.createEventFromTask(task);
        }
        return;
      }

      const event = existingEvents[0];

      // If task no longer has due date, delete the calendar event
      if (!task.dueDate) {
        await this.calendarService.deleteEvent(event.id);
        this.logger.log(`Deleted calendar event ${event.id} for task ${task.id} (no due date)`);
        return;
      }

      // Update the calendar event
      const updateData = {
        title: `Task Due: ${task.title}`,
        description: task.description ? `Task: ${task.description}` : undefined,
        startDate: new Date(task.dueDate),
        endDate: new Date(task.dueDate),
      };

      await this.calendarService.updateEvent(event.id, updateData);
      this.logger.log(`Updated calendar event ${event.id} for task ${task.id}`);
    } catch (error) {
      this.logger.error(`Failed to update calendar event for task ${task.id}:`, error);
    }
  }

  /**
   * Update calendar event when compliance item is updated
   */
  async updateEventFromCompliance(complianceItem: ComplianceItem): Promise<void> {
    try {
      const existingEvents = await this.calendarService.getEvents({
        search: `Compliance: ${complianceItem.type}`,
        clientId: complianceItem.clientId,
        type: 'FILING',
      });

      // Find matching event
      const matchingEvent = existingEvents.find(event => 
        event.description?.includes(complianceItem.id) ||
        (event.title.includes(complianceItem.type) && 
         event.clientId === complianceItem.clientId)
      );

      if (!matchingEvent) {
        // No existing event, create one if compliance has due date
        if (complianceItem.dueDate) {
          await this.createEventFromCompliance(complianceItem);
        }
        return;
      }

      // If compliance no longer has due date, delete the calendar event
      if (!complianceItem.dueDate) {
        await this.calendarService.deleteEvent(matchingEvent.id);
        this.logger.log(`Deleted calendar event ${matchingEvent.id} for compliance ${complianceItem.id} (no due date)`);
        return;
      }

      // Update the calendar event
      const updateData = {
        title: `Filing Due: ${complianceItem.type}`,
        description: `Compliance filing for ${complianceItem.type}${complianceItem.period ? ` (${complianceItem.period})` : ''}\nCompliance ID: ${complianceItem.id}`,
        startDate: new Date(complianceItem.dueDate),
        endDate: new Date(complianceItem.dueDate),
      };

      await this.calendarService.updateEvent(matchingEvent.id, updateData);
      this.logger.log(`Updated calendar event ${matchingEvent.id} for compliance ${complianceItem.id}`);
    } catch (error) {
      this.logger.error(`Failed to update calendar event for compliance ${complianceItem.id}:`, error);
    }
  }

  /**
   * Delete calendar event when task is deleted
   */
  async deleteEventFromTask(taskId: string): Promise<void> {
    try {
      const existingEvents = await this.calendarService.getEvents({
        taskId: taskId,
        type: 'DEADLINE',
      });

      for (const event of existingEvents) {
        await this.calendarService.deleteEvent(event.id);
        this.logger.log(`Deleted calendar event ${event.id} for deleted task ${taskId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete calendar events for task ${taskId}:`, error);
    }
  }

  /**
   * Delete calendar event when compliance item is deleted
   */
  async deleteEventFromCompliance(complianceId: string, clientId: string, type: string): Promise<void> {
    try {
      const existingEvents = await this.calendarService.getEvents({
        clientId: clientId,
        type: 'FILING',
      });

      // Find matching events
      const matchingEvents = existingEvents.filter(event => 
        event.description?.includes(complianceId) ||
        event.title.includes(type)
      );

      for (const event of matchingEvents) {
        await this.calendarService.deleteEvent(event.id);
        this.logger.log(`Deleted calendar event ${event.id} for deleted compliance ${complianceId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete calendar events for compliance ${complianceId}:`, error);
    }
  }

  /**
   * Sync all existing tasks and compliance items to calendar
   */
  async syncAllToCalendar(): Promise<void> {
    this.logger.log('Starting full calendar sync...');

    try {
      // Sync all tasks with due dates
      const tasks = await this.tasksService.findAll({});
      for (const task of tasks) {
        if (task.dueDate) {
          await this.createEventFromTask(task);
        }
      }

      // Sync all compliance items with due dates
      const complianceItems = await this.complianceService.getAllComplianceItems();
      for (const item of complianceItems) {
        if (item.dueDate) {
          await this.createEventFromCompliance(item);
        }
      }

      this.logger.log('Completed full calendar sync');
    } catch (error) {
      this.logger.error('Failed to complete full calendar sync:', error);
    }
  }

  /**
   * Create appointment calendar event
   */
  async createAppointment(data: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    clientId?: string;
  }): Promise<void> {
    try {
      const eventData: CreateCalendarEventDto = {
        ...data,
        type: 'APPOINTMENT',
        allDay: false,
      };

      const calendarEvent = await this.calendarService.createEvent(eventData);
      this.logger.log(`Created appointment ${calendarEvent.id}`);
    } catch (error) {
      this.logger.error('Failed to create appointment:', error);
    }
  }

  /**
   * Create meeting calendar event
   */
  async createMeeting(data: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    clientId?: string;
  }): Promise<void> {
    try {
      const eventData: CreateCalendarEventDto = {
        ...data,
        type: 'MEETING',
        allDay: false,
      };

      const calendarEvent = await this.calendarService.createEvent(eventData);
      this.logger.log(`Created meeting ${calendarEvent.id}`);
    } catch (error) {
      this.logger.error('Failed to create meeting:', error);
    }
  }
}
