'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Shell & Styles
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';
import { useBranding } from '@/contexts/BrandingContext';

/** -----------------------------
 *  Shared Types
 *  ----------------------------- */
interface IntegrationConfig {
  id: string;
  name: string;
  type: 'OPENAI' | 'COMPANIES_HOUSE' | 'HMRC' | 'GOV_NOTIFY' | 'XERO';
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  settings: Record<string, any>;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'TESTING';
  lastTested?: string;
  lastError?: string;
}

interface PracticeSettings {
  id: string;
  // Identity & Legal
  practiceName: string;
  tradingName?: string;
  legalForm?: 'LIMITED' | 'LLP' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'OTHER';
  companyNumber?: string;
  vatNumber?: string;

  // Contact Details
  practiceAddress?: string;
  mailingAddress?: string;
  practicePhone?: string;
  alternativePhone?: string;
  practiceEmail?: string;
  accountsEmail?: string;
  practiceWebsite?: string;

  // Key People
  primaryContact?: {
    name: string;
    role: string;
    email: string;
    phone?: string;
  };

  // Regulation & Memberships
  regulatedBodies?: Array<{
    body: string;
    membershipNumber: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
    expiryDate?: string;
  }>;

  // Professional Indemnity Insurance
  insurance?: {
    insurer: string;
    policyNumber: string;
    expiryDate: string;
    coverageLimit: string;
  };

  // Financial Defaults
  defaultCurrency?: string;
  invoiceTerms?: number; // days
  vatScheme?: 'STANDARD' | 'CASH' | 'FLAT_RATE';

  // Compliance Settings
  companiesHouseSync?: boolean;
  reminderCadence?: 'EMAIL' | 'SMS' | 'IN_APP';

  // UI Preferences
  timezone?: string;
  language?: string;

  defaultPortfolioCode: number;
  portfolios: Array<{
    code: number;
    name: string;
    description?: string;
    enabled: boolean;
    clientCount: number;
  }>;
  systemSettings: {
    backupRetentionDays: number;
    autoBackupEnabled: boolean;
    auditLogRetentionDays: number;
    defaultTaskAssignee?: string;
    defaultServiceFrequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
    taskGenerationWindowDays?: number;
  };
}

interface IntegrationTestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  details?: Record<string, any>;
}

interface PortfolioSummary {
  code: number;
  name: string;
  description?: string;
  enabled?: boolean;
  clientCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface PortfolioStatsSummary {
  totalPortfolios: number;
  totalClients: number;
  avgClientsPerPortfolio: number;
}

/** -----------------------------
 *  Portfolio Management (refit to mdjnew.ui.css)
 *  ----------------------------- */
function PortfolioManagement() {
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMergeForm, setShowMergeForm] = useState(false);
  const [selectedPortfolios, setSelectedPortfolios] = useState<number[]>([]);

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [portfoliosData, statsData] = await Promise.all([
        api.get('/portfolios'),
        api.get('/portfolios/stats'),
      ]);

      const orderedPortfolios: PortfolioSummary[] = (Array.isArray(portfoliosData) ? portfoliosData : [])
        .map((portfolio: PortfolioSummary) => ({
          ...portfolio,
          createdAt: portfolio.createdAt || new Date().toISOString(),
        }))
        .sort((a, b) => a.code - b.code);

      setPortfolios(orderedPortfolios);
      const stats = (statsData as any)?.data ?? statsData ?? null;
      setPortfolioStats(stats as any);
      setSelectedPortfolios(prev => prev.filter(code => orderedPortfolios.some(p => p.code === code)));
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load portfolios right now.');
      // Fallback to mock data
      const fallbackPortfolios: PortfolioSummary[] = [
        {
          code: 1,
          name: 'Main Portfolio',
          description: 'Primary client portfolio',
          clientCount: 0,
          createdAt: new Date().toISOString(),
        },
      ];
      setPortfolios(fallbackPortfolios);
      setPortfolioStats({
        totalPortfolios: fallbackPortfolios.length,
        totalClients: 0,
        avgClientsPerPortfolio: 0,
      });
      setSelectedPortfolios(prev => prev.filter(code => fallbackPortfolios.some(p => p.code === code)));
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async (formData: FormData) => {
    try {
      const rawCode = formData.get('code');
      const parsedCode = rawCode ? parseInt(rawCode.toString(), 10) : undefined;
      const cleanedCode = typeof parsedCode === 'number' && Number.isFinite(parsedCode) ? parsedCode : undefined;
      const name = formData.get('name')?.toString().trim() || '';
      const description = formData.get('description')?.toString().trim();

      await api.post('/portfolios', {
        name,
        description: description || undefined,
        code: cleanedCode,
      });

      await loadPortfolios();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create portfolio:', error);
      const message = error instanceof Error ? error.message : 'Please try again.';
      alert(`Failed to create portfolio. ${message}`);
    }
  };

