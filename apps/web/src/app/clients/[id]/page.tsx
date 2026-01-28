'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api, API_BASE_URL } from '@/lib/api';
import type { ClientContextWithParties, ServiceEligibility } from '@/lib/types';

type ClientType = 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
type Person = {
  id: string;
  ref?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  dateOfBirth?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE' | string;
  dueDate?: string;
  tags?: string[];
  serviceId?: string;
};

type Compliance = {
  id: string;
  clientId?: string;
  serviceId?: string;
  type: string;
  description?: string;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT' | string;
  dueDate?: string;
  period?: string;
  source?: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL' | string;
};

type Document = {
  id: string;
  filename: string;
  category?: string;
  uploadedAt: string;
  mimeType?: string;
  originalName?: string;
};

type Service = {
  id: string;
  kind?: string;
  description?: string;
  frequency?: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  fee?: number;
  annualized?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  nextDue?: string;
  eligibility?: ServiceEligibility;
};

type AccountsSet = {
  id: string;
  clientId: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'READY' | 'LOCKED' | string;
  updatedAt?: string;
  framework?: string;
  companyNumber?: string;
  period?: {
    startDate: string;
    endDate: string;
    isFirstYear?: boolean;
  };
  sections?: {
    companyPeriod?: {
      company?: {
        name?: string;
      };
    };
  };
};

type TaxCalculation = {
  id: string;
  clientId: string;
  calculationType?: string;
  taxYear?: string;
  totalTakeHome?: number;
  totalTaxLiability?: number;
  estimatedSavings?: number;
  createdAt?: string;
  calculatedAt?: string;
};

type GeneratedLetter = {
  id: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  clientId: string;
  clientName: string;
  serviceId?: string;
  serviceName?: string;
  documentId: string;
  placeholderValues: Record<string, any>;
  generatedBy: string;
  generatedAt: string;
  status: 'DRAFT' | 'GENERATED' | 'DOWNLOADED' | 'SENT' | 'ARCHIVED';
  downloadCount: number;
  lastDownloadedAt?: string;
};
type HMRCRegistrationStatus =
  | 'NOT_REGISTERED'
  | 'NOT_APPLICABLE'
  | 'APPLIED_FOR'
  | 'REGISTERED'
  | 'DEREGISTERED'
  | 'MISSING_DATA';

type HMRCRegistrationRow = {
  type: string;
  status: HMRCRegistrationStatus;
  reference?: string;
};
type Template = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  version?: number;
  isActive?: boolean;
  placeholders?: Array<{ key: string; required?: boolean }>;
};
const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatCurrency = (value?: number) => (typeof value === 'number' ? currencyFormatter.format(value) : '—');
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HMRC_STATUS_LABELS: Record<HMRCRegistrationStatus, string> = {
  NOT_REGISTERED: 'Not registered',
  NOT_APPLICABLE: 'Not applicable',
  APPLIED_FOR: 'Applied for',
  REGISTERED: 'Registered',
  DEREGISTERED: 'Deregistered',
  MISSING_DATA: 'Not recorded',
};

