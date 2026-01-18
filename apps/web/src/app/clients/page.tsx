'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { api } from '@/lib/api'; // uses http://localhost:3001/api/v1 by default

type ClientType = 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

interface Client {
  id: string;
  ref?: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  mainEmail?: string;
  registeredNumber?: string | null;
  utrNumber?: string | null;
  portfolioCode?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // Additional optional fields for richer list display
  mainContact?: string;
  mainPhone?: string;
  yearEnd?: string; // ISO: last made up to
  confirmationStatementDue?: string; // ISO date
  annualFees?: number;
  tasksDueCount?: number;
  // Raw due dates (from API)
  accountsNextDue?: string;
  accountsLastMadeUpTo?: string;
  confirmationNextDue?: string;
  // Derived compliance flags
  compAccounts?: 'overdue' | 'dueSoon' | 'ok' | null;
  compCS?: 'overdue' | 'dueSoon' | 'ok' | null;
}

export default function ClientsPage() {
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const enrichInFlightRef = useRef<Promise<void> | null>(null);
  const lastEnrichedRef = useRef(0);
  const partiesCacheRef = useRef<any[] | null>(null);
  const peopleCacheRef = useRef<any[] | null>(null);

  // filters - load from localStorage on mount
  const [filters, setFilters] = useState<Record<string, string>>({
    ref: '',
    name: '',
    registeredNumber: '',
    utrNumber: '',
    mainContact: '',
    mainPhone: '',
    accountsNextDue: '',
    accountsLastMadeUpTo: '',
    confirmationNextDue: '',
    annualFees: '',
    tasksDueCount: '',
    status: '',
    type: '',
    portfolio: '',
  });
  const [includeParties, setIncludeParties] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'name' | 'status' | 'portfolio' | 'ref'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('clients_sort_field') as any) || 'ref';
    }
    return 'ref';
  });
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('clients_sort_dir') as 'asc' | 'desc') || 'asc';
    }
    return 'asc';
  });
  const [view, setView] = useState<'table' | 'cards'>('table');
  // pagination
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [showCustomize, setShowCustomize] = useState(false);
  const defaultColumnIds = [
    'ref',
    'name',
    'registeredNumber',
    'utrNumber',
    'status',
    'type',
    'portfolio',
    'mainContact',
    'mainPhone',
    'accountsNextDue',
    'accountsLastMadeUpTo',
    'confirmationNextDue',
    'annualFees',
    'tasksDueCount',
    'actions',
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('clients_columns');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return defaultColumnIds;
  });

  // Save sort to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('clients_sort_field', sortField);
    }
  }, [sortField]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('clients_sort_dir', sortDir);
    }
  }, [sortDir]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('clients_columns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);


  // load data via shared API client (no guessing endpoints)
  const loadEnrichments = async () => {
    if (enriching) return;
    setEnriching(true);
    try {
      const [servicesRes, partiesRes, peopleRes] = await Promise.all([
        api.get('/services/with-client-details').catch(() => null),
        api.get('/clients/parties/all').catch(() => null),
        api.get('/clients/people/all').catch(() => null),
      ]);

      const services = Array.isArray(servicesRes) ? servicesRes : [];
      const parties = Array.isArray(partiesRes) ? partiesRes : [];
      const people = Array.isArray(peopleRes) ? peopleRes : [];

      if (parties.length) partiesCacheRef.current = parties;
      if (people.length) peopleCacheRef.current = people;

      const feesByClient: Record<string, number> = {};
      const factor = (freq: string) => (freq === 'MONTHLY' ? 12 : freq === 'QUARTERLY' ? 4 : 1);
      services.forEach((s: any) => {
        const cid = s.clientId;
        if (!cid) return;
        const f = factor(String(s.frequency || 'ANNUAL'));
        const fee = Number(s.fee || 0) * f;
        feesByClient[cid] = (feesByClient[cid] || 0) + fee;
      });

      const peopleMap: Record<string, any> = {};
      people.forEach((p: any) => { peopleMap[p.id] = p; });
      const primaryByClient: Record<string, string> = {};
      parties.forEach((p: any) => {
        if (p?.primaryContact === true && p?.clientId && p?.personId) {
          const person = peopleMap[p.personId];
          if (person?.fullName) primaryByClient[p.clientId] = person.fullName;
        }
      });

      setAllClients((prev) =>
        prev.map((c) => ({
          ...c,
          annualFees: typeof feesByClient[c.id] === 'number' ? feesByClient[c.id] : c.annualFees,
          mainContact: primaryByClient[c.id] || c.mainContact,
        }))
      );
      lastEnrichedRef.current = Date.now();
    } finally {
      setEnriching(false);
    }
  };

  const scheduleEnrichment = (force = false) => {
    if (enrichInFlightRef.current) return;
    if (!force && Date.now() - lastEnrichedRef.current < 60_000) return;

    const run = () => {
      const p = loadEnrichments().finally(() => {
        enrichInFlightRef.current = null;
      });
      enrichInFlightRef.current = p;
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(run, { timeout: 1500 });
    } else {
      setTimeout(run, 0);
    }
  };

  const fetchClients = async (opts: { enrich?: boolean; forceEnrich?: boolean } = {}) => {
    try {
      setLoading(true);
      const data = await api.getClients();
      const items = Array.isArray(data) ? data : [];
      // Normalize fields so Year End and Confirmation Due render after CH sync
      const soonDays = 30;
      const computeFlag = (iso?: string): 'overdue' | 'dueSoon' | 'ok' | null => {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        const now = new Date();
        if (d < now) return 'overdue';
        const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days <= soonDays ? 'dueSoon' : 'ok';
      };

      let normalized = (items as any[]).map((c) => {
        const accountsNextDue = c.accountsNextDue || null;
        const accountsLastMadeUpTo = c.accountsLastMadeUpTo || null;
        const confirmationNextDue = c.confirmationNextDue || null;
        return {
          ...c,
          yearEnd: accountsLastMadeUpTo || null,
          confirmationStatementDue: confirmationNextDue || null,
          accountsNextDue,
          accountsLastMadeUpTo,
          confirmationNextDue,
          compAccounts: computeFlag(accountsNextDue),
          compCS: computeFlag(confirmationNextDue),
        };
      });

      setAllClients(normalized as Client[]);
      if (opts.enrich !== false) scheduleEnrichment(Boolean(opts.forceEnrich));
    } catch (e) {
      console.error('Failed to load clients', e);
      setAllClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let on = true;
    (async () => {
      if (!on) return;
      await fetchClients({ enrich: false });
      if (on) scheduleEnrichment();
    })();
    return () => { on = false; };
  }, []);

  // Auto-refetch on window focus and broadcast events
  useEffect(() => {
    const onFocus = async () => {
      await fetchClients({ enrich: false });
      scheduleEnrichment();
    };
    window.addEventListener('focus', onFocus);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('mdj');
      bc.onmessage = (ev) => {
        if (ev?.data?.topic === 'clients:changed') fetchClients({ enrich: false });
      };
    } catch {}
    return () => {
      window.removeEventListener('focus', onFocus);
      try { bc?.close(); } catch {}
    };
  }, []);

  const portfolios = useMemo(() => {
    const set = new Set<number>();
    allClients.forEach(c => c.portfolioCode && set.add(c.portfolioCode));
    return Array.from(set).sort((a, b) => a - b);
  }, [allClients]);

  // When including parties (directors), build synthetic rows for them
  const [partyRows, setPartyRows] = useState<Client[]>([]);

  useEffect(() => {
    (async () => {
      if (!includeParties) { setPartyRows([]); return; }
      try {
        const parties = partiesCacheRef.current || await api.get('/clients/parties/all');
        const people = peopleCacheRef.current || await api.get('/clients/people/all');
        if (!partiesCacheRef.current && Array.isArray(parties)) partiesCacheRef.current = parties;
        if (!peopleCacheRef.current && Array.isArray(people)) peopleCacheRef.current = people;
        const peopleMap: Record<string, any> = {};
        (Array.isArray(people) ? people : []).forEach((p: any) => { peopleMap[p.id] = p; });
        // Build client map for ref and portfolio
        const clientMap: Record<string, Client> = {};
        allClients.forEach((c) => { clientMap[c.id] = c; });
        const rows: Client[] = [];
        (Array.isArray(parties) ? parties : []).forEach((p: any) => {
          const client = clientMap[p.clientId];
          const person = peopleMap[p.personId];
          if (!client || !person) return;
          const partyRef = `${client.ref}${p.suffixLetter || ''}`;
          rows.push({
            id: `party_${p.id}`,
            ref: partyRef,
            name: person.fullName || '—',
            type: 'INDIVIDUAL',
            status: 'ACTIVE',
            mainEmail: person.email,
            registeredNumber: null,
            portfolioCode: client.portfolioCode,
          } as unknown as Client);
        });
        setPartyRows(rows);
      } catch (e) {
        console.warn('Failed to load parties/people', e);
        setPartyRows([]);
      }
    })();
  }, [includeParties, allClients]);

  const filtered = useMemo(() => {
    const base = includeParties ? [...allClients, ...partyRows] : [...allClients];
    const getText = (v?: string | number | null) => (v === null || v === undefined ? '' : String(v)).toLowerCase();
    return base.filter(c => {
      const matchesRef = !filters.ref || getText(c.ref).includes(filters.ref.toLowerCase());
      const matchesName = !filters.name || getText(c.name).includes(filters.name.toLowerCase());
      const matchesCompanyNo =
        !filters.registeredNumber ||
        getText(c.registeredNumber).includes(filters.registeredNumber.toLowerCase());
      const matchesUtr =
        !filters.utrNumber ||
        getText(c.utrNumber).includes(filters.utrNumber.toLowerCase());
      const contactValue = c.mainContact ?? c.mainEmail ?? '';
      const matchesContact = !filters.mainContact || getText(contactValue).includes(filters.mainContact.toLowerCase());
      const matchesPhone = !filters.mainPhone || getText(c.mainPhone).includes(filters.mainPhone.toLowerCase());
      const matchesAccountsDue =
        !filters.accountsNextDue ||
        getText(c.accountsNextDue).includes(filters.accountsNextDue.toLowerCase()) ||
        getText(c.compAccounts).includes(filters.accountsNextDue.toLowerCase()) ||
        getText(c.accountsNextDue ? new Date(c.accountsNextDue).toLocaleDateString('en-GB') : '').includes(filters.accountsNextDue.toLowerCase());
      const matchesYearEnd =
        !filters.accountsLastMadeUpTo ||
        getText(c.accountsLastMadeUpTo).includes(filters.accountsLastMadeUpTo.toLowerCase()) ||
        getText(c.accountsLastMadeUpTo ? new Date(c.accountsLastMadeUpTo).toLocaleDateString('en-GB') : '').includes(filters.accountsLastMadeUpTo.toLowerCase());
      const matchesCsDue =
        !filters.confirmationNextDue ||
        getText(c.confirmationNextDue || c.confirmationStatementDue).includes(filters.confirmationNextDue.toLowerCase()) ||
        getText(c.compCS).includes(filters.confirmationNextDue.toLowerCase()) ||
        getText(c.confirmationNextDue || c.confirmationStatementDue ? new Date(c.confirmationNextDue || c.confirmationStatementDue as any).toLocaleDateString('en-GB') : '').includes(filters.confirmationNextDue.toLowerCase());
      const matchesFees = !filters.annualFees || getText(c.annualFees).includes(filters.annualFees.toLowerCase());
      const matchesTasks = !filters.tasksDueCount || getText(c.tasksDueCount).includes(filters.tasksDueCount.toLowerCase());
      const matchesStatusCol = !filters.status || getText(c.status).includes(filters.status.toLowerCase());
      const matchesTypeCol = !filters.type || getText(c.type).includes(filters.type.toLowerCase());
      const matchesPortfolioCol = !filters.portfolio || getText(c.portfolioCode).includes(filters.portfolio.toLowerCase());

      return (
        matchesRef &&
        matchesName &&
        matchesCompanyNo &&
        matchesUtr &&
        matchesContact &&
        matchesPhone &&
        matchesAccountsDue &&
        matchesYearEnd &&
        matchesCsDue &&
        matchesFees &&
        matchesTasks &&
        matchesStatusCol &&
        matchesTypeCol &&
        matchesPortfolioCol
      );
    });
  }, [allClients, partyRows, includeParties, filters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let result = 0;
      switch (sortField) {
        case 'name':
          result = a.name.localeCompare(b.name);
          break;
        case 'status':
          result = a.status.localeCompare(b.status);
          break;
        case 'portfolio':
          result = (a.portfolioCode ?? 0) - (b.portfolioCode ?? 0);
          break;
        case 'ref':
          result = (a.ref ?? '').localeCompare(b.ref ?? '');
          break;
      }
      return sortDir === 'asc' ? result : -result;
    });
    return list;
  }, [filtered, sortField, sortDir]);

  // Ensure page resets when the dataset or perPage changes
  useEffect(() => {
    setPage(1);
  }, [filtered.length, perPage]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // clamp page to valid range
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return sorted.slice(start, start + perPage);
  }, [sorted, page, perPage]);

  // Small helper to render compliance pill for due dates
  const renderComplianceDate = (
    iso?: string | null,
    flag?: 'overdue' | 'dueSoon' | 'ok' | null
  ) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const label = isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
    if (flag === 'overdue') return <span className="badge danger">{label}</span>;
    if (flag === 'dueSoon') return <span className="badge warn">{label}</span>;
    return label;
  };

  const handleClear = () => {
    setFilters({
      ref: '',
      name: '',
      registeredNumber: '',
      utrNumber: '',
      mainContact: '',
      mainPhone: '',
      accountsNextDue: '',
      accountsLastMadeUpTo: '',
      confirmationNextDue: '',
      annualFees: '',
      tasksDueCount: '',
      status: '',
      type: '',
      portfolio: '',
    });
    setSortField('ref');
    setSortDir('asc');
  };

  const handlePrint = () => {
    window.print();
  };

  const columnDefs = [
    {
      id: 'ref',
      label: 'Reference',
      render: (c: Client) => <span className="mdj-ref">{c.ref ?? '—'}</span>,
    },
    {
      id: 'name',
      label: 'Name',
      render: (c: Client) => (
        <Link className="mdj-link" href={`/clients/${c.id}`} title="View client">
          {c.name}
        </Link>
      ),
    },
    {
      id: 'registeredNumber',
      label: 'Company No.',
      render: (c: Client) => c.registeredNumber ?? '—',
    },
    {
      id: 'utrNumber',
      label: 'UTR',
      render: (c: Client) => c.utrNumber ?? '—',
    },
    {
      id: 'status',
      label: 'Status',
      render: (c: Client) => c.status,
    },
    {
      id: 'type',
      label: 'Type',
      render: (c: Client) => c.type,
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      render: (c: Client) => (c.portfolioCode ? `#${c.portfolioCode}` : '—'),
    },
    {
      id: 'mainContact',
      label: 'Main Contact',
      render: (c: Client) => c.mainContact ?? c.mainEmail ?? '—',
    },
    {
      id: 'mainPhone',
      label: 'Main Telephone',
      render: (c: Client) => c.mainPhone ?? '—',
    },
    {
      id: 'accountsNextDue',
      label: 'Year End Due',
      render: (c: Client) => renderComplianceDate(c.accountsNextDue, c.compAccounts),
    },
    {
      id: 'accountsLastMadeUpTo',
      label: 'Year End',
      render: (c: Client) =>
        c.accountsLastMadeUpTo ? new Date(c.accountsLastMadeUpTo).toLocaleDateString('en-GB') : '—',
    },
    {
      id: 'confirmationNextDue',
      label: 'Confirmation Statement Due',
      render: (c: Client) => renderComplianceDate(c.confirmationNextDue || c.confirmationStatementDue, c.compCS),
    },
    {
      id: 'annualFees',
      label: 'Annual Fees',
      render: (c: Client) => (typeof c.annualFees === 'number' ? `£${c.annualFees.toFixed(2)}` : '—'),
    },
    {
      id: 'tasksDueCount',
      label: 'Tasks Due',
      render: (c: Client) => (typeof c.tasksDueCount === 'number' ? c.tasksDueCount : '—'),
    },
    {
      id: 'actions',
      label: '',
      render: (c: Client) => (
        <div style={{ textAlign: 'right' }}>
          <Link href={`/clients/${c.id}`} className="btn-outline-primary btn-xs">
            View
          </Link>
        </div>
      ),
    },
  ];
  const visibleColumnDefs = columnDefs.filter((col) => visibleColumns.includes(col.id));
  const safeColumnDefs = visibleColumnDefs.length ? visibleColumnDefs : columnDefs.filter((c) => c.id === 'name');

  return (
    <MDJShell
      pageTitle="Clients"
      pageSubtitle="Manage your client portfolio and relationships"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients' }]}
      actions={[
        { label: 'Refresh', onClick: () => fetchClients({ forceEnrich: true }), variant: 'outline' },
        { label: 'CH Search', href: '/companies-house', variant: 'outline' },
        { label: 'Summary', href: '/clients/summary', variant: 'outline' },
        <ExportMenu key="export"
          onCSV={async () => {
            try {
              const csv = await api.get<string>('/clients/export.csv');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `clients-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
            } catch (e: any) { alert(e?.message || 'Export failed'); }
          }}
          onPDF={() => window.print()}
        />,
        { label: 'Bulk Import', href: '/settings?tab=portfolios', variant: 'outline' },
        { label: 'Add Client', href: '/clients/new/wizard', variant: 'primary' },
      ]}
    >
      {/* List */}
      <div className="card-mdj">
        <div className="list-head">
          <h3>Clients ({sorted.length})</h3>
          <div className="list-head-actions">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={includeParties}
                onChange={(e) => setIncludeParties(e.target.checked)}
              />
              <span className="mdj-sub">Include Directors/Parties</span>
            </label>
            <button type="button" className="btn-outline-primary" onClick={handleClear}>
              Clear Filters
            </button>
            <button type="button" className="btn-primary" onClick={handlePrint}>
              Print List
            </button>
            <button type="button" className="btn-outline-primary" onClick={() => setShowCustomize((v) => !v)}>
              {showCustomize ? 'Hide' : 'Customize'}
            </button>
            <button
              type="button"
              className={`segment ${view === 'table' ? 'active' : ''}`}
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
            >
              Table View
            </button>
            <button
              type="button"
              className={`segment ${view === 'cards' ? 'active' : ''}`}
              onClick={() => setView('cards')}
              aria-pressed={view === 'cards'}
            >
              Card View
            </button>
          </div>
        </div>

        {showCustomize && (
          <div style={{ marginBottom: '1rem', display: 'grid', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Visible Columns</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {columnDefs.map((col) => (
                  <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...visibleColumns, col.id]))
                          : visibleColumns.filter((id) => id !== col.id);
                        setVisibleColumns(next);
                      }}
                    />
                    <span className="mdj-sub">{col.label || 'Actions'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'table' ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="mdj-table">
                <thead>
                  <tr>
                    {safeColumnDefs.map((col) => (
                      <th key={col.id}>{col.label}</th>
                    ))}
                  </tr>
                  <tr>
                    {safeColumnDefs.map((col) => {
                      if (col.id === 'actions') return <th key={col.id} />;
                      if (col.id === 'status') {
                        return (
                          <th key={col.id}>
                            <select
                              aria-label="Filter by status"
                              value={filters.status}
                              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                              className="mdj-select"
                            >
                              <option value="">All</option>
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                              <option value="ARCHIVED">Archived</option>
                            </select>
                          </th>
                        );
                      }
                      if (col.id === 'type') {
                        return (
                          <th key={col.id}>
                            <select
                              aria-label="Filter by type"
                              value={filters.type}
                              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                              className="mdj-select"
                            >
                              <option value="">All</option>
                              <option value="COMPANY">Company</option>
                              <option value="INDIVIDUAL">Individual</option>
                              <option value="SOLE_TRADER">Sole Trader</option>
                              <option value="PARTNERSHIP">Partnership</option>
                              <option value="LLP">LLP</option>
                            </select>
                          </th>
                        );
                      }
                      if (col.id === 'portfolio') {
                        return (
                          <th key={col.id}>
                            <select
                              aria-label="Filter by portfolio"
                              value={filters.portfolio}
                              onChange={(e) => setFilters((prev) => ({ ...prev, portfolio: e.target.value }))}
                              className="mdj-select"
                            >
                              <option value="">All</option>
                              {portfolios.map((p) => (
                                <option key={p} value={String(p)}>
                                  #{p}
                                </option>
                              ))}
                            </select>
                          </th>
                        );
                      }
                      const filterKey = col.id as keyof typeof filters;
                      return (
                        <th key={col.id}>
                          <input
                            aria-label={`Filter by ${col.label}`}
                            value={filters[filterKey] || ''}
                            onChange={(e) => setFilters((prev) => ({ ...prev, [filterKey]: e.target.value }))}
                            className="mdj-input"
                          />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={safeColumnDefs.length} style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      Loading…
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={safeColumnDefs.length} style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      No clients found
                    </td>
                  </tr>
                ) : (
                  paginated.map((c) => (
                    <tr key={c.id}>
                      {safeColumnDefs.map((col) => (
                        <td key={col.id}>{col.render(c)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  {total === 0 ? (
                    'No results'
                  ) : (
                    `Showing ${Math.min((page - 1) * perPage + 1, total)}–${Math.min(page * perPage, total)} of ${total}`
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }} htmlFor="per-page">Show</label>
                  <select
                    id="per-page"
                    value={perPage}
                    onChange={(e) => setPerPage(parseInt(e.target.value, 10))}
                    className="mdj-select"
                    style={{ width: 'auto' }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>

                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-outline-primary"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Prev
                    </button>

                    {/* Page numbers (show a small window around current page) */}
                    {(() => {
                      const pages: number[] = [];
                      let start = Math.max(1, page - 2);
                      let end = Math.min(totalPages, page + 2);
                      // expand window if near edges
                      if (page <= 3) end = Math.min(5, totalPages);
                      if (page >= totalPages - 2) start = Math.max(1, totalPages - 4);
                      for (let i = start; i <= end; i++) pages.push(i);
                      return pages.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`segment ${p === page ? 'active' : ''}`}
                          aria-current={p === page ? 'page' : undefined}
                          style={{ minWidth: '36px' }}
                        >
                          {p}
                        </button>
                      ));
                    })()}

                    <button
                      type="button"
                      className="btn-outline-primary"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
      </div>
      </>
    ) : (
          <div className="client-card-grid">
            {loading ? (
              <div className="text-dim">Loading…</div>
            ) : sorted.length === 0 ? (
              <div className="text-dim">No clients found</div>
            ) : (
              sorted.map((c) => (
                <Link key={c.id} href={`/clients/${c.id}`} className="client-card">
                  <div className="client-card-head">
                    <span className="client-ref">{c.ref ?? '—'}</span>
                    <span
                      className={`mdj-badge ${
                        c.status === 'ACTIVE'
                          ? 'mdj-badge-success'
                          : c.status === 'ARCHIVED'
                          ? 'mdj-badge-dark'
                          : 'mdj-badge-muted'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h4>{c.name}</h4>
                  <p className="client-card-sub">Main Contact: {c.mainContact ?? c.mainEmail ?? '—'}</p>
                  <p className="client-card-info">Company No.: {c.registeredNumber ?? '—'}</p>
                  <p className="client-card-info">UTR: {c.utrNumber ?? '—'}</p>
                  <p className="client-card-info">Tel: {c.mainPhone ?? '—'}</p>
                  <p className="client-card-info">Year End Due: {renderComplianceDate(c.accountsNextDue, c.compAccounts)}</p>
                  <p className="client-card-info">Year End: {c.accountsLastMadeUpTo ? new Date(c.accountsLastMadeUpTo).toLocaleDateString('en-GB') : '—'}</p>
                  <p className="client-card-info">CS Due: {renderComplianceDate(c.confirmationNextDue || c.confirmationStatementDue, c.compCS)}</p>
                  <p className="client-card-info">Fees: {typeof c.annualFees === 'number' ? `£${c.annualFees.toFixed(2)}` : '—'}</p>
                  <p className="client-card-info">Tasks Due: {typeof c.tasksDueCount === 'number' ? c.tasksDueCount : '—'}</p>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </MDJShell>
  );
}
