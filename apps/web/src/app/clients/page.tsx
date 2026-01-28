'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { api } from '@/lib/api'; // uses http://localhost:3001/api/v1 by default
import type { ClientContext } from '@/lib/types';

type ClientRow = ClientContext;

export default function ClientsPage() {
  const [allClients, setAllClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

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


  // no-op: ClientContext already includes list signals
  const scheduleEnrichment = () => {};

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients();
      const items = Array.isArray(data) ? data : [];

      const normalized = items.map((ctx) => {
        const node = ctx.node;
        return {
          ...ctx,
          node: {
            ...node,
            accountsNextDue: node.accountsNextDue ?? null,
            accountsLastMadeUpTo: node.accountsLastMadeUpTo ?? null,
            confirmationNextDue: node.confirmationNextDue ?? null,
          },
        };
      });

      setAllClients(normalized);
      scheduleEnrichment();
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
      await fetchClients();
      if (on) scheduleEnrichment();
    })();
    return () => { on = false; };
  }, []);

  // Auto-refetch on window focus and broadcast events
  useEffect(() => {
    const onFocus = async () => {
      await fetchClients();
      scheduleEnrichment();
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
      const matchesRef = !filters.ref || getText(node.ref).includes(filters.ref.toLowerCase());
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
        getText(undefined).includes(filters.tasksDueCount.toLowerCase());
      const matchesStatus = !filters.status || node.status === filters.status;
      const matchesType = !filters.type || node.type === filters.type;
      const matchesPortfolio = !filters.portfolio || String(node.portfolioCode || '') === filters.portfolio;
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
        matchesAnnualFees &&
        matchesTasksDue &&
        matchesStatus &&
        matchesType &&
        matchesPortfolio
      );
    });
  }, [allClients, filters]);


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
        case 'status':
          result = aNode.status.localeCompare(bNode.status);
          break;
        case 'portfolio':
          result = (aNode.portfolioCode ?? 0) - (bNode.portfolioCode ?? 0);
          break;
        case 'ref':
          result = (aNode.ref ?? '').localeCompare(bNode.ref ?? '');
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
      render: (c: ClientRow) => <span className="mdj-ref">{c.node.ref ?? '—'}</span>,
    },
    {
      id: 'name',
      label: 'Name',
      render: (c: ClientRow) => {
        const lifecycle = c.profile.lifecycleStatus;
        const lifecycleInactive = Boolean(lifecycle && lifecycle !== 'ACTIVE');
        const amlIncomplete = !c.computed.isAmlComplete;
        const amlReviewDue = c.computed.amlReviewDue;
        const risk = c.profile.clientRiskRating;
        const highRisk = Boolean(risk && String(risk).toLowerCase().includes('high'));
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link className="mdj-link" href={`/clients/${c.node.id}`} title="View client">
              {c.node.name}
            </Link>
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
      label: 'Year End Due',
      render: (c: ClientRow) => renderDate(c.node.accountsNextDue),
    },
    {
      id: 'accountsLastMadeUpTo',
      label: 'Year End',
      render: (c: ClientRow) => renderDate(c.node.accountsLastMadeUpTo),
    },
    {
      id: 'confirmationNextDue',
      label: 'Confirmation Statement Due',
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
      render: () => '—',
    },
    {
      id: 'actions',
      label: '',
      render: (c: ClientRow) => (
        <div style={{ textAlign: 'right' }}>
          <Link href={`/clients/${c.node.id}`} className="btn-outline-primary btn-xs">
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
              sorted.map((c) => (
                <Link key={c.node.id} href={`/clients/${c.node.id}`} className="client-card">
                  <div className="client-card-head">
                    <span className="client-ref">{c.node.ref ?? '—'}</span>
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
                  <p className="client-card-info">Tasks Due: —</p>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </MDJShell>
  );
}
