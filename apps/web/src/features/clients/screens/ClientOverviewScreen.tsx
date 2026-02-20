'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';
import type { ClientContextWithParties, ClientStatus, ClientType } from '@/lib/types';
import ClientHeaderSection from '@/features/clients/components/ClientHeaderSection';
import IdentitySection from '@/features/clients/components/IdentitySection';
import PracticeOverviewSection from '@/features/clients/components/PracticeOverviewSection';
import RegulatorySettingsSection from '@/features/clients/components/RegulatorySettingsSection';
import CompaniesHouseSection from '@/features/clients/components/CompaniesHouseSection';

type ServiceWork = {
  id: string;
  kind?: string;
  status?: string;
  tasks?: Array<{ id: string; status?: string }>;
  compliance?: { id: string; status?: string; dueDate?: string; type?: string; source?: string } | null;
};

const isOpenTask = (status?: string) => {
  const normalized = String(status || '').toUpperCase();
  return normalized !== 'COMPLETED' && normalized !== 'CANCELLED';
};

const isPendingCompliance = (status?: string) => {
  const normalized = String(status || '').toUpperCase();
  return normalized !== 'FILED' && normalized !== 'EXEMPT';
};

const complianceBadgeTone = (status?: string) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'OVERDUE') return 'danger';
  if (normalized === 'FILED') return 'success';
  return 'warn';
};

const toDueSort = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;
  return date.getTime();
};

