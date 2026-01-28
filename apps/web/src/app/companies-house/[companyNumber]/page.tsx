'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';
import { ReportFooter, ReportHeader } from '@/components/mdj-ui/ReportChrome';

/* ===========================
   Types
=========================== */

interface CompanyDetails {
  company_number: string;
  company_name: string;
  company_status: string;
  company_type: string;
  date_of_creation?: string;
  sic_codes?: string[];
  jurisdiction?: string;
  registered_office_address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  accounts?: {
    accounting_reference_date?: { day?: string; month?: string };
    last_accounts?: { made_up_to?: string };
    next_accounts?: { due_on?: string; overdue?: boolean };
    next_due?: string;
    next_made_up_to?: string;
    overdue?: boolean;
  };
  confirmation_statement?: {
    last_made_up_to?: string;
    next_due?: string;
    next_made_up_to?: string;
    overdue?: boolean;
  };
  has_charges?: boolean;
  has_insolvency_history?: boolean;
  has_super_secure_pscs?: boolean;
}

interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  country_of_residence?: string;
  occupation?: string;
  date_of_birth?: { month?: number; year?: number };
}

interface PSC {
  name: string;
  kind: string;
  notified_on?: string;
  ceased_on?: string;
  ceased?: boolean;
  nationality?: string;
  country_of_residence?: string;
  date_of_birth?: { month?: number; year?: number };
  natures_of_control?: string[];
}

interface ChargeItem {
  created_on?: string;
  satisfied_on?: string;
  status?: string;
  charge_code?: string;
  transactions?: Array<{ delivered_on?: string }>;
}

interface FilingItem {
  date?: string;        // e.g. 2025-03-31
  type?: string;        // e.g. AA / CS01
  description?: string; // free text
}

/* ===========================
   Helpers
=========================== */

const fmtDate = (d?: string | number | Date) =>
  d ? new Date(d).toLocaleDateString('en-GB') : '—';

const toTitle = (s?: string) =>
  (s || '')
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const badgeTone = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'badge success';
  if (s === 'dissolved') return 'badge danger';
  return 'badge warn';
};

