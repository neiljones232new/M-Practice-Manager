'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { MDJCard, MDJButton, MDJTable, MDJInput } from '@/components/mdj-ui';
import { AccountsSet } from '@/lib/types';

interface Client {
  id: string;
  name: string;
  ref?: string;
  registeredNumber?: string;
}

export default function AccountsProductionPage() {
  const router = useRouter();
  const [accountsSets, setAccountsSets] = useState<AccountsSet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get all clients and accounts sets in parallel
        const [clientsData, accountsSetsData] = await Promise.all([
          api.getClients({ status: 'ACTIVE', limit: '1000' }),
          api.get<AccountsSet[]>('/accounts-sets')
        ]);
        
        if (mounted) {
          const items = Array.isArray(clientsData) ? clientsData : [];
          setClients(items.map((c: any) => c.node ?? c));
          setAccountsSets(accountsSetsData || []);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load accounts sets');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getClientRef = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.ref || '';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'IN_REVIEW':
        return 'warning';
      case 'READY':
        return 'success';
      case 'LOCKED':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'IN_REVIEW':
        return 'In Review';
      case 'READY':
        return 'Ready';
      case 'LOCKED':
        return 'Locked';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFrameworkLabel = (framework: string) => {
    const frameworkLabels = {
      'MICRO_FRS105': 'Micro-entity (FRS 105)',
      'SMALL_FRS102_1A': 'Small company (FRS 102 1A)',
      'DORMANT': 'Dormant company',
      'SOLE_TRADER': 'Sole trader / Individual',
      'INDIVIDUAL': 'Sole trader / Individual',
    };
    return frameworkLabels[framework as keyof typeof frameworkLabels] || framework;
  };

  const getCompletionPercentage = (accountsSet: AccountsSet) => {
    const requiredSections = ['companyPeriod', 'frameworkDisclosures', 'accountingPolicies', 'profitAndLoss', 'balanceSheet', 'notes'];
    const completedSections = requiredSections.filter(section => accountsSet.sections[section]);
    return Math.round((completedSections.length / requiredSections.length) * 100);
  };

  // Filter accounts sets based on search and status
  const filteredAccountsSets = accountsSets.filter(accountsSet => {
    const clientName = getClientName(accountsSet.clientId).toLowerCase();
    const clientRef = getClientRef(accountsSet.clientId).toLowerCase();
    const companyName = accountsSet.sections.companyPeriod?.company.name?.toLowerCase() || '';
    const companyNumber = accountsSet.companyNumber?.toLowerCase() || '';
    
    const matchesSearch = !searchTerm || 
      clientName.includes(searchTerm.toLowerCase()) ||
      clientRef.includes(searchTerm.toLowerCase()) ||
      companyName.includes(searchTerm.toLowerCase()) ||
      companyNumber.includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || accountsSet.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'client',
      header: 'Client',
      render: (value: any, row: AccountsSet) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            {getClientName(row.clientId)}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {getClientRef(row.clientId)} • {row.companyNumber || 'No company number'}
          </div>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (value: any, row: AccountsSet) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {formatDate(row.period.startDate)} - {formatDate(row.period.endDate)}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {getFrameworkLabel(row.framework)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string, row: AccountsSet) => (
        <div>
          <span className={`badge ${getStatusBadge(value)}`} style={{ marginBottom: '0.25rem' }}>
            {getStatusLabel(value)}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {getCompletionPercentage(row)}% complete
          </div>
        </div>
      ),
    },
    {
      key: 'updated',
      header: 'Last Updated',
      render: (value: any, row: AccountsSet) => (
        <div>
          <div>{formatDate(row.updatedAt)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.period.isFirstYear ? 'First Year' : 'Subsequent Year'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, row: AccountsSet) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <MDJButton
            size="sm"
            variant={row.status === 'DRAFT' ? 'primary' : 'outline'}
            onClick={() => router.push(`/accounts-production/${row.id}`)}
          >
            {row.status === 'DRAFT' ? 'Continue' : 'View'}
          </MDJButton>
          <MDJButton
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/clients/${row.clientId}`)}
          >
            Client
          </MDJButton>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <MDJShell
        pageTitle="Accounts Production"
        pageSubtitle="Loading accounts sets..."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Accounts Production' }
        ]}
      >
        <div className="card-mdj" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '2rem',
              height: '2rem',
              border: '2px solid var(--border-subtle)',
              borderTopColor: 'var(--brand-primary)',
              borderRadius: '50%',
              margin: '0 auto .75rem',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ color: 'var(--text-muted)' }}>Loading accounts sets...</div>
        </div>
      </MDJShell>
    );
  }

  return (
    <MDJShell
      pageTitle="Accounts Production"
      pageSubtitle="Manage statutory accounts production for your clients"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Accounts Production' }
      ]}
      actions={[
        {
          label: 'New Accounts Set',
          onClick: () => router.push('/accounts-production/select-client'),
          variant: 'primary'
        }
      ]}
    >
      {error && (
        <div className="card-mdj" style={{ 
          marginBottom: '1rem', 
          padding: '1rem',
          background: 'var(--status-danger-bg)',
          borderColor: 'var(--status-danger-border)'
        }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600 }}>
            {error}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <MDJCard>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
              {accountsSets.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Total Accounts Sets
            </div>
          </div>
        </MDJCard>
        
        <MDJCard>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
              {accountsSets.filter(a => a.status === 'DRAFT').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              In Progress
            </div>
          </div>
        </MDJCard>
        
        <MDJCard>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
              {accountsSets.filter(a => a.status === 'READY').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Ready
            </div>
          </div>
        </MDJCard>
        
        <MDJCard>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>
              {accountsSets.filter(a => a.status === 'LOCKED').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Completed
            </div>
          </div>
        </MDJCard>
      </div>

      <MDJCard 
        title="Accounts Production Sets" 
        subtitle="View and manage all statutory accounts in progress and completed"
      >
        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <MDJInput
              placeholder="Search by client name, ref, or company number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon="🔍"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              minWidth: '150px'
            }}
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="READY">Ready</option>
            <option value="LOCKED">Completed</option>
          </select>
        </div>

        {filteredAccountsSets.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 1rem',
            color: 'var(--text-muted)'
          }}>
            {accountsSets.length === 0 ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                  No Accounts Sets Yet
                </h3>
                <p style={{ marginBottom: '1.5rem' }}>
                  Create your first accounts production set to get started with statutory accounts preparation.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <MDJButton
                    variant="primary"
                    onClick={() => router.push('/accounts-production/select-client')}
                  >
                    Create First Accounts Set
                  </MDJButton>
                  <MDJButton
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                  >
                    Back to Dashboard
                  </MDJButton>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                  No matches found
                </h3>
                <p>No accounts sets match your current search and filter criteria.</p>
                <MDJButton
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  style={{ marginTop: '1rem' }}
                >
                  Clear Filters
                </MDJButton>
              </>
            )}
          </div>
        ) : (
          <MDJTable
            columns={columns}
            data={filteredAccountsSets}
            emptyMessage="No accounts sets found"
          />
        )}
      </MDJCard>

      {filteredAccountsSets.length > 0 && (
        <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Showing {filteredAccountsSets.length} of {accountsSets.length} accounts sets
        </div>
      )}
    </MDJShell>
  );
}
