'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { MDJTemplateDrawer } from '@/components/mdj-ui';
import { api } from '@/lib/api';

type Frequency = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface Service {
  id: string;
  clientId: string;
  clientName: string;
  clientIdentifier: string;
  kind: string;
  frequency: Frequency;
  fee: number;
  annualized: number;
  status: ServiceStatus;
  nextDue?: string;
  portfolioCode: number;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | ServiceStatus>('');
  const [freq, setFreq] = useState<'' | Frequency>('');
  const [portfolio, setPortfolio] = useState<string>('');

  // template drawer state
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // use shared api client so base is always /api/v1
        const data = await api.get('/services/with-client-details');
        const items = Array.isArray(data) ? data : [];
        if (on) setServices(items as Service[]);
      } catch (e: any) {
        console.error('Failed to fetch services', e);
        if (on) {
          setServices([]);
          setErr(e?.message || 'Failed to fetch services');
        }
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  const portfolios = useMemo(() => {
    const set = new Set<number>();
    services.forEach(s => s.portfolioCode && set.add(s.portfolioCode));
    return Array.from(set).sort((a,b)=>a-b);
  }, [services]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return services.filter(s => {
      const matchesQ =
        !needle ||
        s.clientName.toLowerCase().includes(needle) ||
        (s.clientIdentifier ?? '').toLowerCase().includes(needle) ||
        (s.kind ?? '').toLowerCase().includes(needle);

      const matchesStatus = !status || s.status === status;
      const matchesFreq = !freq || s.frequency === freq;
      const matchesPortfolio = !portfolio || String(s.portfolioCode) === String(portfolio);

      return matchesQ && matchesStatus && matchesFreq && matchesPortfolio;
    });
  }, [services, q, status, freq, portfolio]);

  const totalAnnual = filtered.reduce((sum, s) => sum + (s.annualized || 0), 0);

  const fmtGBP = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n || 0);

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

  return (
    <MDJShell
      pageTitle="Services"
      pageSubtitle="Manage client services, fees, and recurring revenue streams"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Services' }]}
      actions={[
        <ExportMenu key="export"
          onCSV={async () => {
            try {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (freq) params.set('frequency', freq);
              if (portfolio) params.set('portfolioCode', String(portfolio));
              if (q.trim()) params.set('search', q.trim());
              const csv = await api.get<string>(`/services/export.csv${params.toString() ? `?${params.toString()}` : ''}`);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `services-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
            } catch (e: any) { alert(e?.message || 'Export failed'); }
          }}
          onXLSX={async () => {
            try {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (freq) params.set('frequency', freq);
              if (portfolio) params.set('portfolioCode', String(portfolio));
              if (q.trim()) params.set('search', q.trim());
              const data = await api.get<any>(`/services/export.xlsx${params.toString() ? `?${params.toString()}` : ''}`);
              const blob = new Blob([data], { type: 'application/vnd.ms-excel' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `services-${new Date().toISOString().slice(0,10)}.xls`; a.click(); URL.revokeObjectURL(url);
            } catch (e: any) { alert(e?.message || 'Excel export failed'); }
          }}
          onPDF={async () => {
            try {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (freq) params.set('frequency', freq);
              if (portfolio) params.set('portfolioCode', String(portfolio));
              if (q.trim()) params.set('search', q.trim());
              const data = await api.get<any>(`/services/export.pdf${params.toString() ? `?${params.toString()}` : ''}`);
              const blob = new Blob([data], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `services-${new Date().toISOString().slice(0,10)}.pdf`; a.click(); URL.revokeObjectURL(url);
            } catch (e: any) { alert(e?.message || 'PDF export failed'); }
          }}
        />,
        { label: 'Templates', onClick: () => setTemplatesOpen(true), variant: 'outline' },
        { label: 'Add Service', href: '/services/new', variant: 'primary' },
      ]}
    >
      {/* Summary cards */}
      <div className="dashboard-summary-grid">
        <div className="summary-card accent-services">
          <div className="summary-icon">💼</div>
          <div className="summary-content">
            <div className="summary-value">{services.length}</div>
            <div className="summary-label">Total Services</div>
          </div>
        </div>
        <div className="summary-card accent-clients">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <div className="summary-value">{services.filter(s => s.status === 'ACTIVE').length}</div>
            <div className="summary-label">Active Services</div>
          </div>
        </div>
        <div className="summary-card accent-compliance">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-value">{fmtGBP(totalAnnual)}</div>
            <div className="summary-label">Annual Revenue</div>
            <div className="summary-note">(filtered results)</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <div className="filter-section">
          <div className="filter-main">
            <input
              className="mdj-input"
              placeholder="Search by client, reference, or service type…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <div className="filter-group">
              <label>Status</label>
              <select
                className="mdj-select"
                value={status}
                onChange={(e)=>setStatus(e.target.value as any)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Frequency</label>
              <select
                className="mdj-select"
                value={freq}
                onChange={(e)=>setFreq(e.target.value as any)}
              >
                <option value="">All Frequencies</option>
                <option value="ANNUAL">Annual</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Portfolio</label>
              <select
                className="mdj-select"
                value={portfolio}
                onChange={(e)=>setPortfolio(e.target.value)}
              >
                <option value="">All Portfolios</option>
                {portfolios.map(p => (
                  <option key={p} value={p}>Portfolio #{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-mdj">
        <div className="list-head">
          <h3>Services ({filtered.length})</h3>
          <div className="list-head-actions">
            <button 
              className={`segment ${status === '' ? 'active' : ''}`}
              onClick={() => setStatus('')}
            >
              All
            </button>
            <button 
              className={`segment ${status === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setStatus('ACTIVE')}
            >
              Active
            </button>
            <button 
              className={`segment ${status === 'INACTIVE' ? 'active' : ''}`}
              onClick={() => setStatus('INACTIVE')}
            >
              Inactive
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading…</div>
        ) : err ? (
          <div style={{ padding: '1rem' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '.75rem' }}>{err}</div>
            <button
              className="btn-gold"
              onClick={() => {
                setLoading(true);
                setErr(null);
                // trigger a reload by resetting effect dependencies
                (async () => {
                  try {
                    const data = await api.get('/services/with-client-details');
                    const items = Array.isArray(data) ? data : [];
                    setServices(items as Service[]);
                  } catch (e: any) {
                    setErr(e?.message || 'Failed to fetch services');
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>No services found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service Type</th>
                  <th>Frequency</th>
                  <th className="right">Fee</th>
                  <th className="right">Annual Value</th>
                  <th>Status</th>
                  <th>Next Due</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display:'grid', gap: '2px' }}>
                        <span className="mdj-ref">{s.clientIdentifier}</span>
                        <Link className="mdj-link" href={`/clients/${s.clientId}`}>
                          {s.clientName}
                        </Link>
                      </div>
                    </td>
                    <td>{s.kind}</td>
                    <td>
                      <span className="service-frequency">{s.frequency}</span>
                    </td>
                    <td className="right">{fmtGBP(s.fee)}</td>
                    <td className="right" style={{ fontWeight: 600 }}>{fmtGBP(s.annualized)}</td>
                    <td>
                      <span
                        className={`badge ${
                          s.status === 'ACTIVE'
                            ? 'success'
                            : s.status === 'SUSPENDED'
                            ? 'warn'
                            : 'danger'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td>{fmtDate(s.nextDue)}</td>
                    <td className="right">
                      <Link href={`/services/${s.id}`} className="btn-outline-gold btn-xs" style={{ marginRight: '0.5rem' }}>
                        View
                      </Link>
                      <Link href={`/clients/${s.clientId}`} className="btn-outline-gold btn-xs">
                        Client
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}></td>
                  <td className="right" style={{ fontWeight: 800 }}>{fmtGBP(totalAnnual)}</td>
                  <td colSpan={3} className="right" style={{ color:'var(--muted)' }}>
                    Annual total (filtered)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <MDJTemplateDrawer
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        highlightMode="services"
      />
    </MDJShell>
  );
}
