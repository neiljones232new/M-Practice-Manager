'use client';

import { useMemo, useState } from 'react';
import type { ClientProfileSubset } from '@/lib/types';

type PracticePayload = {
  mainContactName: string | null;
  partnerResponsible: string | null;
  clientManager: string | null;
  lifecycleStatus: string | null;
  engagementType: string | null;
  engagementLetterSigned: boolean;
  onboardingDate: string | null;
  disengagementDate: string | null;
  amlCompleted: boolean;
  clientRiskRating: string | null;
  doNotContact: boolean;
  notes: string | null;
};

type StaffOption = { value: string; label: string };

type Props = {
  profile: ClientProfileSubset;
  staffOptions: StaffOption[];
  onSave: (payload: PracticePayload) => Promise<void>;
};

const normalizeText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function PracticeOverviewSection({ profile, staffOptions, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo(
    () => ({
      mainContactName: profile.mainContactName || '',
      partnerResponsible: profile.partnerResponsible || '',
      clientManager: profile.clientManager || '',
      lifecycleStatus: profile.lifecycleStatus || '',
      engagementType: profile.engagementType || '',
      engagementLetterSigned: !!profile.engagementLetterSigned,
      onboardingDate: toDateInput(profile.onboardingDate || null),
      disengagementDate: toDateInput(profile.disengagementDate || null),
      amlCompleted: !!profile.amlCompleted,
      clientRiskRating: profile.clientRiskRating || '',
      doNotContact: !!profile.doNotContact,
      notes: profile.notes || '',
    }),
    [profile],
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
        mainContactName: normalizeText(form.mainContactName),
        partnerResponsible: normalizeText(form.partnerResponsible),
        clientManager: normalizeText(form.clientManager),
        lifecycleStatus: normalizeText(form.lifecycleStatus),
        engagementType: normalizeText(form.engagementType),
        engagementLetterSigned: !!form.engagementLetterSigned,
        onboardingDate: normalizeText(form.onboardingDate),
        disengagementDate: normalizeText(form.disengagementDate),
        amlCompleted: !!form.amlCompleted,
        clientRiskRating: normalizeText(form.clientRiskRating),
        doNotContact: !!form.doNotContact,
        notes: normalizeText(form.notes),
      });
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save practice overview');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-mdj" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Practice Overview</h3>
        {!editing ? (
          <button className="btn-outline-primary btn-sm" onClick={() => { reset(); setEditing(true); }}>
            Edit Practice Overview
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
            { label: 'Main Contact', value: profile.mainContactName || '—' },
            { label: 'Partner Responsible', value: profile.partnerResponsible || '—' },
            { label: 'Client Manager', value: profile.clientManager || '—' },
            { label: 'Lifecycle', value: profile.lifecycleStatus || '—' },
            { label: 'Engagement Type', value: profile.engagementType || '—' },
            { label: 'Engagement Letter Signed', value: profile.engagementLetterSigned ? 'Yes' : 'No' },
            {
              label: 'Onboarding Date',
              value: profile.onboardingDate ? new Date(profile.onboardingDate).toLocaleDateString('en-GB') : '—',
            },
            {
              label: 'Disengagement Date',
              value: profile.disengagementDate ? new Date(profile.disengagementDate).toLocaleDateString('en-GB') : '—',
            },
            { label: 'AML Completed', value: profile.amlCompleted ? 'Yes' : 'No' },
            { label: 'Risk Rating', value: profile.clientRiskRating || '—' },
            { label: 'Do Not Contact', value: profile.doNotContact ? 'Yes' : 'No' },
            { label: 'Notes', value: profile.notes || '—' },
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
            <label>Main Contact</label>
            <input className="input-mdj" value={form.mainContactName} onChange={(e) => setField('mainContactName', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Partner Responsible</label>
            <select className="input-mdj" value={form.partnerResponsible} onChange={(e) => setField('partnerResponsible', e.target.value)}>
              {staffOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Client Manager</label>
            <select className="input-mdj" value={form.clientManager} onChange={(e) => setField('clientManager', e.target.value)}>
              {staffOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Lifecycle</label>
            <select className="input-mdj" value={form.lifecycleStatus} onChange={(e) => setField('lifecycleStatus', e.target.value)}>
              <option value="">—</option>
              {['PROSPECT', 'ONBOARDING', 'ACTIVE', 'DORMANT', 'CEASED'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Engagement Type</label>
            <input className="input-mdj" value={form.engagementType} onChange={(e) => setField('engagementType', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Onboarding Date</label>
            <input type="date" className="input-mdj" value={form.onboardingDate} onChange={(e) => setField('onboardingDate', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Disengagement Date</label>
            <input type="date" className="input-mdj" value={form.disengagementDate} onChange={(e) => setField('disengagementDate', e.target.value)} />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input id="engagementLetterSigned" type="checkbox" checked={form.engagementLetterSigned} onChange={(e) => setField('engagementLetterSigned', e.target.checked)} />
            <label htmlFor="engagementLetterSigned">Engagement Letter Signed</label>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input id="amlCompleted" type="checkbox" checked={form.amlCompleted} onChange={(e) => setField('amlCompleted', e.target.checked)} />
            <label htmlFor="amlCompleted">AML Completed</label>
          </div>

          <div className="form-group">
            <label>Risk Rating</label>
            <input className="input-mdj" value={form.clientRiskRating} onChange={(e) => setField('clientRiskRating', e.target.value)} />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input id="doNotContact" type="checkbox" checked={form.doNotContact} onChange={(e) => setField('doNotContact', e.target.checked)} />
            <label htmlFor="doNotContact">Do Not Contact</label>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea className="input-mdj" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </div>
        </div>
      )}
    </section>
  );
}
