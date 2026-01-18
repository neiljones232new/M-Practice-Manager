'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { AccountsProductionWizard } from '@/components/accounts-production/AccountsProductionWizard';
import { AccountsSet } from '@/lib/types';

export default function AccountsProductionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const accountsSetId = params?.id as string;

  const [accountsSet, setAccountsSet] = useState<AccountsSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountsSetId) return;

    let mounted = true;

    const loadAccountsSet = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await api.get<AccountsSet>(`/accounts-sets/${accountsSetId}`);
        
        if (mounted) {
          setAccountsSet(data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load accounts set');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAccountsSet();

    return () => {
      mounted = false;
    };
  }, [accountsSetId]);

  const handleAccountsSetUpdate = (updatedAccountsSet: AccountsSet) => {
    setAccountsSet(updatedAccountsSet);
  };

  if (loading) {
    return (
      <MDJShell
        pageTitle="Accounts Production"
        pageSubtitle="Loading accounts set..."
        showBack
        backHref="/clients"
        backLabel="Back to Clients"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
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
          <div style={{ color: 'var(--text-muted)' }}>Loading accounts set...</div>
        </div>
      </MDJShell>
    );
  }

  if (error || !accountsSet) {
    return (
      <MDJShell
        pageTitle="Accounts Production"
        pageSubtitle="Error loading accounts set"
        showBack
        backHref="/clients"
        backLabel="Back to Clients"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
          { label: 'Accounts Production' }
        ]}
      >
        <div className="card-mdj" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '.5rem' }}>
            {error || 'Accounts set not found'}
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
      pageTitle={`Accounts Production - ${accountsSet.sections.companyPeriod?.company.name || 'Client'}`}
      pageSubtitle={`${accountsSet.framework} accounts for period ending ${new Date(accountsSet.sections.companyPeriod?.period.endDate || accountsSet.period.endDate).toLocaleDateString('en-GB')}`}
      showBack
      backHref={`/clients/${accountsSet.clientId}`}
      backLabel="Back to Client"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Clients', href: '/clients' },
        { label: accountsSet.sections.companyPeriod?.company.name || 'Client', href: `/clients/${accountsSet.clientId}` },
        { label: 'Accounts Production' }
      ]}
      actions={[
        { 
          label: 'Preview', 
          onClick: () => {
            if (accountsSet.outputs.htmlUrl) {
              window.open(accountsSet.outputs.htmlUrl, '_blank');
            }
          }, 
          variant: 'outline' 
        },
        { 
          label: 'Generate PDF', 
          onClick: async () => {
            try {
              const result = await api.post(`/accounts-sets/${accountsSetId}/outputs`);
              if (result.pdfUrl) {
                window.open(result.pdfUrl, '_blank');
              }
            } catch (err) {
              console.error('Failed to generate PDF:', err);
            }
          }, 
          variant: 'primary' 
        }
      ]}
    >
      <AccountsProductionWizard
        accountsSet={accountsSet}
        onUpdate={handleAccountsSetUpdate}
      />
    </MDJShell>
  );
}
