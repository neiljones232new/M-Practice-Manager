'use client';

import React, { useEffect, useMemo, useState } from 'react';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';
import type { ClientContext } from '@/lib/types';

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const isOverdue = (d?: string | null) => (d ? new Date(d) < new Date() : false);
const isDueSoon = (d?: string | null, days = 30) => {
  if (!d) return false;
  const due = new Date(d).getTime();
  const now = Date.now();
  return due >= now && due <= now + days * 24 * 60 * 60 * 1000;
};

export default function ClientsSummaryPage() {
  const [rows, setRows] = useState<ClientContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [portfolio, setPortfolio] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [showCounts, setShowCounts] = useState<boolean>(false);
  const [counts, setCounts] = useState<Record<string, { directors: number; pscs: number }>>({});

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api.getClients();
        const items = Array.isArray(data) ? data : [];
        if (on) setRows(items);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((c) => {
      const node = c.node;
      const txt = `${node.name} ${node.registeredNumber || node.id || ''} ${node.utrNumber || ''}`.toLowerCase();
      const matchesQ = !needle || txt.includes(needle);
      const matchesP = !portfolio || String(node.portfolioCode || '') === portfolio;
      const matchesS = !status || node.status === status;
      return matchesQ && matchesP && matchesS;
    });
  }, [rows, q, portfolio, status]);

  const addressLine = (a?: ClientContext['node']['address']) =>
    a ? [a.line1, a.line2, a.city, a.county, a.postcode, a.country].filter(Boolean).join(', ') : '—';

  // Lazy load party counts when toggled on (best-effort for first 50 to avoid hammering)
  useEffect(() => {
    if (!showCounts) return;
    const toFetch = filtered.slice(0, 50).filter((c) => !(counts[c.node.id]));
    if (toFetch.length === 0) return;
    (async () => {
      const results = await Promise.allSettled(
        toFetch.map((c) => api.get(`/clients/${c.node.id}/with-parties`).catch(() => null))
      );
      const next: Record<string, { directors: number; pscs: number }> = { ...counts };
      results.forEach((r, idx) => {
        const base = toFetch[idx];
        if (r.status === 'fulfilled' && r.value && Array.isArray((r.value as any).partiesDetails)) {
          const parties: any[] = (r.value as any).partiesDetails;
          const directors = parties.filter((p) => p.role === 'DIRECTOR').length;
          const pscs = parties.filter((p) => p.role === 'UBO' || p.role === 'OWNER' || p.role === 'SHAREHOLDER').length;
          next[base.node.id] = { directors, pscs };
        }
      });
      setCounts(next);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCounts, filtered.map((c) => c.node.id).join('|')]);

  return (
    <MDJShell
      pageTitle="Companies Summary"
      pageSubtitle="Portfolio-wide Companies House snapshot"
      actions={[{ label: 'Back to Clients', href: '/clients', variant: 'outline' }]}
    >
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <div className="filter-grid">
          <input className="mdj-input" placeholder="Search name/identifier/number/UTR…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="mdj-select" value={portfolio} onChange={(e) => setPortfolio(e.target.value)}>
            <option value="">All Portfolios</option>
            {[1,3,7,9].map((p) => (
              <option key={p} value={String(p)}>Portfolio {p}</option>
            ))}
          </select>
          <select className="mdj-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button className="btn-outline-gold" onClick={() => { setQ(''); setPortfolio(''); setStatus(''); }}>Clear</button>
          <button className="btn-outline-gold" onClick={() => window.print()}>Print / PDF</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={showCounts} onChange={(e) => setShowCounts(e.target.checked)} />
            <span className="mdj-sub">Show officer/PSC counts</span>
          </label>
        </div>
      </div>

      <div className="card-mdj" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="mdj-sub" style={{ padding: '1rem' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mdj-sub" style={{ padding: '1rem' }}>No clients found.</div>
        ) : (
          <table className="mdj-table">
            <thead>
              <tr>
                <th>Identifier</th>
                <th>Status</th>
                <th>Company Name</th>
                <th>Company Number</th>
                <th>UTR</th>
                {showCounts && <th>Directors</th>}
                {showCounts && <th>PSCs</th>}
                <th>Last Accs</th>
                <th>Accs Due</th>
                <th>Last Conf Stmt</th>
                <th>Conf Stmt Due</th>
                <th>Incorporated</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.node.id}>
                  <td><span className="gold-ref">{c.node.registeredNumber || c.node.id || '—'}</span></td>
                  <td>{c.node.status}</td>
                  <td>{c.node.name}</td>
                  <td>{c.node.registeredNumber || '—'}</td>
                  <td>{c.node.utrNumber || '—'}</td>
                  {showCounts && <td>{counts[c.node.id]?.directors ?? '—'}</td>}
                  {showCounts && <td>{counts[c.node.id]?.pscs ?? '—'}</td>}
                  <td>{fmt(c.node.accountsLastMadeUpTo)}</td>
                  <td>
                    {fmt(c.node.accountsNextDue)}
                    {isOverdue(c.node.accountsNextDue) && <span style={{ marginLeft: 6 }} className="mdj-badge mdj-badge-danger">OVERDUE</span>}
                    {!isOverdue(c.node.accountsNextDue) && isDueSoon(c.node.accountsNextDue) && <span style={{ marginLeft: 6 }} className="mdj-badge mdj-badge-warn">Due soon</span>}
                  </td>
                  <td>{fmt(c.node.confirmationLastMadeUpTo)}</td>
                  <td>
                    {fmt(c.node.confirmationNextDue)}
                    {isOverdue(c.node.confirmationNextDue) && <span style={{ marginLeft: 6 }} className="mdj-badge mdj-badge-danger">OVERDUE</span>}
                    {!isOverdue(c.node.confirmationNextDue) && isDueSoon(c.node.confirmationNextDue) && <span style={{ marginLeft: 6 }} className="mdj-badge mdj-badge-warn">Due soon</span>}
                  </td>
                  <td>{fmt(c.node.incorporationDate)}</td>
                  <td>{addressLine(c.node.address)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MDJShell>
  );
}
