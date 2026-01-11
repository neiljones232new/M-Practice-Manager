import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { CalendarEvent, CreateCalendarEventDto, UpdateCalendarEventDto } from './interfaces/calendar.interface';

describe('CalendarService', () => {
  let service: CalendarService;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const mockEvent: CalendarEvent = {
    id: 'event-1',
    title: 'Test Meeting',
    description: 'Test meeting description',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    allDay: false,
    clientId: 'client-1',
    type: 'MEETING',
    location: 'Conference Room A',
    attendees: ['user1@example.com', 'user2@example.com'],
    status: 'SCHEDULED',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      deleteJson: jest.fn(),
      listFiles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    fileStorageService = module.get(FileStorageService);
  });

  describe('createEvent', () => {
    it('should create a calendar event successfully', async () => {
      const createDto: CreateCalendarEventDto = {
        title: 'Test Meeting',
        description: 'Test meeting description',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        clientId: 'client-1',
        type: 'MEETING',
        location: 'Conference Room A',
        attendees: ['user1@example.com'],
      };

      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.createEvent(createDto);

      expect(result).toMatchObject({
        title: createDto.title,
        description: createDto.description,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        clientId: createDto.clientId,
        type: createDto.type,
        location: createDto.location,
        attendees: createDto.attendees,
        allDay: false,
        status: 'SCHEDULED',
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(fileStorageService.writeJson).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when start date is after end date', async () => {
      const createDto: CreateCalendarEventDto = {
        title: 'Invalid Event',
        startDate: new Date('2024-01-15T11:00:00Z'),
        endDate: new Date('2024-01-15T10:00:00Z'),
        type: 'MEETING',
      };

      await expect(service.createEvent(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEventById', () => {
    it('should return an event by ID', async () => {
      fileStorageService.readJson.mockResolvedValue(mockEvent);

      const result = await service.getEventById('event-1');

      expect(result).toEqual(mockEvent);
      expect(fileStorageService.readJson).toHaveBeenCalledWith('calendar/events', 'event-1');
    });

    it('should throw NotFoundException when event does not exist', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      await expect(service.getEventById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEvent', () => {
    it('should update an event successfully', async () => {
      const updateDto: UpdateCalendarEventDto = {
        title: 'Updated Meeting',
        location: 'Conference Room B',
      };

      fileStorageService.readJson.mockResolvedValue(mockEvent);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.updateEvent('event-1', updateDto);

      expect(result.title).toBe(updateDto.title);
      expect(result.location).toBe(updateDto.location);
      expect(result.updatedAt).not.toEqual(mockEvent.updatedAt);
    });

    it('should throw BadRequestException when updating with invalid dates', async () => {
      const updateDto: UpdateCalendarEventDto = {
        startDate: new Date('2024-01-15T11:00:00Z'),
        endDate: new Date('2024-01-15T10:00:00Z'),
      };

      fileStorageService.readJson.mockResolvedValue(mockEvent);

      await expect(service.updateEvent('event-1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockEvent);
      fileStorageService.deleteJson.mockResolvedValue(undefined);

      await service.deleteEvent('event-1');

      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('calendar/events', 'event-1');
    });
  });

  describe('getEventsByDateRange', () => {
    it('should return events within date range', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      fileStorageService.listFiles.mockResolvedValue(['event-1.json']);
      fileStorageService.readJson.mockResolvedValue(mockEvent);

      const result = await service.getEventsByDateRange(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEvent);
    });
  });

  describe('getCalendarSummary', () => {
    it('should return calendar summary', async () => {
      const events = [
        { ...mockEvent, type: 'MEETING', status: 'SCHEDULED' },
        { ...mockEvent, id: 'event-2', type: 'DEADLINE', status: 'COMPLETED' },
      ];

      fileStorageService.listFiles.mockResolvedValue(['event-1.json', 'event-2.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(events[0])
        .mockResolvedValueOnce(events[1]);

      const result = await service.getCalendarSummary();

      expect(result.totalEvents).toBe(2);
      expect(result.eventsByType).toEqual({
        MEETING: 1,
        DEADLINE: 1,
      });
      expect(result.eventsByStatus).toEqual({
        SCHEDULED: 1,
        COMPLETED: 1,
      });
    });
  });
});