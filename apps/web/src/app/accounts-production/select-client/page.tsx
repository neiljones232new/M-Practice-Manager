'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { MDJCard, MDJButton, MDJInput } from '@/components/mdj-ui';

interface Client {
  id: string;
  ref?: string;
  name: string;
  type: string;
  status: string;
  registeredNumber?: string;
  portfolioCode?: number;
}

export default function SelectClientPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadClients = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const clientsData = await api.get<Client[]>('/clients', {
          params: { status: 'ACTIVE', limit: '1000' }
        });
        
        if (mounted) {
          setClients(clientsData || []);
          setFilteredClients(clientsData || []);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load clients');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadClients();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.registeredNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const handleClientSelect = (client: Client) => {
    router.push(`/accounts-production/new?clientId=${client.id}`);
  };

  const getClientTypeLabel = (type: string) => {
    const typeLabels = {
      'COMPANY': 'Company',
      'INDIVIDUAL': 'Individual',
      'SOLE_TRADER': 'Sole Trader',
      'PARTNERSHIP': 'Partnership',
      'LLP': 'LLP',
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  if (loading) {
    return (
      <MDJShell
        pageTitle="Select Client"
        pageSubtitle="Choose a client for accounts production"
        showBack
        backHref="/accounts-production"
        backLabel="Back to Accounts Production"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Accounts Production', href: '/accounts-production' },
          { label: 'Select Client' }
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
          <div style={{ color: 'var(--text-muted)' }}>Loading clients...</div>
        </div>
      </MDJShell>
    );
  }

  if (error) {
    return (
      <MDJShell
        pageTitle="Select Client"
        pageSubtitle="Error loading clients"
        showBack
        backHref="/accounts-production"
        backLabel="Back to Accounts Production"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Accounts Production', href: '/accounts-production' },
          { label: 'Select Client' }
        ]}
      >
        <div className="card-mdj" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '.5rem' }}>
            {error}
          </div>
          <MDJButton
            variant="outline"
            onClick={() => router.push('/accounts-production')}
          >
            Back to Accounts Production
          </MDJButton>
        </div>
      </MDJShell>
    );
  }

  return (
    <MDJShell
      pageTitle="Select Client"
      pageSubtitle="Choose a client to create accounts production set"
      showBack
      backHref="/accounts-production"
      backLabel="Back to Accounts Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Accounts Production', href: '/accounts-production' },
        { label: 'Select Client' }
      ]}
    >
      <MDJCard 
        title="Select Client for Accounts Production" 
        subtitle="Choose an active client to create a new accounts production set"
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <MDJInput
            placeholder="Search clients by name, ref, or company number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon="🔍"
          />
        </div>

        {filteredClients.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem 1rem',
            color: 'var(--text-muted)'
          }}>
            {searchTerm ? (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                  No clients found
                </h3>
                <p>No clients match your search criteria. Try a different search term.</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👥</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                  No active clients
                </h3>
                <p>You need active clients to create accounts production sets.</p>
                <MDJButton
                  variant="primary"
                  onClick={() => router.push('/clients')}
                  style={{ marginTop: '1rem' }}
                >
                  Manage Clients
                </MDJButton>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filteredClients.map((client) => (
              <div
                key={client.id}
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: 'var(--surface)',
                }}
                className="hover:bg-gray-50 hover:border-gray-300"
                onClick={() => handleClientSelect(client)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {client.name}
                      </h4>
                      <span className="badge success" style={{ fontSize: '0.75rem' }}>
                        {client.status}
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {client.ref && (
                        <div>
                          <strong>Ref:</strong> {client.ref}
                        </div>
                      )}
                      <div>
                        <strong>Type:</strong> {getClientTypeLabel(client.type)}
                      </div>
                      {client.registeredNumber && (
                        <div>
                          <strong>Company No:</strong> {client.registeredNumber}
                        </div>
                      )}
                      {client.portfolioCode && (
                        <div>
                          <strong>Portfolio:</strong> #{client.portfolioCode}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <MDJButton
                    size="sm"
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClientSelect(client);
                    }}
                  >
                    Select
                  </MDJButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </MDJCard>

      {filteredClients.length > 0 && (
        <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Showing {filteredClients.length} of {clients.length} active clients
        </div>
      )}
    </MDJShell>
  );
}