'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { api } from '@/lib/api';

interface Trend {
  direction: 'up' | 'down' | 'neutral';
  monthOverMonth?: number;
  revenueChange?: number;
  completionRateChange?: number;
  complianceRateChange?: number;
}

interface DashboardMetrics {
  clients: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
    trend: Trend;
  };
  services: {
    total: number;
    active: number;
    totalAnnualFees: number;
    averageFeePerClient: number;
    serviceBreakdown: Record<string, number>;
    trend: Trend;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
    dueThisWeek: number;
    completionRate: number;
    trend: Trend;
  };
  compliance: {
    total: number;
    pending: number;
    overdue: number;
    dueThisMonth: number;
    filed: number;
    complianceRate: number;
    trend: Trend;
  };
  calendar: {
    totalEvents: number;
    upcomingEvents: number;
    eventsThisWeek: number;
    meetingsThisWeek: number;
  };
  lastUpdated: string;
  refreshInterval: number;
}

type KpiConfig = {
  title: string;
  value: string | number;
  subLabel?: string;
  trend?: Trend;
  href: string;
  accent: 'clients' | 'services' | 'tasks' | 'compliance';
};

function formatTrend(trend?: Trend): { label: string; className: string } | null {
  if (!trend) return null;
  const delta =
    trend.monthOverMonth ??
    trend.revenueChange ??
    trend.completionRateChange ??
    trend.complianceRateChange;
  if (delta === undefined) return null;
  if (delta === 0 && trend.direction === 'neutral') return null;
  const label = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
  const className =
    trend.direction === 'up'
      ? 'trend-up'
      : trend.direction === 'down'
      ? 'trend-down'
      : 'trend-neutral';
  return { label, className };
}

