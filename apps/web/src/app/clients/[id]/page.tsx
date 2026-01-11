'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api, API_BASE_URL } from '@/lib/api';
import { MDJModal } from '@/components/mdj-ui';

type ClientType = 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type ClientPartyRole =
  | 'DIRECTOR'
  | 'SHAREHOLDER'
  | 'PARTNER'
  | 'MEMBER'
  | 'OWNER'
  | 'UBO'
  | 'SECRETARY'
  | 'CONTACT';

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

type ClientParty = {
  id: string;
  clientId: string;
  personId: string;
  role: ClientPartyRole;
  ownershipPercent?: number;
  appointedAt?: string;
  resignedAt?: string;
  primaryContact: boolean;
  suffixLetter: string;
};

type Client = {
  id: string;
  ref?: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  portfolioCode?: number;
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
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
  partiesDetails?: ClientParty[];
  createdAt: string;
  updatedAt: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE' | string;
  dueDate?: string;
};

type Compliance = {
  id: string;
  type: string;
  description?: string;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT' | string;
  dueDate?: string;
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
const toDateInput = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ClientDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
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
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingParty, setDeletingParty] = useState<Record<string, boolean>>({});
  const [partyMsg, setPartyMsg] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<Record<string, boolean>>({});
  const [docDeleting, setDocDeleting] = useState<Record<string, boolean>>({});
  const [complianceDeleting, setComplianceDeleting] = useState<Record<string, boolean>>({});
  const [lettersDownloading, setLettersDownloading] = useState<Record<string, boolean>>({});
  const [tabMessage, setTabMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [editMessage, setEditMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [chError, setChError] = useState<string | null>(null);

  const [form, setForm] = useState<any>({});
  const [portfolios, setPortfolios] = useState<Array<{ code: number; name: string }>>([]);
  const [newPortfolio, setNewPortfolio] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveMsg, setMoveMsg] = useState<string | null>(null);
  const [refValue, setRefValue] = useState<string>('');
  const [refSaving, setRefSaving] = useState(false);
  const [partyEditOpen, setPartyEditOpen] = useState(false);
  const [partyEditing, setPartyEditing] = useState<{ party: ClientParty; person: Person | null } | null>(null);
  const [partyForm, setPartyForm] = useState<any>({});
  const [partySaving, setPartySaving] = useState(false);
  const [partyEditMsg, setPartyEditMsg] = useState<string | null>(null);
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

  // Set default tab to 'services' for better UX
  const [tab, setTab] = useState<'services' | 'accounts' | 'tax' | 'tasks' | 'compliance' | 'documents' | 'letters' | 'ch' | 'people'>('services');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const peopleCacheRef = useRef<Record<string, Person | null>>({});

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get('/portfolios');
        const items = (Array.isArray(list) ? list : [])
          .map((p: any) => ({
            code: Number(p.code ?? p.portfolioCode ?? p.id),
            name: p.name || `Portfolio ${p.code ?? p.portfolioCode ?? p.id}`,
          }))
          .filter((p: any) => Number.isFinite(p.code))
          .sort((a: any, b: any) => a.code - b.code);
        setPortfolios(items);
      } catch {
        setPortfolios([]);
      }
    })();
  }, []);

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
        const c = await api.get<Client>(`/clients/${clientId}/with-parties`).catch((e) => {
          throw new Error((e as Error)?.message || 'Failed to load client');
        });

        const effectiveId = c?.id || clientId;
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
          setClient(c);
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

  const handleDeleteCompliance = async (id: string) => {
    const ok = window.confirm('Delete this compliance item?');
    if (!ok) return;
    setComplianceDeleting((prev) => ({ ...prev, [id]: true }));
    setTabMessage(null);
    try {
      await api.delete(`/compliance/${id}`);
      setCompliance((prev) => prev.filter((item) => item.id !== id));
      setTabMessage({ text: 'Compliance item deleted.' });
    } catch (e: any) {
      setTabMessage({ text: e?.message || 'Failed to delete compliance item.', error: true });
    } finally {
      setComplianceDeleting((prev) => ({ ...prev, [id]: false }));
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
    const parties = client?.partiesDetails ?? [];
    if (parties.length === 0) {
      setPartyPeople({});
      return;
    }

    let on = true;
    (async () => {
      const uniqueIds = Array.from(new Set(parties.map((party) => party.personId).filter(Boolean)));
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
  }, [client?.partiesDetails]);

  const addressLine = useMemo(() => {
    if (!client?.address) return '';
    const a = client.address;
    return [a.line1, a.line2, a.city, a.county, a.postcode, a.country].filter(Boolean).join(', ');
  }, [client]);

  const primaryParty = useMemo(() => {
    return client?.partiesDetails?.find((party) => party.primaryContact);
  }, [client?.partiesDetails]);

  const primaryPerson = primaryParty ? partyPeople[primaryParty.personId] : null;
  const parties = client?.partiesDetails ?? [];
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

  const handleSync = async () => {
    if (!client?.ref) return;
    setSyncMessage(null);
    setSyncing(true);
    try {
      const res = await api.post<{ message?: string }>(`/companies-house/sync/${client.ref}`);
      setSyncMessage({ text: res?.message || 'Synchronized with Companies House', error: false });
      const refreshed = await api.get<Client>(`/clients/${clientId}/with-parties`).catch(() => null);
      if (refreshed) {
        setClient(refreshed);
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

  const setField = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const setAddressField = (key: string, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      address: { ...(prev.address || {}), [key]: value },
    }));
  };

  const openEdit = () => {
    if (!client) return;
    setForm({
      name: client.name || '',
      type: client.type,
      status: client.status,
      mainEmail: client.mainEmail || '',
      mainPhone: client.mainPhone || '',
      registeredNumber: client.registeredNumber || '',
      utrNumber: client.utrNumber || '',
      incorporationDate: toDateInput(client.incorporationDate),
      accountsAccountingReferenceDay: client.accountsAccountingReferenceDay ?? '',
      accountsAccountingReferenceMonth: client.accountsAccountingReferenceMonth ?? '',
      accountsLastMadeUpTo: toDateInput(client.accountsLastMadeUpTo),
      accountsNextDue: toDateInput(client.accountsNextDue),
      confirmationLastMadeUpTo: toDateInput(client.confirmationLastMadeUpTo),
      confirmationNextDue: toDateInput(client.confirmationNextDue),
      address: {
        line1: client.address?.line1 || '',
        line2: client.address?.line2 || '',
        city: client.address?.city || '',
        county: client.address?.county || '',
        postcode: client.address?.postcode || '',
        country: client.address?.country || 'United Kingdom',
      },
    });
    setRefValue(client.ref || '');
    setNewPortfolio(client.portfolioCode ?? null);
    setEditMessage(null);
    setMoveMsg(null);
    setEditOpen(true);
  };

  const handleSaveClient = async () => {
    if (!client) return;
    setSaving(true);
    setEditMessage(null);
    try {
      const payload = {
        name: form.name?.trim() || client.name,
        type: form.type,
        status: form.status,
        mainEmail: form.mainEmail || '',
        mainPhone: form.mainPhone || '',
        registeredNumber: form.registeredNumber || '',
        utrNumber: form.utrNumber || '',
        incorporationDate: form.incorporationDate || null,
        accountsAccountingReferenceDay: form.accountsAccountingReferenceDay ? Number(form.accountsAccountingReferenceDay) : null,
        accountsAccountingReferenceMonth: form.accountsAccountingReferenceMonth ? Number(form.accountsAccountingReferenceMonth) : null,
        accountsLastMadeUpTo: form.accountsLastMadeUpTo || null,
        accountsNextDue: form.accountsNextDue || null,
        confirmationLastMadeUpTo: form.confirmationLastMadeUpTo || null,
        confirmationNextDue: form.confirmationNextDue || null,
        address: {
          line1: form.address?.line1 || '',
          line2: form.address?.line2 || '',
          city: form.address?.city || '',
          county: form.address?.county || '',
          postcode: form.address?.postcode || '',
          country: form.address?.country || 'United Kingdom',
        },
      };

      await api.put(`/clients/${client.id}`, payload);
      const refreshed = await api.get<Client>(`/clients/${client.id}/with-parties`);
      setClient(refreshed);
      setEditOpen(false);
    } catch (e: any) {
      setEditMessage({ text: e?.message || 'Failed to update client.', error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRef = async () => {
    if (!client) return;
    const nextRef = refValue.trim();
    if (!nextRef || nextRef === client.ref) return;
    setRefSaving(true);
    setEditMessage(null);
    try {
      await api.put(`/clients/${client.id}/ref`, { ref: nextRef });
      const refreshed = await api.get<Client>(`/clients/${client.id}/with-parties`);
      setClient(refreshed);
      router.replace(`/clients/${refreshed.id}`);
    } catch (e: any) {
      setEditMessage({ text: e?.message || 'Failed to update client reference.', error: true });
    } finally {
      setRefSaving(false);
    }
  };

  const handleMovePortfolio = async () => {
    if (!client || newPortfolio === null || newPortfolio === client.portfolioCode) return;
    setMoving(true);
    setMoveMsg(null);
    try {
      await api.put(`/clients/${client.id}/portfolio`, { portfolioCode: newPortfolio });
      const refreshed = await api.get<Client>(`/clients/${client.id}/with-parties`);
      setClient(refreshed);
      router.replace(`/clients/${refreshed.id}`);
    } catch (e: any) {
      setMoveMsg(e?.message || 'Failed to move portfolio.');
    } finally {
      setMoving(false);
    }
  };

  const handleSetPrimary = async (party: ClientParty) => {
    if (!client?.id) return;
    setSettingPrimary((prev) => ({ ...prev, [party.id]: true }));
    setPartyMsg(null);
    try {
      await api.put(`/clients/parties/${party.id}`, { primaryContact: true });
      const refreshed = await api.get<Client>(`/clients/${client?.id}/with-parties`);
      setClient(refreshed);
    } catch (e: any) {
      setPartyMsg(e?.message || 'Failed to update primary contact.');
    } finally {
      setSettingPrimary((prev) => ({ ...prev, [party.id]: false }));
    }
  };

  const handleResignParty = async (party: ClientParty) => {
    if (!client?.id) return;
    const ok = window.confirm('Mark this party as resigned?');
    if (!ok) return;
    setPartyMsg(null);
    try {
      await api.put(`/clients/parties/${party.id}/resign`, {});
      const refreshed = await api.get<Client>(`/clients/${client?.id}/with-parties`);
      setClient(refreshed);
    } catch (e: any) {
      setPartyMsg(e?.message || 'Failed to resign party.');
    }
  };

  const handleDeleteParty = async (party: ClientParty) => {
    if (!client?.id) return;
    const ok = window.confirm('Remove this party from the client?');
    if (!ok) return;
    setDeletingParty((prev) => ({ ...prev, [party.id]: true }));
    setPartyMsg(null);
    try {
      await api.delete(`/clients/parties/${party.id}`);
      const refreshed = await api.get<Client>(`/clients/${client?.id}/with-parties`);
      setClient(refreshed);
    } catch (e: any) {
      setPartyMsg(e?.message || 'Failed to delete party.');
    } finally {
      setDeletingParty((prev) => ({ ...prev, [party.id]: false }));
    }
  };

  const openPartyEditor = async (party: ClientParty) => {
    setPartyEditMsg(null);
    let person = partyPeople[party.personId] || null;
    if (!person) {
      try {
        person = await api.get<Person>(`/clients/people/${party.personId}`);
      } catch {
        person = null;
      }
    }

    setPartyEditing({ party, person });
    setPartyForm({
      role: party.role,
      ownershipPercent: party.ownershipPercent ?? '',
      appointedAt: toDateInput(party.appointedAt),
      resignedAt: toDateInput(party.resignedAt),
      primaryContact: party.primaryContact,
      firstName: person?.firstName || '',
      lastName: person?.lastName || '',
      email: person?.email || '',
      phone: person?.phone || '',
      nationality: person?.nationality || '',
      dateOfBirth: toDateInput(person?.dateOfBirth),
      address: {
        line1: person?.address?.line1 || '',
        line2: person?.address?.line2 || '',
        city: person?.address?.city || '',
        county: person?.address?.county || '',
        postcode: person?.address?.postcode || '',
        country: person?.address?.country || 'United Kingdom',
      },
    });
    setPartyEditOpen(true);
  };

  const handleSaveParty = async () => {
    if (!partyEditing) return;
    setPartySaving(true);
    setPartyEditMsg(null);
    try {
      const personPayload = {
        firstName: partyForm.firstName?.trim() || '',
        lastName: partyForm.lastName?.trim() || '',
        email: partyForm.email || '',
        phone: partyForm.phone || '',
        nationality: partyForm.nationality || '',
        dateOfBirth: partyForm.dateOfBirth || null,
        address: {
          line1: partyForm.address?.line1 || '',
          line2: partyForm.address?.line2 || '',
          city: partyForm.address?.city || '',
          county: partyForm.address?.county || '',
          postcode: partyForm.address?.postcode || '',
          country: partyForm.address?.country || 'United Kingdom',
        },
      };

      if (partyEditing.person?.id) {
        await api.put(`/clients/people/${partyEditing.person.id}`, personPayload);
      }

      await api.put(`/clients/parties/${partyEditing.party.id}`, {
        role: partyForm.role,
        ownershipPercent:
          partyForm.ownershipPercent === '' || partyForm.ownershipPercent === null
            ? null
            : Number(partyForm.ownershipPercent),
        appointedAt: partyForm.appointedAt || null,
        resignedAt: partyForm.resignedAt || null,
        primaryContact: Boolean(partyForm.primaryContact),
      });

      const refreshed = await api.get<Client>(`/clients/${client?.id}/with-parties`);
      setClient(refreshed);
      setPartyPeople({});
      peopleCacheRef.current = {};
      setPartyEditOpen(false);
    } catch (e: any) {
      setPartyEditMsg(e?.message || 'Failed to update party.');
    } finally {
      setPartySaving(false);
    }
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

  const isCompanyClient = client.type === 'COMPANY' || client.type === 'LLP';
  const showCompaniesHouse = isCompanyClient;
  const overviewMeta = isCompanyClient
    ? (client.registeredNumber ? `Company No. ${client.registeredNumber}` : 'No company number')
    : (client.utrNumber ? `UTR ${client.utrNumber}` : 'No UTR');
  const primaryDob = primaryPerson?.dateOfBirth ? new Date(primaryPerson.dateOfBirth).toLocaleDateString('en-GB') : '—';
  const primaryNationality = primaryPerson?.nationality || '—';
  const formType = (form?.type as ClientType) || client.type;
  const isCompanyForm = formType === 'COMPANY' || formType === 'LLP';
  const tabKeys = showCompaniesHouse
    ? (['services', 'accounts', 'tax', 'tasks', 'compliance', 'documents', 'letters', 'people', 'ch'] as const)
    : (['services', 'accounts', 'tax', 'tasks', 'compliance', 'documents', 'letters', 'people'] as const);

  /* ----------------- Main Page Layout ----------------- */
  return (
    <MDJShell
      pageTitle={client.name}
      pageSubtitle="Client overview, services, tasks, compliance, and documents"
      showBack backHref="/clients" backLabel="Back to Clients"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: client.name }]}
      actions={[
        { label: '← Back', onClick: () => router.push('/clients'), variant: 'outline' },
        { label: 'Report', onClick: () => router.push(`/clients/${client.id}/report`), variant: 'outline' },
        { label: 'Export CSV', onClick: downloadClientCsv, variant: 'outline' },
        { label: 'Edit Client', onClick: openEdit, variant: 'outline' },
        { label: 'Add Task', onClick: () => router.push(`/tasks/new?clientId=${client.id}`), variant: 'primary' },
        <button
          key="delete"
          type="button"
          className="btn-danger"
          onClick={handleDeleteClient}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete Client'}
        </button>,
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

      {/* Company Overview Header */}
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {client.name}
            </h2>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Client overview, services, tasks, compliance · {overviewMeta}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className={`badge ${badgeForStatus(client.status)}`}>{client.status}</span>
              <span className="badge">{client.type.replace(/_/g, ' ')}</span>
              {client.portfolioCode && <span className="badge primary">Portfolio #{client.portfolioCode}</span>}
            </div>
          </div>
          
          {/* Action Buttons - Top Right */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {showCompaniesHouse && (
              <>
                <button className="btn-outline-primary btn-sm" onClick={() => window.open(`https://find-and-update.company-information.service.gov.uk/company/${client.registeredNumber}`, '_blank')} disabled={!client.registeredNumber}>
                  View on CH
                </button>
                <button className="btn-primary btn-sm" onClick={handleSync} disabled={syncing || !client.registeredNumber}>
                  {syncing ? 'Syncing…' : 'Sync CH'}
                </button>
              </>
            )}
            <button className="btn-outline-primary btn-sm" onClick={() => router.push(`/clients/${client.id}/report`)}>
              Export
            </button>
            <button className="btn-outline-primary btn-sm" onClick={openEdit}>
              Edit Client
            </button>
            <button className="btn-primary btn-sm" onClick={() => router.push(`/accounts-production/new?clientId=${client.id}`)}>
              Accounts Production
            </button>
          </div>
        </div>

        {/* Client Overview Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {isCompanyClient ? 'Company Overview' : 'Client Overview'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client Ref</div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{client.ref || '—'}</div>
            </div>
            {isCompanyClient ? (
              <>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Company Number</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{client.registeredNumber || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Portfolio</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>#{client.portfolioCode || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>UTR</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{client.utrNumber || '—'}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Portfolio</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>#{client.portfolioCode || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>UTR</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{client.utrNumber || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Date of Birth</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{primaryDob}</div>
                </div>
              </>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Address</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: '1.4' }}>{addressLine || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{client.mainPhone || '—'}</div>
            </div>
            {isCompanyClient ? (
              <>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Last Info Return</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {client.accountsLastMadeUpTo ? new Date(client.accountsLastMadeUpTo).toLocaleDateString('en-GB') : '—'}
                    {client.accountsNextDue && (
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        → {new Date(client.accountsNextDue).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Year End (ARD)</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {client.accountsAccountingReferenceDay && client.accountsAccountingReferenceMonth
                      ? `${client.accountsAccountingReferenceDay} ${monthNames[client.accountsAccountingReferenceMonth - 1]}`
                      : '—'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{client.mainEmail || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Nationality</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{primaryNationality}</div>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Client Details and Next Actions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Client Details */}
          <div>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Client Details
            </h4>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Primary Contact</div>
                <div style={{ fontWeight: 600 }}>{primaryPerson?.fullName || client.mainEmail || '—'}</div>
                {client.mainEmail && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{client.mainEmail}</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Phone</div>
                <div style={{ fontWeight: 600 }}>{client.mainPhone || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {isCompanyClient ? 'Incorporation Date' : 'Date of Birth'}
                </div>
                <div style={{ fontWeight: 600 }}>
                  {isCompanyClient
                    ? (client.incorporationDate ? new Date(client.incorporationDate).toLocaleDateString('en-GB') : '—')
                    : primaryDob}
                </div>
              </div>
            </div>
          </div>

          {/* Next Actions */}
          <div>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Next Actions
            </h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              What matters now. Short list only. Quick Edit
            </div>
            
            {/* Compliance Status Cards */}
            {isCompanyClient ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {/* CT600 Due */}
                <div style={{ 
                  padding: '0.75rem', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '6px',
                  background: 'var(--surface-subtle)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>CT600 DUE</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {client.accountsNextDue ? new Date(client.accountsNextDue).toLocaleDateString('en-GB') : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Tracking from year end
                      </div>
                    </div>
                    <span className="badge success" style={{ fontSize: '0.75rem' }}>OK</span>
                  </div>
                </div>

                {/* VAT Return */}
                <div style={{ 
                  padding: '0.75rem', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '6px',
                  background: 'var(--surface-subtle)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>VAT RETURN</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Not registered</div>
                    </div>
                    <span className="badge default" style={{ fontSize: '0.75rem' }}>Info</span>
                  </div>
                </div>

                {/* Confirmation Statement */}
                <div style={{ 
                  padding: '0.75rem', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '6px',
                  background: 'var(--surface-subtle)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>CONFIRMATION</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {client.confirmationNextDue ? new Date(client.confirmationNextDue).toLocaleDateString('en-GB') : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Companies House</div>
                    </div>
                    {(() => {
                      if (!client.confirmationNextDue) return <span className="badge default" style={{ fontSize: '0.75rem' }}>—</span>;
                      const due = new Date(client.confirmationNextDue);
                      const now = new Date();
                      const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      if (daysUntil < 0) return <span className="badge danger" style={{ fontSize: '0.75rem' }}>Overdue</span>;
                      if (daysUntil <= 60) return <span className="badge warning" style={{ fontSize: '0.75rem' }}>Due Soon</span>;
                      return <span className="badge success" style={{ fontSize: '0.75rem' }}>OK</span>;
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '0.75rem', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '6px',
                background: 'var(--surface-subtle)',
                fontSize: '0.875rem',
                color: 'var(--text-muted)'
              }}>
                No company filing milestones for this client type.
              </div>
            )}
          </div>
        </div>
      </div>

      {tabMessage && (
        <div className="card-mdj" style={{ marginBottom: '1rem', padding: '.75rem 1rem' }}>
          <span style={{ color: tabMessage.error ? 'var(--danger)' : 'var(--text-muted)' }}>{tabMessage.text}</span>
        </div>
      )}
      {/* Compact Tabs Section */}
      <div className="card-mdj" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Enhanced Tabs Header with Counts */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-subtle)', padding: '0', background: 'var(--surface-table-header)' }}>
          {tabKeys.map((key) => {
            const counts = {
              services: services.length,
              accounts: accountsSets.length,
              tax: taxCalculations.length,
              tasks: tasks.length,
              compliance: compliance.length,
              documents: documents.length,
              letters: letters.length,
              people: parties.length,
              ch: chOfficers.length + chPscs.length + chFilings.length,
            } as const;
            const active = tab === key;
            const labels = {
              services: 'Services',
              accounts: 'Accounts',
              tax: 'Tax',
              tasks: 'Tasks', 
              compliance: 'Compliance',
              documents: 'Documents',
              letters: 'Letters',
              people: 'People',
              ch: 'Companies House'
            };
            return (
              <button
                key={key}
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
                <span className={`badge ${active ? 'primary' : 'default'}`} style={{ fontSize: '0.75rem' }}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content - Services */}
        {tab === 'services' && (
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <button className="btn-outline-primary" onClick={handleGenerateTasks} disabled={generatingTasks || services.length === 0} style={{ padding: '6px 12px', fontSize: 13 }}>
                {generatingTasks ? 'Generating…' : 'Generate upcoming tasks'}
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
                      <th>Status</th>
                      <th>Next Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div>{s.kind || '—'}</div>
                          {s.description && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.description}</div>
                          )}
                        </td>
                        <td>{s.frequency || '—'}</td>
                        <td>{formatCurrency(s.fee)}</td>
                        <td>{formatCurrency(s.annualized)}</td>
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
                    ))}
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
                      <th>Status</th>
                      <th>Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => {
                      const st = getTaskBadge(t.status);
                      const label = String(t.status || '').replace(/_/g, ' ').toLowerCase();
                      return (
                        <tr key={t.id}>
                          <td>{t.title}</td>
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
            {compliance.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No compliance items found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {compliance.map((item) => {
                      const badge = getComplianceBadge(item.status);
                      const label = String(item.status || '').replace(/_/g, ' ').toLowerCase();
                      return (
                        <tr key={item.id}>
                          <td>{item.type?.replace(/_/g, ' ') || '—'}</td>
                          <td>
                            <span className={`badge ${badge}`}>{label}</span>
                          </td>
                          <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-outline-primary btn-xs"
                              onClick={() => router.push(`/compliance/${item.id}`)}
                              style={{ marginRight: '0.5rem' }}
                            >
                              View
                            </button>
                            <button
                              className="btn-xs danger"
                              onClick={() => handleDeleteCompliance(item.id)}
                              disabled={complianceDeleting[item.id]}
                            >
                              {complianceDeleting[item.id] ? 'Deleting…' : 'Delete'}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <button className="btn-outline-primary btn-sm" onClick={() => router.push(`/clients/${client.id}/parties/new`)}>
                Add Party
              </button>
              {partyMsg && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{partyMsg}</span>}
            </div>
            {parties.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No parties linked to this client.
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parties.map((party) => {
                      const person = partyPeople[party.personId];
                      return (
                        <tr key={party.id}>
                          <td>
                            <div>{person?.fullName || person?.email || 'Unknown person'}</div>
                            {(person?.email || person?.phone || !person) && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {[person?.email, person?.phone].filter(Boolean).join(' · ') || party.personId}
                              </div>
                            )}
                          </td>
                          <td>{party.role.replace(/_/g, ' ')}</td>
                          <td>{typeof party.ownershipPercent === 'number' ? `${party.ownershipPercent}%` : '—'}</td>
                          <td>{party.appointedAt ? new Date(party.appointedAt).toLocaleDateString('en-GB') : '—'}</td>
                          <td>{party.resignedAt ? new Date(party.resignedAt).toLocaleDateString('en-GB') : '—'}</td>
                          <td>{party.primaryContact ? <span className="badge success">Primary</span> : '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-outline-primary btn-xs"
                              onClick={() => openPartyEditor(party)}
                              style={{ marginRight: '0.5rem' }}
                            >
                              Edit
                            </button>
                            {!party.primaryContact && (
                              <button
                                className="btn-outline-primary btn-xs"
                                onClick={() => handleSetPrimary(party)}
                                disabled={settingPrimary[party.id]}
                                style={{ marginRight: '0.5rem' }}
                              >
                                {settingPrimary[party.id] ? 'Setting…' : 'Set Primary'}
                              </button>
                            )}
                            {!party.resignedAt && (
                              <button
                                className="btn-xs warning"
                                onClick={() => handleResignParty(party)}
                                style={{ marginRight: '0.5rem' }}
                              >
                                Resign
                              </button>
                            )}
                            <button
                              className="btn-xs danger"
                              onClick={() => handleDeleteParty(party)}
                              disabled={deletingParty[party.id]}
                            >
                              {deletingParty[party.id] ? 'Deleting…' : 'Remove'}
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

      {/* Edit Modal */}
      <MDJModal isOpen={editOpen} onClose={() => setEditOpen(false)} title={`Edit Client: ${client.name}`}>
        <div style={{ padding: '1rem' }}>
          {editMessage && (
            <div className="card-mdj" style={{ marginBottom: '1rem', padding: '.75rem 1rem' }}>
              <span style={{ color: editMessage.error ? 'var(--danger)' : 'var(--text-muted)' }}>{editMessage.text}</span>
            </div>
          )}
          <div className="kv" style={{ marginBottom: '1rem' }}>
            <div className="k">Client Name</div>
            <div className="v">
              <input className="input-mdj" value={form.name || ''} onChange={(e) => setField('name', e.target.value)} />
            </div>

            <div className="k">Client Type</div>
            <div className="v">
              <select className="input-mdj" value={form.type || 'COMPANY'} onChange={(e) => setField('type', e.target.value)}>
                <option value="COMPANY">Company</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="SOLE_TRADER">Sole Trader</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="LLP">LLP</option>
              </select>
            </div>

            <div className="k">Status</div>
            <div className="v">
              <select className="input-mdj" value={form.status || 'ACTIVE'} onChange={(e) => setField('status', e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            {isCompanyForm && (
              <>
                <div className="k">Registered Number</div>
                <div className="v">
                  <input
                    className="input-mdj"
                    value={form.registeredNumber || ''}
                    onChange={(e) => setField('registeredNumber', e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="k">UTR</div>
            <div className="v">
              <input className="input-mdj" value={form.utrNumber || ''} onChange={(e) => setField('utrNumber', e.target.value)} />
            </div>
          </div>

          <h4 style={{ margin: '0 0 0.5rem 0' }}>Contact</h4>
          <div className="kv" style={{ marginBottom: '1rem' }}>
            <div className="k">Main Email</div>
            <div className="v">
              <input className="input-mdj" value={form.mainEmail || ''} onChange={(e) => setField('mainEmail', e.target.value)} />
            </div>
            <div className="k">Main Phone</div>
            <div className="v">
              <input className="input-mdj" value={form.mainPhone || ''} onChange={(e) => setField('mainPhone', e.target.value)} />
            </div>
          </div>

          {isCompanyForm && (
            <>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Key Dates</h4>
              <div className="kv" style={{ marginBottom: '1rem' }}>
                <div className="k">Incorporation Date</div>
                <div className="v">
                  <input
                    className="input-mdj"
                    type="date"
                    value={form.incorporationDate || ''}
                    onChange={(e) => setField('incorporationDate', e.target.value)}
                  />
                </div>
                <div className="k">Accounting Reference Day</div>
                <div className="v">
                  <input
                    className="input-mdj"
                    type="number"
                    min={1}
                    max={31}
                    value={form.accountsAccountingReferenceDay || ''}
                    onChange={(e) => setField('accountsAccountingReferenceDay', e.target.value)}
                  />
                </div>
                <div className="k">Accounting Reference Month</div>
                <div className="v">
                  <input
                    className="input-mdj"
                    type="number"
                    min={1}
                    max={12}
                    value={form.accountsAccountingReferenceMonth || ''}
                    onChange={(e) => setField('accountsAccountingReferenceMonth', e.target.value)}
                  />
                </div>
                <div className="k">Accounts Last Made Up To</div>
                <div className="v">
                  <input
                    className="input-mdj"
                    type="date"
                    value={form.accountsLastMadeUpTo || ''}
                    onChange={(e) => setField('accountsLastMadeUpTo', e.target.value)}
                  />
                </div>
                <div className="k">Accounts Next Due</div>
                <div className="v">
                  <input
                    className="input-mdj"
                    type="date"
                    value={form.accountsNextDue || ''}
                    onChange={(e) => setField('accountsNextDue', e.target.value)}
                  />
                </div>
                <div className="k">Confirmation Last Made Up To</div>
                <div className="v">
                  <input
                    className="input-mdj"
                    type="date"
                    value={form.confirmationLastMadeUpTo || ''}
                    onChange={(e) => setField('confirmationLastMadeUpTo', e.target.value)}
                  />
                </div>
                <div className="k">Confirmation Next Due</div>
                <div className="v">
                  <input
                    className="input-mdj"
                    type="date"
                    value={form.confirmationNextDue || ''}
                    onChange={(e) => setField('confirmationNextDue', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <h4 style={{ margin: '0 0 0.5rem 0' }}>Address</h4>
          <div className="kv" style={{ marginBottom: '1rem' }}>
            <div className="k">Address Line 1</div>
            <div className="v">
              <input
                className="input-mdj"
                value={form.address?.line1 || ''}
                onChange={(e) => setAddressField('line1', e.target.value)}
              />
            </div>
            <div className="k">Address Line 2</div>
            <div className="v">
              <input
                className="input-mdj"
                value={form.address?.line2 || ''}
                onChange={(e) => setAddressField('line2', e.target.value)}
              />
            </div>
            <div className="k">City</div>
            <div className="v">
              <input className="input-mdj" value={form.address?.city || ''} onChange={(e) => setAddressField('city', e.target.value)} />
            </div>
            <div className="k">County/State</div>
            <div className="v">
              <input
                className="input-mdj"
                value={form.address?.county || ''}
                onChange={(e) => setAddressField('county', e.target.value)}
              />
            </div>
            <div className="k">Postcode</div>
            <div className="v">
              <input
                className="input-mdj"
                value={form.address?.postcode || ''}
                onChange={(e) => setAddressField('postcode', e.target.value)}
              />
            </div>
            <div className="k">Country</div>
            <div className="v">
              <input
                className="input-mdj"
                value={form.address?.country || ''}
                onChange={(e) => setAddressField('country', e.target.value)}
              />
            </div>
          </div>

          <h4 style={{ margin: '0 0 0.5rem 0' }}>Reference & Portfolio</h4>
          <div className="kv" style={{ marginBottom: '1rem' }}>
            <div className="k">Client ID</div>
            <div className="v">
              <input className="input-mdj" value={client.id} readOnly />
            </div>
            <div className="k">Client Ref</div>
            <div className="v">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="input-mdj"
                  value={refValue}
                  onChange={(e) => setRefValue(e.target.value)}
                />
                <button className="btn-outline-primary" onClick={handleUpdateRef} disabled={refSaving || refValue.trim() === client.ref}>
                  {refSaving ? 'Updating…' : 'Update'}
                </button>
              </div>
            </div>
            <div className="k">Portfolio</div>
            <div className="v">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  className="input-mdj"
                  value={String(newPortfolio ?? client.portfolioCode ?? '')}
                  onChange={(e) => setNewPortfolio(Number(e.target.value))}
                >
                  {portfolios.length === 0 && (
                    <option value={client.portfolioCode || ''}>#{client.portfolioCode || '—'}</option>
                  )}
                  {portfolios.map((p) => (
                    <option key={p.code} value={p.code}>#{p.code} — {p.name}</option>
                  ))}
                </select>
                <button
                  className="btn-outline-primary"
                  onClick={handleMovePortfolio}
                  disabled={moving || newPortfolio === null || newPortfolio === client.portfolioCode}
                >
                  {moving ? 'Moving…' : 'Move'}
                </button>
              </div>
            </div>
          </div>

          {moveMsg && (
            <div className="card-mdj" style={{ marginBottom: '1rem', padding: '.75rem 1rem' }}>
              <span style={{ color: 'var(--danger)' }}>{moveMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-outline-primary" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveClient} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </MDJModal>

      <MDJModal
        isOpen={partyEditOpen}
        onClose={() => setPartyEditOpen(false)}
        title={`Edit Party${partyEditing?.person?.fullName ? `: ${partyEditing.person.fullName}` : ''}`}
      >
        <div style={{ padding: '1rem' }}>
          {partyEditMsg && (
            <div className="card-mdj" style={{ marginBottom: '1rem', padding: '.75rem 1rem' }}>
              <span style={{ color: 'var(--danger)' }}>{partyEditMsg}</span>
            </div>
          )}
          <div className="kv" style={{ marginBottom: '1rem' }}>
            <div className="k">First Name</div>
            <div className="v">
              <input className="input-mdj" value={partyForm.firstName || ''} onChange={(e) => setPartyForm((p: any) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="k">Last Name</div>
            <div className="v">
              <input className="input-mdj" value={partyForm.lastName || ''} onChange={(e) => setPartyForm((p: any) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div className="k">Email</div>
            <div className="v">
              <input className="input-mdj" value={partyForm.email || ''} onChange={(e) => setPartyForm((p: any) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="k">Phone</div>
            <div className="v">
              <input className="input-mdj" value={partyForm.phone || ''} onChange={(e) => setPartyForm((p: any) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="k">Nationality</div>
            <div className="v">
              <input className="input-mdj" value={partyForm.nationality || ''} onChange={(e) => setPartyForm((p: any) => ({ ...p, nationality: e.target.value }))} />
            </div>
            <div className="k">Date of Birth</div>
            <div className="v">
              <input
                className="input-mdj"
                type="date"
                value={partyForm.dateOfBirth || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, dateOfBirth: e.target.value }))}
              />
            </div>
          </div>

          <h4 style={{ margin: '0 0 0.5rem 0' }}>Party Details</h4>
          <div className="kv" style={{ marginBottom: '1rem' }}>
            <div className="k">Role</div>
            <div className="v">
              <select className="input-mdj" value={partyForm.role || 'CONTACT'} onChange={(e) => setPartyForm((p: any) => ({ ...p, role: e.target.value }))}>
                <option value="DIRECTOR">Director</option>
                <option value="SHAREHOLDER">Shareholder</option>
                <option value="PARTNER">Partner</option>
                <option value="MEMBER">Member</option>
                <option value="OWNER">Owner</option>
                <option value="UBO">UBO</option>
                <option value="SECRETARY">Secretary</option>
                <option value="CONTACT">Contact</option>
              </select>
            </div>
            <div className="k">Ownership %</div>
            <div className="v">
              <input
                className="input-mdj"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={partyForm.ownershipPercent ?? ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, ownershipPercent: e.target.value }))}
              />
            </div>
            <div className="k">Appointed</div>
            <div className="v">
              <input
                className="input-mdj"
                type="date"
                value={partyForm.appointedAt || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, appointedAt: e.target.value }))}
              />
            </div>
            <div className="k">Resigned</div>
            <div className="v">
              <input
                className="input-mdj"
                type="date"
                value={partyForm.resignedAt || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, resignedAt: e.target.value }))}
              />
            </div>
            <div className="k">Primary Contact</div>
            <div className="v">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={Boolean(partyForm.primaryContact)}
                  onChange={(e) => setPartyForm((p: any) => ({ ...p, primaryContact: e.target.checked }))}
                />
                Set as primary contact
              </label>
            </div>
          </div>

          <h4 style={{ margin: '0 0 0.5rem 0' }}>Address</h4>
          <div className="kv" style={{ marginBottom: '1rem' }}>
            <div className="k">Address Line 1</div>
            <div className="v">
              <input
                className="input-mdj"
                value={partyForm.address?.line1 || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, address: { ...(p.address || {}), line1: e.target.value } }))}
              />
            </div>
            <div className="k">Address Line 2</div>
            <div className="v">
              <input
                className="input-mdj"
                value={partyForm.address?.line2 || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, address: { ...(p.address || {}), line2: e.target.value } }))}
              />
            </div>
            <div className="k">City</div>
            <div className="v">
              <input
                className="input-mdj"
                value={partyForm.address?.city || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, address: { ...(p.address || {}), city: e.target.value } }))}
              />
            </div>
            <div className="k">County/State</div>
            <div className="v">
              <input
                className="input-mdj"
                value={partyForm.address?.county || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, address: { ...(p.address || {}), county: e.target.value } }))}
              />
            </div>
            <div className="k">Postcode</div>
            <div className="v">
              <input
                className="input-mdj"
                value={partyForm.address?.postcode || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, address: { ...(p.address || {}), postcode: e.target.value } }))}
              />
            </div>
            <div className="k">Country</div>
            <div className="v">
              <input
                className="input-mdj"
                value={partyForm.address?.country || ''}
                onChange={(e) => setPartyForm((p: any) => ({ ...p, address: { ...(p.address || {}), country: e.target.value } }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-outline-primary" onClick={() => setPartyEditOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveParty} disabled={partySaving}>
              {partySaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </MDJModal>
    </MDJShell>
  );
}
