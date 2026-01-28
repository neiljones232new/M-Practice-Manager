'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

interface PortfolioDetail {
  code: number;
  name: string;
  description?: string;
  enabled?: boolean;
  clientCount: number;
  createdAt: string;
  updatedAt?: string;
}

export default function PortfolioDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const codeParam = params?.code;
  const [portfolio, setPortfolio] = useState<PortfolioDetail | null>(null);
  const [formState, setFormState] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const loadPortfolio = async () => {
      if (!codeParam) return;
      try {
        setLoading(true);
        setError(null);
        const detail = await api.get<PortfolioDetail>(`/portfolios/${codeParam}`);
        setPortfolio(detail);
        setFormState({
          name: detail.name || '',
          description: detail.description || '',
        });
      } catch (err) {
        console.error('Failed to load portfolio', err);
        const message = err instanceof Error ? err.message : 'Unable to load portfolio.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [codeParam]);

  const updatePortfolio = async () => {
    if (!portfolio) return;
    try {
      setSaving(true);
      setSaveMessage(null);
      setSaveStatus(null);
      await api.put(`/portfolios/${portfolio.code}`, {
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
      });
      const refreshed = await api.get<PortfolioDetail>(`/portfolios/${portfolio.code}`);
      setPortfolio(refreshed);
      setFormState({
        name: refreshed.name || '',
        description: refreshed.description || '',
      });
      setSaveMessage('Portfolio updated successfully.');
      setSaveStatus('success');
    } catch (err) {
      console.error('Failed to update portfolio', err);
      const message = err instanceof Error ? err.message : 'Unable to update portfolio.';
      setSaveMessage(message);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MDJShell
      pageTitle={portfolio ? `Portfolio ${portfolio.code}` : 'Portfolio'}
      pageSubtitle="Review portfolio details and client summary"
    >
      <div className="page-content space-y-4">
        <button className="btn-outline-gold" onClick={() => router.back()}>
          ← Back to Settings
        </button>

        {loading && (
          <div className="center-stack py-8">
            <div className="spinner mdj mx-auto mb-2" />
            <p className="text-dim">Loading portfolio...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert-warn">
            {error}
          </div>
        )}

        {!loading && portfolio && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-mdj">
              <div className="card-header">
                <h3>Portfolio Overview</h3>
              </div>
              <div className="card-content space-y-3">
                <div>
                  <div className="text-dim text-sm">Code</div>
                  <div className="text-strong mono text-lg">{portfolio.code}</div>
                </div>
                <div>
                  <div className="text-dim text-sm">Name</div>
                  <div className="text-strong text-lg">{portfolio.name}</div>
                </div>
                <div>
                  <div className="text-dim text-sm">Description</div>
                  <div>{portfolio.description || '—'}</div>
                </div>
                <div className="row gap-4">
                  <div>
                    <div className="text-dim text-sm">Clients</div>
                    <div className="text-strong text-xl">{portfolio.clientCount}</div>
                  </div>
                  <div>
                    <div className="text-dim text-sm">Status</div>
                    <div className={portfolio.enabled ? 'chip success' : 'chip danger'}>
                      {portfolio.enabled ? 'Active' : 'Disabled'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-dim">
                  <div>
                    <div>Created</div>
                    <div>{new Date(portfolio.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div>Updated</div>
                    <div>{portfolio.updatedAt ? new Date(portfolio.updatedAt).toLocaleString() : '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-mdj">
              <div className="card-header">
                <h3>Edit Portfolio</h3>
              </div>
              <div className="card-content space-y-3">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={event => setFormState(prev => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows={4}
                    value={formState.description}
                    onChange={event => setFormState(prev => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                {saveMessage && saveStatus === 'success' && (
                  <div className="pill ok">{saveMessage}</div>
                )}
                {saveMessage && saveStatus === 'error' && (
                  <div className="alert-warn">{saveMessage}</div>
                )}
                <div className="row end gap-2">
                  <button
                    type="button"
                    className="btn-outline-gold"
                    onClick={() =>
                      setFormState({
                        name: portfolio.name || '',
                        description: portfolio.description || '',
                      })
                    }
                    disabled={saving}
                  >
                    Reset
                  </button>
                  <button type="button" className="btn-gold" onClick={updatePortfolio} disabled={saving || !formState.name.trim()}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MDJShell>
  );
}
