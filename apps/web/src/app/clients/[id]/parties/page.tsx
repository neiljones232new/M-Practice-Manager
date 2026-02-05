'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { MDJModal, MDJFormGroup } from '@/components/mdj-ui';
import { api } from '@/lib/api';
import type { ClientContextWithParties, ClientParty } from '@/lib/types';

type Person = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
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
};

const toDateInput = (value?: string | Date | null) => {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function ClientPartiesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<ClientContextWithParties | null>(null);
  const [parties, setParties] = useState<ClientParty[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [error, setError] = useState<string | null>(null);
  const [showFormer, setShowFormer] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedParty, setSelectedParty] = useState<ClientParty | null>(null);
  const [personForm, setPersonForm] = useState<Person>({ id: '', firstName: '', lastName: '' });
  const [partyForm, setPartyForm] = useState<{
    role: string;
    ownershipPercent?: number;
    appointedAt?: string;
    primaryContact?: boolean;
  }>({ role: 'DIRECTOR', ownershipPercent: undefined, appointedAt: '', primaryContact: false });

  const loadClient = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ClientContextWithParties>(`/clients/${clientId}/with-parties`);
      setContext(data);
      setParties(Array.isArray(data?.partiesDetails) ? data.partiesDetails : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const loadPerson = async (personId: string) => {
    if (!personId || people[personId]) return;
    try {
      const res = await api.get<Person>(`/people/${personId}`);
      setPeople((prev) => ({ ...prev, [personId]: res }));
    } catch {
      // ignore missing person for now
    }
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  useEffect(() => {
    parties.forEach((p) => {
      if (p.personId) loadPerson(p.personId);
    });
  }, [parties]);

  const visibleParties = useMemo(() => {
    if (showFormer) return parties;
    return parties.filter((p) => !p.resignedAt);
  }, [parties, showFormer]);

  const openAdd = () => {
    setPersonForm({ id: '', firstName: '', lastName: '', email: '', phone: '' });
    setPartyForm({ role: 'DIRECTOR', ownershipPercent: undefined, appointedAt: '', primaryContact: false });
    setAddOpen(true);
  };

  const openEdit = (party: ClientParty) => {
    const person = party.personId ? people[party.personId] : undefined;
    setSelectedParty(party);
    setPersonForm({
      id: person?.id || '',
      firstName: person?.firstName || '',
      lastName: person?.lastName || '',
      email: person?.email || '',
      phone: person?.phone || '',
      dateOfBirth: person?.dateOfBirth || '',
      nationality: person?.nationality || '',
    });
    setPartyForm({
      role: party.role || 'DIRECTOR',
      ownershipPercent: typeof party.ownershipPercent === 'number' ? party.ownershipPercent : undefined,
      appointedAt: party.appointedAt ? toDateInput(party.appointedAt) : '',
      primaryContact: !!party.primaryContact,
    });
    setEditOpen(true);
  };

  const saveNewParty = async () => {
    if (!clientId) return;
    if (!personForm.firstName || !personForm.lastName) {
      setError('First name and last name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const person = await api.post<Person>('/people', {
        firstName: personForm.firstName,
        lastName: personForm.lastName,
        email: personForm.email || undefined,
        phone: personForm.phone || undefined,
        dateOfBirth: personForm.dateOfBirth || undefined,
        nationality: personForm.nationality || undefined,
      });

      await api.post('/clients/parties', {
        clientId,
        personId: person.id,
        role: partyForm.role,
        ownershipPercent: partyForm.ownershipPercent,
        appointedAt: partyForm.appointedAt || undefined,
        primaryContact: partyForm.primaryContact || false,
      });

      setAddOpen(false);
      await loadClient();
    } catch (e: any) {
      setError(e?.message || 'Failed to add party');
    } finally {
      setSaving(false);
    }
  };

  const saveEditParty = async () => {
    if (!selectedParty) return;
    setSaving(true);
    setError(null);
    try {
      if (selectedParty.personId) {
        await api.put(`/people/${selectedParty.personId}`, {
          firstName: personForm.firstName || undefined,
          lastName: personForm.lastName || undefined,
          email: personForm.email || undefined,
          phone: personForm.phone || undefined,
          dateOfBirth: personForm.dateOfBirth || undefined,
          nationality: personForm.nationality || undefined,
        });
      }

      await api.put(`/clients/parties/${selectedParty.id}`, {
        role: partyForm.role || undefined,
        ownershipPercent: partyForm.ownershipPercent,
        appointedAt: partyForm.appointedAt || undefined,
        primaryContact: !!partyForm.primaryContact,
      });

      setEditOpen(false);
      setSelectedParty(null);
      await loadClient();
    } catch (e: any) {
      setError(e?.message || 'Failed to update party');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (party: ClientParty) => {
    if (!party.id) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/clients/parties/${party.id}`, { primaryContact: true });
      await loadClient();
    } catch (e: any) {
      setError(e?.message || 'Failed to set primary contact');
    } finally {
      setSaving(false);
    }
  };

  const handleResign = async (party: ClientParty) => {
    if (!party.id) return;
    const ok = window.confirm('Mark this party as resigned?');
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/clients/parties/${party.id}/resign`, { resignationDate: new Date().toISOString() });
      await loadClient();
    } catch (e: any) {
      setError(e?.message || 'Failed to resign party');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (party: ClientParty) => {
    if (!party.id) return;
    const ok = window.confirm('Remove this party?');
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/clients/parties/${party.id}`);
      await loadClient();
    } catch (e: any) {
      setError(e?.message || 'Failed to remove party');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MDJShell
      pageTitle="Client Parties"
      pageSubtitle={context?.node?.name || 'People & roles'}
      actions={[
        { label: 'Back to Client', href: `/clients/${clientId}`, variant: 'outline' },
        { label: 'Add Person', onClick: openAdd, variant: 'primary' },
      ]}
    >
      <hr className="mdj-gold-rule" />

      {error && (
        <div className="card-mdj" style={{ padding: '0.75rem 1rem', background: 'var(--status-danger-bg)' }}>
          <span style={{ color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      <div className="card-mdj" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{context?.node?.name || 'Client'}</div>
            <div style={{ color: 'var(--text-muted)' }}>
              {context?.node?.registeredNumber || context?.node?.id ? `ID ${context.node.registeredNumber || context.node.id}` : '—'}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={showFormer} onChange={(e) => setShowFormer(e.target.checked)} />
            Show former officers
          </label>
        </div>
      </div>

      <div className="card-mdj" style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading parties…</div>
        ) : visibleParties.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No parties linked to this client.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Ownership</th>
                  <th>Appointed</th>
                  <th>Resigned</th>
                  <th>Primary</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleParties.map((party) => {
                  const person = party.personId ? people[party.personId] : undefined;
                  return (
                    <tr key={party.id}>
                      <td>
                        <div>{person?.fullName || [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Unknown person'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {[person?.email, person?.phone].filter(Boolean).join(' · ') || party.personId || '—'}
                        </div>
                      </td>
                      <td>{party.role ? party.role.replace(/_/g, ' ') : '—'}</td>
                      <td>{typeof party.ownershipPercent === 'number' ? `${party.ownershipPercent}%` : '—'}</td>
                      <td>{party.appointedAt ? new Date(party.appointedAt).toLocaleDateString('en-GB') : '—'}</td>
                      <td>{party.resignedAt ? new Date(party.resignedAt).toLocaleDateString('en-GB') : '—'}</td>
                      <td>{party.primaryContact ? <span className="badge success">Primary</span> : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-outline-primary btn-xs" onClick={() => openEdit(party)} style={{ marginRight: 6 }}>Edit</button>
                        {!party.primaryContact && (
                          <button className="btn-outline-primary btn-xs" onClick={() => handleSetPrimary(party)} style={{ marginRight: 6 }}>
                            Set Primary
                          </button>
                        )}
                        {!party.resignedAt && (
                          <button className="btn-xs warning" onClick={() => handleResign(party)} style={{ marginRight: 6 }}>
                            Resign
                          </button>
                        )}
                        <button className="btn-xs danger" onClick={() => handleDelete(party)} disabled={saving}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MDJModal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Person">
        <div style={{ padding: '1rem' }}>
          <MDJFormGroup label="First Name">
            <input className="input-mdj" value={personForm.firstName || ''} onChange={(e) => setPersonForm((p) => ({ ...p, firstName: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup label="Last Name">
            <input className="input-mdj" value={personForm.lastName || ''} onChange={(e) => setPersonForm((p) => ({ ...p, lastName: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup label="Email">
            <input className="input-mdj" value={personForm.email || ''} onChange={(e) => setPersonForm((p) => ({ ...p, email: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup label="Phone">
            <input className="input-mdj" value={personForm.phone || ''} onChange={(e) => setPersonForm((p) => ({ ...p, phone: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup label="Role">
            <select className="input-mdj" value={partyForm.role} onChange={(e) => setPartyForm((p) => ({ ...p, role: e.target.value }))}>
              {['DIRECTOR','SHAREHOLDER','PARTNER','MEMBER','OWNER','UBO','SECRETARY','CONTACT'].map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </MDJFormGroup>
          <MDJFormGroup label="Ownership %">
            <input
              className="input-mdj"
              type="number"
              value={partyForm.ownershipPercent ?? ''}
              onChange={(e) => setPartyForm((p) => ({ ...p, ownershipPercent: e.target.value === '' ? undefined : Number(e.target.value) }))}
            />
          </MDJFormGroup>
          <MDJFormGroup label="Appointed">
            <input className="input-mdj" type="date" value={partyForm.appointedAt || ''} onChange={(e) => setPartyForm((p) => ({ ...p, appointedAt: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!partyForm.primaryContact} onChange={(e) => setPartyForm((p) => ({ ...p, primaryContact: e.target.checked }))} />
              Primary Contact
            </label>
          </MDJFormGroup>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-outline-primary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveNewParty} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </div>
      </MDJModal>

      <MDJModal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Party">
        <div style={{ padding: '1rem' }}>
          <MDJFormGroup label="First Name">
            <input className="input-mdj" value={personForm.firstName || ''} onChange={(e) => setPersonForm((p) => ({ ...p, firstName: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup label="Last Name">
            <input className="input-mdj" value={personForm.lastName || ''} onChange={(e) => setPersonForm((p) => ({ ...p, lastName: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup label="Email">
            <input className="input-mdj" value={personForm.email || ''} onChange={(e) => setPersonForm((p) => ({ ...p, email: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup label="Phone">
            <input className="input-mdj" value={personForm.phone || ''} onChange={(e) => setPersonForm((p) => ({ ...p, phone: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup label="Role">
            <select className="input-mdj" value={partyForm.role} onChange={(e) => setPartyForm((p) => ({ ...p, role: e.target.value }))}>
              {['DIRECTOR','SHAREHOLDER','PARTNER','MEMBER','OWNER','UBO','SECRETARY','CONTACT'].map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </MDJFormGroup>
          <MDJFormGroup label="Ownership %">
            <input
              className="input-mdj"
              type="number"
              value={partyForm.ownershipPercent ?? ''}
              onChange={(e) => setPartyForm((p) => ({ ...p, ownershipPercent: e.target.value === '' ? undefined : Number(e.target.value) }))}
            />
          </MDJFormGroup>
          <MDJFormGroup label="Appointed">
            <input className="input-mdj" type="date" value={partyForm.appointedAt || ''} onChange={(e) => setPartyForm((p) => ({ ...p, appointedAt: e.target.value }))} />
          </MDJFormGroup>
          <MDJFormGroup>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!partyForm.primaryContact} onChange={(e) => setPartyForm((p) => ({ ...p, primaryContact: e.target.checked }))} />
              Primary Contact
            </label>
          </MDJFormGroup>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-outline-primary" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveEditParty} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </MDJModal>
    </MDJShell>
  );
}
