'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { MDJTemplateDrawer } from '@/components/mdj-ui';
import { api } from '@/lib/api';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CANCELLED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Task {
  id: string;
  clientId: string;
  serviceId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignee?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TaskWithClient extends Task {
  clientName: string;
  clientIdentifier: string;
  portfolioCode: number;
  serviceName?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | TaskStatus>('');
  const [priority, setPriority] = useState<'' | TaskPriority>('');
  const [assignee, setAssignee] = useState('');
  const [portfolio, setPortfolio] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // Use shared client; base = http://localhost:3001/api/v1
        const data = await api.get('/tasks/with-client-details');
        const items = Array.isArray(data) ? data : [];
        if (on) setTasks(items as TaskWithClient[]);
      } catch (e: any) {
        console.error('Failed to load tasks', e);
        if (on) {
          setTasks([]);
          setErr(e?.message || 'Failed to load tasks.');
        }
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  const portfolios = useMemo(() => {
    const set = new Set<number>();
    tasks.forEach(t => t.portfolioCode && set.add(t.portfolioCode));
    return Array.from(set).sort((a,b)=>a-b);
  }, [tasks]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => t.assignee && set.add(t.assignee));
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [tasks]);

  const clients = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach(t => {
      if (t.clientId && t.clientName && !map.has(t.clientId)) {
        map.set(t.clientId, { id: t.clientId, name: t.clientName });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [tasks]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks.filter(t => {
      const matchesQ =
        !needle ||
        t.title.toLowerCase().includes(needle) ||
        (t.clientName ?? '').toLowerCase().includes(needle) ||
        (t.clientIdentifier ?? '').toLowerCase().includes(needle) ||
        (t.serviceName ?? '').toLowerCase().includes(needle);

      const matchesStatus = !status || t.status === status;
      const matchesPriority = !priority || t.priority === priority;
      const matchesAssignee = !assignee || (t.assignee ?? '').toLowerCase() === assignee.toLowerCase();
      const matchesPortfolio = !portfolio || String(t.portfolioCode) === String(portfolio);
      const matchesClient = !clientFilter || t.clientId === clientFilter;

      return matchesQ && matchesStatus && matchesPriority && matchesAssignee && matchesPortfolio && matchesClient;
    });
  }, [tasks, q, status, priority, assignee, portfolio, clientFilter]);

  const filteredIds = useMemo(() => filtered.map(t => t.id), [filtered]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  const someFilteredSelected = filteredIds.some(id => selectedIds.includes(id));
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allFilteredSelected && someFilteredSelected;
    }
  }, [allFilteredSelected, someFilteredSelected]);

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
      return;
    }
    setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} task(s)? This cannot be undone.`)) return;
    try {
      setBulkDeleting(true);
      await api.post('/tasks/bulk-delete', { ids: selectedIds });
      const selectedSet = new Set(selectedIds);
      setTasks(prev => prev.filter(t => !selectedSet.has(t.id)));
      setSelectedIds(prev => prev.filter(id => !selectedSet.has(id)));
    } catch (e: any) {
      alert(e?.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

  const priorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'LOW': return 'badge';
      case 'MEDIUM': return 'badge warn';
      case 'HIGH': return 'badge danger';
      case 'URGENT': return 'badge danger';
      default: return 'badge';
    }
  };

  const statusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'TODO': return 'badge';
      case 'IN_PROGRESS': return 'badge warn';
      case 'REVIEW': return 'badge warn';
      case 'COMPLETED': return 'badge success';
      case 'CANCELLED': return 'badge';
      default: return 'badge';
    }
  };

  return (
    <MDJShell
      pageTitle="Tasks"
      pageSubtitle="Manage and track your tasks"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks' }]}
      actions={[
        <ExportMenu key="export"
          onCSV={async () => {
            try {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (priority) params.set('priority', priority);
              if (assignee) params.set('assignee', assignee);
              if (portfolio) params.set('portfolioCode', String(portfolio));
              if (q.trim()) params.set('search', q.trim());
              const csv = await api.get<string>(`/tasks/export.csv${params.toString() ? `?${params.toString()}` : ''}`);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `tasks-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
            } catch (e: any) { alert(e?.message || 'Export failed'); }
          }}
          onXLSX={async () => {
            try {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (priority) params.set('priority', priority);
              if (assignee) params.set('assignee', assignee);
              if (portfolio) params.set('portfolioCode', String(portfolio));
              if (q.trim()) params.set('search', q.trim());
              const data = await api.get<any>(`/tasks/export.xlsx${params.toString() ? `?${params.toString()}` : ''}`);
              const blob = new Blob([data], { type: 'application/vnd.ms-excel' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `tasks-${new Date().toISOString().slice(0,10)}.xls`; a.click(); URL.revokeObjectURL(url);
            } catch (e: any) { alert(e?.message || 'Excel export failed'); }
          }}
          onPDF={async () => {
            try {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (priority) params.set('priority', priority);
              if (assignee) params.set('assignee', assignee);
              if (portfolio) params.set('portfolioCode', String(portfolio));
              if (q.trim()) params.set('search', q.trim());
              const data = await api.get<any>(`/tasks/export.pdf${params.toString() ? `?${params.toString()}` : ''}`);
              const blob = new Blob([data], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `tasks-${new Date().toISOString().slice(0,10)}.pdf`; a.click(); URL.revokeObjectURL(url);
            } catch (e: any) { alert(e?.message || 'PDF export failed'); }
          }}
        />,
        { label: 'Templates', onClick: () => setTemplatesOpen(true), variant: 'outline' },
        { label: 'Add Task', href: '/tasks/new', variant: 'primary' },
      ]}
    >
      {/* Filters */}
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <div className="filter-section">
          <div className="filter-main">
            <input
              className="mdj-input"
              placeholder="Search by title, client or service…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <div className="filter-group">
              <label>Client</label>
              <select
                className="mdj-select"
                value={clientFilter}
                onChange={(e)=>setClientFilter(e.target.value)}
              >
                <option value="">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select
                className="mdj-select"
                value={status}
                onChange={(e)=>setStatus(e.target.value as TaskStatus | '')}
              >
                <option value="">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Priority</label>
              <select
                className="mdj-select"
                value={priority}
                onChange={(e)=>setPriority(e.target.value as TaskPriority | '')}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Assignee</label>
              <select
                className="mdj-select"
                value={assignee}
                onChange={(e)=>setAssignee(e.target.value)}
              >
                <option value="">All Assignees</option>
                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-mdj">
        <div className="list-head">
          <h3>Tasks ({filtered.length})</h3>
          <div className="list-head-actions">
            <button
              className="btn-outline-gold btn-xs"
              disabled={selectedIds.length === 0 || bulkDeleting}
              onClick={bulkDelete}
            >
              {bulkDeleting ? 'Deleting…' : `Delete Selected (${selectedIds.length})`}
            </button>
            <button 
              className={`segment ${status === '' ? 'active' : ''}`}
              onClick={() => setStatus('')}
            >
              All
            </button>
            <button 
              className={`segment ${status === 'TODO' ? 'active' : ''}`}
              onClick={() => setStatus('TODO')}
            >
              To Do
            </button>
            <button 
              className={`segment ${status === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => setStatus('IN_PROGRESS')}
            >
              In Progress
            </button>
            <button 
              className={`segment ${status === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setStatus('COMPLETED')}
            >
              Completed
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:'1rem', color:'var(--text-muted)' }}>Loading…</div>
        ) : err ? (
          <div style={{ padding:'1rem' }}>
            <div style={{ color:'var(--danger)', marginBottom:'.75rem' }}>{err}</div>
            <button
              className="btn-gold"
              onClick={async () => {
                try {
                  setLoading(true);
                  setErr(null);
                  const data = await api.get('/tasks/with-client-details');
                  const items = Array.isArray(data) ? data : [];
                  setTasks(items as TaskWithClient[]);
                } catch (e: any) {
                  setErr(e?.message || 'Failed to load tasks.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'1rem', color:'var(--text-muted)' }}>
            No tasks found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all tasks"
                      style={{ width: 18, height: 18 }}
                    />
                  </th>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleSelectOne(t.id)}
                        aria-label={`Select ${t.title}`}
                        style={{ width: 18, height: 18 }}
                      />
                    </td>
                    <td>
                      <span style={{ fontWeight:700 }}>{t.title}</span>
                    </td>
                    <td>
                        <Link className="mdj-link" href={`/clients/${t.clientId}`}>
                          {t.clientName}
                        </Link>
                    </td>
                    <td>
                      {t.serviceId && t.serviceName ? (
                        <Link className="mdj-link" href={`/services/${t.serviceId}`}>
                          {t.serviceName}
                        </Link>
                      ) : (
                        <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>
                          Standalone Task
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={priorityBadge(t.priority)}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={statusBadge(t.status)}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{t.assignee || '—'}</td>
                    <td>{fmtDate(t.dueDate)}</td>
                    <td className="right">
                      <Link href={`/tasks/${t.id}`} className="btn-outline-gold btn-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MDJTemplateDrawer
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        highlightMode="tasks"
      />
    </MDJShell>
  );
}
