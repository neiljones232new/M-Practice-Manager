'use client';

import { useMemo, useState } from 'react';
import type { Client, ClientStatus, ClientType } from '@/lib/types';

type IdentityPayload = {
  name: string;
  type: ClientType;
  status: ClientStatus;
  registeredNumber: string | null;
  utrNumber: string | null;
  mainEmail: string | null;
  mainPhone: string | null;
};

type Props = {
  client: Client;
  onSave: (payload: IdentityPayload) => Promise<void>;
};

type IdentityFormState = {
  name: string;
  type: ClientType;
  status: ClientStatus;
  registeredNumber: string;
  utrNumber: string;
  mainEmail: string;
  mainPhone: string;
};

const normalizeText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export default function IdentitySection({ client, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo(
    (): IdentityFormState => ({
      name: client.name || '',
      type: (client.type || 'COMPANY') as ClientType,
      status: (client.status || 'ACTIVE') as ClientStatus,
      registeredNumber: client.registeredNumber || '',
      utrNumber: client.utrNumber || '',
      mainEmail: client.mainEmail || '',
      mainPhone: client.mainPhone || '',
    }),
    [client],
  );

  const [form, setForm] = useState(initial);

  const reset = () => {
    setForm(initial);
    setError(null);
  };

  const setField = <K extends keyof IdentityFormState>(key: K, value: IdentityFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: form.name.trim() || client.name,
        type: form.type,
        status: form.status,
        registeredNumber: normalizeText(form.registeredNumber),
        utrNumber: normalizeText(form.utrNumber),
        mainEmail: normalizeText(form.mainEmail),
        mainPhone: normalizeText(form.mainPhone),
      });
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save identity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-mdj" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Identity</h3>
        {!editing ? (
          <button className="btn-outline-primary btn-sm" onClick={() => { reset(); setEditing(true); }}>
            Edit Identity
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-outline-primary btn-sm" onClick={() => { setEditing(false); reset(); }} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="card-mdj" style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--status-danger-bg)' }}>
          <span style={{ color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {!editing ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.65rem',
            marginTop: '0.75rem',
          }}
        >
          {[
            { label: 'Name', value: client.name || '—' },
            { label: 'Type', value: client.type?.replace(/_/g, ' ') || '—' },
            { label: 'Status', value: client.status || '—' },
            { label: 'Client Ref', value: client.clientRef || client.id || '—' },
            { label: 'Portfolio', value: client.portfolioCode || '—' },
            { label: 'Registered Number', value: client.registeredNumber || '—' },
            { label: 'UTR', value: client.utrNumber || '—' },
            { label: 'Main Email', value: client.mainEmail || '—' },
            { label: 'Main Phone', value: client.mainPhone || '—' },
          ].map((item) => (
            <div
              key={item.label}
              className="card-mdj tight"
              style={{ padding: '0.6rem 0.7rem', background: 'var(--surface-subtle)' }}
            >
              <div style={{ color: 'var(--text-muted)', fontSize: '0.77rem', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
            marginTop: '0.75rem',
          }}
        >
          <div className="form-group">
            <label>Name</label>
            <input className="input-mdj" value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Type</label>
            <select className="input-mdj" value={form.type} onChange={(e) => setField('type', e.target.value as ClientType)}>
              {['COMPANY', 'INDIVIDUAL', 'SOLE_TRADER', 'PARTNERSHIP', 'LLP'].map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select className="input-mdj" value={form.status} onChange={(e) => setField('status', e.target.value as ClientStatus)}>
              {['ACTIVE', 'INACTIVE', 'ARCHIVED'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Registered Number</label>
            <input className="input-mdj" value={form.registeredNumber} onChange={(e) => setField('registeredNumber', e.target.value)} />
          </div>

          <div className="form-group">
            <label>UTR</label>
            <input className="input-mdj" value={form.utrNumber} onChange={(e) => setField('utrNumber', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Main Email</label>
            <input className="input-mdj" value={form.mainEmail} onChange={(e) => setField('mainEmail', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Main Phone</label>
            <input className="input-mdj" value={form.mainPhone} onChange={(e) => setField('mainPhone', e.target.value)} />
          </div>
        </div>
      )}
    </section>
  );
}