  const deletePortfolio = async (code: number) => {
    if (!confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/portfolios/${code}`);
      setSelectedPortfolios(prev => prev.filter(c => c !== code));
      await loadPortfolios();
    } catch (error) {
      console.error('Failed to delete portfolio:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete portfolio: ${message}`);
    }
  };

  const mergePortfolios = async (formData: FormData) => {
    try {
      const targetCode = formData.get('targetPortfolio');
      const newName = formData.get('newPortfolioName')?.toString().trim() || '';

      await api.post('/portfolios/merge', {
        sourcePortfolioCodes: selectedPortfolios,
        targetPortfolioCode: targetCode ? parseInt(targetCode.toString(), 10) : undefined,
        newPortfolioName: newName || undefined,
      });

      await loadPortfolios();
      setShowMergeForm(false);
      setSelectedPortfolios([]);
    } catch (error) {
      console.error('Failed to merge portfolios:', error);
      const message = error instanceof Error ? error.message : 'Please try again.';
      alert(`Failed to merge portfolios. ${message}`);
    }
  };

  if (loading) {
    return (
      <div className="center-stack py-8">
        <div className="spinner mdj mx-auto mb-2" />
        <p className="text-dim">Loading portfolios...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Stats */}
      {portfolioStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-details">
                <div className="stat-value">{portfolioStats.totalPortfolios}</div>
                <div className="stat-title">Total Portfolios</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-details">
                <div className="stat-value">{portfolioStats.totalClients}</div>
                <div className="stat-title">Total Clients</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-details">
                <div className="stat-value">{portfolioStats.avgClientsPerPortfolio}</div>
                <div className="stat-title">Avg Clients/Portfolio</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && <div className="alert-warn">{errorMessage}</div>}

      {/* Header + Actions */}
      <div className="card-mdj">
        <div className="card-header">
          <h3>Portfolio Management</h3>
          <div className="row gap-2">
            <button className="btn-gold" onClick={() => setShowCreateForm(true)}>
              Add Portfolio
            </button>
            {selectedPortfolios.length > 1 && (
              <button className="btn-outline-gold" onClick={() => setShowMergeForm(true)}>
                Merge Selected ({selectedPortfolios.length})
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="table-mdj">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    onChange={e => {
                      if (e.target.checked) setSelectedPortfolios(portfolios.map(p => p.code));
                      else setSelectedPortfolios([]);
                    }}
                    checked={selectedPortfolios.length === portfolios.length && portfolios.length > 0}
                  />
                </th>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Clients</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {portfolios.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-dim py-6">
                    No portfolios found yet. Create one to start organising clients.
                  </td>
                </tr>
              )}
              {portfolios.map(p => (
                <tr key={p.code}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPortfolios.includes(p.code)}
                      onChange={e => {
                        if (e.target.checked) setSelectedPortfolios([...selectedPortfolios, p.code]);
                        else setSelectedPortfolios(selectedPortfolios.filter(c => c !== p.code));
                      }}
                    />
                  </td>
                  <td className="mono text-gold">{p.code}</td>
                  <td className="text-strong">{p.name}</td>
                  <td className="text-dim">{p.description || '—'}</td>
                  <td className="text-dim">{p.clientCount}</td>
                  <td className="text-dim">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="row gap-2">
                      <button
                        className="btn-outline-gold btn-xs"
                        onClick={() => window.open(`/settings/portfolios/${p.code}`, '_blank')}
                      >
                        View
                      </button>
                      <button
                        className="btn-outline-gold btn-xs danger"
                        onClick={() => deletePortfolio(p.code)}
                        disabled={p.clientCount > 0}
                        title={p.clientCount > 0 ? 'Cannot delete portfolio with clients' : 'Delete portfolio'}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Portfolio Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="card-mdj modal-card">
            <div className="card-header">
              <h3>Create New Portfolio</h3>
              <button className="icon-close" onClick={() => setShowCreateForm(false)}>
                ×
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                createPortfolio(new FormData(e.currentTarget));
              }}
            >
              <div className="form-group">
                <label>Portfolio Name *</label>
                <input type="text" name="name" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" rows={3} />
              </div>
              <div className="form-group">
                <label>Portfolio Code (optional)</label>
                <input type="number" name="code" min={1} placeholder="Auto-generated if not specified" />
              </div>
              <div className="row end gap-2">
                <button type="button" className="btn-outline-gold" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-gold">
                  Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Portfolios Modal */}
      {showMergeForm && (
        <div className="modal-overlay">
          <div className="card-mdj modal-card">
            <div className="card-header">
              <h3>Merge Portfolios</h3>
              <button className="icon-close" onClick={() => setShowMergeForm(false)}>
                ×
              </button>
            </div>

            <div className="alert-warn mb-3">
              Merging will move all clients from selected portfolios to the target. Source portfolios will be deleted.
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                mergePortfolios(new FormData(e.currentTarget));
              }}
            >
              <div className="form-group">
                <label>Selected Portfolios to Merge:</label>
                <div className="surface-light p-2 rounded">
                  {selectedPortfolios.map(code => {
                    const portfolio = portfolios.find(p => p.code === code);
                    if (!portfolio) return null;
                    return (
                      <div key={code} className="text-sm mb-1">
                        {portfolio.code}: {portfolio.name} ({portfolio.clientCount} clients)
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label>Merge Into Existing Portfolio:</label>
                <select name="targetPortfolio">
                  <option value="">Select existing portfolio...</option>
                  {portfolios
                    .filter(p => !selectedPortfolios.includes(p.code))
                    .map(p => (
                      <option key={p.code} value={p.code}>
                        {p.code}: {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="text-center text-dim my-2">— OR —</div>

              <div className="form-group">
                <label>Create New Portfolio:</label>
                <input type="text" name="newPortfolioName" placeholder="New portfolio name..." />
              </div>

              <div className="row end gap-2">
                <button type="button" className="btn-outline-gold" onClick={() => setShowMergeForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-gold">
                  Merge Portfolios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** -----------------------------
 *  Settings Page
 *  ----------------------------- */
export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedLogo, updateLogo, resetLogo, isCustomLogo } = useBranding();
  const [activeTab, setActiveTab] = useState<'practice' | 'portfolios' | 'integrations' | 'system' | 'monitoring'>('practice');
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [practiceSettings, setPracticeSettings] = useState<PracticeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, IntegrationTestResult>>({});
  const [healthDashboard, setHealthDashboard] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Initialize active tab from query parameter (?tab=portfolios|practice|integrations|system|monitoring)
  useEffect(() => {
    const t = searchParams?.get('tab');
    if (!t) return;
    const allowed = new Set(['practice', 'portfolios', 'integrations', 'system', 'monitoring']);
    if (allowed.has(t)) setActiveTab(t as any);
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Integrations
      let loadedIntegrations: IntegrationConfig[] = [];
      try {
        loadedIntegrations = await api.get('/integrations');
      } catch {
        loadedIntegrations = [
          { id: '1', name: 'OpenAI GPT', type: 'OPENAI', enabled: false, status: 'DISCONNECTED', settings: {} },
          { id: '2', name: 'Companies House API', type: 'COMPANIES_HOUSE', enabled: false, status: 'DISCONNECTED', settings: {} },
          { id: '3', name: 'HMRC API', type: 'HMRC', enabled: false, status: 'DISCONNECTED', settings: {} },
          { id: '4', name: 'GOV.UK Notify', type: 'GOV_NOTIFY', enabled: false, status: 'DISCONNECTED', settings: {} },
        ];
      }

      // Practice Settings
      let loadedPracticeSettings: PracticeSettings;
      try {
        loadedPracticeSettings = await api.get('/integrations/settings/practice');
      } catch {
        loadedPracticeSettings = {
          id: '1',
          practiceName: 'MDJ Practice',
          tradingName: 'MDJ Accounting Services',
          legalForm: 'LIMITED',
          companyNumber: '12345678',
          vatNumber: 'GB999999973',
          practiceAddress: '123 Business Street\nLondon, UK\nSW1A 1AA',
          practicePhone: '+44 20 1234 5678',
          alternativePhone: '+44 20 1234 5679',
          practiceEmail: 'admin@mdjpractice.com',
          accountsEmail: 'accounts@mdjpractice.com',
          practiceWebsite: 'https://mdjpractice.com',
          primaryContact: {
            name: 'John Smith',
            role: 'Managing Director',
            email: 'john.smith@mdjpractice.com',
            phone: '+44 20 1234 5680',
          },
          regulatedBodies: [
            { body: 'ACCA', membershipNumber: 'ACC12345', status: 'ACTIVE', expiryDate: '2025-12-31' },
          ],
          insurance: {
            insurer: 'Professional Indemnity Insurance Ltd',
            policyNumber: 'PII123456',
            expiryDate: '2025-06-30',
            coverageLimit: '£1,000,000',
          },
          defaultCurrency: 'GBP',
          invoiceTerms: 30,
          vatScheme: 'STANDARD',
          companiesHouseSync: true,
          reminderCadence: 'EMAIL',
          timezone: 'Europe/London',
          language: 'en-GB',
          defaultPortfolioCode: 1,
          portfolios: [
            {
              code: 1,
              name: 'Main Portfolio',
              description: 'Primary client portfolio',
              enabled: true,
              clientCount: 0,
            },
          ],
          systemSettings: {
            backupRetentionDays: 30,
            autoBackupEnabled: true,
            auditLogRetentionDays: 90,
            defaultTaskAssignee: 'Admin',
            defaultServiceFrequency: 'ANNUAL',
          },
        };
      }

      // Monitoring
      try {
        const healthData = await api.get('/integrations/monitoring/dashboard');
        setHealthDashboard(healthData);
      } catch {}
      try {
        const usageData = await api.get('/integrations/monitoring/usage');
        setUsageStats(Array.isArray(usageData) ? usageData : []);
      } catch {}

      setIntegrations(loadedIntegrations);
      setPracticeSettings(loadedPracticeSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePracticeSettings = async (updates: Partial<PracticeSettings>) => {
    if (!practiceSettings) return;
    try {
      setSaving(true);
      const updated = await api.put<PracticeSettings>('/integrations/settings/practice', updates);
      setPracticeSettings(updated);
      alert('Practice settings saved successfully!');
    } catch (error: any) {
      console.error('Failed to update practice settings:', error);
      alert(`Failed to save practice settings: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const updateIntegration = async (id: string, updates: Partial<IntegrationConfig>) => {
    try {
      setSaving(true);
      const updated = await api.put<IntegrationConfig>(`/integrations/${id}`, updates);
      setIntegrations(prev => prev.map(i => (i.id === id ? updated : i)));
      const integration = integrations.find(i => i.id === id);
      if (integration) alert(`${integration.name} settings saved successfully!`);
    } catch (error) {
      console.error('Failed to update integration:', error);
      alert('Failed to save integration settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const testIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;
    try {
      setTesting(id);
      setIntegrations(prev =>
        prev.map(int => (int.id === id ? { ...int, status: 'TESTING' } : int)),
      );
      const testResult = await api.post<IntegrationTestResult>(`/integrations/${id}/test`);
      setTestResults(prev => ({ ...prev, [id]: testResult as IntegrationTestResult }));
      const newStatus = testResult.success ? 'CONNECTED' : 'ERROR';
      setIntegrations(prev =>
        prev.map(int =>
          int.id === id
            ? {
                ...int,
                status: newStatus,
                lastTested: new Date().toISOString(),
                lastError: testResult.error,
              }
            : int,
        ),
      );
      alert(
        testResult.success
          ? `✅ ${integration.name} connection test successful! (${testResult.responseTime}ms)`
          : `❌ ${integration.name} connection test failed: ${testResult.error}`,
      );
    } catch (error: any) {
      console.error('Failed to test integration:', error);
      setIntegrations(prev =>
        prev.map(int =>
          int.id === id
            ? {
                ...int,
                status: 'ERROR',
                lastError: error?.message || 'Test failed',
              }
            : int,
        ),
      );
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, responseTime: 0, error: error?.message || 'Test failed' },
      }));
      alert(`❌ ${integration.name} test failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setTesting(null);
    }
  };

  const toggleIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;
    try {
      const updated = await api.post<IntegrationConfig>(`/integrations/${id}/toggle`);
      setIntegrations(prev => prev.map(int => (int.id === id ? updated : int)));
      alert(`${integration.name} has been ${updated.enabled ? 'enabled' : 'disabled'} successfully.`);
    } catch (error) {
      console.error('Failed to toggle integration:', error);
      alert('Failed to toggle integration. Please try again.');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'chip success';
      case 'TESTING':
        return 'chip warn';
      case 'ERROR':
        return 'chip danger';
      default:
        return 'chip';
    }
  };

  // Xero connect button logic
  const connectXero = async () => {
    try {
      // This hits /api/v1/auth/xero/connect behind the scenes
      const res = await api.get<{ url: string }>('/auth/xero/connect');
      // Depending on how api is implemented, res might already be the data
      const url = (res as any)?.url ?? (res as any)?.data?.url;
      if (!url) {
        alert('Xero connection URL was not returned from the server.');
        return;
      }
      window.location.href = url;
    } catch (error: any) {
      console.error('Failed to start Xero connect:', error);
      alert(error?.message || 'Failed to start Xero connection. Please try again.');
    }
  };

  if (loading) {
    return (
      <MDJShell
        pageTitle="Settings"
        pageSubtitle="Configure your practice settings and integrations"
        showBack
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      >
        <div className="page-content">
          <div className="center-stack py-12">
            <div className="spinner mdj mx-auto mb-3" />
            <p>Loading settings...</p>
          </div>
        </div>
      </MDJShell>
    );
  }

  return (
    <MDJShell
      pageTitle="Settings"
      pageSubtitle="Configure your practice settings and integrations"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings' },
      ]}
    >
      {/* Centered content container */}
      <div className="page-content">
        {/* Tabs */}
        <div className="tabs-mdj mb-6">
          <button
            className={activeTab === 'practice' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('practice')}
          >
            Practice Details
          </button>
          <button
            className={activeTab === 'portfolios' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('portfolios')}
          >
            Portfolios
          </button>
          <button
            className={activeTab === 'integrations' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('integrations')}
          >
            Integrations
          </button>
          <button
            className={activeTab === 'system' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('system')}
          >
            System Settings
          </button>
          <button
            className={activeTab === 'monitoring' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('monitoring')}
          >
            Monitoring
          </button>
        </div>

        {/* Practice Details */}
        {activeTab === 'practice' && practiceSettings && (
          <div className="settings-grid-two">
            {/* Branding / Logo */}
            <div className="card-mdj">
              <h3>Branding</h3>
              <p className="text-dim">
                Upload your practice logo for the top bar and printed reports. MDJ Assist will
                continue to use the MDJ lion.
              </p>
              <div className="row gap-2" style={{ alignItems: 'center', marginTop: '.5rem' }}>
                <img
                  src={resolvedLogo}
                  alt="Current Logo"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        updateLogo(String(reader.result));
                      } catch {}
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {isCustomLogo && (
                  <button
                    type="button"
                    className="btn-outline-gold"
                    onClick={() => resetLogo()}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Identity & Legal */}
            <div className="card-mdj">
              <h3>Identity &amp; Legal Information</h3>
              <form
                className="form-grid mt-3"
                onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  updatePracticeSettings({
                    practiceName: fd.get('practiceName') as string,
                    tradingName: (fd.get('tradingName') as string) || undefined,
                    legalForm: (fd.get('legalForm') as any) || undefined,
                    companyNumber: (fd.get('companyNumber') as string) || undefined,
                    vatNumber: (fd.get('vatNumber') as string) || undefined,
                  });
                }}
              >
                <div className="form-group">
                  <label>Practice Name *</label>
                  <input
                    name="practiceName"
                    defaultValue={practiceSettings.practiceName}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Trading Name</label>
                  <input name="tradingName" defaultValue={practiceSettings.tradingName || ''} />
                </div>
                <div className="form-group">
                  <label>Legal Form</label>
                  <select name="legalForm" defaultValue={practiceSettings.legalForm || ''}>
                    <option value="">Select...</option>
                    <option value="LIMITED">Limited Company</option>
                    <option value="LLP">Limited Liability Partnership</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="SOLE_TRADER">Sole Trader</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Company Number</label>
                  <input
                    name="companyNumber"
                    placeholder="12345678"
                    defaultValue={practiceSettings.companyNumber || ''}
                  />
                </div>
                <div className="form-group">
                  <label>VAT Number</label>
                  <input
                    name="vatNumber"
                    placeholder="GB999999973"
                    defaultValue={practiceSettings.vatNumber || ''}
                  />
                </div>

                <button type="submit" className="btn-gold">
                  {saving ? 'Saving...' : 'Save Identity & Legal'}
                </button>
              </form>
            </div>

            {/* Contact Details */}
            <div className="card-mdj">
              <h3>Contact Details</h3>
              <form
                className="form-grid mt-3"
                onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  updatePracticeSettings({
                    practiceAddress: (fd.get('practiceAddress') as string) || undefined,
                    practicePhone: (fd.get('practicePhone') as string) || undefined,
                    practiceEmail: (fd.get('practiceEmail') as string) || undefined,
                    practiceWebsite: (fd.get('practiceWebsite') as string) || undefined,
                  });
                }}
              >
                <div className="form-group">
                  <label>Primary Office Address *</label>
                  <textarea
                    name="practiceAddress"
                    rows={3}
                    placeholder="Street, City, Postcode, Country"
                    defaultValue={practiceSettings.practiceAddress || ''}
                  />
                </div>

                <div className="form-group">
                  <label>Main Phone *</label>
                  <input
                    name="practicePhone"
                    type="tel"
                    placeholder="+44 20 1234 5678"
                    defaultValue={practiceSettings.practicePhone || ''}
                  />
                </div>
                <div className="form-group">
                  <label>General Email *</label>
                  <input
                    name="practiceEmail"
                    type="email"
                    placeholder="info@practice.com"
                    defaultValue={practiceSettings.practiceEmail || ''}
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    name="practiceWebsite"
                    type="url"
                    placeholder="https://practice.com"
                    defaultValue={practiceSettings.practiceWebsite || ''}
                  />
                </div>

                <button type="submit" className="btn-gold">
                  {saving ? 'Saving...' : 'Save Contact Details'}
                </button>
              </form>
            </div>

            {/* Primary Contact */}
            <div className="card-mdj">
              <h3>Primary Contact</h3>
              <form
                className="form-grid mt-3"
                onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  updatePracticeSettings({
                    primaryContact: {
                      name: fd.get('contactName') as string,
                      role: fd.get('contactRole') as string,
                      email: fd.get('contactEmail') as string,
                      phone: (fd.get('contactPhone') as string) || undefined,
                    },
                  });
                }}
              >
                <div className="form-group">
                  <label>Contact Name *</label>
                  <input
                    name="contactName"
                    required
                    placeholder="John Smith"
                    defaultValue={practiceSettings.primaryContact?.name || ''}
                  />
                </div>
                <div className="form-group">
                  <label>Role/Title *</label>
                  <input
                    name="contactRole"
                    required
                    placeholder="Managing Director"
                    defaultValue={practiceSettings.primaryContact?.role || ''}
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    name="contactEmail"
                    type="email"
                    required
                    placeholder="john.smith@practice.com"
                    defaultValue={practiceSettings.primaryContact?.email || ''}
                  />
                </div>
                <div className="form-group">
                  <label>Direct Phone</label>
                  <input
                    name="contactPhone"
                    type="tel"
                    placeholder="+44 20 1234 5680"
                    defaultValue={practiceSettings.primaryContact?.phone || ''}
                  />
                </div>

                <button type="submit" className="btn-gold">
                  {saving ? 'Saving...' : 'Save Primary Contact'}
                </button>
              </form>
            </div>

            {/* Professional Memberships */}
            <div className="card-mdj">
              <h3>Professional Memberships</h3>
              <form
                className="form-grid mt-3"
                onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const memberships: Array<{
                    body: string;
                    membershipNumber: string;
                    status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
                    expiryDate?: string;
                  }> = [];
                  let index = 0;
                  while (fd.get(`body_${index}`)) {
                    memberships.push({
                      body: fd.get(`body_${index}`) as string,
                      membershipNumber: fd.get(`membershipNumber_${index}`) as string,
                      status: fd.get(`status_${index}`) as any,
                      expiryDate: (fd.get(`expiryDate_${index}`) as string) || undefined,
                    });
                    index++;
                  }
                  updatePracticeSettings({ regulatedBodies: memberships });
                }}
              >
                {practiceSettings.regulatedBodies && practiceSettings.regulatedBodies.length > 0 ? (
                  <div className="space-y-3">
                    {practiceSettings.regulatedBodies.map((body, index) => (
                      <div key={index} className="panel">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="form-group">
                            <label>Professional Body *</label>
                            <select
                              name={`body_${index}`}
                              defaultValue={body.body}
                              required
                            >
                              <option value="">Select...</option>
                              <option value="ACCA">ACCA</option>
                              <option value="ACA">ACA (ICAEW)</option>
                              <option value="ICAS">ICAS</option>
                              <option value="ICAI">ICAI</option>
                              <option value="AAT">AAT</option>
                              <option value="ATT">ATT</option>
                              <option value="CIOT">CIOT</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Membership Number *</label>
                            <input
                              name={`membershipNumber_${index}`}
                              defaultValue={body.membershipNumber}
                              required
                              placeholder="ACC12345"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="form-group">
                            <label>Status</label>
                            <select name={`status_${index}`} defaultValue={body.status}>
                              <option value="ACTIVE">Active</option>
                              <option value="SUSPENDED">Suspended</option>
                              <option value="EXPIRED">Expired</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Expiry Date</label>
                            <input
                              type="date"
                              name={`expiryDate_${index}`}
                              defaultValue={body.expiryDate}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty dashed">
                    <p>No professional memberships added yet.</p>
                    <p className="text-sm text-dim">
                      Add your professional body memberships to track compliance.
                    </p>
                  </div>
                )}

                <div className="row gap-2">
                  <button type="submit" className="btn-gold">
                    {saving ? 'Saving...' : 'Save Memberships'}
                  </button>
                  <button
                    type="button"
                    className="btn-outline-gold"
                    onClick={() => {
                      const next = [
                        ...(practiceSettings?.regulatedBodies || []),
                        {
                          body: '',
                          membershipNumber: '',
                          status: 'ACTIVE' as const,
                          expiryDate: undefined,
                        },
                      ];
                      updatePracticeSettings({ regulatedBodies: next });
                    }}
                  >
                    Add Membership
                  </button>
                </div>
              </form>
            </div>

            {/* Insurance */}
            <div className="card-mdj">
              <h3>Professional Indemnity Insurance</h3>
              <form
                className="form-grid mt-3"
                onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  updatePracticeSettings({
                    insurance: {
                      insurer: fd.get('insurer') as string,
                      policyNumber: fd.get('policyNumber') as string,
                      expiryDate: fd.get('expiryDate') as string,
                      coverageLimit: fd.get('coverageLimit') as string,
                    },
                  });
                }}
              >
                <div className="form-group">
                  <label>Insurance Company *</label>
                  <input
                    name="insurer"
                    required
                    placeholder="Professional Indemnity Insurance Ltd"
                    defaultValue={practiceSettings.insurance?.insurer || ''}
                  />
                </div>
                <div className="form-group">
                  <label>Policy Number *</label>
                  <input
                    name="policyNumber"
                    required
                    placeholder="PII123456"
                    defaultValue={practiceSettings.insurance?.policyNumber || ''}
                  />
                </div>
                <div className="form-group">
                  <label>Coverage Limit *</label>
                  <select
                    name="coverageLimit"
                    required
                    defaultValue={practiceSettings.insurance?.coverageLimit || ''}
                  >
                    <option value="">Select coverage...</option>
                    <option value="£100,000">£100,000</option>
                    <option value="£250,000">£250,000</option>
                    <option value="£500,000">£500,000</option>
                    <option value="£1,000,000">£1,000,000</option>
                    <option value="£2,000,000">£2,000,000</option>
                    <option value="£5,000,000">£5,000,000</option>
                    <option value="£10,000,000">£10,000,000</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    required
                    defaultValue={practiceSettings.insurance?.expiryDate || ''}
                  />
                </div>

                <button type="submit" className="btn-gold">
                  {saving ? 'Saving...' : 'Save Insurance Details'}
                </button>
              </form>
            </div>

            {/* Financial Defaults */}
            <div className="card-mdj">
              <h3>Financial Defaults</h3>
              <form
                className="form-grid mt-3"
                onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  updatePracticeSettings({
                    defaultCurrency: (fd.get('defaultCurrency') as string) || undefined,
                    invoiceTerms: fd.get('invoiceTerms')
                      ? parseInt(fd.get('invoiceTerms') as string)
                      : undefined,
                    vatScheme: (fd.get('vatScheme') as any) || undefined,
                  });
                }}
              >
                <div className="form-group">
                  <label>Default Currency</label>
                  <select
                    name="defaultCurrency"
                    defaultValue={practiceSettings.defaultCurrency || 'GBP'}
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Invoice Terms (days)</label>
                  <input
                    name="invoiceTerms"
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={practiceSettings.invoiceTerms || 30}
                  />
                </div>
                <div className="form-group">
                  <label>VAT Scheme</label>
                  <select
                    name="vatScheme"
                    defaultValue={practiceSettings.vatScheme || 'STANDARD'}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="CASH">Cash Accounting</option>
                    <option value="FLAT_RATE">Flat Rate</option>
                  </select>
                </div>

                <button type="submit" className="btn-gold">
                  {saving ? 'Saving...' : 'Save Financial Defaults'}
                </button>
              </form>
            </div>

            {/* Compliance & Preferences */}
            <div className="card-mdj">
              <h3>Compliance &amp; Preferences</h3>
              <form
                className="form-grid mt-3"
                onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  updatePracticeSettings({
                    companiesHouseSync: fd.get('companiesHouseSync') === 'on',
                    reminderCadence: (fd.get('reminderCadence') as any) || undefined,
                    timezone: (fd.get('timezone') as string) || undefined,
                    language: (fd.get('language') as string) || undefined,
                  });
                }}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      name="companiesHouseSync"
                      defaultChecked={practiceSettings.companiesHouseSync}
                    />
                    <span>Enable Companies House sync</span>
                  </label>

                  <div className="form-group">
                    <label>Reminder Preference</label>
                    <select
                      name="reminderCadence"
                      defaultValue={practiceSettings.reminderCadence || 'EMAIL'}
                    >
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="IN_APP">In-App Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label>Timezone</label>
                    <select
                      name="timezone"
                      defaultValue={practiceSettings.timezone || 'Europe/London'}
                    >
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Dublin">Dublin (GMT/IST)</option>
                      <option value="America/New_York">New York (EST/EDT)</option>
                      <option value="Europe/Paris">Paris (CET/CEST)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Language</label>
                    <select
                      name="language"
                      defaultValue={practiceSettings.language || 'en-GB'}
                    >
                      <option value="en-GB">English (UK)</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-IE">English (Ireland)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-gold">
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Portfolios */}
        {activeTab === 'portfolios' && (
          <div className="content-grid">
            <PortfolioManagement />

            {/* Bulk Import */}
            <div className="card-mdj">
              <div className="card-header">
                <h3>Bulk Import Clients (CSV)</h3>
                <div className="row gap-2">
                  <button
                    className="btn-outline-gold"
                    onClick={async () => {
                      try {
                        const csv = await api.get<string>('/clients/import/template.csv');
                        const blob = new Blob([csv], {
                          type: 'text/csv;charset=utf-8;',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'clients-import-template.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        alert('Failed to download template');
                      }
                    }}
                  >
                    Download CSV Template
                  </button>
                </div>
              </div>
              <p className="text-dim">
                The template includes a “Portfolio Code” column. If omitted, clients default to
                portfolio 1.
              </p>
              <div className="row gap-2" style={{ marginTop: '.5rem' }}>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const res = await api.post<{ created: number; errors?: any[] }>(
                        '/clients/import/csv',
                        { csv: text },
                      );
                      alert(
                        `Imported ${res.created} clients${
                          res.errors?.length ? `, ${res.errors.length} errors` : ''
                        }.`,
                      );
                    } catch (err: any) {
                      alert(err?.message || 'Import failed');
                    } finally {
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Integrations */}
        {activeTab === 'integrations' && (
          <div className="content-grid">
            {integrations.length === 0 && (
              <div className="card-mdj">
                <h3>Integrations</h3>
                <p className="text-dim">
                  No integrations found. Use this area to configure Companies House, OpenAI and other
                  service keys.
                </p>
              </div>
            )}

            {integrations.map(int => (
              <div key={int.id} className="card-mdj">
                <div className="card-header">
                  <h3>{int.name}</h3>
                  <span className={getStatusClass(int.status)}>{int.status}</span>
                </div>
                <form
                  className="form-grid mt-2"
                  onSubmit={e => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const updates: Partial<IntegrationConfig> = {
                      enabled: fd.get('enabled') === 'on',
                      apiKey: (fd.get('apiKey') as string) || undefined,
                      baseUrl: (fd.get('baseUrl') as string) || undefined,
                      settings: {
                        ...(int.settings || {}),
                        ...(int.type === 'OPENAI'
                          ? {
                              model:
                                (fd.get('openai_model') as string) ||
                                (int.settings?.model || ''),
                            }
                          : {}),
                        ...(int.type === 'COMPANIES_HOUSE'
                          ? {
                              env:
                                (fd.get('ch_env') as string) ||
                                (int.settings?.env || 'production'),
                              perMinute: parseInt(
                                String(
                                  fd.get('ch_perMinute') ||
                                    int.settings?.perMinute ||
                                    600,
                                ),
                                10,
                              ),
                            }
                          : {}),
                      },
                    };
                    updateIntegration(int.id, updates);
                  }}
                >
                  <label className="row gap-2" style={{ alignItems: 'center' }}>
                    <input name="enabled" type="checkbox" defaultChecked={int.enabled} />
                    <span>Enabled</span>
                  </label>

                  {/* Non-Xero integrations use API key-style config */}
                  {int.type !== 'XERO' && (
                    <>
                      <div className="form-group">
                        <label>
                          {int.type === 'OPENAI'
                            ? 'OpenAI API Key'
                            : int.type === 'COMPANIES_HOUSE'
                            ? 'Companies House API Key'
                            : 'API Key'}
                        </label>
                        <div className="row gap-2">
                          <input
                            name="apiKey"
                            type={reveal[int.id] ? 'text' : 'password'}
                            placeholder="••••••••"
                            defaultValue={int.apiKey || ''}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn-outline-gold"
                            onClick={() =>
                              setReveal(prev => ({
                                ...prev,
                                [int.id]: !prev[int.id],
                              }))
                            }
                          >
                            {reveal[int.id] ? 'Hide' : 'Reveal'}
                          </button>
                          <button
                            type="button"
                            className="btn-outline-gold"
                            onClick={async ev => {
                              try {
                                const form =
                                  (ev.currentTarget as HTMLElement).closest(
                                    'form',
                                  ) as HTMLFormElement | null;
                                const input =
                                  form?.querySelector(
                                    "input[name='apiKey']",
                                  ) as HTMLInputElement | null;
                                const val = input?.value || '';
                                await navigator.clipboard.writeText(val);
                                alert('API key copied to clipboard');
                              } catch {
                                alert('Copy failed');
                              }
                            }}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            className="btn-outline-gold"
                            onClick={ev => {
                              const form =
                                (ev.currentTarget as HTMLElement).closest(
                                  'form',
                                ) as HTMLFormElement | null;
                              const input =
                                form?.querySelector(
                                  "input[name='apiKey']",
                                ) as HTMLInputElement | null;
                              if (input) {
                                input.value = '';
                                input.focus();
                              }
                            }}
                          >
                            Rotate
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Base URL (optional)</label>
                        <input
                          name="baseUrl"
                          type="url"
                          placeholder={
                            int.type === 'OPENAI'
                              ? 'https://api.openai.com/v1'
                              : 'https://'
                          }
                          defaultValue={int.baseUrl || ''}
                        />
                      </div>

                      {/* Provider-specific settings */}
                      {int.type === 'OPENAI' && (
                        <div className="form-group">
                          <label>OpenAI Model</label>
                          <select
                            name="openai_model"
                            defaultValue={
                              (int.settings && int.settings.model) || 'gpt-4o'
                            }
                          >
                            <option value="gpt-4o">gpt-4o</option>
                            <option value="gpt-4o-mini">gpt-4o-mini</option>
                            <option value="gpt-4.1">gpt-4.1</option>
                            <option value="o3-mini">o3-mini</option>
                          </select>
                        </div>
                      )}

                      {int.type === 'COMPANIES_HOUSE' && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="form-group">
                            <label>Environment</label>
                            <select
                              name="ch_env"
                              defaultValue={
                                (int.settings && (int.settings.env || 'production'))
                              }
                            >
                              <option value="production">Production</option>
                              <option value="sandbox">Sandbox</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Rate Limit (req/min)</label>
                            <input
                              name="ch_perMinute"
                              type="number"
                              min={60}
                              max={3000}
                              defaultValue={
                                (int.settings &&
                                  (int.settings.perMinute || 600)) as number
                              }
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Xero-specific UI */}
                  {int.type === 'XERO' && (
                    <div className="form-group">
                      <p className="text-dim">
                        Connect MDJ Practice Manager to your Xero organisation. No API key required –
                        you&apos;ll be redirected to Xero to approve access.
                      </p>
                      <button
                        type="button"
                        className="btn-gold"
                        onClick={connectXero}
                        disabled={testing === int.id}
                      >
                        {int.status === 'CONNECTED'
                          ? 'Reconnect to Xero'
                          : 'Connect to Xero'}
                      </button>
                    </div>
                  )}

                  <div className="row gap-2 mt-2">
                    <button type="submit" className="btn-gold" disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline-gold"
                      onClick={() => testIntegration(int.id)}
                      disabled={testing === int.id}
                    >
                      {testing === int.id ? 'Testing…' : 'Test Connection'}
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* System Settings */}
        {activeTab === 'system' && practiceSettings && (
          <div className="content-grid">
            <div className="card-mdj">
              <h3>System Configuration</h3>
              <form
                className="form-grid mt-3"
                onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const next = {
                    backupRetentionDays: parseInt(
                      String(
                        fd.get('backupRetentionDays') ||
                          practiceSettings.systemSettings.backupRetentionDays,
                      ),
                      10,
                    ),
                    autoBackupEnabled: fd.get('autoBackupEnabled') === 'on',
                    auditLogRetentionDays: parseInt(
                      String(
                        fd.get('auditLogRetentionDays') ||
                          practiceSettings.systemSettings.auditLogRetentionDays,
                      ),
                      10,
                    ),
                    defaultTaskAssignee:
                      (fd.get('defaultTaskAssignee') as string) || undefined,
                    defaultServiceFrequency:
                      (fd.get('defaultServiceFrequency') as any) ||
                      practiceSettings.systemSettings.defaultServiceFrequency,
                    taskGenerationWindowDays: parseInt(
                      String(
                        fd.get('taskGenerationWindowDays') ||
                          practiceSettings.systemSettings
                            .taskGenerationWindowDays ||
                          60,
                      ),
                      10,
                    ),
                  };
                  updatePracticeSettings({ systemSettings: next as any });
                }}
              >
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label>Backup Retention (days)</label>
                    <input
                      name="backupRetentionDays"
                      type="number"
                      min={1}
                      max={3650}
                      defaultValue={practiceSettings.systemSettings.backupRetentionDays}
                    />
                  </div>
                  <div className="form-group">
                    <label>Audit Log Retention (days)</label>
                    <input
                      name="auditLogRetentionDays"
                      type="number"
                      min={1}
                      max={3650}
                      defaultValue={
                        practiceSettings.systemSettings.auditLogRetentionDays
                      }
                    />
                  </div>
                  <label className="row gap-2" style={{ alignItems: 'end' }}>
                    <input
                      name="autoBackupEnabled"
                      type="checkbox"
                      defaultChecked={practiceSettings.systemSettings.autoBackupEnabled}
                    />
                    <span>Enable Auto Backups</span>
                  </label>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label>Default Task Assignee</label>
                    <input
                      name="defaultTaskAssignee"
                      defaultValue={
                        practiceSettings.systemSettings.defaultTaskAssignee || ''
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Default Service Frequency</label>
                    <select
                      name="defaultServiceFrequency"
                      defaultValue={practiceSettings.systemSettings.defaultServiceFrequency}
                    >
                      <option value="ANNUAL">Annual</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Task Generation Window (days)</label>
                    <input
                      name="taskGenerationWindowDays"
                      type="number"
                      min={1}
                      max={365}
                      defaultValue={
                        practiceSettings.systemSettings.taskGenerationWindowDays || 60
                      }
                    />
                  </div>
                </div>

                <button type="submit" className="btn-gold">
                  {saving ? 'Saving…' : 'Save System Settings'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Monitoring */}
        {activeTab === 'monitoring' && (
          <div className="content-grid">
            <div className="card-mdj">
              <h3>Service Health</h3>
              {healthDashboard ? (
                <pre
                  style={{
                    marginTop: '.5rem',
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '.75rem',
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(healthDashboard, null, 2)}
                </pre>
              ) : (
                <p className="text-dim">No health data available.</p>
              )}
            </div>
            <div className="card-mdj">
              <h3>Usage</h3>
              {Array.isArray(usageStats) && usageStats.length > 0 ? (
                <div className="table-wrap">
                  <table className="table-mdj">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Period</th>
                        <th>Requests</th>
                        <th>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageStats.map((u: any, i: number) => (
                        <tr key={i}>
                          <td>{u.service || '—'}</td>
                          <td className="text-dim">{u.period || '—'}</td>
                          <td>{u.requests ?? '—'}</td>
                          <td>{u.errors ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-dim">No usage data yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </MDJShell>
  );
}