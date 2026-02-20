'use client';

import type { Client, ClientProfileSubset } from '@/lib/types';

type Props = {
  client: Client;
  profile: ClientProfileSubset;
  syncing: boolean;
  onSync: () => Promise<void>;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
};

export default function CompaniesHouseSection({ client, profile, syncing, onSync }: Props) {
  const companyNumber = client.registeredNumber;
  const clientRouteId = (() => {
    const candidates = [client.id, client.clientRef];
    for (const raw of candidates) {
      const value = String(raw || '').trim();
      if (!value || value === 'undefined' || value === 'null') continue;
      return value;
    }
    return '';
  })();
  const accountsLastMadeUpTo = profile.lastAccountsMadeUpTo || client.accountsLastMadeUpTo || null;
  const accountsNextDue = profile.nextAccountsDueBy || profile.nextAccountsDueDate || client.accountsNextDue || null;
  const confirmationLastMadeUpTo = profile.lastConfirmationStatementDate || client.confirmationLastMadeUpTo || null;
  const confirmationNextDue = profile.confirmationStatementDueBy || profile.nextConfirmationStatementDate || client.confirmationNextDue || null;
  const facts = [
    { label: 'Company Number', value: companyNumber || '—' },
    { label: 'Company Status', value: profile.companyStatusDetail || '—' },
    { label: 'Incorporation Date', value: formatDate(client.incorporationDate || null) },
    { label: 'Registered Office', value: profile.registeredOfficeFull || profile.registeredAddress || '—' },
    { label: 'Accounts Last Made Up To', value: formatDate(accountsLastMadeUpTo) },
    { label: 'Accounts Next Due', value: formatDate(accountsNextDue) },
    { label: 'Confirmation Last Made Up To', value: formatDate(confirmationLastMadeUpTo) },
    { label: 'Confirmation Next Due', value: formatDate(confirmationNextDue) },
    { label: 'Director Count', value: typeof profile.directorCount === 'number' ? String(profile.directorCount) : '—' },
    { label: 'PSC Count', value: typeof profile.pscCount === 'number' ? String(profile.pscCount) : '—' },
    { label: 'Last Fetched', value: formatDate(profile.lastChRefresh || null) },
  ];

  return (
    <section className="card-mdj" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Companies House</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-outline-primary btn-sm" onClick={onSync} disabled={syncing || !companyNumber}>
            {syncing ? 'Syncing…' : 'Sync CH'}
          </button>
          <a
            className="btn-outline-primary btn-sm"
            href={clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/companies` : '#'}
            onClick={(e) => {
              if (!clientRouteId) e.preventDefault();
            }}
          >
            View Filings
          </a>
          <a
            className="btn-outline-primary btn-sm"
            href={clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/companies` : '#'}
            onClick={(e) => {
              if (!clientRouteId) e.preventDefault();
            }}
          >
            View Officers
          </a>
          <a
            className="btn-outline-primary btn-sm"
            href={clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/companies` : '#'}
            onClick={(e) => {
              if (!clientRouteId) e.preventDefault();
            }}
          >
            View PSCs
          </a>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.65rem',
          marginTop: '0.75rem',
        }}
      >
        {facts.map((item) => (
          <div
            key={item.label}
            className="card-mdj tight"
            style={{ padding: '0.6rem 0.7rem', background: 'var(--surface-subtle)' }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '0.77rem', marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.65rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Directors</div>
          <div className="card-mdj tight" style={{ padding: '0.5rem 0.6rem', marginTop: '0.25rem', background: 'var(--surface-subtle)' }}>
            {profile.currentDirectors || '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current PSCs</div>
          <div className="card-mdj tight" style={{ padding: '0.5rem 0.6rem', marginTop: '0.25rem', background: 'var(--surface-subtle)' }}>
            {profile.currentPscs || '—'}
          </div>
        </div>
      </div>
    </section>
  );
}
