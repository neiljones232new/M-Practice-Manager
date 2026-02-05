import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarEvent, CreateCalendarEventDto, UpdateCalendarEventDto } from './interfaces/calendar.interface';

describe('CalendarService', () => {
  let service: CalendarService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockEvent: CalendarEvent = {
    id: 'event-1',
    title: 'Test Meeting',
    description: 'Test meeting description',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    allDay: false,
    clientId: 'client-1',
    type: 'MEETING',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      calendarEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      client: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    prismaService = module.get(PrismaService);
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
      };

      prismaService.calendarEvent.create.mockResolvedValue({
        ...mockEvent,
        title: createDto.title,
        description: createDto.description,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        clientId: createDto.clientId,
        type: createDto.type || 'APPOINTMENT',
      });

      const result = await service.createEvent(createDto);

      expect(prismaService.calendarEvent.create).toHaveBeenCalledWith({
        data: {
          title: createDto.title,
          description: createDto.description,
          startDate: createDto.startDate,
          endDate: createDto.endDate,
          allDay: false,
          clientId: createDto.clientId,
          taskId: undefined,
          type: createDto.type,
        },
      });
      expect(result).toMatchObject({
        title: createDto.title,
        description: createDto.description,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        clientId: createDto.clientId,
        type: createDto.type,
        allDay: false,
      });
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
      prismaService.calendarEvent.findUnique.mockResolvedValue(mockEvent);

      const result = await service.getEventById('event-1');

      expect(result).toEqual(mockEvent);
      expect(prismaService.calendarEvent.findUnique).toHaveBeenCalledWith({ where: { id: 'event-1' } });
    });

    it('should throw NotFoundException when event does not exist', async () => {
      prismaService.calendarEvent.findUnique.mockResolvedValue(null);

      await expect(service.getEventById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEvent', () => {
    it('should update an event successfully', async () => {
      const updateDto: UpdateCalendarEventDto = {
        title: 'Updated Meeting',
        description: 'Updated description',
      };

      prismaService.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      prismaService.calendarEvent.update.mockResolvedValue({
        ...mockEvent,
        title: updateDto.title || mockEvent.title,
        description: updateDto.description || mockEvent.description,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      });

      const result = await service.updateEvent('event-1', updateDto);

      expect(result.title).toBe(updateDto.title);
      expect(result.description).toBe(updateDto.description);
      expect(result.updatedAt).not.toEqual(mockEvent.updatedAt);
    });

    it('should throw BadRequestException when updating with invalid dates', async () => {
      const updateDto: UpdateCalendarEventDto = {
        startDate: new Date('2024-01-15T11:00:00Z'),
        endDate: new Date('2024-01-15T10:00:00Z'),
      };

      prismaService.calendarEvent.findUnique.mockResolvedValue(mockEvent);

      await expect(service.updateEvent('event-1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      prismaService.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      prismaService.calendarEvent.delete.mockResolvedValue(mockEvent);

      await service.deleteEvent('event-1');

      expect(prismaService.calendarEvent.delete).toHaveBeenCalledWith({ where: { id: 'event-1' } });
    });
  });

  describe('getEventsByDateRange', () => {
    it('should return events within date range', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      prismaService.calendarEvent.findMany.mockResolvedValue([mockEvent]);

      const result = await service.getEventsByDateRange(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEvent);
      expect(prismaService.calendarEvent.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCalendarSummary', () => {
    it('should return calendar summary', async () => {
      const events = [
        { ...mockEvent, type: 'MEETING' },
        { ...mockEvent, id: 'event-2', type: 'DEADLINE' },
      ];

      prismaService.calendarEvent.findMany.mockResolvedValue(events);

      const result = await service.getCalendarSummary();

      expect(result.totalEvents).toBe(2);
      expect(result.eventsByType).toEqual({
        MEETING: 1,
        DEADLINE: 1,
      });
    });
  });
});
