'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

type ClientType = 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type Freq = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
type PartyRole = 'DIRECTOR' | 'SHAREHOLDER' | 'PARTNER' | 'MEMBER' | 'OWNER' | 'UBO' | 'SECRETARY' | 'CONTACT';

interface Address { line1?: string; line2?: string; city?: string; county?: string; postcode?: string; country?: string; }

interface CreateClientDto {
  name: string;
  type: ClientType;
  portfolioCode: number;
  status?: ClientStatus;
  mainEmail?: string;
  mainPhone?: string;
  registeredNumber?: string;
  utrNumber?: string;
  incorporationDate?: string;
  accountsAccountingReferenceDay?: number;
  accountsAccountingReferenceMonth?: number;
  accountsLastMadeUpTo?: string;
  accountsNextDue?: string;
  confirmationLastMadeUpTo?: string;
  confirmationNextDue?: string;
  address?: Address;
}

interface DirectorInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: Address;
  role?: PartyRole;
  ownershipPercent?: number;
  appointedAt?: string;
  primaryContact?: boolean;
}

interface ServiceInput {
  kind: string;
  frequency: Freq;
  fee: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  nextDue?: string;
  description?: string;
  enabled?: boolean;
}

const DEFAULT_SERVICES: ServiceInput[] = [
  { kind: 'Annual Accounts', frequency: 'ANNUAL', fee: 600, status: 'ACTIVE', enabled: true },
  { kind: 'Corporation Tax Return', frequency: 'ANNUAL', fee: 250, status: 'ACTIVE', enabled: true },
  { kind: 'Company Secretarial', frequency: 'ANNUAL', fee: 60, status: 'ACTIVE', enabled: true },
  { kind: 'Payroll Services', frequency: 'MONTHLY', fee: 100, status: 'ACTIVE', enabled: true },
  { kind: 'VAT Returns', frequency: 'QUARTERLY', fee: 120, status: 'ACTIVE', enabled: true },
  { kind: 'Self Assessment', frequency: 'ANNUAL', fee: 350, status: 'ACTIVE', enabled: true },
];