function CalendarSnapshotWidget() {
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUpcomingTasks = async () => {
      try {
        setLoading(true);
        // Get all tasks
        const tasks = await api.get<any[]>('/tasks').catch(() => []);
        
        // Filter for tasks due in the next 7 days
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const upcoming = (Array.isArray(tasks) ? tasks : [])
          .filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= now && dueDate <= weekFromNow && task.status !== 'completed';
          })
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5); // Show top 5
        
        setUpcomingTasks(upcoming);
      } catch (error) {
        console.error('Failed to load upcoming tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUpcomingTasks();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="card-mdj flex-column">
      <h3>Calendar Snapshot</h3>
      {loading ? (
        <p className="text-dim">Loading...</p>
      ) : upcomingTasks.length === 0 ? (
                <p className="text-dim">No tasks due in the next week.</p>
      ) : (
        <ul className="snapshot-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {upcomingTasks.map(task => (
            <li key={task.id} style={{ 
              padding: '8px 0', 
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>{task.title}</div>
                {task.clientName && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{task.clientName}</div>
                )}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#d97706',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                marginLeft: '12px'
              }}>
                {formatDate(task.dueDate)}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link href="/calendar" className="btn-outline-primary" style={{ marginTop: '12px' }}>
        Open Calendar
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<DashboardMetrics>('/dashboard/kpis');
        setMetrics(data);
      } catch (e: any) {
        console.error('Failed to load dashboard data', e);
        setError(e?.message || 'Unable to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtGBP = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n || 0);

  const kpis: KpiConfig[] = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        title: 'Active Clients',
        value: metrics.clients.active,
        subLabel: `${metrics.clients.total} total clients`,
        trend: metrics.clients.trend,
        href: '/clients',
        accent: 'clients',
      },
      {
        title: 'Annual Fees',
        value: fmtGBP(metrics.services.totalAnnualFees),
        subLabel: `${metrics.services.active} active services`,
        trend: metrics.services.trend,
        href: '/services',
        accent: 'services',
      },
      {
        title: 'Tasks Due',
        value: metrics.tasks.open,
        subLabel: `${metrics.tasks.overdue} overdue · ${metrics.tasks.dueThisWeek} due this week`,
        trend: metrics.tasks.trend,
        href: '/tasks',
        accent: 'tasks',
      },
      {
        title: 'Compliance Items',
        value: metrics.compliance.overdue,
        subLabel: `${metrics.compliance.pending} pending items`,
        trend: metrics.compliance.trend,
        href: '/compliance',
        accent: 'compliance',
      },
    ];
  }, [metrics]);

  const quickLinks = [
    {
      title: 'Clients',
      body: 'Review client portfolios, add new clients, and manage parties.',
      href: '/clients',
    },
    {
      title: 'Services',
      body: 'Track recurring services, billing frequencies, and fee structures.',
      href: '/services',
    },
    {
      title: 'Tasks',
      body: 'Stay ahead of deadlines and team assignments.',
      href: '/tasks',
    },
    {
      title: 'Documents',
      body: 'Upload compliance evidence, invoices, and client reports.',
      href: '/documents',
    },
  ];

  const taxTools = [
    {
      title: 'Salary & Dividend Optimisation',
      body: 'Model the most tax-efficient split for directors.',
      href: '/tax-calculations/new',
    },
    {
      title: 'Personal Tax',
      body: 'Calculate income tax and NI for individuals.',
      href: '/tax-calculations/new',
    },
    {
      title: 'Corporation Tax',
      body: 'Estimate company tax with marginal relief.',
      href: '/tax-calculations/new',
    },
    {
      title: 'Scenario Comparison',
      body: 'Compare multiple salary/dividend scenarios.',
      href: '/tax-calculations/new',
    },
  ];

  return (
    <MDJShell
      pageTitle="Dashboard"
      pageSubtitle="Here's what's happening with your practice today"
      actions={[
        { label: 'Add Client', href: '/clients/new/wizard', variant: 'primary' },
        { label: 'Create Service', href: '/services/new', variant: 'primary' },
        { label: 'Add Task', href: '/tasks/new', variant: 'primary' },
        <ExportMenu key="export"
          onPDF={async () => {
            try {
              const pdfBuffer = await api.get<ArrayBuffer>('/dashboard/export.pdf');
              const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `dashboard-${new Date().toISOString().slice(0,10)}.pdf`; a.click(); URL.revokeObjectURL(url);
            } catch (e: any) { alert(e?.message || 'PDF export failed'); }
          }}
        />,
      ]}
    >
      <div className="dashboard-section">
        {loading ? (
          <div className="card-mdj">Loading dashboard…</div>
        ) : error ? (
          <div className="card-mdj error-card">{error}</div>
        ) : (
          <>
            <div className="kpi-grid">
              {kpis.map((kpi) => {
                const trend = formatTrend(kpi.trend);
                return (
                  <Link key={kpi.title} href={kpi.href} className={`kpi-card accent-${kpi.accent}`}>
                    <div className="kpi-header">
                      <div className="kpi-title-section">
                        <p className="kpi-title">{kpi.title}</p>
                        {trend && <span className={`trend-pill ${trend.className}`}>{trend.label}</span>}
                      </div>
                      <div className="kpi-icon">
                        {kpi.accent === 'clients' && '👥'}
                        {kpi.accent === 'services' && '💼'}
                        {kpi.accent === 'tasks' && '📋'}
                        {kpi.accent === 'compliance' && '⚠️'}
                      </div>
                    </div>
                    <div className="kpi-value">{kpi.value}</div>
                    {kpi.subLabel && <p className="kpi-subtitle">{kpi.subLabel}</p>}
                  </Link>
                );
              })}
            </div>

            <div className="dashboard-grid">
              <CalendarSnapshotWidget />
              

              <div className="card-mdj flex-column">
                <h3>Practice Overview</h3>
                <p className="text-dim">
                  Monitor key metrics, tasks, and compliance activity in one place.
                </p>
                <div className="overview-grid">
                  <div>
                    <span className="overview-label">New Clients</span>
                    <strong>{metrics?.clients.newThisMonth ?? 0}</strong>
                  </div>
                  <div>
                    <span className="overview-label">Avg Fee per Client</span>
                    <strong>{fmtGBP(metrics?.services.averageFeePerClient ?? 0)}</strong>
                  </div>
                  <div>
                    <span className="overview-label">Completion Rate</span>
                    <strong>{(metrics?.tasks.completionRate ?? 0).toFixed(0)}%</strong>
                  </div>
                  <div>
                    <span className="overview-label">Compliance Rate</span>
                    <strong>{(metrics?.compliance.complianceRate ?? 0).toFixed(0)}%</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-mdj flex-column">
              <h3>Tax Calculations</h3>
              <p className="text-dim">Jump into M Powered™ tax tools.</p>
              <div className="quick-links">
                {taxTools.map((tool) => (
                  <Link key={tool.title} href={tool.href} className="quick-card">
                    <div>
                      <h4>{tool.title}</h4>
                      <p>{tool.body}</p>
                    </div>
                    <span className="quick-arrow">→</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="quick-links">
              {quickLinks.map((link) => (
                <Link key={link.title} href={link.href} className="quick-card">
                  <div>
                    <h4>{link.title}</h4>
                    <p>{link.body}</p>
                  </div>
                  <span className="quick-arrow">→</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </MDJShell>
  );
}