export default function ClientOverviewScreen() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const routeClientId = String(params?.id || '').trim();
  const clientId =
    routeClientId && routeClientId !== 'undefined' && routeClientId !== 'null'
      ? routeClientId
      : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [context, setContext] = useState<ClientContextWithParties | null>(null);
  const [serviceCount, setServiceCount] = useState(0);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [pendingComplianceCount, setPendingComplianceCount] = useState(0);
  const [pendingComplianceItems, setPendingComplianceItems] = useState<
    Array<{ id: string; status?: string; dueDate?: string; type?: string; source?: string; serviceId: string; serviceKind?: string }>
  >([]);
  const [syncing, setSyncing] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [staffOptions, setStaffOptions] = useState<Array<{ ref: string; fullName: string; role?: string }>>([]);

  const loadData = useCallback(async () => {
    if (!clientId) {
      setError('Invalid client route.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [staff, clientContext] = await Promise.all([
        api.get('/staff').catch(() => []),
        api.get<ClientContextWithParties>(`/clients/${clientId}/with-parties`),
      ]);

      const resolvedClientId = clientContext?.node?.id || clientId;
      const serviceWork = await api
        .get<ServiceWork[]>(`/clients/${resolvedClientId}/services`)
        .catch(() => []);

      const services = Array.isArray(serviceWork) ? serviceWork : [];
      const openTasks = services
        .flatMap((service) => (Array.isArray(service.tasks) ? service.tasks : []))
        .filter((task) => isOpenTask(task.status)).length;
      const pendingCompliance = services
        .map((service) => service.compliance)
        .filter((item) => item && isPendingCompliance(item.status)).length;
      const pendingItems = services
        .map((service) => {
          if (!service.compliance) return null;
          if (!isPendingCompliance(service.compliance.status)) return null;
          return {
            ...service.compliance,
            serviceId: service.id,
            serviceKind: service.kind,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => toDueSort(a?.dueDate) - toDueSort(b?.dueDate)) as Array<{
        id: string;
        status?: string;
        dueDate?: string;
        type?: string;
        source?: string;
        serviceId: string;
        serviceKind?: string;
      }>;

      setContext(clientContext);
      setStaffOptions(Array.isArray(staff) ? staff : []);
      setServiceCount(services.length);
      setOpenTaskCount(openTasks);
      setPendingComplianceCount(pendingCompliance);
      setPendingComplianceItems(pendingItems.slice(0, 5));
    } catch (e: any) {
      setError(e?.message || 'Failed to load client overview');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const staffSelectOptions = useMemo(() => {
    const base = (staffOptions || [])
      .filter((staff) => staff && staff.ref)
      .map((staff) => ({
        value: staff.ref,
        label: `${staff.fullName}${staff.role ? ` (${staff.role})` : ''}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: '', label: '—' }, ...base];
  }, [staffOptions]);

  const broadcastClientUpdated = (updatedClientId: string) => {
    try {
      const channel = new BroadcastChannel('mdj');
      channel.postMessage({ topic: 'clients:changed' });
      channel.postMessage({ topic: 'client:updated', clientId: updatedClientId });
      channel.close();
    } catch {
      // ignore broadcast failures
    }
  };

  const saveIdentity = async (payload: {
    name: string;
    type: ClientType;
    status: ClientStatus;
    registeredNumber: string | null;
    utrNumber: string | null;
    mainEmail: string | null;
    mainPhone: string | null;
  }) => {
    if (!context?.node?.id) return;
    await api.put(`/clients/${context.node.id}`, payload);
    setContext((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        node: {
          ...prev.node,
          ...payload,
          mainEmail: payload.mainEmail ?? undefined,
          mainPhone: payload.mainPhone ?? undefined,
        },
      };
    });
    setMessage('Identity updated.');
    broadcastClientUpdated(context.node.id);
  };

  const saveProfile = async (payload: Record<string, any>) => {
    if (!context?.node?.id) return;
    await api.put(`/clients/${context.node.id}/profile`, payload);
    setContext((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        profile: {
          ...(prev.profile || {}),
          ...payload,
        },
      };
    });
    setMessage('Profile updated.');
    broadcastClientUpdated(context.node.id);
  };

  const syncCompaniesHouse = async () => {
    if (!context?.node?.id || !context.node.registeredNumber) return;
    setSyncing(true);
    setMessage(null);
    setError(null);
    try {
      await api.post(`/companies-house/sync/${context.node.id}`);
      await loadData();
      setMessage('Companies House data synchronized.');
    } catch (e: any) {
      setError(e?.message || 'Failed to synchronize Companies House data.');
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!context?.node?.id) return;
    setGeneratingTasks(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post<{ created: number; services: number }>(`/tasks/generate/client/${context.node.id}`);
      const created = Number(res?.created || 0);
      setMessage(
        created > 0
          ? `Generated ${created} task${created === 1 ? '' : 's'}.`
          : 'No new tasks generated. Services may already have active tasks.',
      );
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Failed to generate tasks.');
    } finally {
      setGeneratingTasks(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!context?.node?.id || deleting) return;
    const ok = window.confirm('Delete this client? This cannot be undone.');
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/clients/${context.node.id}`);
      router.push('/clients');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete client.');
      setDeleting(false);
    }
  };

  const downloadClientCsv = () => {
    if (!context?.node) return;
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      const needsQuotes = /[",\n]/.test(s);
      const t = s.replace(/"/g, '""');
      return needsQuotes ? `"${t}"` : t;
    };

    const rows: string[] = [];
    rows.push(['id', 'clientRef', 'name', 'type', 'status', 'portfolioCode', 'registeredNumber', 'utrNumber', 'mainEmail', 'mainPhone', 'serviceCount', 'openTaskCount', 'pendingComplianceCount'].join(','));
    rows.push(
      [
        context.node.id,
        context.node.clientRef || '',
        context.node.name || '',
        context.node.type || '',
        context.node.status || '',
        context.node.portfolioCode || '',
        context.node.registeredNumber || '',
        context.node.utrNumber || '',
        context.node.mainEmail || '',
        context.node.mainPhone || '',
        serviceCount,
        openTaskCount,
        pendingComplianceCount,
      ]
        .map(esc)
        .join(','),
    );

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-${context.node.clientRef || context.node.id}-overview.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <MDJShell pageTitle="Client Overview" pageSubtitle="Loading..." showBack backHref="/clients" backLabel="Back to Clients">
        <div className="card-mdj" style={{ padding: '1rem' }}>Loading…</div>
      </MDJShell>
    );
  }

  if (error || !context?.node) {
    return (
      <MDJShell pageTitle="Client Overview" pageSubtitle="Unable to load client" showBack backHref="/clients" backLabel="Back to Clients">
        <div className="card-mdj" style={{ padding: '1rem', background: 'var(--status-danger-bg)' }}>
          <span style={{ color: 'var(--danger)' }}>{error || 'Client not found.'}</span>
        </div>
      </MDJShell>
    );
  }

  const client = context.node;
  const profile = context.profile || {};
  const clientRouteId = (() => {
    const candidates = [client.id, client.clientRef, clientId];
    for (const raw of candidates) {
      const value = String(raw || '').trim();
      if (!value || value === 'undefined' || value === 'null') continue;
      return value;
    }
    return '';
  })();
  const primaryTabs = [
    {
      key: 'overview',
      label: 'Overview',
      count: 0,
      href: clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/overview` : '#',
    },
    {
      key: 'work',
      label: 'Work',
      count: serviceCount + openTaskCount + pendingComplianceCount,
      href: clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/work` : '#',
    },
    {
      key: 'companies',
      label: 'Companies House',
      count: Number(profile?.directorCount || 0) + Number(profile?.pscCount || 0),
      href: clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/companies` : '#',
    },
  ];

  return (
    <MDJShell
      pageTitle={client.name}
      pageSubtitle="Overview"
      showBack
      backHref="/clients"
      backLabel="Back to Clients"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: client.name }]}
    >
      <div className="mdj-page">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn-outline-primary btn-sm"
              onClick={() => {
                if (!clientRouteId) return;
                router.push(`/clients/${encodeURIComponent(clientRouteId)}/edit`);
              }}
            >
              Edit Client
            </button>
            <button
              className="btn-outline-primary btn-sm"
              onClick={handleGenerateTasks}
              disabled={generatingTasks || serviceCount === 0}
            >
              {generatingTasks ? 'Generating…' : 'Generate Tasks'}
            </button>
            <button className="btn-outline-primary btn-sm" onClick={downloadClientCsv}>
              Export CSV
            </button>
            <button
              className="btn-outline-primary btn-sm"
              onClick={() => {
                if (!clientRouteId) return;
                router.push(`/clients/${encodeURIComponent(clientRouteId)}/report`);
              }}
            >
              Export Report
            </button>
          </div>
          <button className="btn-danger btn-sm" onClick={handleDeleteClient} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Client'}
          </button>
        </div>

        <nav className="mdj-tabs card-mdj" style={{ padding: 0, overflow: 'hidden', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-subtle)', padding: 0, background: 'var(--surface-table-header)', flexWrap: 'wrap' }}>
            {primaryTabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab ${tab.key === 'overview' ? 'active' : ''}`}
                onClick={() => {
                  if (!clientRouteId || tab.href === '#') return;
                  router.push(tab.href);
                }}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  background: tab.key === 'overview' ? 'var(--status-info-bg)' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: tab.key === 'overview' ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  color: tab.key === 'overview' ? 'var(--brand-primary-active)' : 'var(--text-secondary)',
                  fontWeight: tab.key === 'overview' ? 700 : 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>{tab.label}</span>
                <span className={`count badge ${tab.key === 'overview' ? 'primary' : 'default'}`} style={{ fontSize: '0.75rem' }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {message && (
        <div className="card-mdj" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{message}</span>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <ClientHeaderSection
          client={client}
          serviceCount={serviceCount}
          openTaskCount={openTaskCount}
          pendingComplianceCount={pendingComplianceCount}
        />

        <main
          className="grid2"
          style={{
            gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
            gap: '1rem',
            alignItems: 'start',
          }}
        >
          <section style={{ display: 'grid', gap: '1rem' }}>
            <IdentitySection client={client} onSave={saveIdentity} />

            <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <PracticeOverviewSection
                profile={profile}
                staffOptions={staffSelectOptions}
                onSave={saveProfile}
              />

              <RegulatorySettingsSection
                client={client}
                profile={profile}
                onSave={saveProfile}
              />
            </div>

            <CompaniesHouseSection
              client={client}
              profile={profile}
              syncing={syncing}
              onSync={syncCompaniesHouse}
            />
          </section>

          <aside>
            <section className="card-mdj" style={{ padding: '1rem', position: 'sticky', top: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Next Actions</h3>
              <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Focus on due compliance and workflow.
              </div>

              <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
                <a
                  href={clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/work` : '#'}
                  className="btn-outline-primary btn-sm"
                  onClick={(e) => {
                    if (!clientRouteId) e.preventDefault();
                  }}
                >
                  Open Work
                </a>
                <a
                  href={clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/work?workTab=compliance` : '#'}
                  className="btn-outline-primary btn-sm"
                  onClick={(e) => {
                    if (!clientRouteId) e.preventDefault();
                  }}
                >
                  Open Compliance
                </a>
                <a
                  href={clientRouteId ? `/clients/${encodeURIComponent(clientRouteId)}/companies` : '#'}
                  className="btn-outline-primary btn-sm"
                  onClick={(e) => {
                    if (!clientRouteId) e.preventDefault();
                  }}
                >
                  Open Companies House
                </a>
              </div>

              <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.6rem' }}>
                {pendingComplianceItems.length === 0 ? (
                  <div
                    className="card-mdj tight"
                    style={{ padding: '0.7rem', background: 'var(--surface-subtle)', color: 'var(--text-muted)' }}
                  >
                    No pending compliance items.
                  </div>
                ) : (
                  pendingComplianceItems.map((item) => (
                    <div
                      key={item.id}
                      className="card-mdj tight"
                      style={{ padding: '0.7rem', background: 'var(--surface-subtle)' }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                        {item.type?.replace(/_/g, ' ') || item.serviceKind || 'Compliance'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                        Due {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : '—'}
                      </div>
                      <span
                        className={`badge ${complianceBadgeTone(item.status)}`}
                        style={{ marginTop: 6, display: 'inline-flex' }}
                      >
                        {String(item.status || 'PENDING').replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </main>
      </div>
    </MDJShell>
  );
}
