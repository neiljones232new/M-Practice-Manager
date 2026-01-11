'use client';

import { useEffect, useMemo, useState } from 'react';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'READ' | 'TEST' | 'SYNC';
type AuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type AuditCategory = 'SECURITY' | 'AUTH' | 'DATA' | 'SYSTEM' | 'INTEGRATION' | 'UI';

interface AuditEvent {
  id: string;
  timestamp: string; // ISO
  actor: string;
  action: AuditAction;
  severity: AuditSeverity;
  category: AuditCategory;
  entity?: string;
  entityId?: string | number;
  ip?: string;
  message?: string;
  meta?: Record<string, any>;
}

interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

const ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'READ', 'TEST', 'SYNC'];
const SEVERITIES: AuditSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const CATEGORIES: AuditCategory[] = ['SECURITY', 'AUTH', 'DATA', 'SYSTEM', 'INTEGRATION', 'UI'];

function formatDate(value?: string) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleString();
  } catch {
    return value;
  }
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: 9999, background: color, display: 'inline-block' }} />;
}

function severityColor(sev: AuditSeverity) {
  switch (sev) {
    case 'CRITICAL':
      return 'var(--danger)';
    case 'HIGH':
      return 'var(--warn)';
    case 'MEDIUM':
      return 'var(--gold)';
    default:
      return 'var(--text-muted)';
  }
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState<string>('');
  const [actor, setActor] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  // Paging
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);

  const totals = useMemo(() => {
    const t = {
      total: total,
      critical: events.filter(e => e.severity === 'CRITICAL').length,
      security: events.filter(e => e.category === 'SECURITY').length,
      data: events.filter(e => e.category === 'DATA').length,
    };
    return t;
  }, [events, total]);

  async function loadData(p: number = page, ps: number = pageSize) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', String(ps));
      if (q) params.set('q', q);
      if (actor) params.set('actor', actor);
      if (action) params.set('action', action);
      if (severity) params.set('severity', severity);
      if (category) params.set('category', category);
      if (start) params.set('start', start);
      if (end) params.set('end', end);

      const res = await api.get<PagedResult<AuditEvent>>(`/audit/events?${params.toString()}`);
      setEvents(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setPageSize(res.pageSize || ps);
    } catch (err: any) {
      console.error('Failed to load audit data', err);
      setError('Failed to load audit data');
      // Optional local fallback
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFilters() {
    setQ('');
    setActor('');
    setAction('');
    setSeverity('');
    setCategory('');
    setStart('');
    setEnd('');
  }

  function exportCSV() {
    const headers = ['Timestamp', 'Actor', 'Action', 'Severity', 'Category', 'Entity', 'EntityId', 'IP', 'Message'];
    const rows = events.map(e => [
      e.timestamp,
      e.actor,
      e.action,
      e.severity,
      e.category,
      e.entity ?? '',
      e.entityId ?? '',
      e.ip ?? '',
      (e.message ?? '').replace(/\n/g, ' ').replace(/,/g, ';')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < pageCount;

  async function clearAuditEvents() {
    if (!confirm('Clear all audit events? This deletes local audit files.')) return;
    try {
      await api.post('/audit/clear');
      await loadData(1, pageSize);
    } catch (err) {
      console.error('Failed to clear audit events', err);
      setError('Failed to clear audit events');
    }
  }

  return (
    <MDJShell pageTitle="Audit" pageSubtitle="Monitor system activity and security events" showBack backHref="/dashboard" backLabel="Back to Dashboard" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit' }]}>
      {/* Stats */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{totals.total}</div>
          <div className="kpi-label">Total Events</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{totals.critical}</div>
          <div className="kpi-label">Critical Events</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{totals.security}</div>
          <div className="kpi-label">Security</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{totals.data}</div>
          <div className="kpi-label">Data Changes</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-mdj mb-6">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="label-mdj">Search</label>
              <input
                className="input-mdj"
                placeholder="Free text…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div>
              <label className="label-mdj">Actor</label>
              <input
                className="input-mdj"
                placeholder="e.g. Admin User"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              />
            </div>
            <div>
              <label className="label-mdj">Action</label>
              <select className="input-mdj" value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">All Actions</option>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label-mdj">Severity</label>
              <select className="input-mdj" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">All Severities</option>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="label-mdj">Category</label>
              <select className="input-mdj" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label-mdj">Start Date</label>
              <input className="input-mdj" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="label-mdj">End Date</label>
              <input className="input-mdj" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <button className="btn-gold" onClick={() => loadData(1, pageSize)}>Apply</button>
              <button className="btn-outline-gold" onClick={() => { resetFilters(); setTimeout(() => loadData(1, pageSize), 0); }}>Reset</button>
              <button className="btn-outline-gold" onClick={exportCSV}>Export CSV</button>
              <button className="btn-danger" onClick={clearAuditEvents}>Clear Audit</button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-mdj">
        <div className="overflow-x-auto">
          <table className="table-mdj w-full">
            <thead>
              <tr>
                <th style={{minWidth: 180}}>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Severity</th>
                <th>Category</th>
                <th>Entity</th>
                <th>Message</th>
                <th style={{minWidth: 110}}>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center p-6">Loading audit log…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="text-center p-6 text-danger">
                    {error} <button className="btn-link" onClick={() => loadData()}>Retry</button>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-dim">
                    No audit events found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                events.map(ev => (
                  <tr key={ev.id}>
                    <td className="whitespace-nowrap">{formatDate(ev.timestamp)}</td>
                    <td>{ev.actor || '—'}</td>
                    <td>
                      <span className="chip-mdj">{ev.action}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Dot color={severityColor(ev.severity)} /> {ev.severity}
                      </div>
                    </td>
                    <td>{ev.category}</td>
                    <td className="text-dim">{ev.entity ? `${ev.entity}${ev.entityId ? ` #${ev.entityId}` : ''}` : '—'}</td>
                    <td className="truncate max-w-[420px]" title={ev.message || ''}>{ev.message || '—'}</td>
                    <td className="text-dim">{ev.ip || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-dim text-sm">
            Page {page} of {Math.max(1, Math.ceil(total / pageSize))} • {total} total
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input-mdj"
              value={pageSize}
              onChange={(e) => { const ps = parseInt(e.target.value, 10); setPageSize(ps); loadData(1, ps); }}
            >
              {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s} / page</option>)}
            </select>
            <div className="flex items-center gap-2">
              <button className="btn-outline-gold" onClick={() => { if (canPrev) loadData(page - 1, pageSize); }} disabled={!canPrev}>Prev</button>
              <button className="btn-gold" onClick={() => { if (canNext) loadData(page + 1, pageSize); }} disabled={!canNext}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </MDJShell>
  );
}
