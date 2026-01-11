'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Shell & Styles
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

// MDJ UI atoms/molecules (keep using these where available)
import { MDJButton, MDJCard, MDJTable, MDJSection, MDJInput } from '@/components/mdj-ui';

interface IntegrationConfig {
  id: string;
  name: string;
  type: 'OPENAI' | 'COMPANIES_HOUSE' | 'HMRC' | 'GOV_NOTIFY';
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
  practiceName: string;
  practiceAddress?: string;
  practicePhone?: string;
  practiceEmail?: string;
  practiceWebsite?: string;
  defaultPortfolioCode: number;
  portfolios: Array<{
    code: number;
    name: string;
  }>;
}

interface Person {
  id: string;
  ref: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function PeoplePage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [practiceSettings, setPracticeSettings] = useState<PracticeSettings | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<boolean>(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editForm, setEditForm] = useState<Partial<Person>>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [settingsData, integrationsData, peopleData] = await Promise.all([
          Promise.resolve(null), // practice-settings endpoint doesn't exist yet
          api.get('/integrations').catch(() => []),
          api.get('/clients/people/all').catch(() => []),
        ]);

        // Fallbacks so the screen still renders in demo/offline
        const ps = (settingsData as any)?.data ?? settingsData ?? {
            id: 'demo',
            practiceName: 'MDJ Practice',
            defaultPortfolioCode: 1,
            portfolios: [{ code: 1, name: 'Main' }],
          };
        setPracticeSettings(ps as PracticeSettings);
        setIntegrations(Array.isArray(integrationsData) ? integrationsData : []);
        setPeople(
          (Array.isArray(peopleData) ? peopleData : []) as Person[]
        );
      } catch (err) {
        console.error(err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = people.filter(p => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.ref.toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <MDJShell pageTitle="People" pageSubtitle="Manage contacts and team members">
        <div className="mdj-center p-10">
          <div className="mdj-spinner mb-3" aria-label="Loading" />
          <p className="mdj-text-dim">Loading…</p>
        </div>
      </MDJShell>
    );
  }

  if (error) {
    return (
      <MDJShell pageTitle="People" pageSubtitle="Manage contacts and team members">
        <div className="mdj-center p-10">
          <p className="mdj-text-danger">{error}</p>
        </div>
      </MDJShell>
    );
  }

  return (
    <MDJShell pageTitle="People" pageSubtitle="Manage contacts and team members">
      {/* Top Summary */}
      <MDJSection className="gap-4 grid md:grid-cols-3">
        <MDJCard>
          <div className="mdj-card-title">Practice Name</div>
          <div className="mdj-card-value">{practiceSettings?.practiceName ?? '—'}</div>
        </MDJCard>
        <MDJCard>
          <div className="mdj-card-title">Default Portfolio</div>
          <div className="mdj-card-value">{practiceSettings?.defaultPortfolioCode ?? '—'}</div>
        </MDJCard>
        <MDJCard>
          <div className="mdj-card-title">Integrations</div>
          <div className="mdj-card-value">{integrations.length}</div>
        </MDJCard>
      </MDJSection>

      {/* People toolbar */}
      <div className="mdj-toolbar mdj-card mb-4">
        <div className="mdj-toolbar-left">
          <MDJInput
            placeholder="Search people…"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
          {selected.size > 0 && (
            <MDJButton
              variant="outline"
              disabled={deleting}
              onClick={async () => {
                if (!confirm(`Delete ${selected.size} selected people? This cannot be undone.`)) return;
                setDeleting(true);
                try {
                  await Promise.all(
                    Array.from(selected).map(id => api.delete(`/clients/people/${id}`))
                  );
                  setPeople(people.filter(p => !selected.has(p.id)));
                  setSelected(new Set());
                } catch (err: any) {
                  alert(err?.message || 'Failed to delete some people');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting...' : `Delete ${selected.size} Selected`}
            </MDJButton>
          )}
        </div>
        <div className="mdj-toolbar-right">
          <MDJButton
            variant="primary"
            onClick={() => router.push('/people/new')}
          >
            Add Person
          </MDJButton>
        </div>
      </div>

      {/* People Table */}
      <MDJCard>
        <table className="mdj-table">
          <thead>
            <tr>
              <th className="w-1">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every(p => selected.has(p.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(filtered.map(p => p.id)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                />
              </th>
              <th>Ref</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th className="w-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="mdj-empty">
                    <div className="mdj-empty-title">No people found</div>
                    <div className="mdj-empty-subtitle">Try a different search term.</div>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(person => (
              <tr key={person.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(person.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selected);
                      if (e.target.checked) {
                        newSelected.add(person.id);
                      } else {
                        newSelected.delete(person.id);
                      }
                      setSelected(newSelected);
                    }}
                  />
                </td>
                <td><span className="mdj-ref">{person.ref}</span></td>
                <td>{person.fullName}</td>
                <td>{person.email || '—'}</td>
                <td>{person.phone || '—'}</td>
                <td>
                  <div className="mdj-actions">
                    <MDJButton
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPerson(person);
                        setEditForm(person);
                      }}
                    >
                      Edit
                    </MDJButton>
                    <MDJButton
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!confirm(`Delete ${person.fullName}? This cannot be undone.`)) return;
                        try {
                          await api.delete(`/clients/people/${person.id}`);
                          setPeople(people.filter(p => p.id !== person.id));
                          setSelected(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(person.id);
                            return newSet;
                          });
                        } catch (err: any) {
                          alert(err?.message || 'Failed to delete person');
                        }
                      }}
                    >
                      Delete
                    </MDJButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </MDJCard>

      {/* Edit Modal */}
      {editingPerson && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="mdj-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--gold)', fontSize: '1.5rem' }}>Edit Person</h2>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--text-dim)', fontSize: '0.875rem' }}>Update person information</p>
            </div>
            
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-light)' }}>
                    First Name <span style={{ color: 'var(--gold)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName || ''}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="input-dark"
                    placeholder="Enter first name"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-light)' }}>
                    Last Name <span style={{ color: 'var(--gold)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName || ''}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="input-dark"
                    placeholder="Enter last name"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-light)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="input-dark"
                    placeholder="person@example.com"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-light)' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="input-dark"
                    placeholder="+44 20 1234 5678"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                <MDJButton
                  variant="primary"
                  onClick={async () => {
                    if (!editForm.firstName || !editForm.lastName) {
                      alert('First name and last name are required');
                      return;
                    }
                    try {
                      await api.put(`/clients/people/${editingPerson.id}`, {
                        firstName: editForm.firstName,
                        lastName: editForm.lastName,
                        email: editForm.email,
                        phone: editForm.phone,
                      });
                      setPeople(people.map(p => p.id === editingPerson.id ? {
                        ...p,
                        firstName: editForm.firstName!,
                        lastName: editForm.lastName!,
                        fullName: `${editForm.firstName} ${editForm.lastName}`,
                        email: editForm.email,
                        phone: editForm.phone,
                      } : p));
                      setEditingPerson(null);
                      setEditForm({});
                    } catch (err: any) {
                      alert(err?.message || 'Failed to update person');
                    }
                  }}
                >
                  Save Changes
                </MDJButton>
                <MDJButton
                  variant="outline"
                  onClick={() => {
                    setEditingPerson(null);
                    setEditForm({});
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </MDJButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </MDJShell>
  );
}
