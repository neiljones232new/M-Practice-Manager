'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';
import type { ClientContextWithParties } from '@/lib/types';

type FormState = {
  // Core
  name: string;
  type: string;
  status: string;
  registeredNumber?: string | null;
  utrNumber?: string | null;
  incorporationDate?: string | null;
  accountsAccountingReferenceDay?: number | null;
  accountsAccountingReferenceMonth?: number | null;
  accountsLastMadeUpTo?: string | null;
  accountsNextDue?: string | null;
  confirmationLastMadeUpTo?: string | null;
  confirmationNextDue?: string | null;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressCounty?: string;
  addressPostcode?: string;
  addressCountry?: string;

  // Profile / practice
  mainContactName?: string | null;
  contactPosition?: string | null;
  mainEmail?: string | null;
  mainPhone?: string | null;
  telephone?: string | null;
  mobile?: string | null;
  email?: string | null;
  preferredContactMethod?: string | null;
  correspondenceAddress?: string | null;
  partnerResponsible?: string | null;
  clientManager?: string | null;
  lifecycleStatus?: string | null;
  engagementType?: string | null;
  engagementLetterSigned?: boolean;
  onboardingDate?: string | null;
  disengagementDate?: string | null;
  onboardingStartedAt?: string | null;
  wentLiveAt?: string | null;
  ceasedAt?: string | null;
  dormantSince?: string | null;
  accountingPeriodEnd?: string | null;
  statutoryYearEnd?: string | null;
  nextAccountsDueDate?: string | null;
  nextCorporationTaxDueDate?: string | null;
  vatRegistrationDate?: string | null;
  vatPeriodStart?: string | null;
  vatPeriodEnd?: string | null;
  vatStagger?: string | null;
  payrollPayDay?: number | null;
  payrollPeriodEndDay?: number | null;
  payrollFrequency?: string | null;
  corporationTaxUtr?: string | null;
  vatNumber?: string | null;
  vatScheme?: string | null;
  vatReturnFrequency?: string | null;
  vatQuarter?: string | null;
  payeReference?: string | null;
  payeAccountsOfficeReference?: string | null;
  accountsOfficeReference?: string | null;
  cisRegistered?: boolean;
  cisUtr?: string | null;
  payrollRtiRequired?: boolean;
  amlCompleted?: boolean;
  clientRiskRating?: string | null;
  annualFee?: number | null;
  monthlyFee?: number | null;
  feeArrangement?: string | null;
  businessBankName?: string | null;
  accountLastFour?: string | null;
  directDebitInPlace?: boolean;
  paymentIssues?: string | null;
  notes?: string | null;
  specialCircumstances?: string | null;
  seasonalBusiness?: boolean;
  dormant?: boolean;
  doNotContact?: boolean;
  tradingName?: string | null;
  registeredAddress?: string | null;

  // Personal
  personalUtr?: string | null;
  nationalInsuranceNumber?: string | null;
  dateOfBirth?: string | null;
  personalAddress?: string | null;
  personalTaxYear?: string | null;
  selfAssessmentTaxYear?: string | null;
  selfAssessmentRequired?: boolean;
  selfAssessmentFiled?: boolean;
  linkedCompanyNumber?: string | null;
  directorRole?: string | null;
  clientType?: string | null;
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

const normalizeText = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const pickValue = <T,>(primary: T | null | undefined, fallback: T | null | undefined): T | null => {
  if (primary !== null && primary !== undefined) return primary;
  if (fallback !== null && fallback !== undefined) return fallback;
  return null;
};

const withCustomOption = (value: string | null | undefined, options: string[]) => {
  if (!value) return options;
  return options.includes(value) ? options : [value, ...options];
};

const sectionIdFor = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function ClientFormSection({
  title,
  children,
  initiallyOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const sectionId = sectionIdFor(title);

  return (
    <section id={sectionId} className="card-mdj" style={{ padding: '1rem', scrollMarginTop: 90 }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={`${sectionId}-content`}
        className="mdj-section-toggle"
      >
        <span className="mdj-section-toggle__icon">{open ? '▾' : '▸'}</span>
        <span className="mdj-section-toggle__label">{title}</span>
        <span className="mdj-section-toggle__hint">{open ? 'Hide' : 'Show'}</span>
      </button>
      <hr className="mdj-gold-divider" />
      {open && (
        <div id={`${sectionId}-content`}>
          {children}
        </div>
      )}
    </section>
  );
}

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ClientContextWithParties | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const vatSchemeOptions = ['Standard', 'Flat Rate', 'Cash Accounting', 'Annual Accounting', 'Margin Scheme', 'Reverse Charge', 'Other'];
  const preferredContactOptions = ['Email', 'Phone', 'Portal', 'Post'];
  const payrollFrequencyOptions = ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Not applicable'];
  const engagementTypeOptions = ['Ongoing', 'One-off', 'Advisory', 'Compliance only'];
  const riskRatingOptions = ['Low', 'Medium', 'High', 'Not assessed'];

  useEffect(() => {
    if (!clientId) return;
    let on = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<ClientContextWithParties>(`/clients/${clientId}/with-parties`);
        if (!on) return;
        setContext(data);

        const node = data?.node;
        const profile = data?.profile || {};

        setForm({
          name: node?.name || '',
          type: node?.type || 'COMPANY',
          status: node?.status || 'ACTIVE',
          registeredNumber: node?.registeredNumber || null,
          utrNumber: node?.utrNumber || null,
          incorporationDate: toDateInput(node?.incorporationDate || null),
          accountsAccountingReferenceDay: node?.accountsAccountingReferenceDay ?? null,
          accountsAccountingReferenceMonth: node?.accountsAccountingReferenceMonth ?? null,
          accountsLastMadeUpTo: toDateInput(node?.accountsLastMadeUpTo || null),
          accountsNextDue: toDateInput(node?.accountsNextDue || null),
          confirmationLastMadeUpTo: toDateInput(node?.confirmationLastMadeUpTo || null),
          confirmationNextDue: toDateInput(node?.confirmationNextDue || null),
          addressLine1: node?.address?.line1 || '',
          addressLine2: node?.address?.line2 || '',
          addressCity: node?.address?.city || '',
          addressCounty: node?.address?.county || '',
          addressPostcode: node?.address?.postcode || '',
          addressCountry: node?.address?.country || '',

          mainContactName: pickValue(profile.mainContactName, node?.mainContactName),
          contactPosition: pickValue(profile.contactPosition, (node as any)?.contactPosition),
          mainEmail: pickValue(node?.mainEmail, (profile as any)?.email),
          mainPhone: pickValue(node?.mainPhone, (profile as any)?.telephone),
          telephone: pickValue(profile.telephone, (node as any)?.telephone),
          mobile: pickValue(profile.mobile, (node as any)?.mobile),
          email: pickValue(profile.email, (node as any)?.email),
          preferredContactMethod: pickValue(profile.preferredContactMethod, (node as any)?.preferredContactMethod),
          correspondenceAddress: pickValue(profile.correspondenceAddress, (node as any)?.correspondenceAddress),
          partnerResponsible: pickValue(profile.partnerResponsible, (node as any)?.partnerResponsible),
          clientManager: pickValue(profile.clientManager, (node as any)?.clientManager),
          lifecycleStatus: pickValue(profile.lifecycleStatus, (node as any)?.lifecycleStatus),
          engagementType: pickValue(profile.engagementType, (node as any)?.engagementType),
          engagementLetterSigned: pickValue(profile.engagementLetterSigned, (node as any)?.engagementLetterSigned) ?? false,
          onboardingDate: pickValue(profile.onboardingDate, (node as any)?.onboardingDate),
          disengagementDate: pickValue(profile.disengagementDate, (node as any)?.disengagementDate),
          onboardingStartedAt: pickValue(profile.onboardingStartedAt, (node as any)?.onboardingStartedAt),
          wentLiveAt: pickValue(profile.wentLiveAt, (node as any)?.wentLiveAt),
          ceasedAt: pickValue(profile.ceasedAt, (node as any)?.ceasedAt),
          dormantSince: pickValue(profile.dormantSince, (node as any)?.dormantSince),
          accountingPeriodEnd: pickValue(profile.accountingPeriodEnd, (node as any)?.accountingPeriodEnd),
          statutoryYearEnd: pickValue(profile.statutoryYearEnd, (node as any)?.statutoryYearEnd),
          nextAccountsDueDate: pickValue(profile.nextAccountsDueDate, (node as any)?.nextAccountsDueDate),
          nextCorporationTaxDueDate: pickValue(profile.nextCorporationTaxDueDate, (node as any)?.nextCorporationTaxDueDate),
          vatRegistrationDate: pickValue(profile.vatRegistrationDate, (node as any)?.vatRegistrationDate),
          vatPeriodStart: pickValue(profile.vatPeriodStart, (node as any)?.vatPeriodStart),
          vatPeriodEnd: pickValue(profile.vatPeriodEnd, (node as any)?.vatPeriodEnd),
          vatStagger: pickValue(profile.vatStagger, (node as any)?.vatStagger),
          payrollPayDay: pickValue(profile.payrollPayDay, (node as any)?.payrollPayDay),
          payrollPeriodEndDay: pickValue(profile.payrollPeriodEndDay, (node as any)?.payrollPeriodEndDay),
          payrollFrequency: pickValue(profile.payrollFrequency, (node as any)?.payrollFrequency),
          corporationTaxUtr: pickValue(profile.corporationTaxUtr, (node as any)?.corporationTaxUtr),
          vatNumber: pickValue(profile.vatNumber, (node as any)?.vatNumber),
          vatScheme: pickValue(profile.vatScheme, (node as any)?.vatScheme),
          vatReturnFrequency: pickValue(profile.vatReturnFrequency, (node as any)?.vatReturnFrequency),
          vatQuarter: pickValue(profile.vatQuarter, (node as any)?.vatQuarter),
          payeReference: pickValue(profile.payeReference, (node as any)?.payeReference),
          payeAccountsOfficeReference: pickValue(profile.payeAccountsOfficeReference, (node as any)?.payeAccountsOfficeReference),
          accountsOfficeReference: pickValue(profile.accountsOfficeReference, (node as any)?.accountsOfficeReference),
          cisRegistered: pickValue(profile.cisRegistered, (node as any)?.cisRegistered) ?? false,
          cisUtr: pickValue(profile.cisUtr, (node as any)?.cisUtr),
          payrollRtiRequired: pickValue(profile.payrollRtiRequired, (node as any)?.payrollRtiRequired) ?? false,
          amlCompleted: pickValue(profile.amlCompleted, (node as any)?.amlCompleted) ?? false,
          clientRiskRating: pickValue(profile.clientRiskRating, (node as any)?.clientRiskRating),
          annualFee: pickValue(profile.annualFee, (node as any)?.annualFee),
          monthlyFee: pickValue(profile.monthlyFee, (node as any)?.monthlyFee),
          feeArrangement: pickValue(profile.feeArrangement, (node as any)?.feeArrangement),
          businessBankName: pickValue(profile.businessBankName, (node as any)?.businessBankName),
          accountLastFour: pickValue(profile.accountLastFour, (node as any)?.accountLastFour),
          directDebitInPlace: pickValue(profile.directDebitInPlace, (node as any)?.directDebitInPlace) ?? false,
          paymentIssues: pickValue(profile.paymentIssues, (node as any)?.paymentIssues),
          notes: pickValue(profile.notes, (node as any)?.notes),
          specialCircumstances: pickValue(profile.specialCircumstances, (node as any)?.specialCircumstances),
          seasonalBusiness: pickValue(profile.seasonalBusiness, (node as any)?.seasonalBusiness) ?? false,
          dormant: pickValue(profile.dormant, (node as any)?.dormant) ?? false,
          doNotContact: pickValue(profile.doNotContact, (node as any)?.doNotContact) ?? false,
          tradingName: pickValue(profile.tradingName, (node as any)?.tradingName),
          registeredAddress: pickValue(profile.registeredAddress, (node as any)?.registeredAddress),

          personalUtr: pickValue(profile.personalUtr, (node as any)?.personalUtr),
          nationalInsuranceNumber: pickValue(profile.nationalInsuranceNumber, (node as any)?.nationalInsuranceNumber),
          dateOfBirth: pickValue(profile.dateOfBirth, (node as any)?.dateOfBirth),
          personalAddress: pickValue(profile.personalAddress, (node as any)?.personalAddress),
          personalTaxYear: pickValue(profile.personalTaxYear, (node as any)?.personalTaxYear),
          selfAssessmentTaxYear: pickValue(profile.selfAssessmentTaxYear, (node as any)?.selfAssessmentTaxYear),
          selfAssessmentRequired: pickValue(profile.selfAssessmentRequired, (node as any)?.selfAssessmentRequired) ?? false,
          selfAssessmentFiled: pickValue(profile.selfAssessmentFiled, (node as any)?.selfAssessmentFiled) ?? false,
          linkedCompanyNumber: pickValue(profile.linkedCompanyNumber, (node as any)?.linkedCompanyNumber),
          directorRole: pickValue(profile.directorRole, (node as any)?.directorRole),
          clientType: pickValue(profile.clientType, (node as any)?.clientType),
        });
      } catch (e: any) {
        if (on) setError(e?.message || 'Failed to load client');
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [clientId]);

  const setField = (key: keyof FormState, value: any) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const profileMeta = useMemo(() => {
    if (!context?.node) return '';
    const node = context.node;
    const parts = [node.ref ? `Ref ${node.ref}` : '', node.portfolioCode ? `Portfolio ${node.portfolioCode}` : ''];
    return parts.filter(Boolean).join(' · ');
  }, [context?.node]);

  const handleSave = async () => {
    if (!form || !context?.node) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const nodePayload: any = {
        name: normalizeText(form.name) || context.node.name,
        type: form.type,
        status: form.status,
        registeredNumber: normalizeText(form.registeredNumber),
        utrNumber: normalizeText(form.utrNumber),
        incorporationDate: form.incorporationDate || undefined,
        accountsAccountingReferenceDay: form.accountsAccountingReferenceDay ?? undefined,
        accountsAccountingReferenceMonth: form.accountsAccountingReferenceMonth ?? undefined,
        accountsLastMadeUpTo: form.accountsLastMadeUpTo || undefined,
        accountsNextDue: form.accountsNextDue || undefined,
        confirmationLastMadeUpTo: form.confirmationLastMadeUpTo || undefined,
        confirmationNextDue: form.confirmationNextDue || undefined,
        address: {
          line1: normalizeText(form.addressLine1) || undefined,
          line2: normalizeText(form.addressLine2) || undefined,
          city: normalizeText(form.addressCity) || undefined,
          county: normalizeText(form.addressCounty) || undefined,
          postcode: normalizeText(form.addressPostcode) || undefined,
          country: normalizeText(form.addressCountry) || undefined,
        },
        mainEmail: normalizeText(form.mainEmail),
        mainPhone: normalizeText(form.mainPhone),
      };

      // Fees & billing are service-derived; omit from profile update payload.
      const profilePayload: any = {
        mainContactName: normalizeText(form.mainContactName),
        contactPosition: normalizeText(form.contactPosition),
        telephone: normalizeText(form.telephone),
        mobile: normalizeText(form.mobile),
        email: normalizeText(form.email),
        preferredContactMethod: normalizeText(form.preferredContactMethod),
        correspondenceAddress: normalizeText(form.correspondenceAddress),
        partnerResponsible: normalizeText(form.partnerResponsible),
        clientManager: normalizeText(form.clientManager),
        lifecycleStatus: normalizeText(form.lifecycleStatus),
        engagementType: normalizeText(form.engagementType),
        engagementLetterSigned: form.engagementLetterSigned ?? false,
        onboardingDate: normalizeText(form.onboardingDate),
        disengagementDate: normalizeText(form.disengagementDate),
        onboardingStartedAt: normalizeText(form.onboardingStartedAt),
        wentLiveAt: normalizeText(form.wentLiveAt),
        ceasedAt: normalizeText(form.ceasedAt),
        dormantSince: normalizeText(form.dormantSince),
        accountingPeriodEnd: normalizeText(form.accountingPeriodEnd),
        statutoryYearEnd: normalizeText(form.statutoryYearEnd),
        nextAccountsDueDate: normalizeText(form.nextAccountsDueDate),
        nextCorporationTaxDueDate: normalizeText(form.nextCorporationTaxDueDate),
        vatRegistrationDate: normalizeText(form.vatRegistrationDate),
        vatPeriodStart: normalizeText(form.vatPeriodStart),
        vatPeriodEnd: normalizeText(form.vatPeriodEnd),
        vatStagger: normalizeText(form.vatStagger),
        payrollPayDay: form.payrollPayDay ?? undefined,
        payrollPeriodEndDay: form.payrollPeriodEndDay ?? undefined,
        payrollFrequency: normalizeText(form.payrollFrequency),
        corporationTaxUtr: normalizeText(form.corporationTaxUtr),
        vatNumber: normalizeText(form.vatNumber),
        vatScheme: normalizeText(form.vatScheme),
        vatReturnFrequency: normalizeText(form.vatReturnFrequency),
        vatQuarter: normalizeText(form.vatQuarter),
        payeReference: normalizeText(form.payeReference),
        payeAccountsOfficeReference: normalizeText(form.payeAccountsOfficeReference),
        accountsOfficeReference: normalizeText(form.accountsOfficeReference),
        cisRegistered: form.cisRegistered ?? false,
        cisUtr: normalizeText(form.cisUtr),
        payrollRtiRequired: form.payrollRtiRequired ?? false,
        amlCompleted: form.amlCompleted ?? false,
        clientRiskRating: normalizeText(form.clientRiskRating),
        notes: normalizeText(form.notes),
        specialCircumstances: normalizeText(form.specialCircumstances),
        seasonalBusiness: form.seasonalBusiness ?? false,
        dormant: form.dormant ?? false,
        doNotContact: form.doNotContact ?? false,
        tradingName: normalizeText(form.tradingName),
        registeredAddress: normalizeText(form.registeredAddress),
        personalUtr: normalizeText(form.personalUtr),
        nationalInsuranceNumber: normalizeText(form.nationalInsuranceNumber),
        dateOfBirth: normalizeText(form.dateOfBirth),
        personalAddress: normalizeText(form.personalAddress),
        personalTaxYear: normalizeText(form.personalTaxYear),
        selfAssessmentTaxYear: normalizeText(form.selfAssessmentTaxYear),
        selfAssessmentRequired: form.selfAssessmentRequired ?? false,
        selfAssessmentFiled: form.selfAssessmentFiled ?? false,
        linkedCompanyNumber: normalizeText(form.linkedCompanyNumber),
        directorRole: normalizeText(form.directorRole),
        clientType: normalizeText(form.clientType),
      };

      await api.put(`/clients/${context.node.id}`, nodePayload);
      await api.put(`/clients/${context.node.id}/profile`, profilePayload);
      try {
        const bc = new BroadcastChannel('mdj');
        bc.postMessage({ topic: 'clients:changed' });
        bc.postMessage({ topic: 'client:updated', clientId: context.node.id });
        bc.close();
      } catch {
        // ignore broadcast issues
      }
      setMessage('Client updated.');
      setTimeout(() => router.push(`/clients/${context.node.id}?updated=${Date.now()}`), 600);
    } catch (e: any) {
      setError(e?.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MDJShell
      pageTitle="Edit Client"
      pageSubtitle={context?.node?.name || 'Client details'}
      actions={[
        { label: 'Back to Client', href: `/clients/${clientId}`, variant: 'outline' },
      ]}
    >
      <hr className="mdj-gold-rule" />

      {loading ? (
        <div className="card-mdj" style={{ padding: '1rem' }}>Loading…</div>
      ) : error ? (
        <div className="card-mdj" style={{ padding: '1rem', background: 'var(--status-danger-bg)' }}>
          <span style={{ color: 'var(--danger)' }}>{error}</span>
        </div>
      ) : !form || !context ? (
        <div className="card-mdj" style={{ padding: '1rem' }}>Client not found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
          <aside style={{ position: 'sticky', top: 90 }}>
            <div className="card-mdj" style={{ padding: '0.75rem 0.9rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Quick Nav</div>
              <nav style={{ display: 'grid', gap: 6, fontSize: '0.9rem' }}>
                {[
                  'Profile',
                  'Contact',
                  'Address',
                  'Dates',
                  'Tax & Registration',
                  'Personal (Individual Clients)',
                  'Notes & Flags',
                ].map((section) => (
                  <a key={section} href={`#${sectionIdFor(section)}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    {section}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {message && (
              <div className="card-mdj" style={{ padding: '0.75rem 1rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{message}</span>
              </div>
            )}

            <div className="card-mdj" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Client</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{context.node.name}</div>
                  {profileMeta && <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{profileMeta}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="btn-outline-primary" onClick={() => router.push(`/clients/${context.node.id}`)}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            <ClientFormSection title="Profile">
              <div className="kv">
                <div className="k">Client Name</div>
                <div className="v"><input className="input-mdj" value={form.name} onChange={(e) => setField('name', e.target.value)} /></div>
                <div className="k">Trading Name</div>
                <div className="v"><input className="input-mdj" value={form.tradingName || ''} onChange={(e) => setField('tradingName', e.target.value)} /></div>
                <div className="k">Type</div>
                <div className="v">
                  <select className="input-mdj" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                    {['COMPANY','INDIVIDUAL','SOLE_TRADER','PARTNERSHIP','LLP'].map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="k">Status</div>
                <div className="v">
                  <select className="input-mdj" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                    {['ACTIVE','INACTIVE','ARCHIVED'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="k">Lifecycle</div>
                <div className="v">
                  <select className="input-mdj" value={form.lifecycleStatus || ''} onChange={(e) => setField('lifecycleStatus', e.target.value)}>
                    <option value="">—</option>
                    {['PROSPECT','ONBOARDING','ACTIVE','DORMANT','CEASED'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="k">Engagement Type</div>
                <div className="v">
                  <select className="input-mdj" value={form.engagementType || ''} onChange={(e) => setField('engagementType', e.target.value)}>
                    <option value="">—</option>
                    {withCustomOption(form.engagementType, engagementTypeOptions).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="k">Engagement Letter Signed</div>
                <div className="v"><input type="checkbox" checked={!!form.engagementLetterSigned} onChange={(e) => setField('engagementLetterSigned', e.target.checked)} /></div>
                <div className="k">Partner Responsible</div>
                <div className="v"><input className="input-mdj" value={form.partnerResponsible || ''} onChange={(e) => setField('partnerResponsible', e.target.value)} /></div>
                <div className="k">Client Manager</div>
                <div className="v"><input className="input-mdj" value={form.clientManager || ''} onChange={(e) => setField('clientManager', e.target.value)} /></div>
                <div className="k">AML Completed</div>
                <div className="v"><input type="checkbox" checked={!!form.amlCompleted} onChange={(e) => setField('amlCompleted', e.target.checked)} /></div>
                <div className="k">Risk Rating</div>
                <div className="v">
                  <select className="input-mdj" value={form.clientRiskRating || ''} onChange={(e) => setField('clientRiskRating', e.target.value)}>
                    <option value="">—</option>
                    {withCustomOption(form.clientRiskRating, riskRatingOptions).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="k">Do Not Contact</div>
                <div className="v"><input type="checkbox" checked={!!form.doNotContact} onChange={(e) => setField('doNotContact', e.target.checked)} /></div>
              </div>
            </ClientFormSection>

            <ClientFormSection title="Contact">
              <div className="kv">
                <div className="k">Main Contact Name</div>
                <div className="v"><input className="input-mdj" value={form.mainContactName || ''} onChange={(e) => setField('mainContactName', e.target.value)} /></div>
                <div className="k">Contact Position</div>
                <div className="v"><input className="input-mdj" value={form.contactPosition || ''} onChange={(e) => setField('contactPosition', e.target.value)} /></div>
                <div className="k">Main Email</div>
                <div className="v"><input className="input-mdj" value={form.mainEmail || ''} onChange={(e) => setField('mainEmail', e.target.value)} /></div>
                <div className="k">Main Phone</div>
                <div className="v"><input className="input-mdj" value={form.mainPhone || ''} onChange={(e) => setField('mainPhone', e.target.value)} /></div>
                <div className="k">Telephone</div>
                <div className="v"><input className="input-mdj" value={form.telephone || ''} onChange={(e) => setField('telephone', e.target.value)} /></div>
                <div className="k">Mobile</div>
                <div className="v"><input className="input-mdj" value={form.mobile || ''} onChange={(e) => setField('mobile', e.target.value)} /></div>
                <div className="k">Email (Practice)</div>
                <div className="v"><input className="input-mdj" value={form.email || ''} onChange={(e) => setField('email', e.target.value)} /></div>
                <div className="k">Preferred Contact Method</div>
                <div className="v">
                  <select className="input-mdj" value={form.preferredContactMethod || ''} onChange={(e) => setField('preferredContactMethod', e.target.value)}>
                    <option value="">—</option>
                    {withCustomOption(form.preferredContactMethod, preferredContactOptions).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="k">Correspondence Address</div>
                <div className="v"><input className="input-mdj" value={form.correspondenceAddress || ''} onChange={(e) => setField('correspondenceAddress', e.target.value)} /></div>
              </div>
            </ClientFormSection>

            <ClientFormSection title="Address">
              <div className="kv">
                <div className="k">Line 1</div>
                <div className="v"><input className="input-mdj" value={form.addressLine1 || ''} onChange={(e) => setField('addressLine1', e.target.value)} /></div>
                <div className="k">Line 2</div>
                <div className="v"><input className="input-mdj" value={form.addressLine2 || ''} onChange={(e) => setField('addressLine2', e.target.value)} /></div>
                <div className="k">City</div>
                <div className="v"><input className="input-mdj" value={form.addressCity || ''} onChange={(e) => setField('addressCity', e.target.value)} /></div>
                <div className="k">County</div>
                <div className="v"><input className="input-mdj" value={form.addressCounty || ''} onChange={(e) => setField('addressCounty', e.target.value)} /></div>
                <div className="k">Postcode</div>
                <div className="v"><input className="input-mdj" value={form.addressPostcode || ''} onChange={(e) => setField('addressPostcode', e.target.value)} /></div>
                <div className="k">Country</div>
                <div className="v"><input className="input-mdj" value={form.addressCountry || ''} onChange={(e) => setField('addressCountry', e.target.value)} /></div>
                <div className="k">Registered Address (DB)</div>
                <div className="v"><input className="input-mdj" value={form.registeredAddress || ''} onChange={(e) => setField('registeredAddress', e.target.value)} /></div>
              </div>
            </ClientFormSection>

            <ClientFormSection title="Dates">
              <div className="kv">
                <div className="k">Incorporation Date</div>
                <div className="v"><input type="date" className="input-mdj" value={form.incorporationDate || ''} onChange={(e) => setField('incorporationDate', e.target.value)} /></div>
                <div className="k">Accounting Period End</div>
                <div className="v"><input className="input-mdj" value={form.accountingPeriodEnd || ''} onChange={(e) => setField('accountingPeriodEnd', e.target.value)} /></div>
                <div className="k">Statutory Year End</div>
                <div className="v"><input className="input-mdj" value={form.statutoryYearEnd || ''} onChange={(e) => setField('statutoryYearEnd', e.target.value)} /></div>
                <div className="k">Accounts Last Made Up To</div>
                <div className="v"><input type="date" className="input-mdj" value={form.accountsLastMadeUpTo || ''} onChange={(e) => setField('accountsLastMadeUpTo', e.target.value)} /></div>
                <div className="k">Accounts Next Due</div>
                <div className="v"><input type="date" className="input-mdj" value={form.accountsNextDue || ''} onChange={(e) => setField('accountsNextDue', e.target.value)} /></div>
                <div className="k">Confirmation Last Made Up To</div>
                <div className="v"><input type="date" className="input-mdj" value={form.confirmationLastMadeUpTo || ''} onChange={(e) => setField('confirmationLastMadeUpTo', e.target.value)} /></div>
                <div className="k">Confirmation Next Due</div>
                <div className="v"><input type="date" className="input-mdj" value={form.confirmationNextDue || ''} onChange={(e) => setField('confirmationNextDue', e.target.value)} /></div>
                <div className="k">Onboarding Date</div>
                <div className="v"><input type="date" className="input-mdj" value={toDateInput(form.onboardingDate)} onChange={(e) => setField('onboardingDate', e.target.value)} /></div>
                <div className="k">Disengagement Date</div>
                <div className="v"><input type="date" className="input-mdj" value={toDateInput(form.disengagementDate)} onChange={(e) => setField('disengagementDate', e.target.value)} /></div>
                <div className="k">Went Live At</div>
                <div className="v"><input type="date" className="input-mdj" value={toDateInput(form.wentLiveAt)} onChange={(e) => setField('wentLiveAt', e.target.value)} /></div>
                <div className="k">Ceased At</div>
                <div className="v"><input type="date" className="input-mdj" value={toDateInput(form.ceasedAt)} onChange={(e) => setField('ceasedAt', e.target.value)} /></div>
              </div>
            </ClientFormSection>

            <ClientFormSection title="Tax & Registration">
              <div className="kv">
                <div className="k">Corporation Tax UTR</div>
                <div className="v"><input className="input-mdj" value={form.corporationTaxUtr || ''} onChange={(e) => setField('corporationTaxUtr', e.target.value)} /></div>
                <div className="k">VAT Number</div>
                <div className="v"><input className="input-mdj" value={form.vatNumber || ''} onChange={(e) => setField('vatNumber', e.target.value)} /></div>
                <div className="k">VAT Registration Date</div>
                <div className="v"><input type="date" className="input-mdj" value={toDateInput(form.vatRegistrationDate)} onChange={(e) => setField('vatRegistrationDate', e.target.value)} /></div>
                <div className="k">VAT Scheme</div>
                <div className="v">
                  <select className="input-mdj" value={form.vatScheme || ''} onChange={(e) => setField('vatScheme', e.target.value)}>
                    <option value="">—</option>
                    {form.vatScheme && !vatSchemeOptions.includes(form.vatScheme) && (
                      <option value={form.vatScheme}>{form.vatScheme}</option>
                    )}
                    {vatSchemeOptions.map((scheme) => (
                      <option key={scheme} value={scheme}>{scheme}</option>
                    ))}
                  </select>
                </div>
                <div className="k">VAT Return Frequency</div>
                <div className="v"><input className="input-mdj" value={form.vatReturnFrequency || ''} onChange={(e) => setField('vatReturnFrequency', e.target.value)} /></div>
                <div className="k">VAT Quarter</div>
                <div className="v"><input className="input-mdj" value={form.vatQuarter || ''} onChange={(e) => setField('vatQuarter', e.target.value)} /></div>
                <div className="k">VAT Period Start</div>
                <div className="v"><input className="input-mdj" value={form.vatPeriodStart || ''} onChange={(e) => setField('vatPeriodStart', e.target.value)} /></div>
                <div className="k">VAT Period End</div>
                <div className="v"><input className="input-mdj" value={form.vatPeriodEnd || ''} onChange={(e) => setField('vatPeriodEnd', e.target.value)} /></div>
                <div className="k">VAT Stagger</div>
                <div className="v">
                  <select className="input-mdj" value={form.vatStagger || ''} onChange={(e) => setField('vatStagger', e.target.value)}>
                    <option value="">—</option>
                    {form.vatStagger && !['A', 'B', 'C', 'NONE'].includes(form.vatStagger) && (
                      <option value={form.vatStagger}>{form.vatStagger}</option>
                    )}
                    {['A', 'B', 'C', 'NONE'].map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="k">PAYE Reference</div>
                <div className="v"><input className="input-mdj" value={form.payeReference || ''} onChange={(e) => setField('payeReference', e.target.value)} /></div>
                <div className="k">PAYE Accounts Office Ref</div>
                <div className="v"><input className="input-mdj" value={form.payeAccountsOfficeReference || ''} onChange={(e) => setField('payeAccountsOfficeReference', e.target.value)} /></div>
                <div className="k">Accounts Office Ref</div>
                <div className="v"><input className="input-mdj" value={form.accountsOfficeReference || ''} onChange={(e) => setField('accountsOfficeReference', e.target.value)} /></div>
                <div className="k">CIS Registered</div>
                <div className="v"><input type="checkbox" checked={!!form.cisRegistered} onChange={(e) => setField('cisRegistered', e.target.checked)} /></div>
                <div className="k">CIS UTR</div>
                <div className="v"><input className="input-mdj" value={form.cisUtr || ''} onChange={(e) => setField('cisUtr', e.target.value)} /></div>
                <div className="k">Payroll RTI Required</div>
                <div className="v"><input type="checkbox" checked={!!form.payrollRtiRequired} onChange={(e) => setField('payrollRtiRequired', e.target.checked)} /></div>
                <div className="k">Payroll Frequency</div>
                <div className="v">
                  <select className="input-mdj" value={form.payrollFrequency || ''} onChange={(e) => setField('payrollFrequency', e.target.value)}>
                    <option value="">—</option>
                    {withCustomOption(form.payrollFrequency, payrollFrequencyOptions).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="k">Payroll Pay Day</div>
                <div className="v"><input className="input-mdj" value={form.payrollPayDay ?? ''} onChange={(e) => setField('payrollPayDay', e.target.value === '' ? null : Number(e.target.value))} /></div>
                <div className="k">Payroll Period End Day</div>
                <div className="v"><input className="input-mdj" value={form.payrollPeriodEndDay ?? ''} onChange={(e) => setField('payrollPeriodEndDay', e.target.value === '' ? null : Number(e.target.value))} /></div>
              </div>
            </ClientFormSection>

            <ClientFormSection title="Personal (Individual Clients)">
              <div className="kv">
                <div className="k">Personal UTR</div>
                <div className="v"><input className="input-mdj" value={form.personalUtr || ''} onChange={(e) => setField('personalUtr', e.target.value)} /></div>
                <div className="k">NI Number</div>
                <div className="v"><input className="input-mdj" value={form.nationalInsuranceNumber || ''} onChange={(e) => setField('nationalInsuranceNumber', e.target.value)} /></div>
                <div className="k">Date of Birth</div>
                <div className="v"><input type="date" className="input-mdj" value={toDateInput(form.dateOfBirth)} onChange={(e) => setField('dateOfBirth', e.target.value)} /></div>
                <div className="k">Personal Address</div>
                <div className="v"><input className="input-mdj" value={form.personalAddress || ''} onChange={(e) => setField('personalAddress', e.target.value)} /></div>
                <div className="k">Personal Tax Year</div>
                <div className="v"><input className="input-mdj" value={form.personalTaxYear || ''} onChange={(e) => setField('personalTaxYear', e.target.value)} /></div>
                <div className="k">Self Assessment Tax Year</div>
                <div className="v"><input className="input-mdj" value={form.selfAssessmentTaxYear || ''} onChange={(e) => setField('selfAssessmentTaxYear', e.target.value)} /></div>
                <div className="k">Self Assessment Required</div>
                <div className="v"><input type="checkbox" checked={!!form.selfAssessmentRequired} onChange={(e) => setField('selfAssessmentRequired', e.target.checked)} /></div>
                <div className="k">Self Assessment Filed</div>
                <div className="v"><input type="checkbox" checked={!!form.selfAssessmentFiled} onChange={(e) => setField('selfAssessmentFiled', e.target.checked)} /></div>
                <div className="k">Linked Company Number</div>
                <div className="v"><input className="input-mdj" value={form.linkedCompanyNumber || ''} onChange={(e) => setField('linkedCompanyNumber', e.target.value)} /></div>
                <div className="k">Director Role</div>
                <div className="v"><input className="input-mdj" value={form.directorRole || ''} onChange={(e) => setField('directorRole', e.target.value)} /></div>
                <div className="k">Client Type (Personal)</div>
                <div className="v"><input className="input-mdj" value={form.clientType || ''} onChange={(e) => setField('clientType', e.target.value)} /></div>
              </div>
            </ClientFormSection>

            <ClientFormSection title="Notes & Flags">
              <div className="kv">
                <div className="k">Notes</div>
                <div className="v"><textarea className="input-mdj" value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} /></div>
                <div className="k">Special Circumstances</div>
                <div className="v"><textarea className="input-mdj" value={form.specialCircumstances || ''} onChange={(e) => setField('specialCircumstances', e.target.value)} /></div>
                <div className="k">Seasonal Business</div>
                <div className="v"><input type="checkbox" checked={!!form.seasonalBusiness} onChange={(e) => setField('seasonalBusiness', e.target.checked)} /></div>
                <div className="k">Dormant</div>
                <div className="v"><input type="checkbox" checked={!!form.dormant} onChange={(e) => setField('dormant', e.target.checked)} /></div>
              </div>
            </ClientFormSection>
          </div>
        </div>
      )}
    </MDJShell>
  );
}