export default function AddClientWizardPage() {
  const router = useRouter();
  const qs = useSearchParams();

  const [step, setStep] = useState(1); // 1..7
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Array<{ code: number; name: string }>>([]);

  // Form state
  const [client, setClient] = useState<CreateClientDto>({
    name: '',
    type: 'COMPANY',
    portfolioCode: 1,
    status: 'ACTIVE',
    address: { country: 'United Kingdom' },
  });
  const [services, setServices] = useState<ServiceInput[]>([]);
  const [useDefaultServices, setUseDefaultServices] = useState(true);
  const [directors, setDirectors] = useState<DirectorInput[]>([]);
  const [generateTasks, setGenerateTasks] = useState(true);

  // Load portfolios and prefill if CH param is present
  useEffect(() => {
    (async () => {
      try {
        const list = await api.get('/portfolios');
        const items = (Array.isArray(list) ? list : []).map((p: any) => ({
          code: Number(p.code ?? p.portfolioCode ?? p.id),
          name: p.name || `Portfolio ${p.code ?? p.portfolioCode ?? p.id}`,
        })).sort((a: any, b: any) => a.code - b.code);
        setPortfolios(items);
        if (items.length > 0) setClient((prev) => ({ ...prev, portfolioCode: items[0].code }));
      } catch {
        // keep defaults
      }

      // Prefill from Companies House if ch=number
      const chNumber = qs.get('ch');
      if (chNumber) {
        try {
          const cd = await api.get<any>(`/companies-house/company/${encodeURIComponent(chNumber)}`);
          setClient((prev) => ({
            ...prev,
            name: cd.company_name || prev.name,
            registeredNumber: cd.company_number || prev.registeredNumber,
            incorporationDate: cd.date_of_creation || prev.incorporationDate,
            address: {
              line1: cd.registered_office_address?.address_line_1 || prev.address?.line1,
              line2: cd.registered_office_address?.address_line_2 || prev.address?.line2,
              city: cd.registered_office_address?.locality || prev.address?.city,
              county: cd.registered_office_address?.region || prev.address?.county,
              postcode: cd.registered_office_address?.postal_code || prev.address?.postcode,
              country: cd.registered_office_address?.country || prev.address?.country || 'United Kingdom',
            },
          }));
        } catch (e) {
          console.warn('CH prefill failed', e);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (useDefaultServices) {
      setServices(DEFAULT_SERVICES.map((s) => ({ ...s, enabled: s.enabled !== false })));
    }
  }, [useDefaultServices]);

  const selectedServices = useMemo(() => services.filter((s) => s.enabled !== false && String(s.kind || '').trim()), [services]);

  useEffect(() => {
    if (selectedServices.length === 0 && generateTasks) {
      setGenerateTasks(false);
    }
  }, [selectedServices.length, generateTasks]);

  const annualValue = useMemo(() => selectedServices.reduce((sum, s) => {
    const fee = Number(s.fee || 0) || 0;
    switch (s.frequency) {
      case 'MONTHLY': return sum + fee * 12;
      case 'QUARTERLY': return sum + fee * 4;
      case 'WEEKLY': return sum + fee * 52;
      default: return sum + fee;
    }
  }, 0), [selectedServices]);

  const next = () => setStep((s) => Math.min(7, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const updateService = (i: number, patch: Partial<ServiceInput>) => {
    setServices((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addService = () => setServices((prev) => ([...prev, { kind: '', frequency: 'ANNUAL', fee: 0, status: 'ACTIVE', enabled: true }]));
  const removeService = (i: number) => setServices((prev) => prev.filter((_, idx) => idx !== i));

  const addDirector = () => setDirectors((prev) => ([...prev, { firstName: '', lastName: '', role: 'DIRECTOR', primaryContact: prev.length === 0 }]));
  const updateDirector = (i: number, patch: Partial<DirectorInput>) => {
    setDirectors((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };
  const removeDirector = (i: number) => setDirectors((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        client,
        services: selectedServices,
        defaultServices: false,
        directors,
        generateTasks: generateTasks && selectedServices.length > 0,
      };
      const res = await api.post<{ client?: { id: string } }>(
        '/clients/create-full',
        payload
      );
      const id = res?.client?.id;
      router.push(id ? `/clients/${id}` : '/clients');
    } catch (e: any) {
      setError(e?.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const Steps = (
    <div className="card-mdj" style={{ marginBottom: '1rem' }}>
      <div className="mdj-pagehead">
        <h3 className="mdj-page-title">Add Client — Step {step} of 7</h3>
        <div className="mdj-page-actions">
          {step > 1 && <button className="btn-outline-gold" onClick={back}>Back</button>}
          {step < 7 && <button className="btn-gold" onClick={next}>Next</button>}
          {step === 7 && <button className="btn-gold" onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Create Client'}</button>}
        </div>
      </div>
    </div>
  );

  return (
    <MDJShell
      pageTitle="Add Client Wizard"
      pageSubtitle="Create a client with services, directors, and tasks"
      actions={[{ label: 'Cancel', href: '/clients', variant: 'outline' }]}
    >
      <hr className="mdj-gold-rule" />
      {Steps}

      {error && (
        <div className="card-mdj" style={{ background: 'var(--danger-bg)', borderColor: 'rgba(239,68,68,.35)', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</div>
        </div>
      )}

      {/* 1. Basic Information */}
      {step === 1 && (
        <div className="card-mdj" style={{ padding: '1rem' }}>
          <h3>Basic Information</h3>
          <hr className="mdj-gold-divider" />
          <div className="kv">
            <div className="k">Client Name *</div>
            <div className="v"><input className="input-mdj" id="new-client-name" name="name" value={client.name} onChange={(e)=>setClient({ ...client, name: e.target.value })} /></div>
            <div className="k">Client Type *</div>
            <div className="v">
              <select className="input-mdj" id="new-client-type" name="type" value={client.type} onChange={(e)=>setClient({ ...client, type: e.target.value as ClientType })}>
                <option value="COMPANY">Company</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="SOLE_TRADER">Sole Trader</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="LLP">LLP</option>
              </select>
            </div>
            <div className="k">Portfolio *</div>
            <div className="v">
              <select className="input-mdj" id="new-client-portfolioCode" name="portfolioCode" value={String(client.portfolioCode)} onChange={(e)=>setClient({ ...client, portfolioCode: parseInt(e.target.value) })}>
                {portfolios.length === 0 && <option value={client.portfolioCode}>#{client.portfolioCode}</option>}
                {portfolios.map(p => <option key={p.code} value={p.code}>#{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="k">Status</div>
            <div className="v">
              <select className="input-mdj" id="new-client-status" name="status" value={client.status || 'ACTIVE'} onChange={(e)=>setClient({ ...client, status: e.target.value as ClientStatus })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="k">Registered Number</div>
            <div className="v"><input className="input-mdj" id="new-client-registeredNumber" name="registeredNumber" value={client.registeredNumber || ''} onChange={(e)=>setClient({ ...client, registeredNumber: e.target.value })} /></div>
          </div>
        </div>
      )}

      {/* 2. Contact Information */}
      {step === 2 && (
        <div className="card-mdj">
          <h3>Contact Information</h3>
          <hr className="mdj-gold-divider" />
          <div className="kv">
            <div className="k">Email</div>
            <div className="v"><input className="input-mdj" id="new-client-mainEmail" name="mainEmail" value={client.mainEmail || ''} onChange={(e)=>setClient({ ...client, mainEmail: e.target.value })} /></div>
            <div className="k">Phone</div>
            <div className="v"><input className="input-mdj" id="new-client-mainPhone" name="mainPhone" value={client.mainPhone || ''} onChange={(e)=>setClient({ ...client, mainPhone: e.target.value })} /></div>
          </div>
        </div>
      )}

      {/* 3. Address */}
      {step === 3 && (
        <div className="card-mdj">
          <h3>Address</h3>
          <hr className="mdj-gold-divider" />
          <div className="kv">
            <div className="k">Line 1</div>
            <div className="v"><input className="input-mdj" id="new-client-address-line1" name="address.line1" value={client.address?.line1 || ''} onChange={(e)=>setClient({ ...client, address: { ...(client.address||{}), line1: e.target.value } })} /></div>
            <div className="k">Line 2</div>
            <div className="v"><input className="input-mdj" id="new-client-address-line2" name="address.line2" value={client.address?.line2 || ''} onChange={(e)=>setClient({ ...client, address: { ...(client.address||{}), line2: e.target.value } })} /></div>
            <div className="k">City</div>
            <div className="v"><input className="input-mdj" id="new-client-address-city" name="address.city" value={client.address?.city || ''} onChange={(e)=>setClient({ ...client, address: { ...(client.address||{}), city: e.target.value } })} /></div>
            <div className="k">County</div>
            <div className="v"><input className="input-mdj" id="new-client-address-county" name="address.county" value={client.address?.county || ''} onChange={(e)=>setClient({ ...client, address: { ...(client.address||{}), county: e.target.value } })} /></div>
            <div className="k">Postcode</div>
            <div className="v"><input className="input-mdj" id="new-client-address-postcode" name="address.postcode" value={client.address?.postcode || ''} onChange={(e)=>setClient({ ...client, address: { ...(client.address||{}), postcode: e.target.value } })} /></div>
            <div className="k">Country</div>
            <div className="v">
              <select className="input-mdj" id="new-client-address-country" name="address.country" value={client.address?.country || 'United Kingdom'} onChange={(e)=>setClient({ ...client, address: { ...(client.address||{}), country: e.target.value } })}>
                <option>United Kingdom</option>
                <option>Ireland</option>
                <option>United States</option>
                <option>Canada</option>
                <option>Australia</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. Accounting & Tax Info (minimal) */}
      {step === 4 && (
        <div className="card-mdj">
          <h3>Accounting & Tax Info</h3>
          <hr className="mdj-gold-divider" />
          <div className="kv">
            <div className="k">UTR Number</div>
            <div className="v"><input className="input-mdj" id="new-client-utrNumber" name="utrNumber" value={client.utrNumber || ''} onChange={(e)=>setClient({ ...client, utrNumber: e.target.value })} /></div>
            <div className="k">Accounts Last Made Up To</div>
            <div className="v"><input className="input-mdj" id="new-client-accountsLastMadeUpTo" name="accountsLastMadeUpTo" type="date" value={client.accountsLastMadeUpTo || ''} onChange={(e)=>setClient({ ...client, accountsLastMadeUpTo: e.target.value })} /></div>
            <div className="k">Accounts Next Due</div>
            <div className="v"><input className="input-mdj" id="new-client-accountsNextDue" name="accountsNextDue" type="date" value={client.accountsNextDue || ''} onChange={(e)=>setClient({ ...client, accountsNextDue: e.target.value })} /></div>
            <div className="k">Accounting Reference Day</div>
            <div className="v">
              <input
                className="input-mdj"
                id="new-client-accountsAccountingReferenceDay"
                name="accountsAccountingReferenceDay"
                type="number"
                min={1}
                max={31}
                value={client.accountsAccountingReferenceDay || ''}
                onChange={(e)=>setClient({ ...client, accountsAccountingReferenceDay: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </div>
            <div className="k">Accounting Reference Month</div>
            <div className="v">
              <input
                className="input-mdj"
                id="new-client-accountsAccountingReferenceMonth"
                name="accountsAccountingReferenceMonth"
                type="number"
                min={1}
                max={12}
                value={client.accountsAccountingReferenceMonth || ''}
                onChange={(e)=>setClient({ ...client, accountsAccountingReferenceMonth: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="k">Confirmation Statement Next Due</div>
            <div className="v"><input className="input-mdj" type="date" value={client.confirmationNextDue || ''} onChange={(e)=>setClient({ ...client, confirmationNextDue: e.target.value })} /></div>
          </div>
        </div>
      )}

      {/* 5. Services */}
      {step === 5 && (
        <div className="card-mdj">
          <div className="mdj-pagehead">
            <h3 className="mdj-page-title">Services</h3>
            <div className="mdj-page-actions">
              <a className="btn-outline-gold" href="/settings/templates" target="_blank" rel="noreferrer">Manage Service Task Templates</a>
            </div>
          </div>
          <hr className="mdj-gold-divider" />

          <label className="row gap-2" style={{ marginBottom: '.75rem' }}>
            <input type="checkbox" checked={useDefaultServices} onChange={(e)=>setUseDefaultServices(e.target.checked)} />
            <span>Use default service templates and pricing</span>
          </label>

          <div style={{ overflowX: 'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Service</th>
                  <th>Frequency</th>
                  <th>Fee</th>
                  <th>Next Due</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        type="checkbox"
                        checked={s.enabled !== false}
                        onChange={(e) => updateService(i, { enabled: e.target.checked })}
                      />
                    </td>
                    <td><input className="input-mdj" value={s.kind} onChange={(e)=>updateService(i, { kind: e.target.value })} /></td>
                    <td>
                      <select className="input-mdj" value={s.frequency} onChange={(e)=>updateService(i, { frequency: e.target.value as Freq })}>
                        <option value="ANNUAL">Annual</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>
                    </td>
                    <td><input className="input-mdj" type="number" min={0} step={1} value={String(s.fee)} onChange={(e)=>updateService(i, { fee: Number(e.target.value||0) })} /></td>
                    <td><input className="input-mdj" type="date" value={s.nextDue || ''} onChange={(e)=>updateService(i, { nextDue: e.target.value })} /></td>
                    <td>
                      <select className="input-mdj" value={s.status || 'ACTIVE'} onChange={(e)=>updateService(i, { status: e.target.value as any })}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </td>
                    <td className="right"><button type="button" className="btn-outline-gold btn-xs" onClick={()=>removeService(i)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row gap-2" style={{ marginTop: '.75rem' }}>
            <button type="button" className="btn-outline-gold" onClick={addService}>Add Service</button>
            <div className="mdj-sub">Annualised value: £{annualValue.toLocaleString()}</div>
            <div className="mdj-sub">{selectedServices.length} selected</div>
          </div>
        </div>
      )}

      {/* 6. Directors / Main Contact */}
      {step === 6 && (
        <div className="card-mdj">
          <h3>Directors / Main Contact</h3>
          <hr className="mdj-gold-divider" />
          <div className="list-compact">
            {directors.map((d, i) => (
              <div key={i} className="item" style={{ display: 'grid', gap: '.5rem' }}>
                <div className="row gap-2">
                  <input className="input-mdj" placeholder="First name" value={d.firstName} onChange={(e)=>updateDirector(i, { firstName: e.target.value })} />
                  <input className="input-mdj" placeholder="Last name" value={d.lastName} onChange={(e)=>updateDirector(i, { lastName: e.target.value })} />
                  <select className="input-mdj" value={d.role || 'DIRECTOR'} onChange={(e)=>updateDirector(i, { role: e.target.value as PartyRole })}>
                    <option>DIRECTOR</option>
                    <option>CONTACT</option>
                    <option>SHAREHOLDER</option>
                    <option>SECRETARY</option>
                  </select>
                  <label className="row gap-2" style={{ alignItems: 'center' }}>
                    <input type="checkbox" checked={!!d.primaryContact} onChange={(e)=>updateDirector(i, { primaryContact: e.target.checked })} /> Primary
                  </label>
                  <button type="button" className="btn-outline-gold" onClick={()=>removeDirector(i)}>Remove</button>
                </div>
                <div className="row gap-2">
                  <input className="input-mdj" placeholder="Email" value={d.email || ''} onChange={(e)=>updateDirector(i, { email: e.target.value })} />
                  <input className="input-mdj" placeholder="Phone" value={d.phone || ''} onChange={(e)=>updateDirector(i, { phone: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-outline-gold" onClick={addDirector} style={{ marginTop: '.5rem' }}>Add Person</button>
        </div>
      )}

      {/* 7. Auto Tasks & Review */}
      {step === 7 && (
        <div className="card-mdj">
          <h3>Auto Tasks & Review</h3>
          <hr className="mdj-gold-divider" />
          <label className="row gap-2" style={{ marginBottom: '.75rem' }}>
            <input
              type="checkbox"
              checked={generateTasks}
              onChange={(e)=>setGenerateTasks(e.target.checked)}
              disabled={selectedServices.length === 0}
            />
            <span>Generate tasks for services (uses practice task window)</span>
          </label>
          {selectedServices.length === 0 && (
            <div className="mdj-sub" style={{ marginBottom: '.5rem' }}>
              Select at least one service to enable task generation.
            </div>
          )}
          <div className="mdj-sub">You are about to create:</div>
          <ul style={{ marginTop: '.25rem' }}>
            <li>Client: {client.name} ({client.type}) — Portfolio #{client.portfolioCode}</li>
            <li>Services: {selectedServices.length} — Annualised £{annualValue.toLocaleString()}</li>
            <li>People: {directors.length}</li>
            <li>Auto Tasks: {generateTasks ? 'Enabled' : 'Disabled'}</li>
          </ul>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.5rem' }}>
            <button className="btn-gold" onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Create Client'}</button>
          </div>
        </div>
      )}
    </MDJShell>
  );
}
