'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import {
  MDJCard,
  MDJButton,
  MDJInput,
  MDJSelect,
  MDJCheckbox,
  MDJBadge,
} from '@/components/mdj-ui';
import { api } from '@/lib/api';

/* ───────────────────────── Types ───────────────────────── */

interface CompanySearchResult {
  company_number: string;
  title: string;
  company_status: string;
  company_type: string;
  date_of_creation?: string;
  address_snippet?: string;
  description?: string;
}

interface CompanyDetails {
  company_number: string;
  company_name: string;
  company_status: string;
  company_type: string;
  date_of_creation: string;
  registered_office_address: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  accounts?: {
    next_due?: string;
    overdue?: boolean;
    last_accounts?: { made_up_to?: string };
  };
  confirmation_statement?: {
    next_due?: string;
    overdue?: boolean;
    last_made_up_to?: string;
  };
  sic_codes?: string[];
  jurisdiction?: string;
}

interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  country_of_residence?: string;
  occupation?: string;
  date_of_birth?: { month: number; year: number };
}

interface PersonWithSignificantControl {
  name: string;
  kind: string;
  notified_on?: string;
  ceased_on?: string;
  ceased?: boolean;
  nationality?: string;
  country_of_residence?: string;
  date_of_birth?: { month: number; year: number };
  natures_of_control?: string[];
}

interface FilingItem {
  date?: string;
  type?: string;
  description?: string;
}

interface ChargeItem {
  created_on?: string;
  delivered_on?: string;
  status?: string;
  classification?: { description?: string };
  transactions?: Array<{ filing_type?: string; delivered_on?: string }>;
}

/* ─────────────────────── Helpers / UI utils ─────────────────────── */

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

const getBadgeVariant = (status?: string): 'success' | 'error' | 'warning' | 'default' => {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'dissolved') return 'error';
  return 'warning';
};

const toTitle = (v?: string) =>
  (v || '')
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

/* ───────────────────── Recent searches (localStorage) ───────────────────── */

type RecentSearch = { q: string; opts?: Record<string, string>; ts: number };
const RECENT_KEY = 'ch_recent_searches_v1';

