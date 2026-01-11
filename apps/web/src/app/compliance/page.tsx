'use client';

import { useState, useEffect } from 'react';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

interface ComplianceItem {
  id: string;
  clientId: string;
  serviceId?: string;
  type: string;
  description: string;
  dueDate?: string;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: string;
  updatedAt: string;
}

interface ComplianceSummary {
  total: number;
  pending: number;
  overdue: number;
  upcoming: number;
  filed: number;
}

export default function CompliancePage() {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming' | 'pending' | 'filed'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [ignoredItems, setIgnoredItems] = useState<string[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [deletingItems, setDeletingItems] = useState<Record<string, boolean>>({});

  // Load ignored items from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ignoredComplianceItems');
    if (stored) {
      try {
        setIgnoredItems(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse ignored items', e);
      }
    }
  }, []);

  useEffect(() => {
    loadServices();
    loadComplianceData();
    loadSummary();
  }, [filter]);

  // Auto-generate compliance items only on initial load - DISABLED to prevent duplicates
  // useEffect(() => {
  //   generateComplianceFromServices();
  // }, []); // Empty dependency array means this runs only once on mount

  const loadServices = async () => {
    try {
      const response = await api.get('/services/with-client-details');
      setServices(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      
      // Fetch compliance items from API
      let items: ComplianceItem[] = await api.get('/compliance');
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      console.log('Raw compliance items loaded:', items.length);
      console.log('Sample compliance items:', items.slice(0, 3).map(i => ({ id: i.id, clientId: i.clientId, type: i.type })));

      if (items.length === 0) {
        console.log('No compliance items found - setting empty state');
        setComplianceItems([]);
        setError(null);
        setLoading(false);
        return;
      }

      // Load clients to enrich compliance items with client names
      const clients = await api.getClients() as any[];
      console.log('Loaded clients:', clients.length);
      console.log('Sample client IDs:', clients.slice(0, 3).map(c => ({ id: c.id, ref: c.ref, name: c.name })));

      // Create client maps for both ID and ref lookups
      const clientByIdMap = new Map(clients.map(c => [c.id, c]));
      const clientByRefMap = new Map(clients.map(c => [c.ref, c]));

      // Enrich items with client information - but don't fail if client not found
      items = items.map(item => {
        // Try to find client by ID first, then by ref
        let client = clientByIdMap.get(item.clientId);
        if (!client) {
          client = clientByRefMap.get(item.clientId);
        }
        
        if (client) {
          return {
            ...item,
            description: `${client.name} (${client.ref || client.id}) - ${item.type.replace(/_/g, ' ')}`,
          };
        } else {
          console.warn('Client not found for compliance item:', item.clientId, 'Item:', item.id);
          // Still show the item but with a generic description
          return {
            ...item,
            description: `Client ${item.clientId} - ${item.type.replace(/_/g, ' ')}`,
          };
        }
      });

      console.log('Enriched compliance items:', items.length);
      console.log('Items with unknown clients:', items.filter(i => i.description.startsWith('Client ')).length);

      // Apply filters
      let filteredItems = items;
      switch (filter) {
        case 'overdue':
          filteredItems = items.filter(item => item.status === 'OVERDUE');
          break;
        case 'upcoming':
          filteredItems = items.filter(item => {
            if (!item.dueDate) return false;
            const dueDate = new Date(item.dueDate);
            return dueDate >= now && dueDate <= thirtyDaysFromNow;
          });
          break;
        case 'pending':
          filteredItems = items.filter(item => item.status === 'PENDING');
          break;
        case 'filed':
          filteredItems = items.filter(item => item.status === 'FILED');
          break;
      }

      console.log('Filtered items after status filter:', filteredItems.length);

      // Filter out ignored items
      filteredItems = filteredItems.filter(item => !ignoredItems.includes(item.id));

      console.log('Final filtered items after removing ignored:', filteredItems.length);

      // Sort by due date (earliest first)
      filteredItems.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setComplianceItems(filteredItems);
      setError(null);
    } catch (err) {
      console.error('Error loading compliance items:', err);
      setError('Failed to load compliance items');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      // Fetch summary from API
      const summaryData = await api.get('/compliance/dashboard/summary');
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading compliance summary:', err);
    }
  };

  const generateComplianceFromServices = async () => {
    try {
      setLoading(true);
      
      // Call API to auto-generate compliance items from services
      const result = await api.post('/compliance/auto-generate-from-services');
      
      console.log('Auto-generation result:', result);
      
      if (result.generated > 0) {
        setError(null);
        // Show success message
        const message = `Generated ${result.generated} compliance items from services. ${result.skipped} items were skipped (already exist).`;
        console.log(message);
        
        // Reload the data to show new items
        await loadComplianceData();
        await loadSummary();
      } else {
        // Show detailed debug information
        const debugInfo = result.debug ? 
          `Debug: ${result.debug.totalServices} total services, ${result.debug.activeServices} active, ${result.debug.clientsWithServices} clients with services, ${result.debug.servicesProcessed} services processed, ${result.debug.clientsNotFound} clients not found.` : '';
        
        setError(`No new compliance items generated. ${result.skipped} items already exist. ${debugInfo}`);
      }
      
      if (result.errors && result.errors.length > 0) {
        console.warn('Some errors occurred during generation:', result.errors);
        setError(prev => `${prev || ''} Errors: ${result.errors.join(', ')}`);
      }
    } catch (err: any) {
      console.error('Error auto-generating compliance items:', err);
      setError(err?.message || 'Failed to auto-generate compliance items from services');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT') => {
    try {
      await api.put(`/compliance/${id}`, { status });
      await loadComplianceData();
      await loadSummary();
    } catch (err) {
      console.error('Error updating compliance item:', err);
      setError('Failed to update compliance item');
    }
  };

  const handleBulkStatusUpdate = async (status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT') => {
    if (selectedItems.length === 0) return;

    try {
      await api.put('/compliance/bulk-update', {
        ids: selectedItems,
        status,
      });
      setSelectedItems([]);
      await loadComplianceData();
      await loadSummary();
    } catch (err) {
      console.error('Error bulk updating compliance items:', err);
      setError('Failed to update compliance items');
    }
  };

  const handleMarkFiled = async (id: string) => {
    try {
      await api.put(`/compliance/${id}/filed`, {
        filedDate: new Date().toISOString(),
      });
      await loadComplianceData();
      await loadSummary();
    } catch (err) {
      console.error('Error marking compliance item as filed:', err);
      setError('Failed to mark item as filed');
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleIgnoreItem = (id: string) => {
    const newIgnored = [...ignoredItems, id];
    setIgnoredItems(newIgnored);
    localStorage.setItem('ignoredComplianceItems', JSON.stringify(newIgnored));
    // Reload data to reflect the change
    loadComplianceData();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this compliance item? This cannot be undone.')) return;
    setDeletingItems((prev) => ({ ...prev, [id]: true }));
    try {
      await api.delete(`/compliance/${id}`);
      await loadComplianceData();
      await loadSummary();
    } catch (err) {
      console.error('Error deleting compliance item:', err);
      setError('Failed to delete compliance item');
    } finally {
      setDeletingItems((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleUnignoreAll = () => {
    setIgnoredItems([]);
    localStorage.removeItem('ignoredComplianceItems');
    loadComplianceData();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FILED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXEMPT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'COMPANIES_HOUSE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HMRC':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MANUAL':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceName = (serviceId?: string) => {
    if (!serviceId) return '-';
    const service = services.find(s => s.id === serviceId);
    return service ? service.kind : '-';
  };

  return (
    <MDJShell
      pageTitle="Compliance & Filings"
      pageSubtitle="Track Companies House accounts and confirmation statements"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Compliance' }]}
      actions={[
        ...(ignoredItems.length > 0 ? [
          { label: `Show Ignored (${ignoredItems.length})`, onClick: handleUnignoreAll, variant: 'outline' as const }
        ] : []),
        { label: 'Cleanup Duplicates', onClick: async () => {
          if (!confirm('This will remove duplicate compliance items. Are you sure?')) return;
          try {
            setLoading(true);
            const result = await api.post('/compliance/cleanup/duplicates');
            console.log('=== CLEANUP RESULT ===');
            console.log('Total files:', result.totalFiles);
            console.log('Duplicates found:', result.duplicatesFound);
            console.log('Duplicates removed:', result.duplicatesRemoved);
            console.log('Errors:', result.errors);
            alert(`Cleanup complete! Removed ${result.duplicatesRemoved} duplicates from ${result.totalFiles} total files.`);
            // Reload data after cleanup
            await loadComplianceData();
            await loadSummary();
          } catch (error) {
            console.error('Cleanup failed:', error);
            alert('Cleanup failed - check console for details');
          } finally {
            setLoading(false);
          }
        }, variant: 'outline' as const },
        { label: 'Add Manual Item', href: '/compliance/new', variant: 'primary' as const },
      ]}
    >
      {/* Summary cards */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div className="card-mdj">
            <div className="mdj-h2" style={{ color: 'var(--text-dark)' }}>{summary.total}</div>
            <div className="mdj-sub">Total Items</div>
          </div>
          <div className="card-mdj">
            <div className="mdj-h2" style={{ color: 'var(--warn)' }}>{summary.pending}</div>
            <div className="mdj-sub">Pending</div>
          </div>
          <div className="card-mdj">
            <div className="mdj-h2" style={{ color: 'var(--danger)' }}>{summary.overdue}</div>
            <div className="mdj-sub">Overdue</div>
          </div>
          <div className="card-mdj">
            <div className="mdj-h2" style={{ color: 'var(--gold)' }}>{summary.upcoming}</div>
            <div className="mdj-sub">Upcoming (30 days)</div>
          </div>
          <div className="card-mdj">
            <div className="mdj-h2" style={{ color: 'var(--success)' }}>{summary.filed}</div>
            <div className="mdj-sub">Filed</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="card-mdj" style={{ marginBottom: '1rem', padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Items' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'pending', label: 'Pending' },
            { key: 'filed', label: 'Filed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={filter === tab.key ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.875rem' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card-mdj" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}>
          <span style={{ color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {/* Compliance Items Table */}
      <div className="card-mdj">
        {loading ? (
          <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading compliance items...</div>
        ) : complianceItems.length === 0 ? (
          <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>
            No compliance items found for the selected filter.
            {filter === 'all' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                If you have compliance files but see no items, they may have invalid client IDs. 
                Try the "Cleanup Invalid Items" button above.
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Service</th>
                  <th>Last Filed</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {complianceItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.type.replace(/_/g, ' ')}</td>
                    <td>
                      {item.serviceId ? (
                        <a
                          href={`/services/${item.serviceId}`}
                          style={{ color: 'var(--gold)', textDecoration: 'none', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {getServiceName(item.serviceId)}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{item.period || '—'}</td>
                    <td>{formatDate(item.dueDate)}</td>
                    <td>
                      <span className={`mdj-badge ${
                        item.status === 'OVERDUE' ? 'mdj-badge-danger' :
                        item.status === 'PENDING' ? 'mdj-badge-warn' :
                        item.status === 'FILED' ? 'mdj-badge-success' :
                        'mdj-badge-muted'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="right">
                      <button
                        onClick={() => window.location.href = `/clients/${item.clientId}`}
                        className="btn-outline-gold btn-xs"
                        style={{ marginRight: '0.5rem' }}
                      >
                        View Client
                      </button>
                      {item.reference && (
                        <button
                          onClick={() => window.open(`https://find-and-update.company-information.service.gov.uk/company/${item.reference}`, '_blank')}
                          className="btn-outline-gold btn-xs"
                          style={{ marginRight: '0.5rem' }}
                        >
                          View on CH
                        </button>
                      )}
                      <button
                        onClick={() => handleIgnoreItem(item.id)}
                        className="btn-outline-gold btn-xs"
                        style={{ marginRight: '0.5rem' }}
                      >
                        Ignore
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="btn-danger btn-xs"
                        disabled={deletingItems[item.id]}
                      >
                        {deletingItems[item.id] ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MDJShell>
  );
}