const normalizeHmrcStatus = (value?: string | null): HMRCRegistrationStatus => {
  const key = String(value || '').toUpperCase();
  if (key === 'NOT_REGISTERED') return 'NOT_REGISTERED';
  if (key === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (key === 'APPLIED_FOR') return 'APPLIED_FOR';
  if (key === 'REGISTERED') return 'REGISTERED';
  if (key === 'DEREGISTERED') return 'DEREGISTERED';
  return 'MISSING_DATA';
};

const hmrcStatusBadge = (status: HMRCRegistrationStatus) => {
  if (status === 'REGISTERED') return 'success';
  if (status === 'APPLIED_FOR') return 'warning';
  if (status === 'NOT_REGISTERED') return 'default';
  if (status === 'MISSING_DATA') return 'default';
  return 'default';
};

const complianceAuthority = (source?: string | null) => {
  const key = String(source || '').toUpperCase();
  if (key === 'COMPANIES_HOUSE') return 'Companies House';
  if (key === 'HMRC') return 'HMRC';
  return 'Manual';
};

export default function ClientDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const clientId = params?.id as string;

  const [clientContext, setClientContext] = useState<ClientContextWithParties | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [compliance, setCompliance] = useState<Compliance[]>([]);
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [accountsSets, setAccountsSets] = useState<AccountsSet[]>([]);
  const [taxCalculations, setTaxCalculations] = useState<TaxCalculation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [partyPeople, setPartyPeople] = useState<Record<string, Person | null>>({});
  const [syncMessage, setSyncMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [chLoading, setChLoading] = useState(false);
  const [chOfficers, setChOfficers] = useState<any[]>([]);
  const [chPscs, setChPscs] = useState<any[]>([]);
  const [chFilings, setChFilings] = useState<any[]>([]);
  const [docDeleting, setDocDeleting] = useState<Record<string, boolean>>({});
  const [lettersDownloading, setLettersDownloading] = useState<Record<string, boolean>>({});
  const [tabMessage, setTabMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [chError, setChError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState<string>('OTHER');
  const [docDescription, setDocDescription] = useState<string>('');
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadMsg, setDocUploadMsg] = useState<string | null>(null);
  const [letterTemplateId, setLetterTemplateId] = useState<string>('');
  const [letterServiceId, setLetterServiceId] = useState<string>('');
  const [letterIncludeDocx, setLetterIncludeDocx] = useState(false);
  const [letterGenerating, setLetterGenerating] = useState(false);
  const [letterPreviewing, setLetterPreviewing] = useState(false);
  const [letterGenMsg, setLetterGenMsg] = useState<string | null>(null);
  const [showAllFilings, setShowAllFilings] = useState(false);
  const [showFormerOfficers, setShowFormerOfficers] = useState(false);
  const [showFormerPscs, setShowFormerPscs] = useState(false);

  const [tab, setTab] = useState<'profile' | 'services' | 'accounts' | 'tax' | 'tasks' | 'compliance' | 'documents' | 'letters' | 'ch' | 'people'>('profile');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const peopleCacheRef = useRef<Record<string, Person | null>>({});

  const client = clientContext?.node ?? null;
  const profile = clientContext?.profile;
  const computed = clientContext?.computed;
  const partiesDetails = useMemo(() => clientContext?.partiesDetails ?? [], [clientContext?.partiesDetails]);


  useEffect(() => {
    (async () => {
      try {
        const list = await api.get('/templates', { params: { isActive: 'true' } });
        const items = Array.isArray(list) ? list : [];
        setTemplates(items);
        setLetterTemplateId((prev) => prev || items[0]?.id || '');
      } catch {
        setTemplates([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let on = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const c = await api.get<ClientContextWithParties>(`/clients/${clientId}/with-parties`, { params: { t: refreshTick } }).catch((e) => {
          throw new Error((e as Error)?.message || 'Failed to load client');
        });

        const effectiveId = c?.node?.id || clientId;
        const [s, t, d, comp, ltrs, aSets, tCalcs] = await Promise.all([
          api.get(`/services/client/${effectiveId}`).catch(() => []) as Promise<Service[]>,
          api.get(`/tasks/client/${effectiveId}`).catch(() => []) as Promise<Task[]>,
          api.get(`/documents/client/${effectiveId}`).catch(() => []) as Promise<any>,
          api.get(`/compliance?clientId=${effectiveId}`).catch(() => []) as Promise<Compliance[]>,
          api.get(`/letters/client/${effectiveId}`).catch(() => []) as Promise<GeneratedLetter[]>,
          api.get(`/accounts-sets/client/${effectiveId}`).catch(() => []) as Promise<AccountsSet[]>,
          api.get(`/tax-calculations/client/${effectiveId}`).catch(() => []) as Promise<TaxCalculation[]>,
        ]);

        if (on) {
          setClientContext(c);
          setPartyPeople({});
          peopleCacheRef.current = {};
          setServices(Array.isArray(s) ? s : []);
          setTasks(Array.isArray(t) ? t : []);
          const docs = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
          setDocuments(docs);
          setCompliance(Array.isArray(comp) ? comp : []);
          setLetters(Array.isArray(ltrs) ? ltrs : []);
          setAccountsSets(Array.isArray(aSets) ? aSets : []);
          setTaxCalculations(Array.isArray(tCalcs) ? tCalcs : []);
        }
      } catch (e: any) {
        if (on) setErr(e?.message || 'Failed to load');
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [clientId, refreshTick]);

  useEffect(() => {
    const updated = searchParams?.get('updated');
    if (updated) {
      setRefreshTick((t) => t + 1);
    }
  }, [searchParams]);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('mdj');
      bc.onmessage = (ev) => {
        if (ev?.data?.topic === 'clients:changed') {
          setRefreshTick((t) => t + 1);
        }
        if (ev?.data?.topic === 'client:updated' && ev?.data?.clientId === clientId) {
          setRefreshTick((t) => t + 1);
        }
      };
    } catch {
      // ignore BroadcastChannel issues
    }
    return () => {
      try { bc?.close(); } catch {}
    };
  }, [clientId]);

  const refreshDocuments = async (targetId: string) => {
    const res = await api.get(`/documents/client/${targetId}`).catch(() => null);
    const docs = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
    setDocuments(docs);
  };

  const refreshLetters = async (targetId: string) => {
    const res = await api.get(`/letters/client/${targetId}`).catch(() => null);
    setLetters(Array.isArray(res) ? res : []);
  };

  // Load CH data when CH tab opens
  useEffect(() => {
    const num = client?.registeredNumber;
    if (tab !== 'ch' || !num) return;
    let on = true;
    (async () => {
      try {
        setChLoading(true);
        setChError(null);
        const [offRes, pscRes, fhRes] = await Promise.allSettled([
          api.get(`/companies-house/company/${num}/officers`),
          api.get(`/companies-house/company/${num}/persons-with-significant-control`),
          api.get(`/companies-house/company/${num}/filing-history`),
        ]);

        const firstError =
          offRes.status === 'rejected'
            ? offRes.reason
            : pscRes.status === 'rejected'
            ? pscRes.reason
            : fhRes.status === 'rejected'
            ? fhRes.reason
            : null;

        if (firstError) {
          setChError(firstError?.message || 'Failed to load Companies House data.');
        }

        const off = offRes.status === 'fulfilled' ? offRes.value : { items: [] };
        const psc = pscRes.status === 'fulfilled' ? pscRes.value : { items: [] };
        const fh = fhRes.status === 'fulfilled' ? fhRes.value : { items: [] };
        if (!on) return;
        setChOfficers(Array.isArray(off) ? off : (off as any)?.items || []);
        setChPscs(Array.isArray(psc) ? psc : (psc as any)?.items || []);
        setChFilings(Array.isArray(fh) ? fh : (fh as any)?.items || []);
      } finally {
        setChLoading(false);
      }
    })();
    return () => { on = false; };
  }, [tab, client?.registeredNumber]);

  const getTaskBadge = (status: Task['status']) => {
    const key = String(status || '').toUpperCase();
    if (key === 'COMPLETED') return 'success';
    if (key === 'OVERDUE') return 'danger';
    if (key === 'IN_PROGRESS') return 'warning';
    if (key === 'CANCELLED') return 'default';
    return 'default';
  };

  const getComplianceBadge = (status: Compliance['status']) => {
    const key = String(status || '').toUpperCase();
    if (key === 'FILED') return 'success';
    if (key === 'OVERDUE') return 'danger';
    if (key === 'PENDING') return 'warning';
    return 'default';
  };

  const handleDeleteClient = async () => {
    const targetId = client?.id || clientId;
    if (!targetId) return;
    const ok = window.confirm('Delete this client? This cannot be undone.');
    if (!ok) return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      await api.delete(`/clients/${targetId}?force=1`);
      router.push('/clients');
    } catch (e: any) {
      setDeleteMsg(e?.message || 'Failed to delete client.');
    } finally {
      setDeleting(false);
    }
  };


  const handleDocumentDownload = async (doc: Document, preview = false) => {
    try {
      const buffer = await api.get<ArrayBuffer>(`/documents/${doc.id}/${preview ? 'preview' : 'download'}`);
      const blob = new Blob([buffer], { type: (doc as any)?.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      if (preview) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = (doc as any)?.originalName || doc.filename || `document-${doc.id}`;
        a.click();
      }
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setTabMessage({ text: e?.message || 'Failed to download document.', error: true });
    }
  };

  const handleDeleteDocument = async (id: string) => {
    const ok = window.confirm('Delete this document?');
    if (!ok) return;
    setDocDeleting((prev) => ({ ...prev, [id]: true }));
    setTabMessage(null);
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setTabMessage({ text: 'Document deleted.' });
    } catch (e: any) {
      setTabMessage({ text: e?.message || 'Failed to delete document.', error: true });
    } finally {
      setDocDeleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleUploadDocument = async () => {
    if (!client?.id) return;
    if (!docFile) {
      setDocUploadMsg('Select a file to upload.');
      return;
    }
    setDocUploading(true);
    setDocUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('clientId', client.id);
      formData.append('category', docCategory);
      if (docDescription) formData.append('description', docDescription);

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Upload failed');
      }

      setDocFile(null);
      setDocDescription('');
      await refreshDocuments(client.id);
      setDocUploadMsg('Document uploaded.');
    } catch (e: any) {
      setDocUploadMsg(e?.message || 'Failed to upload document.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDownloadLetter = async (letter: GeneratedLetter, format: 'PDF' | 'DOCX') => {
    setLettersDownloading((prev) => ({ ...prev, [letter.id]: true }));
    setTabMessage(null);
    try {
      const buffer = await api.get<ArrayBuffer>(`/letters/${letter.id}/download?format=${format}`);
      const mime =
        format === 'PDF'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const blob = new Blob([buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `letter-${letter.id}.${format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setTabMessage({ text: e?.message || 'Failed to download letter.', error: true });
    } finally {
      setLettersDownloading((prev) => ({ ...prev, [letter.id]: false }));
    }
  };

  const handleGenerateLetter = async () => {
    if (!client?.id || !letterTemplateId) return;
    setLetterGenerating(true);
    setLetterGenMsg(null);
    try {
      const outputFormats = ['PDF'] as Array<'PDF' | 'DOCX'>;
      if (letterIncludeDocx) outputFormats.push('DOCX');
      await api.post('/letters/generate', {
        templateId: letterTemplateId,
        clientId: client.id,
        serviceId: letterServiceId || undefined,
        outputFormats,
        autoSave: true,
      });
      await refreshLetters(client.id);
      await refreshDocuments(client.id);
      setLetterGenMsg('Letter generated and saved.');
    } catch (e: any) {
      setLetterGenMsg(e?.message || 'Failed to generate letter.');
    } finally {
      setLetterGenerating(false);
    }
  };

  const handlePreviewLetter = async () => {
    if (!client?.id || !letterTemplateId) return;
    setLetterPreviewing(true);
    setLetterGenMsg(null);
    try {
      const res = await api.post<{ preview?: string }>('/letters/preview', {
        templateId: letterTemplateId,
        clientId: client.id,
        serviceId: letterServiceId || undefined,
      });
      const html = res?.preview || '';
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch (e: any) {
      setLetterGenMsg(e?.message || 'Failed to preview letter.');
    } finally {
      setLetterPreviewing(false);
    }
  };

  useEffect(() => {
    const parties = partiesDetails ?? [];
    if (parties.length === 0) {
      setPartyPeople((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    let on = true;
    (async () => {
      const uniqueIds = Array.from(
        new Set(parties.map((party) => party.personId).filter((id): id is string => Boolean(id)))
      );
      const cachedMap = peopleCacheRef.current;
      const missingIds = uniqueIds.filter((personId) => !(personId in cachedMap));

      const results = await Promise.all(
        missingIds.map(async (personId) => {
          try {
            const person = await api.get<Person>(`/clients/people/${personId}`);
            return { personId, person };
          } catch {
            return { personId, person: null };
          }
        })
      );

      if (!on) return;

      results.forEach(({ personId, person }) => {
        cachedMap[personId] = person;
      });

      const map: Record<string, Person | null> = {};
      uniqueIds.forEach((personId) => {
        map[personId] = cachedMap[personId] ?? null;
      });
      setPartyPeople(map);
    })();

    return () => {
      on = false;
    };
  }, [partiesDetails]);

  const addressLine = useMemo(() => {
    if (!client?.address) return '';
    const a = client.address;
    return [a.line1, a.line2, a.city, a.county, a.postcode, a.country].filter(Boolean).join(', ');
  }, [client]);

  const primaryParty = useMemo(() => {
    return partiesDetails.find((party) => party.primaryContact);
  }, [partiesDetails]);

  const primaryPerson = primaryParty?.personId ? partyPeople[primaryParty.personId] : null;
  const parties = partiesDetails;
  const sortedFilings = useMemo(() => {
    const list = Array.isArray(chFilings) ? [...chFilings] : [];
    const getDate = (item: any) => item?.date || item?.transaction_date || item?.received_date;
    list.sort((a, b) => {
      const ad = getDate(a);
      const bd = getDate(b);
      const at = ad ? new Date(ad).getTime() : 0;
      const bt = bd ? new Date(bd).getTime() : 0;
      return bt - at;
    });
    return list;
  }, [chFilings]);
  const currentOfficers = useMemo(() => chOfficers.filter((o: any) => !o.resigned_on), [chOfficers]);
  const formerOfficers = useMemo(() => chOfficers.filter((o: any) => o.resigned_on), [chOfficers]);
  const currentPscs = useMemo(() => chPscs.filter((p: any) => !p.ceased_on), [chPscs]);
  const formerPscs = useMemo(() => chPscs.filter((p: any) => p.ceased_on), [chPscs]);
  const displayedFilings = useMemo(
    () => (showAllFilings ? sortedFilings : sortedFilings.slice(0, 10)),
    [sortedFilings, showAllFilings]
  );

  const formatFilingDescription = (f: any) => {
    if (f?.description) return f.description;
    const values = f?.description_values;
    if (values && typeof values === 'object') {
      const parts = Object.entries(values)
        .map(([k, v]) => `${String(k).replace(/_/g, ' ')}: ${String(v)}`);
      return parts.length ? parts.join(' · ') : '—';
    }
    return '—';
  };

  const downloadClientCsv = () => {
    if (!client) return;
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      const needsQuotes = /[",\n]/.test(s);
      const t = s.replace(/"/g, '""');
      return needsQuotes ? `"${t}"` : t;
    };
    const rows: string[] = [];

    const pushSection = (title: string, headers: string[], data: any[][]) => {
      rows.push(title);
      rows.push(headers.map(esc).join(','));
      data.forEach((line) => rows.push(line.map(esc).join(',')));
      rows.push('');
    };

    pushSection(
      'Client',
      ['id', 'ref', 'name', 'type', 'status', 'portfolioCode', 'mainEmail', 'mainPhone', 'registeredNumber', 'utrNumber'],
      [[
        client.id,
        client.ref || '',
        client.name,
        client.type,
        client.status,
        client.portfolioCode || '',
        client.mainEmail || '',
        client.mainPhone || '',
        client.registeredNumber || '',
        client.utrNumber || '',
      ]]
    );

    pushSection(
      'Services',
      ['id', 'kind', 'frequency', 'fee', 'annualized', 'status', 'nextDue'],
      services.map((s) => [s.id, s.kind || '', s.frequency || '', s.fee || '', s.annualized || '', s.status || '', s.nextDue || ''])
    );

    pushSection(
      'AccountsSets',
      ['id', 'status', 'companyNumber', 'periodStart', 'periodEnd', 'updatedAt'],
      accountsSets.map((s) => [s.id, s.status || '', s.companyNumber || '', s.period?.startDate || '', s.period?.endDate || '', s.updatedAt || ''])
    );

    pushSection(
      'TaxCalculations',
      ['id', 'type', 'taxYear', 'totalTakeHome', 'totalTaxLiability', 'estimatedSavings', 'calculatedAt'],
      taxCalculations.map((t) => [
        t.id,
        t.calculationType || '',
        t.taxYear || '',
        t.totalTakeHome || '',
        t.totalTaxLiability || '',
        t.estimatedSavings || '',
        t.calculatedAt || t.createdAt || '',
      ])
    );

    pushSection(
      'Tasks',
      ['id', 'title', 'status', 'dueDate'],
      tasks.map((t) => [t.id, t.title, t.status || '', t.dueDate || ''])
    );

    pushSection(
      'Compliance',
      ['id', 'type', 'status', 'dueDate', 'description'],
      compliance.map((c) => [c.id, c.type, c.status || '', c.dueDate || '', c.description || ''])
    );

    pushSection(
      'Documents',
      ['id', 'filename', 'category', 'uploadedAt'],
      documents.map((d) => [d.id, d.filename, d.category || '', d.uploadedAt || ''])
    );

    pushSection(
      'Letters',
      ['id', 'templateName', 'status', 'generatedAt'],
      letters.map((l) => [l.id, l.templateName || l.templateId || '', l.status || '', l.generatedAt || ''])
    );

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-${client.ref || client.id}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const badgeForStatus = (s?: string) =>
    s === 'ACTIVE'
      ? 'success'
      : s === 'READY'
      ? 'success'
      : s === 'IN_REVIEW'
      ? 'warning'
      : s === 'DRAFT'
      ? 'default'
      : s === 'LOCKED'
      ? 'primary'
      : s === 'INACTIVE'
      ? 'default'
      : s === 'SUSPENDED'
      ? 'warning'
      : s === 'ARCHIVED'
      ? 'default'
      : 'default';

  const badgeForLifecycle = (s?: string) => {
    const key = String(s || '').toUpperCase();
    if (key === 'ACTIVE') return 'success';
    if (key === 'ONBOARDING' || key === 'PROSPECT') return 'warning';
    if (key === 'DORMANT' || key === 'CEASED') return 'default';
    return 'default';
  };

  const badgeForRisk = (rating?: string) => {
    const key = String(rating || '').toLowerCase();
    if (key.includes('high')) return 'danger';
    if (key.includes('medium')) return 'warning';
    if (key.includes('low')) return 'success';
    return 'default';
  };

  const handleSync = async () => {
    if (!client?.ref) return;
    setSyncMessage(null);
    setSyncing(true);
    try {
      const res = await api.post<{ message?: string }>(`/companies-house/sync/${client.ref}`);
      setSyncMessage({ text: res?.message || 'Synchronized with Companies House', error: false });
      const refreshed = await api.get<ClientContextWithParties>(`/clients/${clientId}/with-parties`).catch(() => null);
      if (refreshed) {
        setClientContext(refreshed);
        try { new BroadcastChannel('mdj').postMessage({ topic: 'clients:changed' }); } catch {}
      }
    } catch (error: any) {
      setSyncMessage({ text: error?.message || 'Failed to synchronize', error: true });
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!client) return;
    setTaskMessage(null);
    setGeneratingTasks(true);
    try {
      const res = (await api.post<{ serviceId: string; tasksGenerated: number }[]>(
        `/tasks/generate/client/${client.id}`
      )) || [];

      const rows = Array.isArray(res) ? res : [];
      const totalTasks = rows.reduce((sum, row) => sum + (row.tasksGenerated || 0), 0);
      const message =
        rows.length === 0
          ? 'No new tasks were created; services either already have open tasks or fall outside the 30-day window.'
          : `Generated ${totalTasks} task${totalTasks === 1 ? '' : 's'} across ${rows.length} service${rows.length === 1 ? '' : 's'}.`;

      setTaskMessage({ text: message, error: false });
      if (clientId) {
        const refreshedTasks = await api.get<Task[]>(`/tasks/client/${clientId}`);
        setTasks(Array.isArray(refreshedTasks) ? refreshedTasks : []);
      }
    } catch (error: any) {
      setTaskMessage({ text: error?.message || 'Failed to generate tasks', error: true });
    } finally {
      setGeneratingTasks(false);
    }
  };


  const isCompanyClient = client?.type === 'COMPANY' || client?.type === 'LLP';
  const showCompaniesHouse = isCompanyClient;
  const overviewMeta = isCompanyClient
    ? (client?.registeredNumber ? `Company No. ${client.registeredNumber}` : 'No company number')
    : (client?.utrNumber ? `UTR ${client.utrNumber}` : 'No UTR');
  const primaryDob = primaryPerson?.dateOfBirth ? new Date(primaryPerson.dateOfBirth).toLocaleDateString('en-GB') : '—';
  const primaryNationality = primaryPerson?.nationality || '—';
  const tabKeys = showCompaniesHouse
    ? (['profile', 'services', 'accounts', 'tax', 'tasks', 'compliance', 'documents', 'letters', 'people', 'ch'] as const)
    : (['profile', 'services', 'accounts', 'tax', 'tasks', 'compliance', 'documents', 'letters', 'people'] as const);
  const officerRoles = new Set(['DIRECTOR', 'SHAREHOLDER', 'PARTNER', 'MEMBER', 'OWNER', 'UBO', 'SECRETARY']);
  const currentOfficersParties = useMemo(() => {
    return parties.filter((party) => {
      if (party.resignedAt) return false;
      if (!party.role) return false;
      return officerRoles.has(party.role);
    });
  }, [parties]);
  const hmrcRegistrations: HMRCRegistrationRow[] = useMemo(() => {
    if (!client) return [];
    const rows = [
      {
        type: 'Corporation Tax (CT)',
        applies: isCompanyClient,
        reference: client.utrNumber,
        status: client.hmrcCtStatus,
      },
      {
        type: 'Self Assessment',
        applies: !isCompanyClient,
        reference: client.utrNumber,
        status: client.hmrcSaStatus,
      },
      {
        type: 'VAT Registration',
        applies: true,
        reference: profile?.vatNumber ?? client.vatNumber,
        status: client.hmrcVatStatus,
      },
      {
        type: 'PAYE / RTI',
        applies: true,
        reference: profile?.payeReference || client.payeReference || profile?.accountsOfficeReference || client.accountsOfficeReference,
        status: client.hmrcPayeStatus,
      },
      {
        type: 'Construction Industry Scheme (CIS)',
        applies: true,
        reference: profile?.cisUtr ?? client.cisUtr,
        status: client.hmrcCisStatus,
      },
      {
        type: 'Making Tax Digital (VAT)',
        applies: true,
        reference: client.mtdVatEnabled ? 'Enabled' : '',
        status: client.hmrcMtdVatStatus,
      },
      {
        type: 'Making Tax Digital (ITSA)',
        applies: !isCompanyClient,
        reference: client.mtdItsaEnabled ? 'Enabled' : '',
        status: client.hmrcMtdItsaStatus,
      },
      {
        type: 'Customs / EORI',
        applies: isCompanyClient,
        reference: client.eoriNumber,
        status: client.hmrcEoriStatus,
      },
    ];

    return rows.map((row) => {
      const status: HMRCRegistrationStatus = row.applies
        ? normalizeHmrcStatus(row.status)
        : 'NOT_APPLICABLE';
      return {
        type: row.type,
        status,
        reference: row.reference || undefined,
      };
    });
  }, [client, isCompanyClient]);

  const complianceObligations = useMemo(() => {
    return compliance.filter((item: any) => Boolean(item?.dueDate) && Boolean(item?.serviceId));
  }, [compliance]);
  const obligationsByServiceId = useMemo(() => {
    const map = new Map<string, Compliance[]>();
    complianceObligations.forEach((item) => {
      if (!item.serviceId) return;
      const current = map.get(item.serviceId) || [];
      current.push(item);
      map.set(item.serviceId, current);
    });
    return map;
  }, [complianceObligations]);
  const servicesById = useMemo(() => {
    const map = new Map<string, Service>();
    services.forEach((service) => {
      if (service?.id) map.set(service.id, service);
    });
    return map;
  }, [services]);
  const upcomingCompliance = useMemo(() => {
    return [...complianceObligations].sort((a: any, b: any) => {
      const aDate = a?.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b?.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return aDate - bDate;
    });
  }, [complianceObligations]);
  const linkedTasksForCompliance = (item: any) => {
    if (!item) return [];
    const type = String(item.type || '').toLowerCase();
    const desc = String(item.description || '').toLowerCase();
    return tasks.filter((task) => {
      if (!task?.tags?.includes('compliance')) return false;
      const title = String(task.title || '').toLowerCase();
      const tdesc = String(task.description || '').toLowerCase();
      return (type && title.includes(type)) || (desc && tdesc.includes(desc));
    });
  };
  const linkedComplianceForTask = (task: Task) => {
    if (!task?.serviceId) return null;
    const candidates = complianceObligations.filter((item: any) => item?.serviceId === task.serviceId);
    if (candidates.length === 0) return null;
    const title = String(task.title || '').toLowerCase();
    const match = candidates.find((item: any) =>
      String(item.type || '').toLowerCase().split(' ').some((token: string) => token && title.includes(token))
    );
    return match || candidates[0];
  };

  /* ----------------- Loading / Error States ----------------- */
  if (loading) {
    return (
      <MDJShell pageTitle="Client" pageSubtitle="Loading client details" showBack backHref="/clients" backLabel="Back to Clients" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: 'Client' }]}>
        <div className="card-mdj" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '2rem',
              height: '2rem',
              border: '2px solid var(--border-subtle)',
              borderTopColor: 'var(--brand-primary)',
              borderRadius: '50%',
              margin: '0 auto .75rem',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
        </div>
      </MDJShell>
    );
  }

  if (err || !client) {
    return (
      <MDJShell pageTitle="Client" pageSubtitle="Client details" showBack backHref="/clients" backLabel="Back to Clients" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: 'Client' }]}>
        <div className="card-mdj" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '.5rem' }}>
            {err || 'Client not found'}
          </div>
          <button className="btn-outline-primary" onClick={() => router.push('/clients')}>
            Back to Clients
          </button>
        </div>
      </MDJShell>
    );
  }

  /* ----------------- Main Page Layout ----------------- */
  return (
    <MDJShell
      pageTitle={client.name}
      pageSubtitle="Client overview, services, tasks, compliance, and documents"
      showBack backHref="/clients" backLabel="Back to Clients"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: client.name }]}
      actions={[
        <div key="actions-menu" style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn-outline-primary"
            onClick={() => setActionsOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
          >
            Actions ▾
          </button>
          {actionsOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                minWidth: 200,
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '0.5rem',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
                zIndex: 20,
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Operational</div>
              <button className="btn-outline-primary btn-sm" onClick={() => { setActionsOpen(false); router.push(`/clients/${client.id}/report`); }} style={{ width: '100%', justifyContent: 'flex-start' }}>
                Export Report
              </button>
              <button className="btn-outline-primary btn-sm" onClick={() => { setActionsOpen(false); handleGenerateTasks(); }} style={{ width: '100%', justifyContent: 'flex-start', marginTop: 6 }} disabled={generatingTasks || services.length === 0}>
                {generatingTasks ? 'Generating…' : 'Generate from template'}
              </button>
              <button className="btn-primary btn-sm" onClick={() => { setActionsOpen(false); router.push(`/tasks/new?clientId=${client.id}`); }} style={{ width: '100%', justifyContent: 'flex-start', marginTop: 6 }}>
                Add Task
              </button>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.5rem 0' }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Client Management</div>
              <button className="btn-outline-primary btn-sm" onClick={() => { setActionsOpen(false); router.push(`/clients/${client.id}/edit`); }} style={{ width: '100%', justifyContent: 'flex-start', marginTop: 6 }}>
                Edit Client
              </button>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.5rem 0' }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Data & Reporting</div>
              <button className="btn-outline-primary btn-sm" onClick={() => { setActionsOpen(false); downloadClientCsv(); }} style={{ width: '100%', justifyContent: 'flex-start', marginTop: 6 }}>
                Export CSV
              </button>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.5rem 0' }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Danger Zone</div>
              <button className="btn-danger btn-sm" onClick={() => { setActionsOpen(false); handleDeleteClient(); }} disabled={deleting} style={{ width: '100%', justifyContent: 'flex-start', marginTop: 6 }}>
                {deleting ? 'Deleting…' : 'Delete Client'}
              </button>
            </div>
          )}
        </div>,
      ]}
    >
      {syncMessage && (
        <div className="card-mdj" style={{ marginBottom: '1rem', padding: '.75rem 1rem' }}>
          <span style={{ color: syncMessage.error ? 'var(--danger)' : 'var(--text-muted)' }}>{syncMessage.text}</span>
        </div>
      )}
      {deleteMsg && (
        <div className="card-mdj" style={{ marginBottom: '1rem', padding: '.75rem 1rem', background: 'var(--status-danger-bg)', borderColor: 'var(--status-danger-border)' }}>
          <span style={{ color: 'var(--danger)' }}>{deleteMsg}</span>
        </div>
      )}

      <div className="mdj-page">
        {/* Tabs */}
        <nav className="mdj-tabs card-mdj" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem', position: 'sticky', top: '0.5rem', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-subtle)', padding: 0, background: 'var(--surface-table-header)', flexWrap: 'wrap' }}>
            {tabKeys.map((key) => {
              const counts = {
                profile: 0,
                services: services.length,
                accounts: accountsSets.length,
                tax: taxCalculations.length,
                tasks: tasks.length,
                compliance: complianceObligations.length,
                documents: documents.length,
                letters: letters.length,
                people: currentOfficersParties.length,
                ch: chOfficers.length + chPscs.length + chFilings.length,
              } as const;
              const active = tab === key;
              const labels = {
                profile: 'Profile',
                services: 'Services',
                accounts: 'Accounts',
                tax: 'Tax',
                tasks: 'Tasks',
                compliance: 'Compliance',
                documents: 'Documents',
                letters: 'Letters',
                people: 'People',
                ch: 'Companies House',
              };
              return (
                <button
                  key={key}
                  className={`tab ${active ? 'active' : ''}`}
                  onClick={() => setTab(key)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: active ? 'var(--status-info-bg)' : 'transparent',
                    cursor: 'pointer',
                    borderBottom: active ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    color: active ? 'var(--brand-primary-active)' : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 600,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{labels[key]}</span>
                  <span className={`count badge ${active ? 'primary' : 'default'}`} style={{ fontSize: '0.75rem' }}>
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Grid */}
        <main className="mdj-grid two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: '1.5rem', marginBottom: '1rem' }}>
          {/* LEFT COLUMN */}
          <section className="mdj-column">
            {/* Client Summary */}
            <section className="card-mdj" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>{client.name}</h2>
                  <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>Client Summary</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn-outline-primary btn-xs" onClick={() => router.push(`/clients/${client.id}/edit`)}>
                    Edit Client
                  </button>
                  {showCompaniesHouse && (
                    <>
                      <button className="btn-outline-primary btn-xs" onClick={() => window.open(`https://find-and-update.company-information.service.gov.uk/company/${client.registeredNumber}`, '_blank')} disabled={!client.registeredNumber}>
                        View CH
                      </button>
                      <button className="btn-primary btn-xs" onClick={handleSync} disabled={syncing || !client.registeredNumber}>
                        {syncing ? 'Syncing…' : 'Sync CH'}
                      </button>
                    </>
                  )}
                  <button className="btn-outline-primary btn-xs" onClick={() => router.push(`/accounts-production/new?clientId=${client.id}`)}>
                    Accounts Production
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className={`badge ${badgeForStatus(client.status)}`}>{client.status}</span>
                <span className="badge">{client.type ? client.type.replace(/_/g, ' ') : '—'}</span>
                {client.portfolioCode && <span className="badge primary">Portfolio #{client.portfolioCode}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem 1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Client Ref</div>
                  <div style={{ fontWeight: 600 }}>{client.ref || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Primary Contact</div>
                  <div style={{ fontWeight: 600 }}>{profile?.mainContactName || primaryPerson?.fullName || client.mainEmail || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>UTR</div>
                  <div style={{ fontWeight: 600 }}>
                    {isCompanyClient
                      ? (profile?.corporationTaxUtr || client.utrNumber || '—')
                      : (profile?.personalUtr || client.utrNumber || '—')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {isCompanyClient ? 'Company No.' : 'UTR'}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {isCompanyClient ? (client.registeredNumber || '—') : (profile?.personalUtr || client.utrNumber || '—')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Year End (ARD)</div>
                  <div style={{ fontWeight: 600 }}>
                    {client.accountsAccountingReferenceDay && client.accountsAccountingReferenceMonth
                      ? `${client.accountsAccountingReferenceDay} ${monthNames[client.accountsAccountingReferenceMonth - 1]}`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Year End Due</div>
                  <div style={{ fontWeight: 600 }}>
                    {client.accountsNextDue ? new Date(client.accountsNextDue).toLocaleDateString('en-GB') : '—'}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Address</div>
                  <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{addressLine || '—'}</div>
                </div>
              </div>
            </section>

          </section>

          {/* RIGHT COLUMN */}
          <aside className="mdj-column narrow">
            <section className="card-mdj" style={{ padding: '1.25rem', position: 'sticky', top: '1rem', alignSelf: 'start' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Next Actions</h3>
              <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Focus on the immediate deadlines and priorities.
              </div>

              {upcomingCompliance.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                  {upcomingCompliance.slice(0, 3).map((item) => {
                    const badge = getComplianceBadge(item.status);
                    return (
                      <div key={item.id} style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--surface-subtle)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.type?.replace(/_/g, ' ') || 'Compliance'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : '—'} · {complianceAuthority(item.source)}
                        </div>
                        <span className={`badge ${badge}`} style={{ fontSize: '0.7rem', marginTop: 6, display: 'inline-flex' }}>
                          {String(item.status || '').replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 8, background: 'var(--surface-subtle)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No compliance obligations scheduled.
                </div>
              )}
            </section>
          </aside>
        </main>
      </div>

      {tabMessage && (
        <div className="card-mdj" style={{ marginBottom: '1rem', padding: '.75rem 1rem' }}>
          <span style={{ color: tabMessage.error ? 'var(--danger)' : 'var(--text-muted)' }}>{tabMessage.text}</span>
        </div>
      )}
      {/* Tab Content */}
      <div className="card-mdj" style={{ padding: 0, overflow: 'hidden' }}>

        {tab === 'profile' && (
          <div className="panel">
            <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="card-mdj" style={{ padding: '1rem' }}>
                <div className="card-header">
                  <h3 className="mdj-h2">Client Details</h3>
                  <span className="mdj-sub">Database-backed</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginTop: '0.75rem',
                  }}
                >
                  {[
                    { label: 'Trading Name', value: profile?.tradingName || '—' },
                    { label: 'Contact Position', value: profile?.contactPosition || '—' },
                    { label: 'Preferred Contact Method', value: profile?.preferredContactMethod || '—' },
                    { label: 'Correspondence Address', value: profile?.correspondenceAddress || '—', wide: true },
                    { label: 'Payroll Frequency', value: profile?.payrollFrequency || '—' },
                    { label: 'Employees', value: typeof profile?.employeeCount === 'number' ? profile.employeeCount : '—' },
                    { label: 'Fee Arrangement', value: profile?.feeArrangement || '—' },
                    { label: 'Annual Fee', value: typeof profile?.annualFee === 'number' ? formatCurrency(profile.annualFee) : '—' },
                    { label: 'Monthly Fee', value: typeof profile?.monthlyFee === 'number' ? formatCurrency(profile.monthlyFee) : '—' },
                    {
                      label: 'Business Bank',
                      value:
                        profile?.businessBankName || profile?.accountLastFour
                          ? `${profile?.businessBankName || ''}${profile?.businessBankName && profile?.accountLastFour ? ' · ' : ''}${profile?.accountLastFour ? `****${profile.accountLastFour}` : ''}`
                          : '—',
                    },
                    { label: 'Direct Debit', value: profile?.directDebitInPlace ? 'Yes' : 'No' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        flex: item.wide ? '1 1 100%' : '1 1 calc(50% - 0.75rem)',
                        minWidth: 220,
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 10,
                        padding: '0.6rem 0.75rem',
                        background: 'var(--surface-subtle)',
                      }}
                    >
                      <div className="label">{item.label}</div>
                      <div className="text-strong">{item.value}</div>
                    </div>
                  ))}
                </div>
                {(profile?.notes || profile?.specialCircumstances) && (
                  <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                    {profile?.notes && (
                      <div>
                        <div className="label">Notes</div>
                        <div className="text-strong">{profile.notes}</div>
                      </div>
                    )}
                    {profile?.specialCircumstances && (
                      <div>
                        <div className="label">Special Circumstances</div>
                        <div className="text-strong">{profile.specialCircumstances}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="card-mdj" style={{ padding: '1rem' }}>
                <div className="card-header">
                  <h3 className="mdj-h2">Registrations & IDs</h3>
                  <span className="mdj-sub">Facts only</span>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                  {hmrcRegistrations.map((reg) => (
                    <div
                      key={`overview-${reg.type}`}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        background: 'var(--surface-subtle)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>{reg.type}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${hmrcStatusBadge(reg.status)}`}>
                          {HMRC_STATUS_LABELS[reg.status]}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          {reg.reference || '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content - Services */}
        {tab === 'services' && (
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <button className="btn-outline-primary" onClick={handleGenerateTasks} disabled={generatingTasks || services.length === 0} style={{ padding: '6px 12px', fontSize: 13 }}>
                {generatingTasks ? 'Generating…' : 'Generate from template'}
              </button>
              {taskMessage && (
                <span style={{ color: taskMessage.error ? 'var(--danger)' : 'var(--text-muted)', fontSize: 13 }}>
                  {taskMessage.text}
                </span>
              )}
            </div>

            {/* Accounts Production Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Accounts Production</h4>
                <button 
                  className="btn-primary btn-sm" 
                  onClick={() => router.push(`/accounts-production/new?clientId=${client.id}`)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  New Accounts Set
                </button>
              </div>
              <div style={{ 
                padding: '0.75rem', 
                background: 'var(--surface-subtle)', 
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: 'var(--text-muted)'
              }}>
                No accounts sets yet. Create your first accounts production set to get started.
              </div>
            </div>

            {services.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No services yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Frequency</th>
                      <th>Cost (period)</th>
                      <th>Annual total</th>
                      <th>Eligibility</th>
                      <th>Status</th>
                      <th>Next Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
            {services.map((s) => {
              const obligations = s.id ? (obligationsByServiceId.get(s.id) || []) : [];
              return (
              <tr key={s.id}>
                <td>
                  <div>{s.kind || '—'}</div>
                  {s.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.description}</div>
                  )}
                  {obligations.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Creates: {obligations.map((o) => o.type?.replace(/_/g, ' ') || '—').join(' · ')}
                    </div>
                  )}
                </td>
                <td>{s.frequency || '—'}</td>
                <td>{formatCurrency(s.fee)}</td>
                <td>{formatCurrency(s.annualized)}</td>
                        <td>
                          {s.eligibility ? (
                            <>
                              <span
                                className={`badge ${
                                  s.eligibility.status === 'active'
                                    ? 'success'
                                    : s.eligibility.status === 'warning'
                                    ? 'warning'
                                    : s.eligibility.status === 'blocked'
                                    ? 'danger'
                                    : 'default'
                                }`}
                              >
                                {s.eligibility.status}
                              </span>
                              {s.eligibility.reasons?.length ? (
                                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                                  {s.eligibility.reasons.join(' · ')}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <span className={`badge ${badgeForStatus(s.status)}`}>{s.status || '—'}</span>
                        </td>
                        <td>{s.nextDue ? new Date(s.nextDue).toLocaleDateString('en-GB') : '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn-outline-primary btn-xs"
                    onClick={() => router.push(`/services/${s.id}`)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    View
                  </button>
                </td>
              </tr>
              );
            })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'accounts' && (
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                className="btn-outline-primary btn-sm"
                onClick={() => router.push(`/accounts-production/new?clientId=${client.id}`)}
              >
                New Accounts Set
              </button>
              <button
                className="btn-outline-primary btn-sm"
                onClick={() => router.push('/accounts-production')}
              >
                View All
              </button>
            </div>
            {accountsSets.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No accounts sets yet for this client.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountsSets.map((set) => {
                      const companyName = set.sections?.companyPeriod?.company?.name || client.name;
                      const period = set.period
                        ? `${new Date(set.period.startDate).toLocaleDateString('en-GB')} → ${new Date(set.period.endDate).toLocaleDateString('en-GB')}`
                        : '—';
                      return (
                        <tr key={set.id}>
                          <td>
                            <div>{companyName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {set.companyNumber || client.registeredNumber || 'No company number'}
                            </div>
                          </td>
                          <td>{period}</td>
                          <td>
                            <span className={`badge ${badgeForStatus(set.status)}`}>{String(set.status || '—')}</span>
                          </td>
                          <td>{set.updatedAt ? new Date(set.updatedAt).toLocaleDateString('en-GB') : '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-outline-primary btn-xs"
                              onClick={() => router.push(`/accounts-production/${set.id}`)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'tax' && (
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                className="btn-outline-primary btn-sm"
                onClick={() => router.push(`/tax-calculations/new?clientId=${client.id}`)}
              >
                New Tax Calculation
              </button>
              <button
                className="btn-outline-primary btn-sm"
                onClick={() => router.push('/tax-calculations')}
              >
                View All
              </button>
            </div>
            {taxCalculations.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No tax calculations yet for this client.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Tax Year</th>
                      <th>Result</th>
                      <th>Calculated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxCalculations.map((calc) => {
                      const calcDate = calc.calculatedAt || calc.createdAt;
                      return (
                        <tr key={calc.id}>
                          <td>{calc.calculationType?.replace(/_/g, ' ') || '—'}</td>
                          <td>{calc.taxYear || '—'}</td>
                          <td>
                            {typeof calc.totalTakeHome === 'number'
                              ? `Take-home ${formatCurrency(calc.totalTakeHome)}`
                              : typeof calc.totalTaxLiability === 'number'
                              ? `Tax ${formatCurrency(calc.totalTaxLiability)}`
                              : typeof calc.estimatedSavings === 'number'
                              ? `Savings ${formatCurrency(calc.estimatedSavings)}`
                              : '—'}
                          </td>
                          <td>{calcDate ? new Date(calcDate).toLocaleDateString('en-GB') : '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-outline-primary btn-xs"
                              onClick={() => router.push(`/tax-calculations/${calc.id}`)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <div style={{ padding: '1rem' }}>
            {taskMessage && (
              <div style={{ marginBottom: '0.75rem', color: taskMessage.error ? 'var(--danger)' : 'var(--text-muted)', fontSize: 13 }}>
                {taskMessage.text}
              </div>
            )}
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No tasks —{' '}
                <button
                  className="btn-outline-primary"
                  onClick={() => router.push(`/tasks/new?clientId=${client.id}`)}
                  style={{ padding: '2px 8px', fontSize: 12 }}
                >
                  Add one
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Service</th>
                      <th>Compliance</th>
                      <th>Origin</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => {
                      const st = getTaskBadge(t.status);
                      const label = String(t.status || '').replace(/_/g, ' ').toLowerCase();
                      const origin = t.tags?.includes('auto-generated') ? 'Template' : 'Manual';
                      const serviceLabel = t.serviceId ? (servicesById.get(t.serviceId)?.kind || '—') : '—';
                      const complianceItem = linkedComplianceForTask(t);
                      return (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td>{serviceLabel}</td>
                          <td>{complianceItem?.type?.replace(/_/g, ' ') || '—'}</td>
                          <td>{origin}</td>
                          <td>
                            <span className={`badge ${st}`}>{label}</span>
                          </td>
                          <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-outline-primary btn-xs"
                              onClick={() => router.push(`/tasks/${t.id}`)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Compliance Tab */}
        {tab === 'compliance' && (
          <div style={{ padding: '1rem' }}>
            {complianceObligations.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No service-driven compliance obligations found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Obligation</th>
                      <th>Service</th>
                      <th>Period</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Linked Tasks</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceObligations.map((item) => {
                      const badge = getComplianceBadge(item.status);
                      const label = String(item.status || '').replace(/_/g, ' ').toLowerCase();
                      const linkedTasks = linkedTasksForCompliance(item);
                      const serviceLabel = item?.serviceId ? (servicesById.get(item.serviceId)?.kind || '—') : '—';
                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.type?.replace(/_/g, ' ') || '—'}</div>
                            {item.description && (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td>{serviceLabel}</td>
                          <td>{item.period || '—'}</td>
                          <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : '—'}</td>
                          <td>
                            <span className={`badge ${badge}`}>{label}</span>
                          </td>
                          <td>
                            {linkedTasks.length === 0 ? (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {linkedTasks.slice(0, 2).map((task) => (
                                  <button
                                    key={task.id}
                                    className="btn-outline-primary btn-xs"
                                    onClick={() => router.push(`/tasks/${task.id}`)}
                                    style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                                  >
                                    {task.title}
                                  </button>
                                ))}
                                {linkedTasks.length > 2 && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    +{linkedTasks.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-outline-primary btn-xs"
                              onClick={() => router.push(`/compliance/${item.id}`)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <div style={{ padding: '1rem' }}>
            <div className="card-mdj" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    className="input-mdj"
                    type="file"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  />
                  <select
                    className="input-mdj"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                  >
                    {[
                      'ACCOUNTS',
                      'VAT',
                      'PAYROLL',
                      'CORRESPONDENCE',
                      'CONTRACTS',
                      'COMPLIANCE',
                      'REPORTS',
                      'INVOICES',
                      'RECEIPTS',
                      'BANK_STATEMENTS',
                      'OTHER',
                    ].map((cat) => (
                      <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <input
                    className="input-mdj"
                    placeholder="Description (optional)"
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    style={{ flex: 1, minWidth: 220 }}
                  />
                  <button className="btn-primary btn-sm" onClick={handleUploadDocument} disabled={docUploading}>
                    {docUploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                {docUploadMsg && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{docUploadMsg}</div>}
              </div>
            </div>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No documents uploaded.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Category</th>
                      <th>Uploaded</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.filename}</td>
                        <td>{doc.category || '—'}</td>
                        <td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-outline-primary btn-xs"
                            onClick={() => handleDocumentDownload(doc, true)}
                            style={{ marginRight: '0.5rem' }}
                          >
                            Preview
                          </button>
                          <button
                            className="btn-outline-primary btn-xs"
                            onClick={() => handleDocumentDownload(doc, false)}
                            style={{ marginRight: '0.5rem' }}
                          >
                            Download
                          </button>
                          <button
                            className="btn-xs danger"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={docDeleting[doc.id]}
                          >
                            {docDeleting[doc.id] ? 'Deleting…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'letters' && (
          <div style={{ padding: '1rem' }}>
            <div className="card-mdj" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="input-mdj"
                    value={letterTemplateId}
                    onChange={(e) => setLetterTemplateId(e.target.value)}
                    style={{ minWidth: 240 }}
                  >
                    {templates.length === 0 && <option value="">No templates available</option>}
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    className="input-mdj"
                    value={letterServiceId}
                    onChange={(e) => setLetterServiceId(e.target.value)}
                    style={{ minWidth: 220 }}
                  >
                    <option value="">No linked service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.kind || s.id}</option>
                    ))}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={letterIncludeDocx}
                      onChange={(e) => setLetterIncludeDocx(e.target.checked)}
                    />
                    Include DOCX
                  </label>
                  <button className="btn-outline-primary btn-sm" onClick={handlePreviewLetter} disabled={letterPreviewing || !letterTemplateId}>
                    {letterPreviewing ? 'Previewing…' : 'Preview'}
                  </button>
                  <button className="btn-primary btn-sm" onClick={handleGenerateLetter} disabled={letterGenerating || !letterTemplateId}>
                    {letterGenerating ? 'Generating…' : 'Generate'}
                  </button>
                </div>
                {letterGenMsg && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{letterGenMsg}</div>}
              </div>
            </div>
            {letters.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No letters generated.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Template</th>
                      <th>Status</th>
                      <th>Generated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {letters.map((letter) => (
                      <tr key={letter.id}>
                        <td>{letter.templateName || letter.templateId}</td>
                        <td>
                          <span className="badge">{letter.status}</span>
                        </td>
                        <td>{letter.generatedAt ? new Date(letter.generatedAt).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-outline-primary btn-xs"
                            onClick={() => handleDownloadLetter(letter, 'PDF')}
                            style={{ marginRight: '0.5rem' }}
                            disabled={lettersDownloading[letter.id]}
                          >
                            PDF
                          </button>
                          <button
                            className="btn-outline-primary btn-xs"
                            onClick={() => handleDownloadLetter(letter, 'DOCX')}
                            disabled={lettersDownloading[letter.id]}
                          >
                            DOCX
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'people' && (
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.75rem' }}>
              <button className="btn-outline-primary btn-sm" onClick={() => router.push(`/clients/${client.id}/parties`)}>
                Manage People
              </button>
            </div>
            {currentOfficersParties.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No current officers linked to this client.
              </div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {currentOfficersParties.map((party) => {
                      const person = party.personId ? partyPeople[party.personId] : null;
                      return (
                        <tr key={party.id}>
                          <td>
                            <div>{person?.fullName || person?.email || 'Unknown person'}</div>
                            {(person?.email || person?.phone || !person) && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {[person?.email, person?.phone].filter(Boolean).join(' · ') || party.personId || '—'}
                              </div>
                            )}
                          </td>
                          <td>{party.role ? party.role.replace(/_/g, ' ') : '—'}</td>
                          <td>{typeof party.ownershipPercent === 'number' ? `${party.ownershipPercent}%` : '—'}</td>
                          <td>{party.appointedAt ? new Date(party.appointedAt).toLocaleDateString('en-GB') : '—'}</td>
                          <td>{party.resignedAt ? new Date(party.resignedAt).toLocaleDateString('en-GB') : '—'}</td>
                          <td>{party.primaryContact ? <span className="badge success">Primary</span> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showCompaniesHouse && tab === 'ch' && (
          <div style={{ padding: '1rem' }}>
            {!client?.registeredNumber ? (
              <div style={{ color: 'var(--text-muted)' }}>No registered company number on this client.</div>
            ) : chLoading ? (
              <div style={{ color: 'var(--text-muted)' }}>Loading Companies House data…</div>
            ) : chError ? (
              <div style={{ color: 'var(--danger)' }}>{chError}</div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="card-mdj">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>Directors & Officers</h4>
                    {formerOfficers.length > 0 && (
                      <button className="btn-outline-primary btn-xs" onClick={() => setShowFormerOfficers((v) => !v)}>
                        {showFormerOfficers ? 'Hide former' : 'Show former'}
                      </button>
                    )}
                  </div>
                  {currentOfficers.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No officers returned.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="mdj-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Appointed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentOfficers.map((o: any, i: number) => (
                            <tr key={i}>
                              <td>{o.name}</td>
                              <td>{String(o.officer_role || '').replace(/-/g, ' ')}</td>
                              <td>{o.appointed_on ? new Date(o.appointed_on).toLocaleDateString('en-GB') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {showFormerOfficers && formerOfficers.length > 0 && (
                    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                      <table className="mdj-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Appointed</th>
                            <th>Resigned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formerOfficers.map((o: any, i: number) => (
                            <tr key={`former-${i}`}>
                              <td>{o.name}</td>
                              <td>{String(o.officer_role || '').replace(/-/g, ' ')}</td>
                              <td>{o.appointed_on ? new Date(o.appointed_on).toLocaleDateString('en-GB') : '—'}</td>
                              <td>{o.resigned_on ? new Date(o.resigned_on).toLocaleDateString('en-GB') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="card-mdj">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>Persons with Significant Control</h4>
                    {formerPscs.length > 0 && (
                      <button className="btn-outline-primary btn-xs" onClick={() => setShowFormerPscs((v) => !v)}>
                        {showFormerPscs ? 'Hide former' : 'Show former'}
                      </button>
                    )}
                  </div>
                  {currentPscs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No PSCs returned.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="mdj-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Kind</th>
                            <th>Notified</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPscs.map((p: any, i: number) => (
                            <tr key={i}>
                              <td>{p.name || p.full_name || '—'}</td>
                              <td>{String(p.kind || '').replace(/-/g, ' ') || '—'}</td>
                              <td>{p.notified_on ? new Date(p.notified_on).toLocaleDateString('en-GB') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {showFormerPscs && formerPscs.length > 0 && (
                    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                      <table className="mdj-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Kind</th>
                            <th>Notified</th>
                            <th>Ceased</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formerPscs.map((p: any, i: number) => (
                            <tr key={`former-${i}`}>
                              <td>{p.name || p.full_name || '—'}</td>
                              <td>{String(p.kind || '').replace(/-/g, ' ') || '—'}</td>
                              <td>{p.notified_on ? new Date(p.notified_on).toLocaleDateString('en-GB') : '—'}</td>
                              <td>{p.ceased_on ? new Date(p.ceased_on).toLocaleDateString('en-GB') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="card-mdj">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>Filing History</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {sortedFilings.length > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Showing {Math.min(displayedFilings.length, sortedFilings.length)} of {sortedFilings.length}
                        </span>
                      )}
                      {sortedFilings.length > 5 && (
                        <button className="btn-outline-primary btn-xs" onClick={() => setShowAllFilings((v) => !v)}>
                          {showAllFilings ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  </div>
                  {sortedFilings.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No filing history returned.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="mdj-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedFilings.map((f: any, i: number) => (
                            <tr key={i}>
                              <td>
                                {f.date || f.transaction_date || f.received_date
                                  ? new Date(f.date || f.transaction_date || f.received_date).toLocaleDateString('en-GB')
                                  : '—'}
                              </td>
                              <td>{f.type || f.category || '—'}</td>
                              <td>{formatFilingDescription(f)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
            </div>
          </div>
        )}
          </div>
        )}
      </div>
    </MDJShell>
  );
}
