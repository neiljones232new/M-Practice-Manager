import { Test, TestingModule } from '@nestjs/testing';
import { CalendarIntegrationService } from './calendar-integration.service';
import { CalendarService } from './calendar.service';
import { TasksService } from '../tasks/tasks.service';
import { ComplianceService } from '../filings/compliance.service';
import { Task } from '../tasks/interfaces/task.interface';
import { ComplianceItem } from '../companies-house/interfaces/companies-house.interface';

describe('CalendarIntegrationService', () => {
  let service: CalendarIntegrationService;
  let calendarService: jest.Mocked<CalendarService>;
  let tasksService: jest.Mocked<TasksService>;
  let complianceService: jest.Mocked<ComplianceService>;

  const mockTask: Task = {
    id: 'task-1',
    clientId: 'client-1',
    title: 'Test Task',
    description: 'Test task description',
    dueDate: new Date('2024-02-15T00:00:00Z'),
    assignee: 'test-user',
    status: 'OPEN',
    priority: 'MEDIUM',
    tags: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockComplianceItem: ComplianceItem = {
    id: 'compliance-1',
    clientId: 'client-1',
    type: 'Annual Accounts',
    description: 'Annual accounts filing',
    period: '2023',
    dueDate: new Date('2024-03-31T00:00:00Z'),
    status: 'PENDING',
    source: 'COMPANIES_HOUSE',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockCalendarService = {
      createEvent: jest.fn(),
      getEvents: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn(),
    };

    const mockTasksService = {
      findAll: jest.fn(),
    };

    const mockComplianceService = {
      getAllComplianceItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarIntegrationService,
        {
          provide: CalendarService,
          useValue: mockCalendarService,
        },
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: ComplianceService,
          useValue: mockComplianceService,
        },
      ],
    }).compile();

    service = module.get<CalendarIntegrationService>(CalendarIntegrationService);
    calendarService = module.get(CalendarService);
    tasksService = module.get(TasksService);
    complianceService = module.get(ComplianceService);
  });

  describe('createEventFromTask', () => {
    it('should create calendar event from task with due date', async () => {
      calendarService.getEvents.mockResolvedValue([]);
      calendarService.createEvent.mockResolvedValue({
        id: 'event-1',
        title: 'Task Due: Test Task',
        startDate: mockTask.dueDate!,
        endDate: mockTask.dueDate!,
        allDay: true,
        clientId: mockTask.clientId,
        taskId: mockTask.id,
        type: 'DEADLINE',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createEventFromTask(mockTask);

      expect(calendarService.getEvents).toHaveBeenCalledWith({
        taskId: mockTask.id,
        type: 'DEADLINE',
      });
      expect(calendarService.createEvent).toHaveBeenCalledWith({
        title: 'Task Due: Test Task',
        description: 'Task: Test task description',
        startDate: mockTask.dueDate,
        endDate: mockTask.dueDate,
        allDay: true,
        clientId: mockTask.clientId,
        taskId: mockTask.id,
        type: 'DEADLINE',
        status: 'SCHEDULED',
      });
    });

    it('should not create event if task has no due date', async () => {
      const taskWithoutDueDate = { ...mockTask, dueDate: undefined };

      await service.createEventFromTask(taskWithoutDueDate);

      expect(calendarService.getEvents).not.toHaveBeenCalled();
      expect(calendarService.createEvent).not.toHaveBeenCalled();
    });

    it('should not create event if one already exists', async () => {
      calendarService.getEvents.mockResolvedValue([{
        id: 'existing-event',
        title: 'Task Due: Test Task',
        startDate: mockTask.dueDate!,
        endDate: mockTask.dueDate!,
        allDay: true,
        clientId: mockTask.clientId,
        taskId: mockTask.id,
        type: 'DEADLINE',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      await service.createEventFromTask(mockTask);

      expect(calendarService.createEvent).not.toHaveBeenCalled();
    });
  });

  describe('createEventFromCompliance', () => {
    it('should create calendar event from compliance item with due date', async () => {
      calendarService.getEvents.mockResolvedValue([]);
      calendarService.createEvent.mockResolvedValue({
        id: 'event-1',
        title: 'Filing Due: Annual Accounts',
        startDate: mockComplianceItem.dueDate!,
        endDate: mockComplianceItem.dueDate!,
        allDay: true,
        clientId: mockComplianceItem.clientId,
        type: 'FILING',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createEventFromCompliance(mockComplianceItem);

      expect(calendarService.getEvents).toHaveBeenCalledWith({
        search: 'Compliance: Annual Accounts',
        clientId: mockComplianceItem.clientId,
        type: 'FILING',
      });
      expect(calendarService.createEvent).toHaveBeenCalledWith({
        title: 'Filing Due: Annual Accounts',
        description: 'Compliance filing for Annual Accounts (2023)\nCompliance ID: compliance-1',
        startDate: mockComplianceItem.dueDate,
        endDate: mockComplianceItem.dueDate,
        allDay: true,
        clientId: mockComplianceItem.clientId,
        type: 'FILING',
        status: 'SCHEDULED',
      });
    });

    it('should not create event if compliance item has no due date', async () => {
      const complianceWithoutDueDate = { ...mockComplianceItem, dueDate: undefined };

      await service.createEventFromCompliance(complianceWithoutDueDate);

      expect(calendarService.getEvents).not.toHaveBeenCalled();
      expect(calendarService.createEvent).not.toHaveBeenCalled();
    });
  });

  describe('createAppointment', () => {
    it('should create appointment calendar event', async () => {
      const appointmentData = {
        title: 'Client Meeting',
        description: 'Quarterly review meeting',
        startDate: new Date('2024-02-15T10:00:00Z'),
        endDate: new Date('2024-02-15T11:00:00Z'),
        clientId: 'client-1',
        location: 'Conference Room A',
        attendees: ['client@example.com'],
      };

      calendarService.createEvent.mockResolvedValue({
        id: 'event-1',
        ...appointmentData,
        allDay: false,
        type: 'APPOINTMENT',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createAppointment(appointmentData);

      expect(calendarService.createEvent).toHaveBeenCalledWith({
        ...appointmentData,
        type: 'APPOINTMENT',
        status: 'SCHEDULED',
        allDay: false,
      });
    });
  });

  describe('createMeeting', () => {
    it('should create meeting calendar event', async () => {
      const meetingData = {
        title: 'Team Meeting',
        description: 'Weekly team sync',
        startDate: new Date('2024-02-15T14:00:00Z'),
        endDate: new Date('2024-02-15T15:00:00Z'),
        location: 'Zoom',
        attendees: ['team@example.com'],
      };

      calendarService.createEvent.mockResolvedValue({
        id: 'event-1',
        ...meetingData,
        allDay: false,
        type: 'MEETING',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createMeeting(meetingData);

      expect(calendarService.createEvent).toHaveBeenCalledWith({
        ...meetingData,
        type: 'MEETING',
        status: 'SCHEDULED',
        allDay: false,
      });
    });
  });
});