function loadRecents(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as RecentSearch[];
  } catch {
    return [];
  }
}
function saveRecent(entry: RecentSearch) {
  const list = [
    entry,
    ...loadRecents().filter(
      (r) => !(r.q === entry.q && JSON.stringify(r.opts || {}) === JSON.stringify(entry.opts || {})),
    ),
  ].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function CompaniesHousePage() {
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Search state
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    status: '', // active | dissolved
    sic: '',
    postcode: '',
    incorpFrom: '',
    incorpTo: '',
  });

  // Recent
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  // Details state
  const [selected, setSelected] = useState<CompanyDetails | null>(null);
  const [officers, setOfficers] = useState<CompanyOfficer[]>([]);
  const [pscs, setPscs] = useState<PersonWithSignificantControl[]>([]);
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'people' | 'compliance' | 'import'>('overview');

  // Import as client
  const [portfolios, setPortfolios] = useState<Array<{ code: number; name: string }>>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<number | ''>('');
  const [importCompany, setImportCompany] = useState<boolean>(true);
  const [selectedOfficers, setSelectedOfficers] = useState<Record<string, boolean>>({});
  const [createOfficerClients, setCreateOfficerClients] = useState(false);
  const [addPtrService, setAddPtrService] = useState(false);
  const [ptrFee, setPtrFee] = useState<number>(200);
  const [importing, setImporting] = useState(false);
  const [serviceChoices, setServiceChoices] = useState<Array<{ key: string; kind: string; frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY'; fee: number; selected: boolean }>>([
    { key: 'Annual Accounts', kind: 'Annual Accounts', frequency: 'ANNUAL', fee: 600, selected: true },
    { key: 'Company Secretarial', kind: 'Company Secretarial', frequency: 'ANNUAL', fee: 60, selected: true },
    { key: 'Corporation Tax Return', kind: 'Corporation Tax Return', frequency: 'ANNUAL', fee: 250, selected: false },
    { key: 'Payroll', kind: 'Payroll', frequency: 'MONTHLY', fee: 60, selected: false },
  ]);

  useEffect(() => {
    setRecent(loadRecents());
    
    // Handle responsive breakpoints
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // fetch portfolios for import dropdown
    (async () => {
      try {
        const data = await api.get('/portfolios');
        const items = Array.isArray(data) ? data : [];
        setPortfolios(
          items.map((p: any) => ({
            code: Number(p.code ?? p.portfolioCode ?? p.id),
            name: p.name ?? `#${p.code}`,
          })),
        );
      } catch {
        // non-fatal
      }
    })();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ─────────────── Search ─────────────── */

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;

    const params: Record<string, string> = {};
    params.q = q.trim();
    if (filters.status) params.status = filters.status;
    if (filters.sic) params.sic = filters.sic.replace(/\D/g, '');
    if (filters.postcode) params.postcode = filters.postcode.trim();
    if (filters.incorpFrom) params.incorpFrom = filters.incorpFrom;
    if (filters.incorpTo) params.incorpTo = filters.incorpTo;

    saveRecent({ q: params.q, opts: params, ts: Date.now() });
    setRecent(loadRecents());

    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(null);
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await api.get(`/companies-house/search?${qs}`);
      setResults(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  /* ─────────────── Load details for a company ─────────────── */

  const onSelect = async (companyNumber: string) => {
    setLoadingDetails(true);
    setSelected(null);
    setOfficers([]);
    setPscs([]);
    setFilings([]);
    setCharges([]);
    try {
      const [company, off, psc, fh, ch] = await Promise.all([
        api.get(`/companies-house/company/${companyNumber}`),
        api.get(`/companies-house/company/${companyNumber}/officers`),
        api.get(`/companies-house/company/${companyNumber}/persons-with-significant-control`),
        api.get(`/companies-house/company/${companyNumber}/filing-history`),
        api.get(`/companies-house/company/${companyNumber}/charges`),
      ]);

      setSelected(company as CompanyDetails);

      const offItems = Array.isArray(off) ? off : (off as any)?.items ?? [];
      setOfficers((offItems as CompanyOfficer[]).filter((o) => !o.resigned_on));

      const pscItems = Array.isArray(psc) ? psc : (psc as any)?.items ?? [];
      setPscs((pscItems as PersonWithSignificantControl[]).filter((p) => !p.ceased));

      const fhItems = Array.isArray(fh) ? fh : (fh as any)?.items ?? [];
      setFilings(fhItems as FilingItem[]);

      const chItems = Array.isArray(ch) ? ch : (ch as any)?.items ?? [];
      setCharges(chItems as ChargeItem[]);
    } catch (e) {
      console.error('[CH details]', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  /* ─────────────── Derived last-filed dates ─────────────── */

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

  /* ─────────────── Import as Client ─────────────── */

  async function importAsClient() {
    if (!selected) return;
    if (!selectedPortfolio && selectedPortfolio !== 0) {
      alert('Choose a portfolio first.');
      return;
    }
    if (!importCompany) {
      alert('Director-only import is not yet available from this screen. Please enable "Import company".');
      return;
    }
    try {
      setImporting(true);
      const client = await api.post<{ id: string }>(
        '/companies-house/import',
        {
          companyNumber: selected.company_number,
          portfolioCode: Number(selectedPortfolio),
          // Always import officers as parties so they show under Directors
          importOfficers: true,
          createOfficerClients,
          createComplianceItems: true,
          // Add Self Assessment service to director clients if enabled
          selfAssessmentFee: (createOfficerClients && addPtrService) ? ptrFee : undefined,
        }
      );
      // Create selected services
      const chosen = serviceChoices.filter((s) => s.selected);
      for (const s of chosen) {
        await api.post('/services', {
          clientId: client.id,
          kind: s.kind,
          frequency: s.frequency,
          fee: Number(s.fee) || 0,
          status: 'ACTIVE',
        });
      }
      // Notify and navigate to client
      try { new BroadcastChannel('mdj').postMessage({ topic: 'clients:changed' }); } catch {}
      window.location.href = `/clients/${client.id}`;
    } catch (e) {
      alert('Import failed. See console for details.');
      console.error('[Import company failed]', e);
    } finally {
      setImporting(false);
    }
  }

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <MDJShell
      pageTitle="Companies House"
      pageSubtitle="Search and import company data from Companies House"
      actions={[]}
    >
      {/* Search Card */}
      <div className="mb-4">
        <MDJCard padding="md">
        <form onSubmit={handleSearch} className="content-grid gap-3">
          <div className="flex gap-2">
            <MDJInput
              placeholder="Enter company name or number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <MDJButton variant="primary" type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </MDJButton>
            <MDJButton
              variant="outline"
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? 'Hide options' : 'More options'}
            </MDJButton>
          </div>

          {showAdvanced && (
            <div className="advanced-filters-panel">
              <div className="filter-panel-header">
                <h4>Filter Options</h4>
                <MDJButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      status: '',
                      sic: '',
                      postcode: '',
                      incorpFrom: '',
                      incorpTo: '',
                    });
                  }}
                >
                  Clear filters
                </MDJButton>
              </div>
              
              <div className="filter-grid">
                <div className="filter-group">
                  <label>Company Status</label>
                  <MDJSelect
                    value={filters.status}
                    onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
                    options={[
                      { label: 'Any status', value: '' },
                      { label: 'Active', value: 'active' },
                      { label: 'Dissolved', value: 'dissolved' }
                    ]}
                  />
                </div>

                <div className="filter-group">
                  <label>SIC Code</label>
                  <MDJInput
                    placeholder="e.g. 69202"
                    value={filters.sic}
                    onChange={(e) => setFilters((s) => ({ ...s, sic: e.target.value }))}
                  />
                </div>

                <div className="filter-group">
                  <label>Postcode</label>
                  <MDJInput
                    placeholder="e.g. SW1A 1AA"
                    value={filters.postcode}
                    onChange={(e) => setFilters((s) => ({ ...s, postcode: e.target.value }))}
                  />
                </div>

                <div className="filter-group">
                  <label>Incorporated From</label>
                  <MDJInput
                    type="date"
                    value={filters.incorpFrom}
                    onChange={(e) => setFilters((s) => ({ ...s, incorpFrom: e.target.value }))}
                  />
                </div>

                <div className="filter-group">
                  <label>Incorporated To</label>
                  <MDJInput
                    type="date"
                    value={filters.incorpTo}
                    onChange={(e) => setFilters((s) => ({ ...s, incorpTo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="filter-actions">
                <MDJButton variant="primary" onClick={handleSearch}>
                  Apply Filters
                </MDJButton>
              </div>
            </div>
          )}
        </form>
      </MDJCard>
      </div>

      {/* Empty state */}
      {!loading && !error && results.length === 0 && (
        <div className="content-grid gap-4">
          <MDJCard title="No results yet" padding="sm">
            <p className="mdj-sub">
              Try searching by company name or number. Use “More options” for status, SIC, postcode,
              and incorporation date ranges.
            </p>
          </MDJCard>

          <MDJCard title="Recent searches" padding="sm">
            {recent.length === 0 ? (
              <p className="mdj-sub">Your last 5 searches will appear here.</p>
            ) : (
              <div className="list-compact">
                {recent.map((r, i) => (
                  <div key={i} className="item">
                    <div className="title">{r.q || '(blank query)'}</div>
                    {!!r.opts && (
                      <div className="meta">
                        {Object.entries(r.opts)
                          .filter(([k]) => k !== 'q' && r.opts?.[k])
                          .map(([k, v]) => (
                            <span key={k}>
                              {toTitle(k)}: {String(v)}
                            </span>
                          ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <MDJButton
                        variant="outline"
                        onClick={() => {
                          setQ(r.q || '');
                          setFilters((f) => ({
                            ...f,
                            status: (r.opts?.status as string) || '',
                            sic: (r.opts?.sic as string) || '',
                            postcode: (r.opts?.postcode as string) || '',
                            incorpFrom: (r.opts?.incorpFrom as string) || '',
                            incorpTo: (r.opts?.incorpTo as string) || '',
                          }));
                          setTimeout(() => handleSearch(), 0);
                        }}
                      >
                        Run again
                      </MDJButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MDJCard>
        </div>
      )}

      {/* Split layout - responsive: stacks on mobile (<768px), two columns on tablet+ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selected && !isMobile ? '1.05fr 1.35fr' : '1fr',
          gap: '1.25rem',
        }}
      >
        {/* Results list - Redesigned Company Cards */}
        {results.length > 0 && (
          <MDJCard title={`Search Results (${results.length})`}>
            <div className="companies-search-results" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {results.map((r) => {
                const isSel = selected?.company_number === r.company_number;
                return (
                  <div
                    key={r.company_number}
                    className={`company-result-card${isSel ? ' selected' : ''}`}
                    onClick={() => onSelect(r.company_number)}
                  >
                    {/* Company Header */}
                    <div className="company-card-header">
                      <div className="company-main-info">
                        <h4 className="company-name" title={r.title}>
                          {r.title}
                        </h4>
                        <div className="company-meta">
                          <span className="company-number">{r.company_number}</span>
                          <MDJBadge variant={getBadgeVariant(r.company_status)}>
                            {toTitle(r.company_status)}
                          </MDJBadge>
                        </div>
                      </div>
                      <div className="company-type">
                        <span className="type-label">
                          {toTitle(r.company_type?.replace(/-/g, ' ') || '')}
                        </span>
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="company-details">
                      {r.date_of_creation && (
                        <div className="detail-item">
                          <span className="detail-label">Incorporated:</span>
                          <span className="detail-value">{formatDate(r.date_of_creation)}</span>
                        </div>
                      )}
                      {r.address_snippet && (
                        <div className="detail-item address">
                          <span className="detail-label">Registered office:</span>
                          <span className="detail-value" title={r.address_snippet}>
                            {toTitle(r.address_snippet)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="company-actions">
                      <Link
                        href={`/companies-house/${r.company_number}`}
                        className="btn-outline-gold btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View details
                      </Link>
                      <MDJButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(r.company_number);
                        }}
                      >
                        Preview
                      </MDJButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </MDJCard>
        )}

        {/* Details pane - Redesigned with structured layout */}
        {selected && (
          <div className="sticky-pane">
            <div className="company-preview-panel">
              {/* Summary Header */}
              <div className="preview-header">
                <div className="preview-title-section">
                  <h3 className="preview-company-name">{selected.company_name}</h3>
                  <div className="preview-meta">
                    <span className="company-number">{selected.company_number}</span>
                    <MDJBadge variant={getBadgeVariant(selected.company_status)}>
                      {toTitle(selected.company_status)}
                    </MDJBadge>
                    <span className="company-country">
                      {toTitle(selected.jurisdiction || 'England & Wales')}
                    </span>
                  </div>
                </div>
                
                <div className="preview-actions">
                  <MDJSelect
                    value={selectedPortfolio}
                    onChange={(e) => setSelectedPortfolio(e.target.value ? Number(e.target.value) : '')}
                    options={[
                      { label: 'Select Portfolio…', value: '' },
                      ...portfolios.map((p) => ({
                        label: `#${p.code} — ${p.name}`,
                        value: String(p.code)
                      }))
                    ]}
                    style={{ minWidth: 160 }}
                  />
                  <MDJButton variant="primary" onClick={importAsClient} disabled={loadingDetails || importing}>
                    {importing ? 'Importing…' : 'Import Company'}
                  </MDJButton>
                  <MDJButton variant="outline" onClick={() => setSelected(null)}>
                    ×
                  </MDJButton>
                </div>
              </div>

              {/* Key Facts Grid */}
              <div className="key-facts-grid">
                <div className="fact-item">
                  <span className="fact-label">Incorporated</span>
                  <span className="fact-value">{formatDate(selected.date_of_creation)}</span>
                </div>
                <div className="fact-item">
                  <span className="fact-label">SIC Codes</span>
                  <span className="fact-value">
                    {Array.isArray(selected.sic_codes)
                      ? selected.sic_codes.join(', ')
                      : (selected as any).sic_codes || '—'}
                  </span>
                </div>
                <div className="fact-item">
                  <span className="fact-label">Registered Office</span>
                  <span className="fact-value">
                    {[
                      selected.registered_office_address?.address_line_1,
                      selected.registered_office_address?.locality,
                      selected.registered_office_address?.postal_code
                    ].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="preview-tabs">
                <div className="tab-nav">
                  {(['overview', 'people', 'compliance', 'import'] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'overview' && 'Overview'}
                      {tab === 'people' && `People (${officers.length + pscs.length})`}
                      {tab === 'compliance' && 'Compliance'}
                      {tab === 'import' && 'Import Options'}
                    </button>
                  ))}
                </div>

                <div className="tab-content">
                  {activeTab === 'overview' && (
                    <div className="tab-panel">
                      <div className="overview-sections">
                        <div className="overview-section">
                          <h4>Company Information</h4>
                          <div className="info-grid">
                            <div className="info-item">
                              <span>Company Type</span>
                              <span>{toTitle(selected.company_type?.replace(/-/g, ' ') || '—')}</span>
                            </div>
                            <div className="info-item">
                              <span>Status</span>
                              <span>{toTitle(selected.company_status)}</span>
                            </div>
                            <div className="info-item">
                              <span>Jurisdiction</span>
                              <span>{toTitle(selected.jurisdiction || 'England & Wales')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="overview-section">
                          <h4>Registered Office</h4>
                          <div className="address-display">
                            {selected.registered_office_address?.address_line_1 && (
                              <div>{selected.registered_office_address.address_line_1}</div>
                            )}
                            {selected.registered_office_address?.address_line_2 && (
                              <div>{selected.registered_office_address.address_line_2}</div>
                            )}
                            {selected.registered_office_address?.locality && (
                              <div>{selected.registered_office_address.locality}</div>
                            )}
                            {selected.registered_office_address?.region && (
                              <div>{selected.registered_office_address.region}</div>
                            )}
                            {selected.registered_office_address?.postal_code && (
                              <div>{selected.registered_office_address.postal_code}</div>
                            )}
                            {selected.registered_office_address?.country && (
                              <div>{toTitle(selected.registered_office_address.country)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'people' && (
                    <div className="tab-panel">
                      {officers.length > 0 && (
                        <div className="people-section">
                          <h4>Directors & Officers ({officers.length})</h4>
                          <div className="people-list">
                            {officers.map((officer, i) => (
                              <div key={i} className="person-card">
                                <div className="person-header">
                                  <strong className="person-name">{officer.name}</strong>
                                  <span className="person-role">{toTitle(officer.officer_role?.replace(/-/g, ' ') || '')}</span>
                                </div>
                                <div className="person-details">
                                  {officer.appointed_on && (
                                    <span>Appointed: {formatDate(officer.appointed_on)}</span>
                                  )}
                                  {officer.nationality && (
                                    <span>Nationality: {officer.nationality}</span>
                                  )}
                                  {officer.occupation && (
                                    <span>Occupation: {officer.occupation}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pscs.length > 0 && (
                        <div className="people-section">
                          <h4>People with Significant Control ({pscs.length})</h4>
                          <div className="people-list">
                            {pscs.map((psc, i) => (
                              <div key={i} className="person-card">
                                <div className="person-header">
                                  <strong className="person-name">{psc.name}</strong>
                                  <span className="person-role">{toTitle(psc.kind?.replace(/-/g, ' ') || '')}</span>
                                </div>
                                <div className="person-details">
                                  {psc.nationality && (
                                    <span>Nationality: {psc.nationality}</span>
                                  )}
                                  {psc.country_of_residence && (
                                    <span>Residence: {psc.country_of_residence}</span>
                                  )}
                                </div>
                                {psc.natures_of_control && psc.natures_of_control.length > 0 && (
                                  <div className="control-natures">
                                    {psc.natures_of_control.map((nature, idx) => (
                                      <span key={idx} className="chip primary">
                                        {toTitle(nature.replace(/-/g, ' '))}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {officers.length === 0 && pscs.length === 0 && (
                        <div className="empty-state">
                          <p>No people information available.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'compliance' && (
                    <div className="tab-panel">
                      <div className="compliance-grid">
                        <div className="compliance-item">
                          <span className="compliance-label">Last Accounts Filed</span>
                          <span className="compliance-value">
                            {selected.accounts?.last_accounts?.made_up_to
                              ? formatDate(selected.accounts.last_accounts.made_up_to)
                              : derived.lastAccountsFiled
                              ? formatDate(derived.lastAccountsFiled)
                              : '—'}
                          </span>
                        </div>
                        <div className="compliance-item">
                          <span className="compliance-label">Accounts Due</span>
                          <span className={`compliance-value ${selected.accounts?.overdue ? 'overdue' : ''}`}>
                            {formatDate(selected.accounts?.next_due)}
                            {selected.accounts?.overdue && ' (OVERDUE)'}
                          </span>
                        </div>
                        <div className="compliance-item">
                          <span className="compliance-label">Last Confirmation Statement</span>
                          <span className="compliance-value">
                            {selected.confirmation_statement?.last_made_up_to
                              ? formatDate(selected.confirmation_statement.last_made_up_to)
                              : derived.lastConfirmationStatementFiled
                              ? formatDate(derived.lastConfirmationStatementFiled)
                              : '—'}
                          </span>
                        </div>
                        <div className="compliance-item">
                          <span className="compliance-label">Confirmation Statement Due</span>
                          <span className={`compliance-value ${selected.confirmation_statement?.overdue ? 'overdue' : ''}`}>
                            {formatDate(selected.confirmation_statement?.next_due)}
                            {selected.confirmation_statement?.overdue && ' (OVERDUE)'}
                          </span>
                        </div>
                      </div>

                      {(filings.length > 0 || charges.length > 0) && (
                        <div className="recent-activity">
                          <h4>Recent Activity</h4>
                          <div className="activity-list">
                            {filings.slice(0, 5).map((filing, i) => (
                              <div key={i} className="activity-item">
                                <span className="activity-date">{formatDate(filing.date)}</span>
                                <span className="activity-type">{filing.type}</span>
                                <span className="activity-desc">{toTitle(filing.description || '')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'import' && (
                    <div className="tab-panel">
                      <div className="import-options">
                        <div className="import-section">
                          <h4>Import Options</h4>
                          <div className="import-cards">
                            <div className={`import-card ${importCompany ? 'selected' : ''}`} onClick={() => setImportCompany(!importCompany)}>
                              <div className="import-card-header">
                                <input
                                  type="checkbox"
                                  checked={importCompany}
                                  onChange={(e) => setImportCompany(e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <strong>Import Company as Client</strong>
                              </div>
                              <div className="import-card-desc">
                                Creates the company client with compliance due dates and links all directors.
                              </div>
                              <div className="import-card-details">
                                • Company record with full details<br/>
                                • Compliance tracking setup<br/>
                                • Director relationships
                              </div>
                            </div>

                            <div className={`import-card ${createOfficerClients ? 'selected' : ''}`} onClick={() => setCreateOfficerClients(!createOfficerClients)}>
                              <div className="import-card-header">
                                <input
                                  type="checkbox"
                                  checked={createOfficerClients}
                                  onChange={(e) => {
                                    setCreateOfficerClients(e.target.checked);
                                    if (!e.target.checked) setAddPtrService(false);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <strong>Create Directors as Individual Clients</strong>
                              </div>
                              <div className="import-card-desc">
                                Creates separate client records for each director in the same portfolio.
                              </div>
                              <div className="import-card-details">
                                • Individual client records<br/>
                                • Personal tax tracking<br/>
                                • Separate service management
                              </div>
                            </div>
                          </div>

                          {createOfficerClients && (
                            <div className="sub-option">
                              <div className="sub-option-header">
                                <input
                                  type="checkbox"
                                  checked={addPtrService}
                                  onChange={(e) => setAddPtrService(e.target.checked)}
                                />
                                <span>Add Self Assessment service to directors</span>
                              </div>
                              <div className="fee-input">
                                <span>Annual fee: £</span>
                                <MDJInput
                                  type="number"
                                  min="0"
                                  value={ptrFee}
                                  onChange={(e) => setPtrFee(parseFloat(e.target.value) || 0)}
                                  style={{ width: 100 }}
                                  disabled={!addPtrService}
                                />
                                <span>per director</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="services-section">
                          <h4>Company Services</h4>
                          <div className="service-list">
                            {serviceChoices.map((service, idx) => (
                              <div key={service.key} className="service-item">
                                <label className="service-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={service.selected}
                                    onChange={(e) => {
                                      const copy = [...serviceChoices];
                                      copy[idx] = { ...service, selected: e.target.checked };
                                      setServiceChoices(copy);
                                    }}
                                  />
                                  <div className="service-info">
                                    <strong>{service.kind}</strong>
                                    <span className="service-frequency">{service.frequency.toLowerCase()}</span>
                                  </div>
                                </label>
                                <div className="service-fee">
                                  <span>£</span>
                                  <MDJInput
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={service.fee}
                                    onChange={(e) => {
                                      const copy = [...serviceChoices];
                                      copy[idx] = { ...service, fee: Number(e.target.value) };
                                      setServiceChoices(copy);
                                    }}
                                    style={{ width: 80 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="preview-footer">
                <Link
                  className="btn-outline-gold"
                  href={`/companies-house/${selected.company_number}`}
                >
                  Full Company Page
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </MDJShell>
  );
}
