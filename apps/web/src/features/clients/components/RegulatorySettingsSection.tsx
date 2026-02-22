'use client';

import { useMemo, useState } from 'react';
import type { Client, ClientProfileSubset } from '@/lib/types';

type RegulatoryPayload = {
  vatNumber: string | null;
  vatScheme: string | null;
  vatReturnFrequency: string | null;
  payeReference: string | null;
  cisRegistered: boolean;
  selfAssessmentRequired: boolean;
  payrollRtiRequired: boolean;
};

type Props = {
  client: Client;
  profile: ClientProfileSubset;
  onSave: (payload: RegulatoryPayload) => Promise<void>;
};

const normalizeText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export default function RegulatorySettingsSection({ client, profile, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo(
    () => ({
      vatNumber: profile.vatNumber || client.vatNumber || '',
      vatScheme: profile.vatScheme || '',
      vatReturnFrequency: profile.vatReturnFrequency || '',
      payeReference: profile.payeReference || client.payeReference || '',
      cisRegistered: !!profile.cisRegistered,
      selfAssessmentRequired: !!profile.selfAssessmentRequired,
      payrollRtiRequired: !!profile.payrollRtiRequired,
    }),
    [profile, client],
  );

  const [form, setForm] = useState(initial);

  const reset = () => {
    setForm(initial);
    setError(null);
  };

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        vatNumber: normalizeText(form.vatNumber),
        vatScheme: normalizeText(form.vatScheme),
        vatReturnFrequency: normalizeText(form.vatReturnFrequency),
        payeReference: normalizeText(form.payeReference),
        cisRegistered: !!form.cisRegistered,
        selfAssessmentRequired: !!form.selfAssessmentRequired,
        payrollRtiRequired: !!form.payrollRtiRequired,
      });
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save regulatory settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-mdj" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Regulatory Settings</h3>
        {!editing ? (
          <button className="btn-outline-primary btn-sm" onClick={() => { reset(); setEditing(true); }}>
            Edit Regulatory Settings
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
            { label: 'VAT Number', value: profile.vatNumber || client.vatNumber || '—' },
            { label: 'VAT Scheme', value: profile.vatScheme || '—' },
            { label: 'VAT Frequency', value: profile.vatReturnFrequency || '—' },
            { label: 'PAYE Reference', value: profile.payeReference || client.payeReference || '—' },
            { label: 'CIS Registered', value: profile.cisRegistered ? 'Yes' : 'No' },
            { label: 'Self Assessment Required', value: profile.selfAssessmentRequired ? 'Yes' : 'No' },
            { label: 'Payroll RTI Required', value: profile.payrollRtiRequired ? 'Yes' : 'No' },
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
            <label>VAT Number</label>
            <input className="input-mdj" value={form.vatNumber} onChange={(e) => setField('vatNumber', e.target.value)} />
          </div>
          <div className="form-group">
            <label>VAT Scheme</label>
            <input className="input-mdj" value={form.vatScheme} onChange={(e) => setField('vatScheme', e.target.value)} />
          </div>
          <div className="form-group">
            <label>VAT Frequency</label>
            <input className="input-mdj" value={form.vatReturnFrequency} onChange={(e) => setField('vatReturnFrequency', e.target.value)} />
          </div>
          <div className="form-group">
            <label>PAYE Reference</label>
            <input className="input-mdj" value={form.payeReference} onChange={(e) => setField('payeReference', e.target.value)} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input id="cisRegistered" type="checkbox" checked={form.cisRegistered} onChange={(e) => setField('cisRegistered', e.target.checked)} />
            <label htmlFor="cisRegistered">CIS Registered</label>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input id="selfAssessmentRequired" type="checkbox" checked={form.selfAssessmentRequired} onChange={(e) => setField('selfAssessmentRequired', e.target.checked)} />
            <label htmlFor="selfAssessmentRequired">Self Assessment Required</label>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input id="payrollRtiRequired" type="checkbox" checked={form.payrollRtiRequired} onChange={(e) => setField('payrollRtiRequired', e.target.checked)} />
            <label htmlFor="payrollRtiRequired">Payroll RTI Required</label>
          </div>
        </div>
      )}
    </section>
  );
}