function KV({ items }: { items: Array<{ k: string; v?: React.ReactNode }> }) {
  return (
    <div className="kv">
      {items.map(({ k, v }, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <div className="k">{k}</div>
          <div className="v">{v ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="card-mdj">
      <div className="mdj-pagehead" style={{ marginBottom: 6 }}>
        <div><h3 className="mdj-h2" style={{ margin: 0 }}>{title}</h3></div>
        {actions && <div className="mdj-page-actions">{actions}</div>}
      </div>
      <hr className="mdj-gold-rule" />
      {children}
    </div>
  );
}

/* ===========================
   Page
=========================== */

export default function CompanyDetailPage() {
  const { companyNumber } = useParams<{ companyNumber: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [officers, setOfficers] = useState<CompanyOfficer[]>([]);
  const [pscs, setPscs] = useState<PSC[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!companyNumber) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [c, off, psc, ch, fh] = await Promise.all([
          api.get(`/companies-house/company/${companyNumber}`),
          api.get(`/companies-house/company/${companyNumber}/officers`),
          api.get(`/companies-house/company/${companyNumber}/persons-with-significant-control`),
          api.get(`/companies-house/company/${companyNumber}/charges`),
          api.get(`/companies-house/company/${companyNumber}/filing-history`),
        ]);

        if (cancelled) return;

        setCompany(c as CompanyDetails);

        const offItems = Array.isArray(off) ? off : (off as any)?.items ?? [];
        setOfficers((offItems as CompanyOfficer[]).filter(o => !o.resigned_on));

        const pscItems = Array.isArray(psc) ? psc : (psc as any)?.items ?? [];
        setPscs((pscItems as PSC[]).filter(p => !p.ceased));

        const chItems = Array.isArray(ch) ? ch : (ch as any)?.items ?? [];
        setCharges(chItems as ChargeItem[]);

        const fhItems = Array.isArray(fh) ? fh : (fh as any)?.items ?? [];
        setFilings(fhItems as FilingItem[]);
      } catch (e) {
        console.error('[Company detail fetch]', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [companyNumber]);

  // Derive last filed dates if missing
  const derived = useMemo(() => {
    let lastAccountsFiled: string | undefined;
    let lastCSFiled: string | undefined;

    const sorted = [...filings].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    for (const f of sorted) {
      const t = (f.type || '').toUpperCase();
      if (!lastAccountsFiled && t.startsWith('AA') && f.date) lastAccountsFiled = f.date;
      if (!lastCSFiled && t === 'CS01' && f.date) lastCSFiled = f.date;
      if (lastAccountsFiled && lastCSFiled) break;
    }
    return { lastAccountsFiled, lastConfirmationStatementFiled: lastCSFiled };
  }, [filings]);

  const onPrint = () => window.print();

  const onImport = async () => {
    if (!company) return;
    setImporting(true);
    try {
      // 🔧 Wire this to whichever endpoint you implement server-side.
      // Recommended: POST /companies-house/import/:companyNumber with { portfolioCode }
      await api.post(`/companies-house/import/${company.company_number}`, {
        portfolioCode: 1, // TODO: pick from modal/select if you prefer
      });
      alert('Imported successfully.');
      router.push('/clients');
    } catch (e) {
      console.error('[Import company]', e);
      alert('Import failed. Check server logs and endpoint.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <MDJShell
      pageTitle={company ? company.company_name : 'Company'}
      pageSubtitle={company ? `Company Number: ${company.company_number}` : 'Loading…'}
      actions={[
        { label: 'Back to Search', onClick: () => router.push('/companies-house'), variant: 'outline' },
        { label: 'View on CH', onClick: () => window.open(`https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`, '_blank') },
        { label: 'Export PDF', onClick: onPrint, variant: 'primary' },
      ]}
    >
      <ReportHeader
        title={company ? company.company_name : 'Company'}
        subtitle={company ? `Companies House — ${company.company_number}` : 'Companies House'}
      />

      {/* Print styles to hide shell + tidy margins */}
      <style jsx global>{`
        @media print {
          .mdj-topbar, .mdj-sidebar-fixed, .mdj-assist-fab { display: none !important; }
          .mdj-content-offset { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .mdj-pagehead, .mdj-gold-rule { display: none !important; }
          .card-mdj { box-shadow: none !important; border: 1px solid #ddd !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Loading */}
      {loading && (
        <div className="card-mdj">
          <div className="fx-row"><div className="spinner mdj" /> <span className="mdj-sub">Loading company data…</span></div>
        </div>
      )}

      {!loading && company && (
        <div className="content-grid">
          {/* ===== Overview ===== */}
          <SectionCard
            title="Overview"
            actions={
              <>
                <button className="btn-outline-gold" onClick={() => router.refresh()}>Refresh</button>
                <button className="btn-primary" onClick={onImport} disabled={importing}>
                  {importing ? 'Importing…' : 'Import as Client'}
                </button>
              </>
            }
          >
            <div className="card-mdj tight">
              <div className="fx-row" style={{ gap: 10, marginBottom: 8 }}>
                <span className="gold-ref">{company.company_number}</span>
                <span className={badgeTone(company.company_status)}>{toTitle(company.company_status)}</span>
                <span className="badge">{toTitle(company.company_type)}</span>
                {company.jurisdiction && <span className="badge">{toTitle(company.jurisdiction)}</span>}
              </div>

              <KV
                items={[
                  { k: 'Company Name', v: <strong>{company.company_name}</strong> },
                  { k: 'Incorporated', v: fmtDate(company.date_of_creation) },
                  {
                    k: 'SIC',
                    v: company.sic_codes?.length
                      ? company.sic_codes.join(', ')
                      : '—',
                  },
                ]}
              />
            </div>
          </SectionCard>

          {/* ===== Registered Office ===== */}
          <SectionCard title="Registered Office">
            <div className="card-mdj tight">
              <KV
                items={[
                  { k: 'Address Line 1', v: company.registered_office_address?.address_line_1 },
                  { k: 'Address Line 2', v: company.registered_office_address?.address_line_2 },
                  { k: 'Locality', v: company.registered_office_address?.locality },
                  { k: 'Region', v: company.registered_office_address?.region },
                  { k: 'Postcode', v: company.registered_office_address?.postal_code },
                  { k: 'Country', v: company.registered_office_address?.country },
                ]}
              />
            </div>
          </SectionCard>

          {/* ===== Compliance ===== */}
          <SectionCard title="Compliance">
            <div className="card-mdj tight">
              <KV
                items={[
                  {
                    k: 'Last Accounts Filed',
                    v:
                      company.accounts?.last_accounts?.made_up_to
                        ? fmtDate(company.accounts.last_accounts.made_up_to)
                        : derived.lastAccountsFiled
                        ? fmtDate(derived.lastAccountsFiled)
                        : '—',
                  },
                  {
                    k: 'Accounts Due',
                    v: (
                      <>
                        {fmtDate(company.accounts?.next_due ?? company.accounts?.next_accounts?.due_on)}
                        {(company.accounts?.overdue || company.accounts?.next_accounts?.overdue) && (
                          <span style={{ marginLeft: 8, color: 'var(--danger)', fontWeight: 700 }}>(OVERDUE)</span>
                        )}
                      </>
                    ),
                  },
                  {
                    k: 'Last Confirmation Statement',
                    v:
                      company.confirmation_statement?.last_made_up_to
                        ? fmtDate(company.confirmation_statement.last_made_up_to)
                        : derived.lastConfirmationStatementFiled
                        ? fmtDate(derived.lastConfirmationStatementFiled)
                        : '—',
                  },
                  {
                    k: 'Confirmation Statement Due',
                    v: (
                      <>
                        {fmtDate(company.confirmation_statement?.next_due)}
                        {company.confirmation_statement?.overdue && (
                          <span style={{ marginLeft: 8, color: 'var(--danger)', fontWeight: 700 }}>(OVERDUE)</span>
                        )}
                      </>
                    ),
                  },
                ]}
              />
            </div>
          </SectionCard>

          {/* ===== Officers ===== */}
          <SectionCard title="Directors & Officers">
            {officers.length === 0 ? (
              <div className="mdj-sub">No current officers found.</div>
            ) : (
              <div className="list-compact">
                {officers.map((o, i) => (
                  <div key={i} className="item" style={{ padding: '.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <strong className="title">{o.name}</strong>
                      {o.appointed_on && <span className="mdj-sub">Appointed: {fmtDate(o.appointed_on)}</span>}
                    </div>
                    <div className="mdj-sub" style={{ textTransform: 'capitalize' }}>
                      {toTitle(o.officer_role)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '6px', marginTop: 8, fontSize: 13 }}>
                      {o.nationality && <div><b className="mdj-sub">Nationality:</b> {o.nationality}</div>}
                      {o.occupation && <div><b className="mdj-sub">Occupation:</b> {o.occupation}</div>}
                      {o.country_of_residence && <div><b className="mdj-sub">Residence:</b> {o.country_of_residence}</div>}
                      {o.date_of_birth && (
                        <div><b className="mdj-sub">Born:</b> {o.date_of_birth.month}/{o.date_of_birth.year}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ===== PSCs ===== */}
          <SectionCard title="Persons with Significant Control">
            {pscs.length === 0 ? (
              <div className="mdj-sub">No PSC records.</div>
            ) : (
              <div className="list-compact">
                {pscs.map((p, i) => (
                  <div key={i} className="item" style={{ padding: '.75rem' }}>
                    <strong className="title">{p.name}</strong>
                    <div className="mdj-sub">
                      {p.nationality}{p.country_of_residence ? ` • ${p.country_of_residence}` : ''}
                    </div>
                    {!!p.natures_of_control?.length && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {p.natures_of_control.map((n, idx) => (
                          <span key={idx} className="badge" style={{ textTransform: 'capitalize' }}>
                            {toTitle(n)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ===== Charges ===== */}
          <SectionCard title="Charges">
            {charges.length === 0 ? (
              <div className="mdj-sub">No charges recorded.</div>
            ) : (
              <div className="list-compact">
                {charges.map((c, i) => (
                  <div key={i} className="item" style={{ padding: '.75rem' }}>
                    <div className="fx-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge">{c.charge_code || '—'}</span>
                      <span className={`badge ${c.status?.toLowerCase() === 'satisfied' ? 'success' : ''}`}>
                        {toTitle(c.status || 'Unknown')}
                      </span>
                    </div>
                    <div className="mdj-sub" style={{ marginTop: 4 }}>
                      Created: {fmtDate(c.created_on)} {c.satisfied_on ? `• Satisfied: ${fmtDate(c.satisfied_on)}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ===== Filing History ===== */}
          <SectionCard title="Filing History (latest 25)">
            {filings.length === 0 ? (
              <div className="mdj-sub">No filings found.</div>
            ) : (
              <div className="list-compact">
                {filings.slice(0, 25).map((f, i) => (
                  <div key={i} className="item" style={{ padding: '.6rem .8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="gold-ref">{fmtDate(f.date)}</span>
                      <span className="badge">{f.type || '—'}</span>
                      <span style={{ color: 'var(--text-dark)', fontSize: 13 }}>{f.description || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <ReportFooter />
    </MDJShell>
  );
}
