'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { api } from '@/lib/api'; // uses http://localhost:3001/api/v1 by default
import type { ClientContext } from '@/lib/types';

type ClientRow = ClientContext;
type SortField = 'name' | 'portfolio' | 'identifier' | 'accountsDue' | 'confirmationDue' | 'annualFee';

type ClientEnrichment = {
  serviceCount: number;
  openTaskCount: number;
};

const isOpenTaskStatus = (status?: string) => {
  const normalized = String(status || '').toUpperCase();
  return normalized !== 'COMPLETED' && normalized !== 'CANCELLED';
};

const toDateSortValue = (value?: string | null) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;
  return date.getTime();
};

const isOverdueDate = (value?: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
};

const resolveClientRouteKey = (row: ClientRow): string => {
  const candidates = [row?.node?.id, row?.node?.clientRef];
  for (const raw of candidates) {
    const value = String(raw || '').trim();
    if (!value || value === 'undefined' || value === 'null') continue;
    return value;
  }
  return '';
};

export default function ClientsPage() {
  const [allClients, setAllClients] = useState<ClientRow[]>([]);
  const [clientEnrichment, setClientEnrichment] = useState<Record<string, ClientEnrichment>>({});
  const [loading, setLoading] = useState(true);

  // filters - load from localStorage on mount
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    identifier: '',
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
    overdueAccounts: '',
    overdueConfirmation: '',
    hasServices: '',
    amlComplete: '',
    hasOpenTasks: '',
  });
  const [sortField, setSortField] = useState<SortField>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('clients_sort_field');
      if (stored === 'ref') return 'identifier';
      if (stored === 'name' || stored === 'portfolio' || stored === 'identifier' || stored === 'accountsDue' || stored === 'confirmationDue' || stored === 'annualFee') {
        return stored;
      }
      return 'identifier';
    }
    return 'identifier';
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
    'identifier',
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((id: string) => (id === 'ref' ? 'identifier' : id));
          }
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

  const fetchClients = async () => {
    try {
      setLoading(true);
      const [data, servicesRaw, tasksRaw] = await Promise.all([
        api.getClients(),
        api.get('/services').catch(() => []),
        api.get('/tasks/with-client-details').catch(() => []),
      ]);
      const items = Array.isArray(data) ? data : [];
      const services = Array.isArray(servicesRaw) ? servicesRaw : [];
      const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];

      const serviceCountByClient: Record<string, number> = {};
      for (const service of services) {
        const clientId = String((service as any)?.clientId || '').trim();
        if (!clientId) continue;
        serviceCountByClient[clientId] = (serviceCountByClient[clientId] || 0) + 1;
      }

      const openTaskCountByClient: Record<string, number> = {};
      for (const task of tasks) {
        const clientId = String((task as any)?.clientId || '').trim();
        if (!clientId) continue;
        if (!isOpenTaskStatus((task as any)?.status)) continue;
        openTaskCountByClient[clientId] = (openTaskCountByClient[clientId] || 0) + 1;
      }

      const normalized = items.map((ctx) => {
        const node = ctx.node;
        const profile = ctx.profile;
        const accountsNextDue = node.accountsNextDue ?? profile.nextAccountsDueBy ?? profile.nextAccountsDueDate ?? null;
        const confirmationNextDue = node.confirmationNextDue ?? profile.confirmationStatementDueBy ?? profile.nextConfirmationStatementDate ?? null;
        const openTaskCount = openTaskCountByClient[node.id] ?? Number(node.tasksDueCount || 0);
        return {
          ...ctx,
          node: {
            ...node,
            accountsNextDue,
            accountsLastMadeUpTo: node.accountsLastMadeUpTo ?? null,
            confirmationNextDue,
            tasksDueCount: openTaskCount,
          },
        };
      });

      setAllClients(normalized);
      setClientEnrichment(
        normalized.reduce<Record<string, ClientEnrichment>>((acc, row) => {
          const clientId = row.node.id;
          acc[clientId] = {
            serviceCount: serviceCountByClient[clientId] || 0,
            openTaskCount: openTaskCountByClient[clientId] || Number(row.node.tasksDueCount || 0),
          };
          return acc;
        }, {}),
      );
    } catch (e) {
      console.error('Failed to load clients', e);
      setAllClients([]);
      setClientEnrichment({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let on = true;
    (async () => {
      if (!on) return;
      await fetchClients();
    })();
    return () => { on = false; };
  }, []);

  // Auto-refetch on window focus and broadcast events
  useEffect(() => {
    const onFocus = async () => {
      await fetchClients();
    };
    window.addEventListener('focus', onFocus);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('mdj');
      bc.onmessage = (ev) => {
        if (ev?.data?.topic === 'clients:changed') fetchClients();
      };
    } catch {}
    return () => {
      window.removeEventListener('focus', onFocus);
      try { bc?.close(); } catch {}
    };
  }, []);

  
  const portfolios = useMemo(() => {
    const set = new Set<number>();
    allClients.forEach(c => c.node.portfolioCode && set.add(c.node.portfolioCode));
    return Array.from(set).sort((a, b) => a - b);
  }, [allClients]);

  const filtered = useMemo(() => {
    const base = [...allClients];
    const getText = (v?: string | number | null) => (v === null || v === undefined ? '' : String(v)).toLowerCase();
    return base.filter(ctx => {
      const node = ctx.node;
      const profile = ctx.profile;
      const searchText = `${node.clientRef || ''} ${node.name || ''} ${node.registeredNumber || ''} ${node.utrNumber || ''}`.toLowerCase();
      const searchMatch = !filters.search || searchText.includes(filters.search.toLowerCase());
      const matchesIdentifier =
        !filters.identifier ||
        getText(node.clientRef).includes(filters.identifier.toLowerCase());
      const matchesName = !filters.name || getText(node.name).includes(filters.name.toLowerCase());
      const matchesCompanyNo =
        !filters.registeredNumber ||
        getText(node.registeredNumber).includes(filters.registeredNumber.toLowerCase());
      const matchesUtr =
        !filters.utrNumber ||
        getText(node.utrNumber).includes(filters.utrNumber.toLowerCase());
      const contactValue = profile.mainContactName ?? node.mainEmail ?? '';
      const matchesContact = !filters.mainContact || getText(contactValue).includes(filters.mainContact.toLowerCase());
      const matchesPhone = !filters.mainPhone || getText(node.mainPhone).includes(filters.mainPhone.toLowerCase());
      const matchesAccountsDue =
        !filters.accountsNextDue ||
        getText(node.accountsNextDue).includes(filters.accountsNextDue.toLowerCase()) ||
        getText(node.accountsNextDue ? new Date(node.accountsNextDue).toLocaleDateString('en-GB') : '').includes(filters.accountsNextDue.toLowerCase());
      const matchesYearEnd =
        !filters.accountsLastMadeUpTo ||
        getText(node.accountsLastMadeUpTo).includes(filters.accountsLastMadeUpTo.toLowerCase()) ||
        getText(node.accountsLastMadeUpTo ? new Date(node.accountsLastMadeUpTo).toLocaleDateString('en-GB') : '').includes(filters.accountsLastMadeUpTo.toLowerCase());
      const matchesCsDue =
        !filters.confirmationNextDue ||
        getText(node.confirmationNextDue).includes(filters.confirmationNextDue.toLowerCase()) ||
        getText(node.confirmationNextDue ? new Date(node.confirmationNextDue).toLocaleDateString('en-GB') : '').includes(filters.confirmationNextDue.toLowerCase());
      const matchesAnnualFees =
        !filters.annualFees ||
        getText(profile.annualFee).includes(filters.annualFees.toLowerCase());
      const matchesTasksDue =
        !filters.tasksDueCount ||
        getText(node.tasksDueCount).includes(filters.tasksDueCount.toLowerCase());
      const matchesStatus = !filters.status || node.status === filters.status;
      const matchesType = !filters.type || node.type === filters.type;
      const matchesPortfolio = !filters.portfolio || String(node.portfolioCode || '') === filters.portfolio;
      const serviceCount = clientEnrichment[node.id]?.serviceCount || 0;
      const openTaskCount = clientEnrichment[node.id]?.openTaskCount || Number(node.tasksDueCount || 0);
      const hasServices = serviceCount > 0;
      const hasOpenTasks = openTaskCount > 0;
      const amlComplete = profile.amlCompleted === true;
      const overdueAccounts = isOverdueDate(node.accountsNextDue);
      const overdueConfirmation = isOverdueDate(node.confirmationNextDue);
      const matchesOverdueAccounts =
        !filters.overdueAccounts ||
        (filters.overdueAccounts === 'YES' ? overdueAccounts : !overdueAccounts);
      const matchesOverdueConfirmation =
        !filters.overdueConfirmation ||
        (filters.overdueConfirmation === 'YES' ? overdueConfirmation : !overdueConfirmation);
      const matchesHasServices =
        !filters.hasServices ||
        (filters.hasServices === 'YES' ? hasServices : !hasServices);
      const matchesAmlComplete =
        !filters.amlComplete ||
        (filters.amlComplete === 'YES' ? amlComplete : !amlComplete);
      const matchesHasOpenTasks =
        !filters.hasOpenTasks ||
        (filters.hasOpenTasks === 'YES' ? hasOpenTasks : !hasOpenTasks);
      return (
        searchMatch &&
        matchesIdentifier &&
        matchesName &&
        matchesCompanyNo &&
        matchesUtr &&
        matchesContact &&
        matchesPhone &&
        matchesAccountsDue &&
        matchesYearEnd &&
        matchesCsDue &&
        matchesAnnualFees &&
        matchesTasksDue &&
        matchesStatus &&
        matchesType &&
        matchesPortfolio &&
        matchesOverdueAccounts &&
        matchesOverdueConfirmation &&
        matchesHasServices &&
        matchesAmlComplete &&
        matchesHasOpenTasks
      );
    });
  }, [allClients, clientEnrichment, filters]);


  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let result = 0;
      const aNode = a.node;
      const bNode = b.node;
      switch (sortField) {
        case 'name':
          result = aNode.name.localeCompare(bNode.name);
          break;
        case 'portfolio':
          result = (aNode.portfolioCode ?? 0) - (bNode.portfolioCode ?? 0);
          break;
        case 'identifier':
          result = (aNode.clientRef || '').localeCompare(bNode.clientRef || '');
          break;
        case 'accountsDue':
          result = toDateSortValue(aNode.accountsNextDue) - toDateSortValue(bNode.accountsNextDue);
          break;
        case 'confirmationDue':
          result = toDateSortValue(aNode.confirmationNextDue) - toDateSortValue(bNode.confirmationNextDue);
          break;
        case 'annualFee':
          result = Number(a.profile.annualFee || 0) - Number(b.profile.annualFee || 0);
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

  const renderDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
  };

  const handleClear = () => {
    setFilters({
      search: '',
      identifier: '',
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
      overdueAccounts: '',
      overdueConfirmation: '',
      hasServices: '',
      amlComplete: '',
      hasOpenTasks: '',
    });
    setSortField('identifier');
    setSortDir('asc');
  };

  const handlePrint = () => {
    window.print();
  };

  const columnDefs = [
    {
      id: 'identifier',
      label: 'Identifier',
      render: (c: ClientRow) => <span className="mdj-ref">{c.node.clientRef || '—'}</span>,
    },
    {
      id: 'name',
      label: 'Name',
      render: (c: ClientRow) => {
        const routeKey = resolveClientRouteKey(c);
        const lifecycle = c.profile.lifecycleStatus;
        const lifecycleInactive = Boolean(lifecycle && lifecycle !== 'ACTIVE');
        const amlIncomplete = !c.computed.isAmlComplete;
        const amlReviewDue = c.computed.amlReviewDue;
        const risk = c.profile.clientRiskRating;
        const highRisk = Boolean(risk && String(risk).toLowerCase().includes('high'));
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {routeKey ? (
              <Link className="mdj-link" href={`/clients/${encodeURIComponent(routeKey)}/overview`} title="View client">
                {c.node.name}
              </Link>
            ) : (
              <span className="mdj-link" style={{ opacity: 0.65 }}>{c.node.name}</span>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {lifecycleInactive && (
                <span className="mdj-badge mdj-badge-muted">
                  {lifecycle}
                </span>
              )}
              {amlIncomplete && (
                <span className={`mdj-badge ${amlReviewDue ? 'mdj-badge-warn' : 'mdj-badge-danger'}`}>
                  AML incomplete
                </span>
              )}
              {highRisk && <span className="mdj-badge mdj-badge-danger">High risk</span>}
            </div>
          </div>
        );
      },
    },
    {
      id: 'registeredNumber',
      label: 'Company No.',
      render: (c: ClientRow) => c.node.registeredNumber ?? '—',
    },
    {
      id: 'utrNumber',
      label: 'UTR',
      render: (c: ClientRow) => c.node.utrNumber ?? '—',
    },
    {
      id: 'status',
      label: 'Status',
      render: (c: ClientRow) => c.node.status,
    },
    {
      id: 'type',
      label: 'Type',
      render: (c: ClientRow) => c.node.type,
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      render: (c: ClientRow) => (c.node.portfolioCode ? `#${c.node.portfolioCode}` : '—'),
    },
    {
      id: 'mainContact',
      label: 'Main Contact',
      render: (c: ClientRow) => c.profile.mainContactName ?? c.node.mainEmail ?? '—',
    },
    {
      id: 'mainPhone',
      label: 'Main Telephone',
      render: (c: ClientRow) => c.node.mainPhone ?? '—',
    },
    {
      id: 'accountsNextDue',
      label: 'Accounts Due',
      render: (c: ClientRow) => renderDate(c.node.accountsNextDue),
    },
    {
      id: 'accountsLastMadeUpTo',
      label: 'Year End',
      render: (c: ClientRow) => renderDate(c.node.accountsLastMadeUpTo),
    },
    {
      id: 'confirmationNextDue',
      label: 'Confirmation Due',
      render: (c: ClientRow) => renderDate(c.node.confirmationNextDue),
    },
    {
      id: 'annualFees',
      label: 'Annual Fees',
      render: (c: ClientRow) =>
        typeof c.profile.annualFee === 'number' ? `£${c.profile.annualFee.toFixed(2)}` : '—',
    },
    {
      id: 'tasksDueCount',
      label: 'Tasks Due',
      render: (c: ClientRow) => String(c.node.tasksDueCount ?? 0),
    },
    {
      id: 'actions',
      label: '',
      render: (c: ClientRow) => {
        const routeKey = resolveClientRouteKey(c);
        return (
          <div style={{ textAlign: 'right' }}>
            {routeKey ? (
              <Link href={`/clients/${encodeURIComponent(routeKey)}/overview`} className="btn-outline-primary btn-xs">
                View
              </Link>
            ) : (
              <span className="btn-outline-primary btn-xs" style={{ opacity: 0.55, pointerEvents: 'none' }}>
                View
              </span>
            )}
          </div>
        );
      },
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
        { label: 'Refresh', onClick: () => fetchClients(), variant: 'outline' },
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
            <select
              aria-label="Sort field"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="mdj-select"
              style={{ width: 'auto' }}
            >
              <option value="identifier">Sort: Identifier</option>
              <option value="name">Sort: Name</option>
              <option value="portfolio">Sort: Portfolio</option>
              <option value="accountsDue">Sort: Accounts Due</option>
              <option value="confirmationDue">Sort: Confirmation Due</option>
              <option value="annualFee">Sort: Annual Fee</option>
            </select>
            <select
              aria-label="Sort direction"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
              className="mdj-select"
              style={{ width: 'auto' }}
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            aria-label="Search clients"
            placeholder="Search name/ref/company/UTR"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="mdj-input"
          />
          <select
            aria-label="Overdue accounts filter"
            value={filters.overdueAccounts}
            onChange={(e) => setFilters((prev) => ({ ...prev, overdueAccounts: e.target.value }))}
            className="mdj-select"
          >
            <option value="">Accounts Due: All</option>
            <option value="YES">Overdue Accounts: Yes</option>
            <option value="NO">Overdue Accounts: No</option>
          </select>
          <select
            aria-label="Overdue confirmation filter"
            value={filters.overdueConfirmation}
            onChange={(e) => setFilters((prev) => ({ ...prev, overdueConfirmation: e.target.value }))}
            className="mdj-select"
          >
            <option value="">Confirmation Due: All</option>
            <option value="YES">Overdue Confirmation: Yes</option>
            <option value="NO">Overdue Confirmation: No</option>
          </select>
          <select
            aria-label="Has services filter"
            value={filters.hasServices}
            onChange={(e) => setFilters((prev) => ({ ...prev, hasServices: e.target.value }))}
            className="mdj-select"
          >
            <option value="">Has Services: All</option>
            <option value="YES">Has Services: Yes</option>
            <option value="NO">Has Services: No</option>
          </select>
          <select
            aria-label="AML complete filter"
            value={filters.amlComplete}
            onChange={(e) => setFilters((prev) => ({ ...prev, amlComplete: e.target.value }))}
            className="mdj-select"
          >
            <option value="">AML Complete: All</option>
            <option value="YES">AML Complete: Yes</option>
            <option value="NO">AML Complete: No</option>
          </select>
          <select
            aria-label="Open tasks filter"
            value={filters.hasOpenTasks}
            onChange={(e) => setFilters((prev) => ({ ...prev, hasOpenTasks: e.target.value }))}
            className="mdj-select"
          >
            <option value="">Open Tasks: All</option>
            <option value="YES">Open Tasks: Yes</option>
            <option value="NO">Open Tasks: No</option>
          </select>
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
                    <tr key={c.node.id}>
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
              sorted.map((c, index) => {
                const routeKey = resolveClientRouteKey(c);
                const cardKey = routeKey || `${c.node.name || 'client'}-${index}`;

                const body = (
                  <>
                    <div className="client-card-head">
                      <span className="client-ref">{c.node.clientRef || '—'}</span>
                      <span
                        className={`mdj-badge ${
                          c.node.status === 'ACTIVE'
                            ? 'mdj-badge-success'
                            : c.node.status === 'ARCHIVED'
                            ? 'mdj-badge-dark'
                            : 'mdj-badge-muted'
                        }`}
                      >
                        {c.node.status}
                      </span>
                    </div>
                    <h4>{c.node.name}</h4>
                    <p className="client-card-sub">Main Contact: {c.profile.mainContactName ?? c.node.mainEmail ?? '—'}</p>
                    <p className="client-card-info">Company No.: {c.node.registeredNumber ?? '—'}</p>
                    <p className="client-card-info">UTR: {c.node.utrNumber ?? '—'}</p>
                    <p className="client-card-info">Tel: {c.node.mainPhone ?? '—'}</p>
                    <p className="client-card-info">Year End Due: {renderDate(c.node.accountsNextDue)}</p>
                    <p className="client-card-info">Year End: {renderDate(c.node.accountsLastMadeUpTo)}</p>
                    <p className="client-card-info">CS Due: {renderDate(c.node.confirmationNextDue)}</p>
                    <p className="client-card-info">Fees: {typeof c.profile.annualFee === 'number' ? `£${c.profile.annualFee.toFixed(2)}` : '—'}</p>
                    <p className="client-card-info">Tasks Due: {String(c.node.tasksDueCount ?? 0)}</p>
                  </>
                );

                if (!routeKey) {
                  return (
                    <div key={cardKey} className="client-card" style={{ opacity: 0.7 }}>
                      {body}
                    </div>
                  );
                }

                return (
                  <Link key={cardKey} href={`/clients/${encodeURIComponent(routeKey)}/overview`} className="client-card">
                    {body}
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
    </MDJShell>
  );
}
