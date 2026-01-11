'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { apiClient } from '@/lib/api';

/* ───────── Types ───────── */

interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

type ClientType = 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

interface CreateClientDto {
  name: string;
  type: ClientType;
  portfolioCode: number;
  status?: ClientStatus;
  mainEmail?: string;
  mainPhone?: string;
  registeredNumber?: string;
  address?: Address;
}

interface CompanySearchResult {
  company_number: string;
  title: string;
  company_status: string;
  company_type: string;
  date_of_creation?: string;
  address_snippet?: string;
}

interface CompanyDetails {
  company_number: string;
  company_name: string;
  company_status: string;
  company_type: string;
  date_of_creation: string;
  registered_office_address: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}

/* ───────── Component ───────── */

export default function NewClientPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showCH, setShowCH] = useState(false);
  const [q, setQ] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);

  const [portfolios, setPortfolios] = useState<Array<{ code: number; name: string }>>([]);

  const [form, setForm] = useState<CreateClientDto>({
    name: '',
    type: 'COMPANY',
    portfolioCode: 1,
    status: 'ACTIVE',
    mainEmail: '',
    mainPhone: '',
    registeredNumber: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
    },
  });

  /* ───────── Handlers ───────── */

  useEffect(() => {
    (async () => {
      try {
        const list = await apiClient.get('/portfolios');
        const items = (Array.isArray(list) ? list : []).map((p: any) => ({
          code: Number(p.code ?? p.portfolioCode ?? p.id),
          name: p.name || `Portfolio ${p.code ?? p.portfolioCode ?? p.id}`,
        })).sort((a, b) => a.code - b.code);
        setPortfolios(items);
        // Set default portfolio if available
        if (items.length > 0) {
          setForm(prev => ({ ...prev, portfolioCode: items[0].code }));
        }
      } catch {
        // leave default 1 if endpoint not available
      }
    })();
  }, []);

  const setField = (key: keyof CreateClientDto, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const setAddress = (key: keyof Address, value: string) => {
    setForm(prev => ({ ...prev, address: { ...(prev.address || {}), [key]: value } as Address }));
  };

  const searchCompanies = async () => {
    if (!q.trim()) return;
    setIsSearching(true);
    try {
      const res = await apiClient.get(`/companies-house/search?q=${encodeURIComponent(q)}`);
      setResults(Array.isArray(res) ? res : []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectCompany = async (number: string) => {
    try {
      const company = (await apiClient.get(`/companies-house/company/${number}`)) as CompanyDetails;
      setSelectedCompany(company);

      // Prefill
      setForm(prev => ({
        ...prev,
        name: company.company_name,
        type: 'COMPANY',
        registeredNumber: company.company_number,
        address: {
          line1: company.registered_office_address.address_line_1 || '',
          line2: company.registered_office_address.address_line_2 || '',
          city: company.registered_office_address.locality || '',
          county: company.registered_office_address.region || '',
          postcode: company.registered_office_address.postal_code || '',
          country: company.registered_office_address.country || 'United Kingdom',
        },
      }));

      setShowCH(false);
    } catch (e) {
      console.error('Companies House details error', e);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.type) e.type = 'Type is required';
    if (!form.portfolioCode) e.portfolioCode = 'Portfolio required';
    if (form.mainEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.mainEmail)) e.mainEmail = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const created = await apiClient.post<{ id: string }>('/clients', form);
      router.push(`/clients/${created.id}`);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Error creating client' });
    } finally {
      setLoading(false);
    }
  };

  /* ───────── UI ───────── */

  return (
    <MDJShell
      pageTitle="Add New Client"
      pageSubtitle="Create a new client record in your portfolio"
      actions={[
        {
          label: showCH ? 'Hide CH Search' : 'CH Search',
          onClick: () => setShowCH(v => !v),
          variant: 'outline',
        },
        { label: 'Cancel', href: '/clients', variant: 'outline' },
      ]}
    >
      {/* Divider under header */}
      <hr className="mdj-gold-rule" />

      {/* Companies House search (optional) */}
      {showCH && (
        <div className="card-mdj" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Companies House Search</h3>
            <span className="mdj-sub">Search for UK companies to pre-fill client info</span>
          </div>
          <hr className="mdj-gold-divider" />

          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input
              className="input-mdj"
              placeholder="Enter company name or number..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchCompanies()}
            />
            <button className="btn-gold" onClick={searchCompanies} disabled={isSearching || !q.trim()}>
              {isSearching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {results.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="list-compact" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                {results.map((r) => (
                  <button
                    key={r.company_number}
                    className="item"
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => selectCompany(r.company_number)}
                  >
                    <div className="title" title={r.title}>{r.title}</div>
                    <div className="meta">
                      <span className="gold-ref">{r.company_number}</span>
                      <span className="badge">{r.company_status}</span>
                      <span className="mdj-sub" style={{ textTransform: 'capitalize' }}>
                        {r.company_type?.replace(/-/g, ' ')}
                      </span>
                    </div>
                    {r.address_snippet && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        {r.address_snippet}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="card-mdj" style={{ overflow: 'hidden' }}>
        <h3 style={{ margin: 0 }}>Basic Information</h3>
        <hr className="mdj-gold-divider" />

        <div className="kv" style={{ marginBottom: '1rem' }}>
          <div className="k">Client Name *</div>
          <div className="v">
            <input
              className="input-mdj"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{errors.name}</div>}
          </div>

          <div className="k">Client Type *</div>
          <div className="v">
            <select
              className="input-mdj"
              value={form.type}
              onChange={(e) => setField('type', e.target.value as ClientType)}
            >
              <option value="COMPANY">Company</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="SOLE_TRADER">Sole Trader</option>
              <option value="PARTNERSHIP">Partnership</option>
              <option value="LLP">LLP</option>
            </select>
          </div>

          <div className="k">Portfolio *</div>
          <div className="v">
            <select
              className="input-mdj"
              value={String(form.portfolioCode)}
              onChange={(e) => setField('portfolioCode', parseInt(e.target.value))}
            >
              {portfolios.length === 0 && (
                <option value={form.portfolioCode}>#{form.portfolioCode} — Portfolio {form.portfolioCode}</option>
              )}
              {portfolios.map((p) => (
                <option key={p.code} value={p.code}>#{p.code} — {p.name || `Portfolio ${p.code}`}</option>
              ))}
            </select>
            {errors.portfolioCode && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{errors.portfolioCode}</div>
            )}
          </div>

          <div className="k">Status</div>
          <div className="v">
            <select
              className="input-mdj"
              value={form.status || 'ACTIVE'}
              onChange={(e) => setField('status', e.target.value as ClientStatus)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="k">Registered Number</div>
          <div className="v">
            <input
              className="input-mdj"
              value={form.registeredNumber || ''}
              onChange={(e) => setField('registeredNumber', e.target.value)}
            />
          </div>
        </div>

        {/* Contact */}
        <h3 style={{ margin: 0 }}>Contact Information</h3>
        <hr className="mdj-gold-divider" />
        <div className="kv" style={{ marginBottom: '1rem' }}>
          <div className="k">Email</div>
          <div className="v">
            <input
              className="input-mdj"
              type="email"
              value={form.mainEmail || ''}
              onChange={(e) => setField('mainEmail', e.target.value)}
              aria-invalid={!!errors.mainEmail}
            />
            {errors.mainEmail && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{errors.mainEmail}</div>
            )}
          </div>

          <div className="k">Phone</div>
          <div className="v">
            <input
              className="input-mdj"
              type="tel"
              value={form.mainPhone || ''}
              onChange={(e) => setField('mainPhone', e.target.value)}
            />
          </div>
        </div>

        {/* Address */}
        <h3 style={{ margin: 0 }}>Address</h3>
        <hr className="mdj-gold-divider" />
        <div className="kv">
          <div className="k">Address Line 1</div>
          <div className="v">
            <input className="input-mdj" value={form.address?.line1 || ''} onChange={(e) => setAddress('line1', e.target.value)} />
          </div>

          <div className="k">Address Line 2</div>
          <div className="v">
            <input className="input-mdj" value={form.address?.line2 || ''} onChange={(e) => setAddress('line2', e.target.value)} />
          </div>

          <div className="k">City</div>
          <div className="v">
            <input className="input-mdj" value={form.address?.city || ''} onChange={(e) => setAddress('city', e.target.value)} />
          </div>

          <div className="k">County/State</div>
          <div className="v">
            <input className="input-mdj" value={form.address?.county || ''} onChange={(e) => setAddress('county', e.target.value)} />
          </div>

          <div className="k">Postcode</div>
          <div className="v">
            <input className="input-mdj" value={form.address?.postcode || ''} onChange={(e) => setAddress('postcode', e.target.value)} />
          </div>

          <div className="k">Country</div>
          <div className="v">
            <select
              className="input-mdj"
              value={form.address?.country || 'United Kingdom'}
              onChange={(e) => setAddress('country', e.target.value)}
            >
              <option>United Kingdom</option>
              <option>Ireland</option>
              <option>United States</option>
              <option>Canada</option>
              <option>Australia</option>
            </select>
          </div>
        </div>

        {/* Error banner */}
        {errors.submit && (
          <div className="card-mdj" style={{ marginTop: '1rem', background: 'var(--danger-bg)', borderColor: 'rgba(239,68,68,.35)' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 600 }}>{errors.submit}</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '1rem' }}>
          <button type="button" className="btn-outline-gold" onClick={() => router.push('/clients')}>Cancel</button>
          <button type="submit" className="btn-gold" disabled={loading}>
            {loading ? 'Creating…' : 'Create Client'}
          </button>
        </div>
      </form>
    </MDJShell>
  );
}
