import { Injectable, Logger } from '@nestjs/common';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { TasksService } from '../tasks/tasks.service';
import { ComplianceService } from '../filings/compliance.service';
import { CalendarService } from '../calendar/calendar.service';

export interface DashboardKPIs {
  clients: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
    trend: {
      monthOverMonth: number;
      direction: 'up' | 'down' | 'neutral';
    };
  };
  services: {
    total: number;
    active: number;
    totalAnnualFees: number;
    averageFeePerClient: number;
    serviceBreakdown: { [key: string]: number };
    trend: {
      revenueChange: number;
      direction: 'up' | 'down' | 'neutral';
    };
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
    dueThisWeek: number;
    completionRate: number;
    trend: {
      completionRateChange: number;
      direction: 'up' | 'down' | 'neutral';
    };
  };
  compliance: {
    total: number;
    pending: number;
    overdue: number;
    dueThisMonth: number;
    filed: number;
    complianceRate: number;
    trend: {
      complianceRateChange: number;
      direction: 'up' | 'down' | 'neutral';
    };
  };
  calendar: {
    totalEvents: number;
    upcomingEvents: number;
    eventsThisWeek: number;
    meetingsThisWeek: number;
  };
  lastUpdated: Date;
  refreshInterval: number; // in seconds
}

export interface WeekAheadView {
  tasks: Array<{
    id: string;
    title: string;
    dueDate: Date;
    priority: string;
    clientName?: string;
    status: string;
  }>;
  compliance: Array<{
    id: string;
    type: string;
    dueDate: Date;
    clientName?: string;
    status: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    startDate: Date;
    type: string;
    clientName?: string;
  }>;
}

