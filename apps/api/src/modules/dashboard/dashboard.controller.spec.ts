import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: jest.Mocked<DashboardService>;

  const mockKPIs = {
    clients: {
      total: 10,
      active: 8,
      inactive: 2,
      newThisMonth: 2,
      trend: { monthOverMonth: 5, direction: 'up' as const },
    },
    services: {
      total: 15,
      active: 12,
      totalAnnualFees: 50000,
      averageFeePerClient: 6250,
      serviceBreakdown: { Accounts: 8, VAT: 4, Payroll: 3 },
      trend: { revenueChange: 10, direction: 'up' as const },
    },
    tasks: {
      total: 25,
      open: 10,
      inProgress: 5,
      completed: 10,
      overdue: 3,
      dueThisWeek: 7,
      completionRate: 80,
      trend: { completionRateChange: -2, direction: 'down' as const },
    },
    compliance: {
      total: 20,
      pending: 8,
      overdue: 2,
      dueThisMonth: 5,
      filed: 10,
      complianceRate: 90,
      trend: { complianceRateChange: 3, direction: 'up' as const },
    },
    calendar: {
      totalEvents: 30,
      upcomingEvents: 15,
      eventsThisWeek: 8,
      meetingsThisWeek: 5,
    },
    lastUpdated: new Date(),
    refreshInterval: 300,
  };

  const mockWeekAhead = {
    tasks: [
      {
        id: 'task1',
        title: 'Complete annual accounts',
        dueDate: new Date(),
        priority: 'HIGH',
        clientName: 'Test Client',
        status: 'OPEN',
      },
    ],
    compliance: [
      {
        id: 'comp1',
        type: 'VAT Return',
        dueDate: new Date(),
        clientName: 'Test Client',
        status: 'PENDING',
      },
    ],
    events: [
      {
        id: 'event1',
        title: 'Client meeting',
        startDate: new Date(),
        type: 'MEETING',
        clientName: 'Test Client',
      },
    ],
  };

  const mockPriorities = {
    urgentTasks: [
      {
        id: 'task1',
        title: 'Overdue task',
        reason: 'Overdue by 5 days',
        daysOverdue: 5,
        clientName: 'Test Client',
      },
    ],
    complianceFlags: [
      {
        id: 'comp1',
        type: 'Annual Accounts',
        reason: 'Due in 3 days',
        daysUntilDue: 3,
        clientName: 'Test Client',
      },
    ],
    businessInsights: [
      {
        type: 'revenue' as const,
        title: 'Revenue Growth',
        description: 'Annual fees increased by 10%',
        impact: 'high' as const,
      },
    ],
  };

  beforeEach(async () => {
    const mockDashboardService = {
      getDashboardKPIs: jest.fn(),
      getWeekAheadView: jest.fn(),
      getPriorityRecommendations: jest.fn(),
      refreshDashboardData: jest.fn(),
      getCacheStatus: jest.fn(),
      clearCache: jest.fn(),
      generateClientListReport: jest.fn(),
      generateComplianceReport: jest.fn(),
      exportToCSV: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardKPIs', () => {
    it('should return dashboard KPIs', async () => {
      dashboardService.getDashboardKPIs.mockResolvedValue(mockKPIs);

      const result = await controller.getDashboardKPIs();

      expect(result).toEqual(mockKPIs);
      expect(dashboardService.getDashboardKPIs).toHaveBeenCalledWith(undefined);
    });

    it('should handle portfolio code parameter', async () => {
      dashboardService.getDashboardKPIs.mockResolvedValue(mockKPIs);

      await controller.getDashboardKPIs('1');

      expect(dashboardService.getDashboardKPIs).toHaveBeenCalledWith(1);
    });
  });

  describe('getWeekAheadView', () => {
    it('should return week ahead view', async () => {
      dashboardService.getWeekAheadView.mockResolvedValue(mockWeekAhead);

      const result = await controller.getWeekAheadView();

      expect(result).toEqual(mockWeekAhead);
      expect(dashboardService.getWeekAheadView).toHaveBeenCalledWith(undefined);
    });

    it('should handle portfolio code parameter', async () => {
      dashboardService.getWeekAheadView.mockResolvedValue(mockWeekAhead);

      await controller.getWeekAheadView('2');

      expect(dashboardService.getWeekAheadView).toHaveBeenCalledWith(2);
    });
  });

  describe('getPriorityRecommendations', () => {
    it('should return priority recommendations', async () => {
      dashboardService.getPriorityRecommendations.mockResolvedValue(mockPriorities);

      const result = await controller.getPriorityRecommendations();

      expect(result).toEqual(mockPriorities);
      expect(dashboardService.getPriorityRecommendations).toHaveBeenCalledWith(undefined);
    });
  });

  describe('refreshDashboard', () => {
    it('should refresh dashboard data', async () => {
      dashboardService.refreshDashboardData.mockResolvedValue(mockKPIs);

      const result = await controller.refreshDashboard();

      expect(result).toEqual(mockKPIs);
      expect(dashboardService.refreshDashboardData).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getCacheStatus', () => {
    it('should return cache status', async () => {
      const mockCacheStatus = { entries: 3, keys: ['kpis_all', 'kpis_1', 'kpis_2'] };
      dashboardService.getCacheStatus.mockReturnValue(mockCacheStatus);

      const result = await controller.getCacheStatus();

      expect(result).toEqual(mockCacheStatus);
      expect(dashboardService.getCacheStatus).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      dashboardService.clearCache.mockResolvedValue();

      const result = await controller.clearCache();

      expect(result).toEqual({ message: 'Dashboard cache cleared successfully' });
      expect(dashboardService.clearCache).toHaveBeenCalled();
    });
  });

  describe('getClientReport', () => {
    const mockClientReport = {
      clients: [
        {
          ref: '1A001',
          name: 'Test Client',
          type: 'COMPANY',
          status: 'ACTIVE',
          totalAnnualFees: 5000,
          activeServices: 2,
          openTasks: 3,
          overdueItems: 1,
          lastActivity: new Date(),
        },
      ],
      summary: {
        totalClients: 1,
        totalAnnualFees: 5000,
        averageFeePerClient: 5000,
        clientsByStatus: { ACTIVE: 1 },
        clientsByType: { COMPANY: 1 },
      },
      generatedAt: new Date(),
    };

    it('should return client report in JSON format', async () => {
      dashboardService.generateClientListReport.mockResolvedValue(mockClientReport);

      const result = await controller.getClientReport();

      expect(result).toEqual(mockClientReport);
      expect(dashboardService.generateClientListReport).toHaveBeenCalledWith(undefined);
    });

    it('should return client report in CSV format', async () => {
      const csvContent = 'ref,name,type,status\n1A001,Test Client,COMPANY,ACTIVE';
      dashboardService.generateClientListReport.mockResolvedValue(mockClientReport);
      dashboardService.exportToCSV.mockResolvedValue(csvContent);

      const result = await controller.getClientReport(undefined, 'csv');

      expect(result).toMatchObject({
        content: csvContent,
        filename: expect.stringContaining('client-report-'),
        contentType: 'text/csv',
      });
      expect(dashboardService.exportToCSV).toHaveBeenCalledWith(
        mockClientReport.clients,
        expect.stringContaining('client-report-')
      );
    });
  });

  describe('getComplianceReport', () => {
    const mockComplianceReport = {
      items: [
        {
          id: 'comp1',
          clientName: 'Test Client',
          clientRef: '1A001',
          type: 'Annual Accounts',
          dueDate: new Date(),
          status: 'PENDING',
          daysUntilDue: 10,
          source: 'COMPANIES_HOUSE',
        },
      ],
      summary: {
        totalItems: 1,
        overdue: 0,
        dueThisWeek: 0,
        dueThisMonth: 1,
        byStatus: { PENDING: 1 },
        byType: { 'Annual Accounts': 1 },
      },
      generatedAt: new Date(),
    };

    it('should return compliance report in JSON format', async () => {
      dashboardService.generateComplianceReport.mockResolvedValue(mockComplianceReport);

      const result = await controller.getComplianceReport();

      expect(result).toEqual(mockComplianceReport);
      expect(dashboardService.generateComplianceReport).toHaveBeenCalledWith(undefined);
    });

    it('should return compliance report in CSV format', async () => {
      const csvContent = 'id,clientName,type,status\ncomp1,Test Client,Annual Accounts,PENDING';
      dashboardService.generateComplianceReport.mockResolvedValue(mockComplianceReport);
      dashboardService.exportToCSV.mockResolvedValue(csvContent);

      const result = await controller.getComplianceReport(undefined, 'csv');

      expect(result).toMatchObject({
        content: csvContent,
        filename: expect.stringContaining('compliance-report-'),
        contentType: 'text/csv',
      });
      expect(dashboardService.exportToCSV).toHaveBeenCalledWith(
        mockComplianceReport.items,
        expect.stringContaining('compliance-report-')
      );
    });
  });
});