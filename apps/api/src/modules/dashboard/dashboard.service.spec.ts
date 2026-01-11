import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { TasksService } from '../tasks/tasks.service';
import { ComplianceService } from '../filings/compliance.service';
import { CalendarService } from '../calendar/calendar.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let clientsService: jest.Mocked<ClientsService>;
  let servicesService: jest.Mocked<ServicesService>;
  let tasksService: jest.Mocked<TasksService>;
  let complianceService: jest.Mocked<ComplianceService>;
  let calendarService: jest.Mocked<CalendarService>;

  const mockClients = [
    {
      id: 'client1',
      ref: '1A001',
      name: 'Test Client 1',
      type: 'COMPANY',
      status: 'ACTIVE',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'client2',
      ref: '1A002',
      name: 'Test Client 2',
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-15'),
    },
  ];

  const mockServices = [
    {
      id: 'service1',
      clientId: 'client1',
      kind: 'Accounts',
      status: 'ACTIVE',
      annualized: 1000,
      updatedAt: new Date('2024-01-20'),
    },
    {
      id: 'service2',
      clientId: 'client2',
      kind: 'VAT',
      status: 'ACTIVE',
      annualized: 500,
      updatedAt: new Date('2024-02-20'),
    },
  ];

  const mockTasks = [
    {
      id: 'task1',
      clientId: 'client1',
      title: 'Test Task 1',
      status: 'OPEN',
      priority: 'HIGH',
      dueDate: new Date('2024-03-01'),
      updatedAt: new Date('2024-01-25'),
    },
    {
      id: 'task2',
      clientId: 'client2',
      title: 'Test Task 2',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      dueDate: new Date('2024-02-25'),
      updatedAt: new Date('2024-02-25'),
    },
  ];

  const mockCompliance = [
    {
      id: 'comp1',
      clientId: 'client1',
      type: 'Annual Accounts',
      status: 'PENDING',
      dueDate: new Date('2024-03-15'),
      source: 'COMPANIES_HOUSE',
    },
    {
      id: 'comp2',
      clientId: 'client2',
      type: 'VAT Return',
      status: 'FILED',
      dueDate: new Date('2024-02-28'),
      source: 'HMRC',
    },
  ];

  beforeEach(async () => {
    const mockClientsService = {
      findAll: jest.fn(),
      findByPortfolio: jest.fn(),
    };

    const mockServicesService = {
      getServiceSummary: jest.fn(),
      findAll: jest.fn(),
    };

    const mockTasksService = {
      getTaskSummary: jest.fn(),
      findAll: jest.fn(),
    };

    const mockComplianceService = {
      getComplianceStatistics: jest.fn(),
      findAll: jest.fn(),
    };

    const mockCalendarService = {
      getCalendarSummary: jest.fn(),
      getEventsByDateRange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: ClientsService, useValue: mockClientsService },
        { provide: ServicesService, useValue: mockServicesService },
        { provide: TasksService, useValue: mockTasksService },
        { provide: ComplianceService, useValue: mockComplianceService },
        { provide: CalendarService, useValue: mockCalendarService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    clientsService = module.get(ClientsService);
    servicesService = module.get(ServicesService);
    tasksService = module.get(TasksService);
    complianceService = module.get(ComplianceService);
    calendarService = module.get(CalendarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardKPIs', () => {
    beforeEach(() => {
      clientsService.findAll.mockResolvedValue(mockClients as any);
      servicesService.getServiceSummary.mockResolvedValue({
        totalServices: 2,
        activeServices: 2,
        totalAnnualFees: 1500,
        servicesByKind: { Accounts: 1, VAT: 1 },
        servicesByFrequency: { ANNUAL: 2 },
      });
      servicesService.findAll.mockResolvedValue(mockServices as any);
      tasksService.getTaskSummary.mockResolvedValue({
        totalTasks: 2,
        openTasks: 1,
        inProgressTasks: 0,
        completedTasks: 1,
        overdueTasks: 0,
        dueSoonTasks: 1,
      });
      complianceService.getComplianceStatistics.mockResolvedValue({
        total: 2,
        pending: 1,
        overdue: 0,
        dueThisMonth: 1,
        filed: 1,
        totalItems: 2,
        byStatus: { PENDING: 1, FILED: 1 },
        byType: { 'Annual Accounts': 1, 'VAT Return': 1 },
        bySource: { COMPANIES_HOUSE: 1, HMRC: 1 },
        overdueCount: 0,
        upcomingCount: 1,
      });
      calendarService.getCalendarSummary.mockResolvedValue({
        totalEvents: 5,
        upcomingEvents: 3,
        overdueEvents: 0,
        eventsByType: { MEETING: 3, DEADLINE: 2 },
        eventsByStatus: { SCHEDULED: 5 },
      });
      calendarService.getEventsByDateRange.mockResolvedValue([
        { type: 'MEETING' },
        { type: 'DEADLINE' },
        { type: 'MEETING' },
      ] as any);
    });

    it('should calculate KPIs correctly', async () => {
      const result = await service.getDashboardKPIs();

      expect(result).toMatchObject({
        clients: {
          total: 2,
          active: 2,
          inactive: 0,
          newThisMonth: expect.any(Number),
        },
        services: {
          total: 2,
          active: 2,
          totalAnnualFees: 1500,
          averageFeePerClient: 750,
        },
        tasks: {
          total: 2,
          open: 1,
          inProgress: 0,
          completed: 1,
          completionRate: 50,
        },
        compliance: {
          total: 2,
          pending: 1,
          overdue: 0,
          filed: 1,
          complianceRate: 50,
        },
        calendar: {
          totalEvents: 5,
          upcomingEvents: 3,
          eventsThisWeek: 3,
          meetingsThisWeek: 2,
        },
      });

      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(result.refreshInterval).toBe(300); // 5 minutes in seconds
    });

    it('should use cache when available', async () => {
      // First call
      await service.getDashboardKPIs();
      
      // Second call should use cache
      await service.getDashboardKPIs();

      // Services should only be called once due to caching
      expect(clientsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should force refresh when requested', async () => {
      // First call
      await service.getDashboardKPIs();
      
      // Force refresh
      await service.getDashboardKPIs(undefined, true);

      // Services should be called twice
      expect(clientsService.findAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('getWeekAheadView', () => {
    beforeEach(() => {
      tasksService.findAll.mockResolvedValue([mockTasks[0]] as any);
      complianceService.findAll.mockResolvedValue([mockCompliance[0]] as any);
      calendarService.getEventsByDateRange.mockResolvedValue([
        {
          id: 'event1',
          title: 'Client Meeting',
          startDate: new Date(),
          type: 'MEETING',
          clientId: 'client1',
        },
      ] as any);
      clientsService.findOne = jest.fn().mockResolvedValue(mockClients[0] as any);
    });

    it('should return week ahead view', async () => {
      const result = await service.getWeekAheadView();

      expect(result).toMatchObject({
        tasks: expect.arrayContaining([
          expect.objectContaining({
            id: 'task1',
            title: 'Test Task 1',
            priority: 'HIGH',
            status: 'OPEN',
          }),
        ]),
        compliance: expect.arrayContaining([
          expect.objectContaining({
            id: 'comp1',
            type: 'Annual Accounts',
            status: 'PENDING',
          }),
        ]),
        events: expect.arrayContaining([
          expect.objectContaining({
            id: 'event1',
            title: 'Client Meeting',
            type: 'MEETING',
          }),
        ]),
      });
    });
  });

  describe('generateClientListReport', () => {
    beforeEach(() => {
      clientsService.findAll.mockResolvedValue(mockClients as any);
      servicesService.findAll.mockResolvedValue(mockServices as any);
      tasksService.findAll.mockResolvedValue(mockTasks as any);
      complianceService.findAll.mockResolvedValue(mockCompliance as any);
    });

    it('should generate client list report', async () => {
      const result = await service.generateClientListReport();

      expect(result).toMatchObject({
        clients: expect.arrayContaining([
          expect.objectContaining({
            ref: '1A001',
            name: 'Test Client 1',
            type: 'COMPANY',
            status: 'ACTIVE',
            totalAnnualFees: 1000,
            activeServices: 1,
          }),
        ]),
        summary: {
          totalClients: 2,
          totalAnnualFees: 1500,
          averageFeePerClient: 750,
          clientsByStatus: { ACTIVE: 2 },
          clientsByType: { COMPANY: 1, INDIVIDUAL: 1 },
        },
        generatedAt: expect.any(Date),
      });
    });
  });

  describe('generateComplianceReport', () => {
    beforeEach(() => {
      complianceService.findAll.mockResolvedValue(mockCompliance as any);
      clientsService.findAll.mockResolvedValue(mockClients as any);
    });

    it('should generate compliance report', async () => {
      const result = await service.generateComplianceReport();

      expect(result).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'comp1',
            clientName: 'Test Client 1',
            clientRef: '1A001',
            type: 'Annual Accounts',
            status: 'PENDING',
            source: 'COMPANIES_HOUSE',
          }),
        ]),
        summary: {
          totalItems: 2,
          byStatus: { PENDING: 1, FILED: 1 },
          byType: { 'Annual Accounts': 1, 'VAT Return': 1 },
        },
        generatedAt: expect.any(Date),
      });
    });
  });

  describe('exportToCSV', () => {
    it('should export data to CSV format', async () => {
      const testData = [
        { name: 'Client 1', fee: 1000, status: 'Active' },
        { name: 'Client 2', fee: 500, status: 'Inactive' },
      ];

      const result = await service.exportToCSV(testData, 'test.csv');

      expect(result).toBe(
        'name,fee,status\nClient 1,1000,Active\nClient 2,500,Inactive'
      );
    });

    it('should handle empty data', async () => {
      const result = await service.exportToCSV([], 'empty.csv');
      expect(result).toBe('');
    });

    it('should handle values with commas and quotes', async () => {
      const testData = [
        { name: 'Client, Inc.', description: 'A "test" client' },
      ];

      const result = await service.exportToCSV(testData, 'test.csv');

      expect(result).toBe(
        'name,description\n"Client, Inc.","A ""test"" client"'
      );
    });
  });

  describe('cache management', () => {
    beforeEach(() => {
      // Set up all required mocks for cache management tests
      clientsService.findAll.mockResolvedValue(mockClients as any);
      servicesService.getServiceSummary.mockResolvedValue({
        totalServices: 2,
        activeServices: 2,
        totalAnnualFees: 1500,
        servicesByKind: { Accounts: 1, VAT: 1 },
        servicesByFrequency: { ANNUAL: 2 },
      });
      servicesService.findAll.mockResolvedValue(mockServices as any);
      tasksService.getTaskSummary.mockResolvedValue({
        totalTasks: 2,
        openTasks: 1,
        inProgressTasks: 0,
        completedTasks: 1,
        overdueTasks: 0,
        dueSoonTasks: 1,
      });
      complianceService.getComplianceStatistics.mockResolvedValue({
        total: 2,
        pending: 1,
        overdue: 0,
        dueThisMonth: 1,
        filed: 1,
        totalItems: 2,
        byStatus: { PENDING: 1, FILED: 1 },
        byType: { 'Annual Accounts': 1, 'VAT Return': 1 },
        bySource: { COMPANIES_HOUSE: 1, HMRC: 1 },
        overdueCount: 0,
        upcomingCount: 1,
      });
      calendarService.getCalendarSummary.mockResolvedValue({
        totalEvents: 5,
        upcomingEvents: 3,
        overdueEvents: 0,
        eventsByType: { MEETING: 3, DEADLINE: 2 },
        eventsByStatus: { SCHEDULED: 5 },
      });
      calendarService.getEventsByDateRange.mockResolvedValue([
        { type: 'MEETING' },
        { type: 'DEADLINE' },
        { type: 'MEETING' },
      ] as any);
    });

    it('should clear cache', async () => {
      // Populate cache
      await service.getDashboardKPIs();
      expect(service.getCacheStatus().entries).toBe(1);

      // Clear cache
      await service.clearCache();
      expect(service.getCacheStatus().entries).toBe(0);
    });

    it('should refresh dashboard data', async () => {
      const result = await service.refreshDashboardData();
      
      expect(result).toBeDefined();
      expect(clientsService.findAll).toHaveBeenCalled();
    });

    it('should return cache status', () => {
      const status = service.getCacheStatus();
      
      expect(status).toMatchObject({
        entries: expect.any(Number),
        keys: expect.any(Array),
      });
    });
  });
});