export interface PriorityRecommendations {
  urgentTasks: Array<{
    id: string;
    title: string;
    reason: string;
    daysOverdue?: number;
    clientName?: string;
  }>;
  complianceFlags: Array<{
    id: string;
    type: string;
    reason: string;
    daysUntilDue?: number;
    clientName?: string;
  }>;
  businessInsights: Array<{
    type: 'revenue' | 'efficiency' | 'risk' | 'opportunity';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private kpiCache: Map<string, { data: DashboardKPIs; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private readonly clientsService: ClientsService,
    private readonly servicesService: ServicesService,
    private readonly tasksService: TasksService,
    private readonly complianceService: ComplianceService,
    private readonly calendarService: CalendarService,
  ) {}

  async getDashboardKPIs(portfolioCode?: number, forceRefresh = false): Promise<DashboardKPIs> {
    try {
      const cacheKey = `kpis_${portfolioCode || 'all'}`;
      
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cached = this.kpiCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_TTL) {
          this.logger.log(`Returning cached KPIs for portfolio: ${portfolioCode || 'all'}`);
          return cached.data;
        }
      }

      this.logger.log(`Calculating dashboard KPIs for portfolio: ${portfolioCode || 'all'}`);

      // Get current data in parallel
      const [
        clients,
        servicesSummary,
        tasksSummary,
        complianceStats,
        calendarSummary,
        services
      ] = await Promise.all([
        this.clientsService.findAll({ portfolioCode }),
        this.servicesService.getServiceSummary(portfolioCode),
        this.tasksService.getTaskSummary(portfolioCode),
        this.complianceService.getComplianceStatistics(portfolioCode),
        this.calendarService.getCalendarSummary(portfolioCode),
        this.servicesService.findAll({ portfolioCode })
      ]);

      // Get historical data for trend analysis
      const historicalData = await this.getHistoricalKPIs(portfolioCode);

      // Calculate client metrics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const activeClients = clients.filter(c => c.status === 'ACTIVE');
      const inactiveClients = clients.filter(c => c.status === 'INACTIVE');
      const newThisMonth = clients.filter(c => new Date(c.createdAt) >= startOfMonth);

      // Calculate service breakdown
      const serviceBreakdown: { [key: string]: number } = {};
      services.forEach(service => {
        serviceBreakdown[service.kind] = (serviceBreakdown[service.kind] || 0) + 1;
      });

      // Calculate average fee per client
      const totalAnnualFees = servicesSummary.totalAnnualFees || 0;
      const averageFeePerClient = activeClients.length > 0 ? totalAnnualFees / activeClients.length : 0;

      // Calculate task completion rate
      const totalTasks = tasksSummary.totalTasks || 0;
      const completedTasks =
        tasksSummary.completedTasks ??
        tasksSummary.tasksByStatus?.COMPLETED ??
        0;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate compliance rate
      const totalCompliance = complianceStats.total || 0;
      const filedCompliance = complianceStats.filed || 0;
      const complianceRate = totalCompliance > 0 ? (filedCompliance / totalCompliance) * 100 : 0;

      // Get week-ahead events
      const weekAhead = new Date();
      weekAhead.setDate(weekAhead.getDate() + 7);
      const eventsThisWeek = await this.calendarService.getEventsByDateRange(now, weekAhead);
      const meetingsThisWeek = eventsThisWeek.filter(e => e.type === 'MEETING').length;

      // Calculate trends
      const clientTrend = historicalData
        ? this.calculateTrend(activeClients.length, historicalData.clients?.active || activeClients.length, 'client')
        : { direction: 'neutral' };
      const revenueTrend = historicalData
        ? this.calculateTrend(totalAnnualFees, historicalData.services?.totalAnnualFees || totalAnnualFees, 'revenue')
        : { direction: 'neutral' };
      const taskTrend = historicalData
        ? this.calculateTrend(completionRate, historicalData.tasks?.completionRate || completionRate, 'task')
        : { direction: 'neutral' };
      const complianceTrend = historicalData
        ? this.calculateTrend(complianceRate, historicalData.compliance?.complianceRate || complianceRate, 'compliance')
        : { direction: 'neutral' };

      const kpis: DashboardKPIs = {
        clients: {
          total: clients.length,
          active: activeClients.length,
          inactive: inactiveClients.length,
          newThisMonth: newThisMonth.length,
          trend: clientTrend,
        },
        services: {
          total: servicesSummary.totalServices || 0,
          active: servicesSummary.activeServices || 0,
          totalAnnualFees,
          averageFeePerClient: Math.round(averageFeePerClient),
          serviceBreakdown,
          trend: revenueTrend,
        },
        tasks: {
          total: totalTasks,
          open: tasksSummary.openTasks || 0,
          inProgress: tasksSummary.inProgressTasks || 0,
          completed: completedTasks,
          overdue: tasksSummary.overdueTasks || 0,
          dueThisWeek: tasksSummary.dueSoonTasks || 0,
          completionRate: Math.round(completionRate),
          trend: taskTrend,
        },
        compliance: {
          total: totalCompliance,
          pending: complianceStats.pending || 0,
          overdue: complianceStats.overdue || 0,
          dueThisMonth: complianceStats.dueThisMonth || 0,
          filed: filedCompliance,
          complianceRate: Math.round(complianceRate),
          trend: complianceTrend,
        },
        calendar: {
          totalEvents: calendarSummary.totalEvents || 0,
          upcomingEvents: calendarSummary.upcomingEvents || 0,
          eventsThisWeek: eventsThisWeek.length,
          meetingsThisWeek,
        },
        lastUpdated: new Date(),
        refreshInterval: this.CACHE_TTL / 1000, // Convert to seconds
      };

      // Cache the results
      this.kpiCache.set(cacheKey, { data: kpis, timestamp: new Date() });

      return kpis;
    } catch (error) {
      this.logger.error('Error calculating dashboard KPIs:', error);
      throw error;
    }
  }

  async getWeekAheadView(portfolioCode?: number): Promise<WeekAheadView> {
    try {
      const now = new Date();
      const weekAhead = new Date();
      weekAhead.setDate(weekAhead.getDate() + 7);

      // Get tasks due this week (both OPEN and IN_PROGRESS)
      const [openTasks, inProgressTasks] = await Promise.all([
        this.tasksService.findAll({
          portfolioCode,
          dueAfter: now,
          dueBefore: weekAhead,
          status: 'OPEN'
        }),
        this.tasksService.findAll({
          portfolioCode,
          dueAfter: now,
          dueBefore: weekAhead,
          status: 'IN_PROGRESS'
        })
      ]);
      const tasks = [...openTasks, ...inProgressTasks];

      // Get compliance items due this week
      const complianceItems = await this.complianceService.findAll({
        portfolioCode,
        dueDateFrom: now,
        dueDateTo: weekAhead,
        status: 'PENDING'
      });

      // Get calendar events this week
      const events = await this.calendarService.getEventsByDateRange(now, weekAhead);

      // Get client names for context
      const clientIds = [
        ...new Set([
          ...tasks.map(t => t.clientId).filter(Boolean),
          ...complianceItems.map(c => c.clientId).filter(Boolean),
          ...events.map(e => e.clientId).filter(Boolean)
        ])
      ];

      const clients = await Promise.all(
        clientIds.map(id => this.clientsService.findOne(id).catch(() => null))
      );
      const clientMap = new Map(clients.filter(Boolean).map(c => [c.id, c.name]));

      return {
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
          clientName: task.clientId ? clientMap.get(task.clientId) : undefined,
          status: task.status,
        })),
        compliance: complianceItems.map(item => ({
          id: item.id,
          type: item.type,
          dueDate: item.dueDate,
          clientName: item.clientId ? clientMap.get(item.clientId) : undefined,
          status: item.status,
        })),
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          startDate: event.startDate,
          type: event.type,
          clientName: event.clientId ? clientMap.get(event.clientId) : undefined,
        })),
      };
    } catch (error) {
      this.logger.error('Error getting week ahead view:', error);
      throw error;
    }
  }

  async getPriorityRecommendations(portfolioCode?: number): Promise<PriorityRecommendations> {
    try {
      const now = new Date();

      // Get overdue tasks (both OPEN and IN_PROGRESS)
      const [overdueOpen, overdueInProgress] = await Promise.all([
        this.tasksService.findAll({
          portfolioCode,
          dueBefore: now,
          status: 'OPEN'
        }),
        this.tasksService.findAll({
          portfolioCode,
          dueBefore: now,
          status: 'IN_PROGRESS'
        })
      ]);
      const overdueTasks = [...overdueOpen, ...overdueInProgress];

      // Get overdue compliance items
      const overdueCompliance = await this.complianceService.findAll({
        portfolioCode,
        dueDateTo: now,
        status: 'PENDING'
      });

      // Get compliance items due soon
      const soonDue = new Date();
      soonDue.setDate(soonDue.getDate() + 7);
      const complianceDueSoon = await this.complianceService.findAll({
        portfolioCode,
        dueDateFrom: now,
        dueDateTo: soonDue,
        status: 'PENDING'
      });

      // Get client names
      const clientIds = [
        ...new Set([
          ...overdueTasks.map(t => t.clientId).filter(Boolean),
          ...overdueCompliance.map(c => c.clientId).filter(Boolean),
          ...complianceDueSoon.map(c => c.clientId).filter(Boolean)
        ])
      ];

      const clients = await Promise.all(
        clientIds.map(id => this.clientsService.findOne(id).catch(() => null))
      );
      const clientMap = new Map(clients.filter(Boolean).map(c => [c.id, c.name]));

      // Calculate business insights
      const kpis = await this.getDashboardKPIs(portfolioCode);
      const businessInsights = this.generateBusinessInsights(kpis);

      return {
        urgentTasks: overdueTasks
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 10)
          .map(task => ({
            id: task.id,
            title: task.title,
            reason: `Overdue by ${Math.ceil((now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days`,
            daysOverdue: Math.ceil((now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
            clientName: task.clientId ? clientMap.get(task.clientId) : undefined,
          })),
        complianceFlags: [
          ...overdueCompliance.map(item => ({
            id: item.id,
            type: item.type,
            reason: `Overdue filing - immediate action required`,
            daysUntilDue: Math.ceil((new Date(item.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            clientName: item.clientId ? clientMap.get(item.clientId) : undefined,
          })),
          ...complianceDueSoon.map(item => ({
            id: item.id,
            type: item.type,
            reason: `Due within 7 days - prepare filing`,
            daysUntilDue: Math.ceil((new Date(item.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            clientName: item.clientId ? clientMap.get(item.clientId) : undefined,
          }))
        ].slice(0, 10),
        businessInsights,
      };
    } catch (error) {
      this.logger.error('Error getting priority recommendations:', error);
      throw error;
    }
  }

  private generateBusinessInsights(kpis: DashboardKPIs): Array<{
    type: 'revenue' | 'efficiency' | 'risk' | 'opportunity';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }> {
    const insights = [];

    // Revenue insights
    if (kpis.services.totalAnnualFees > 0) {
      insights.push({
        type: 'revenue' as const,
        title: 'Annual Revenue Tracking',
        description: `Total annual fees: £${kpis.services.totalAnnualFees.toLocaleString()} across ${kpis.services.active} active services`,
        impact: 'high' as const,
      });
    }

    // Efficiency insights
    if (kpis.tasks.completionRate < 80) {
      insights.push({
        type: 'efficiency' as const,
        title: 'Task Completion Rate',
        description: `Current completion rate is ${kpis.tasks.completionRate}%. Consider reviewing task management processes.`,
        impact: 'medium' as const,
      });
    }

    // Risk insights
    if (kpis.compliance.overdue > 0) {
      insights.push({
        type: 'risk' as const,
        title: 'Compliance Risk',
        description: `${kpis.compliance.overdue} overdue compliance items require immediate attention to avoid penalties.`,
        impact: 'high' as const,
      });
    }

    if (kpis.tasks.overdue > 5) {
      insights.push({
        type: 'risk' as const,
        title: 'Task Management Risk',
        description: `${kpis.tasks.overdue} overdue tasks may impact client service delivery.`,
        impact: 'medium' as const,
      });
    }

    // Opportunity insights
    if (kpis.clients.newThisMonth > 0) {
      insights.push({
        type: 'opportunity' as const,
        title: 'Client Growth',
        description: `${kpis.clients.newThisMonth} new clients this month. Consider onboarding optimization.`,
        impact: 'medium' as const,
      });
    }

    if (kpis.services.averageFeePerClient > 0) {
      insights.push({
        type: 'opportunity' as const,
        title: 'Service Optimization',
        description: `Average fee per client: £${kpis.services.averageFeePerClient}. Review service mix for growth opportunities.`,
        impact: 'low' as const,
      });
    }

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private calculateTrend(current: number, previous: number, type: 'client' | 'revenue' | 'task' | 'compliance'): any {
    if (previous === 0) {
      return { direction: 'neutral' };
    }

    const change = ((current - previous) / previous) * 100;
    const direction = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral';
    const roundedChange = Math.round(change);

    switch (type) {
      case 'client':
        return { monthOverMonth: roundedChange, direction };
      case 'revenue':
        return { revenueChange: roundedChange, direction };
      case 'task':
        return { completionRateChange: roundedChange, direction };
      case 'compliance':
        return { complianceRateChange: roundedChange, direction };
      default:
        return { direction };
    }
  }

  private async getHistoricalKPIs(portfolioCode?: number): Promise<Partial<DashboardKPIs> | null> {
    try {
      // Get data from 30 days ago for comparison
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // For now, return null to indicate no historical data
      // In a real implementation, you would store and retrieve historical snapshots
      return null;
    } catch (error) {
      this.logger.warn('Could not retrieve historical KPI data:', error);
      return null;
    }
  }

  async refreshDashboardData(portfolioCode?: number): Promise<DashboardKPIs> {
    this.logger.log(`Force refreshing dashboard data for portfolio: ${portfolioCode || 'all'}`);
    
    // Clear cache for this portfolio
    const cacheKey = `kpis_${portfolioCode || 'all'}`;
    this.kpiCache.delete(cacheKey);
    
    // Get fresh data
    return this.getDashboardKPIs(portfolioCode, true);
  }

  async clearCache(): Promise<void> {
    this.logger.log('Clearing dashboard cache');
    this.kpiCache.clear();
  }

  getCacheStatus(): { entries: number; keys: string[] } {
    return {
      entries: this.kpiCache.size,
      keys: Array.from(this.kpiCache.keys()),
    };
  }

  async generateClientListReport(portfolioCode?: number): Promise<{
    clients: Array<{
      ref: string;
      name: string;
      type: string;
      status: string;
      totalAnnualFees: number;
      activeServices: number;
      openTasks: number;
      overdueItems: number;
      lastActivity: Date;
    }>;
    summary: {
      totalClients: number;
      totalAnnualFees: number;
      averageFeePerClient: number;
      clientsByStatus: Record<string, number>;
      clientsByType: Record<string, number>;
    };
    generatedAt: Date;
  }> {
    try {
      this.logger.log(`Generating client list report for portfolio: ${portfolioCode || 'all'}`);

      // Get all clients
      const clients = await this.clientsService.findAll({ portfolioCode });
      const services = await this.servicesService.findAll({ portfolioCode });
      const tasks = await this.tasksService.findAll({ portfolioCode });
      const compliance = await this.complianceService.findAll({ portfolioCode });

      // Build client report data
      const clientReportData = await Promise.all(
        clients.map(async (client) => {
          const clientServices = services.filter(s => s.clientId === client.id);
          const clientTasks = tasks.filter(t => t.clientId === client.id);
          const clientCompliance = compliance.filter(c => c.clientId === client.id);

          const totalAnnualFees = clientServices.reduce((sum, service) => sum + (service.annualized || 0), 0);
          const activeServices = clientServices.filter(s => s.status === 'ACTIVE').length;
          const openTasks = clientTasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
          const overdueTasks = clientTasks.filter(t => 
            t.dueDate && new Date(t.dueDate) < new Date() && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')
          ).length;
          const overdueCompliance = clientCompliance.filter(c => 
            c.dueDate && new Date(c.dueDate) < new Date() && c.status === 'PENDING'
          ).length;

          return {
            ref: client.ref,
            name: client.name,
            type: client.type,
            status: client.status,
            totalAnnualFees,
            activeServices,
            openTasks,
            overdueItems: overdueTasks + overdueCompliance,
            lastActivity: new Date(Math.max(
              new Date(client.updatedAt).getTime(),
              ...clientTasks.map(t => new Date(t.updatedAt).getTime()),
              ...clientServices.map(s => new Date(s.updatedAt).getTime())
            )),
          };
        })
      );

      // Calculate summary statistics
      const totalAnnualFees = clientReportData.reduce((sum, client) => sum + client.totalAnnualFees, 0);
      const averageFeePerClient = clients.length > 0 ? totalAnnualFees / clients.length : 0;

      const clientsByStatus: Record<string, number> = {};
      const clientsByType: Record<string, number> = {};

      clients.forEach(client => {
        clientsByStatus[client.status] = (clientsByStatus[client.status] || 0) + 1;
        clientsByType[client.type] = (clientsByType[client.type] || 0) + 1;
      });

      return {
        clients: clientReportData.sort((a, b) => a.name.localeCompare(b.name)),
        summary: {
          totalClients: clients.length,
          totalAnnualFees,
          averageFeePerClient: Math.round(averageFeePerClient),
          clientsByStatus,
          clientsByType,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error generating client list report:', error);
      throw error;
    }
  }

  async generateComplianceReport(portfolioCode?: number): Promise<{
    items: Array<{
      id: string;
      clientName: string;
      clientRef: string;
      type: string;
      dueDate: Date;
      status: string;
      daysUntilDue: number;
      source: string;
    }>;
    summary: {
      totalItems: number;
      overdue: number;
      dueThisWeek: number;
      dueThisMonth: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
    };
    generatedAt: Date;
  }> {
    try {
      this.logger.log(`Generating compliance report for portfolio: ${portfolioCode || 'all'}`);

      const complianceItems = await this.complianceService.findAll({ portfolioCode });
      const clients = await this.clientsService.findAll({ portfolioCode });
      const clientMap = new Map(clients.map(c => [c.id, c]));

      const now = new Date();
      const weekAhead = new Date();
      weekAhead.setDate(weekAhead.getDate() + 7);
      const monthAhead = new Date();
      monthAhead.setDate(monthAhead.getDate() + 30);

      // Build compliance report data
      const complianceReportData = complianceItems.map(item => {
        const client = clientMap.get(item.clientId);
        const daysUntilDue = item.dueDate 
          ? Math.ceil((new Date(item.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: item.id,
          clientName: client?.name || 'Unknown Client',
          clientRef: client?.ref || 'N/A',
          type: item.type,
          dueDate: item.dueDate,
          status: item.status,
          daysUntilDue,
          source: item.source,
        };
      });

      // Calculate summary statistics
      const overdue = complianceReportData.filter(item => item.daysUntilDue < 0).length;
      const dueThisWeek = complianceReportData.filter(item => 
        item.daysUntilDue >= 0 && item.daysUntilDue <= 7
      ).length;
      const dueThisMonth = complianceReportData.filter(item => 
        item.daysUntilDue >= 0 && item.daysUntilDue <= 30
      ).length;

      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};

      complianceItems.forEach(item => {
        byStatus[item.status] = (byStatus[item.status] || 0) + 1;
        byType[item.type] = (byType[item.type] || 0) + 1;
      });

      return {
        items: complianceReportData.sort((a, b) => a.daysUntilDue - b.daysUntilDue),
        summary: {
          totalItems: complianceItems.length,
          overdue,
          dueThisWeek,
          dueThisMonth,
          byStatus,
          byType,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  async exportToCSV(data: any[], filename: string): Promise<string> {
    try {
      if (data.length === 0) {
        return '';
      }

      // Get headers from first object
      const headers = Object.keys(data[0]);
      
      // Create CSV content
      const csvContent = [
        headers.join(','), // Header row
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      this.logger.log(`Generated CSV export: ${filename}`);
      return csvContent;
    } catch (error) {
      this.logger.error('Error exporting to CSV:', error);
      throw error;
    }
  }
}
