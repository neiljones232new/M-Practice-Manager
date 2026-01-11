'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { MDJInput, MDJSelect, MDJButton, MDJCard } from '@/components/mdj-ui';

type AccountingFramework = 'MICRO_FRS105' | 'SMALL_FRS102_1A' | 'DORMANT';

interface Client {
  id: string;
  name: string;
  registeredNumber?: string;
  accountsLastMadeUpTo?: string | null;
  accountsNextDue?: string | null;
}

export default function NewAccountsProductionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    periodStart: '',
    periodEnd: '',
    framework: 'SMALL_FRS102_1A' as AccountingFramework,
    notFirstYear: false,
  });

  useEffect(() => {
    if (!clientId) {
      setError('No client ID provided');
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadClient = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const clientData = await api.get<Client>(`/clients/${clientId}`);
        
        if (mounted) {
          setClient(clientData);
          
          const toIso = (d: Date) => d.toISOString().split('T')[0];
          const getSuggestedPeriod = (yearEndIso?: string | null) => {
            if (!yearEndIso) return null;
            const end = new Date(`${yearEndIso}T00:00:00Z`);
            if (Number.isNaN(end.getTime())) return null;
            const start = new Date(end);
            start.setFullYear(end.getFullYear() - 1);
            start.setDate(start.getDate() + 1);
            return { start: toIso(start), end: toIso(end) };
          };

          // Set default period dates (use Companies House year end if present)
          const suggested = getSuggestedPeriod(clientData.accountsLastMadeUpTo);
          const now = new Date();
          const yearEnd = new Date(now.getFullYear(), 11, 31); // Dec 31
          const yearStart = new Date(now.getFullYear(), 0, 1); // Jan 1

          setForm(prev => ({
            ...prev,
            periodStart: suggested?.start || toIso(yearStart),
            periodEnd: suggested?.end || toIso(yearEnd),
          }));
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load client');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadClient();

    return () => {
      mounted = false;
    };
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!client) return;

    try {
      setCreating(true);
      setError(null);

      const accountsSet = await api.post('/accounts-sets', {
        clientId: client.id,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        framework: form.framework,
        ...(form.notFirstYear ? { isFirstYear: false } : {}),
      });

      // Navigate to the new accounts set
      router.push(`/accounts-production/${accountsSet.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create accounts set');
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <MDJShell
        pageTitle="New Accounts Production"
        pageSubtitle="Loading client details..."
        showBack
        backHref="/clients"
        backLabel="Back to Clients"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
          { label: 'New Accounts Production' }
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
          <div style={{ color: 'var(--text-muted)' }}>Loading client details...</div>
        </div>
      </MDJShell>
    );
  }

  if (error || !client) {
    return (
      <MDJShell
        pageTitle="New Accounts Production"
        pageSubtitle="Error loading client"
        showBack
        backHref="/clients"
        backLabel="Back to Clients"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
          { label: 'New Accounts Production' }
        ]}
      >
        <div className="card-mdj" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '.5rem' }}>
            {error || 'Client not found'}
          </div>
          <button className="btn-outline-primary" onClick={() => router.push('/clients')}>
            Back to Clients
          </button>
        </div>
      </MDJShell>
    );
  }

  return (
    <MDJShell
      pageTitle={`New Accounts Production - ${client.name}`}
      pageSubtitle="Create a new accounts production set"
      showBack
      backHref={`/clients/${client.id}`}
      backLabel="Back to Client"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Clients', href: '/clients' },
        { label: client.name, href: `/clients/${client.id}` },
        { label: 'New Accounts Production' }
      ]}
    >
      <MDJCard title="Create Accounts Set" subtitle="Set up a new accounts production for this client">
        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px' }}>
            {/* Client Info */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Client Information</h4>
              <div style={{ padding: '1rem', background: 'var(--surface-subtle)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{client.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Company Number: {client.registeredNumber || 'Not registered'}
                </div>
              </div>
            </div>

            {/* Accounting Period */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Accounting Period</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <MDJInput
                  type="date"
                  label="Period Start"
                  value={form.periodStart}
                  onChange={(e) => handleInputChange('periodStart', e.target.value)}
                  required
                />
                <MDJInput
                  type="date"
                  label="Period End"
                  value={form.periodEnd}
                  onChange={(e) => handleInputChange('periodEnd', e.target.value)}
                  required
                />
              </div>
              {client.accountsLastMadeUpTo && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Suggested from Companies House year end ({client.accountsLastMadeUpTo}).
                </div>
              )}
            </div>

            {/* Framework Selection */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Accounting Framework</h4>
              <MDJSelect
                label="Framework"
                value={form.framework}
                onChange={(e) => handleInputChange('framework', e.target.value)}
                required
                options={[
                  { value: 'MICRO_FRS105', label: 'Micro-entity (FRS 105)' },
                  { value: 'SMALL_FRS102_1A', label: 'Small company (FRS 102 Section 1A)' },
                  { value: 'DORMANT', label: 'Dormant company' },
                ]}
              />
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Choose the appropriate accounting framework based on the company size and status.
              </div>
            </div>

            {/* Comparatives */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Comparatives</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={form.notFirstYear}
                  onChange={(e) => setForm(prev => ({ ...prev, notFirstYear: e.target.checked }))}
                />
                <span>This is not the company’s first accounting period (enable comparatives)</span>
              </label>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                If a prior accounts set exists, we’ll copy prior-year figures and notes automatically.
              </div>
            </div>

            {error && (
              <div style={{ 
                padding: '0.75rem 1rem', 
                background: 'var(--status-danger-bg)', 
                border: '1px solid var(--status-danger-border)', 
                borderRadius: '6px',
                color: 'var(--danger)'
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem' }}>
              <MDJButton
                type="button"
                variant="outline"
                onClick={() => router.push(`/clients/${client.id}`)}
                disabled={creating}
              >
                Cancel
              </MDJButton>
              <MDJButton
                type="submit"
                variant="primary"
                loading={creating}
                disabled={!form.periodStart || !form.periodEnd || !form.framework}
              >
                {creating ? 'Creating...' : 'Create Accounts Set'}
              </MDJButton>
            </div>
          </div>
        </form>
      </MDJCard>
    </MDJShell>
  );
}
