'use client';

import Link from 'next/link';
import type { Client } from '@/lib/types';

type Props = {
  client: Client;
  serviceCount: number;
  openTaskCount: number;
  pendingComplianceCount: number;
};

export default function ClientHeaderSection({
  client,
  serviceCount,
  openTaskCount,
  pendingComplianceCount,
}: Props) {
  const identifier = client.clientRef || client.id;
  const clientRouteId = (() => {
    const candidates = [client.id, client.clientRef];
    for (const raw of candidates) {
      const value = String(raw || '').trim();
      if (!value || value === 'undefined' || value === 'null') continue;
      return value;
    }
    return '';
  })();
  const statusBadge =
    client.status === 'ACTIVE' ? 'success' : client.status === 'ARCHIVED' ? 'danger' : 'warn';

  return (
    <section className="card-mdj" style={{ padding: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Client</div>
          <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.35rem' }}>{client.name}</h2>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className={`badge ${statusBadge}`}>{client.status}</span>
            <span className="badge">{client.type?.replace(/_/g, ' ') || 'Unknown'}</span>
            <span className="badge primary">Portfolio #{client.portfolioCode || '—'}</span>
          </div>
          <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
            {identifier}
            {client.registeredNumber ? ` · Company ${client.registeredNumber}` : ''}
            {client.utrNumber ? ` · UTR ${client.utrNumber}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          {clientRouteId ? (
            <>
              <Link href={`/clients/${encodeURIComponent(clientRouteId)}/work`} className="btn-outline-primary btn-sm">
                Open Work
              </Link>
              <Link href={`/clients/${encodeURIComponent(clientRouteId)}/companies`} className="btn-outline-primary btn-sm">
                Open Companies House
              </Link>
            </>
          ) : (
            <>
              <button className="btn-outline-primary btn-sm" disabled>
                Open Work
              </button>
              <button className="btn-outline-primary btn-sm" disabled>
                Open Companies House
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginTop: '0.9rem',
        }}
      >
        <div className="card-mdj tight" style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-subtle)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Services</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{serviceCount}</div>
        </div>
        <div className="card-mdj tight" style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-subtle)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Open Tasks</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{openTaskCount}</div>
        </div>
        <div className="card-mdj tight" style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-subtle)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Pending Compliance</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{pendingComplianceCount}</div>
        </div>
      </div>
    </section>
  );
}
