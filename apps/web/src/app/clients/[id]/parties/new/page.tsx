'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import MDJLayout from '@/components/mdj-ui/MDJLayout';
import { MDJSection, MDJCard, MDJButton, MDJInput, MDJSelect, MDJTextarea } from '@/components/mdj-ui';
import { api, API_BASE_URL } from '@/lib/api';
import type { Client } from '@/lib/types';

// ---- Small UI helpers (theme-friendly) ----
const Pill = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`mdj-pill ${active ? 'mdj-pill-active' : ''}`}
    style={{
      padding: '6px 12px',
      borderRadius: 999,
      border: '1px solid var(--mdj-border, #d1d5db)',
      background: active ? 'var(--mdj-gold-50, #fff8e1)' : 'transparent',
      color: 'var(--mdj-text, #111827)',
      fontSize: 13,
    }}
  >
    {label}
  </button>
);

const Badge = ({
  tone = 'default',
  children,
}: {
  tone?: 'success' | 'default';
  children: React.ReactNode;
}) => (
  <span
    style={{
      display: 'inline-block',
      fontSize: 12,
      padding: '2px 8px',
      borderRadius: 999,
      background: tone === 'success' ? '#dcfce7' : '#e5e7eb',
      color: tone === 'success' ? '#166534' : '#374151',
      border: '1px solid rgba(0,0,0,0.05)',
    }}
  >
    {children}
  </span>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mdj-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
    <div style={{ fontWeight: 600, color: '#111827', marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 14, color: '#374151' }}>{children}</div>
  </div>
);

type Document = {
  id: string;
  filename: string;
  originalName?: string;
  mimeType?: string;
  category?: string;
  createdAt?: string;
};

// ---- Page ----
export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const pathname = usePathname();

  // Robust id extraction for client components
  const id =
    (Array.isArray(params?.id) ? params?.id[0] : params?.id) ||
    (pathname ? pathname.split('/').filter(Boolean).pop() : undefined);

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'Overview' | 'Services' | 'Tasks' | 'Filing History' | 'Documents' | 'Calendar'>(
    'Overview'
  );
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState<string>('OTHER');
  const [docDescription, setDocDescription] = useState<string>('');
  const [docUploading, setDocUploading] = useState(false);
  const [docMsg, setDocMsg] = useState<string | null>(null);
  const [docDeleting, setDocDeleting] = useState<Record<string, boolean>>({});

  // Fetch client
  useEffect(() => {
    let mounted = true;
    if (!id) {
      setError('Missing client id in route');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const data = await api.getClient(id);
        if (mounted) setClient(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load client');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const loadDocuments = async (clientId: string) => {
    setDocsLoading(true);
    setDocMsg(null);
    try {
      const res = await api.get(`/documents/client/${clientId}`).catch(() => null);
      const docs = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
      setDocuments(docs);
    } catch (e: any) {
      setDocMsg(e?.message || 'Failed to load documents.');
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (!client?.id || tab !== 'Documents') return;
    loadDocuments(client.id);
  }, [client?.id, tab]);

  const handleUploadDocument = async () => {
    if (!client?.id) return;
    if (!docFile) {
      setDocMsg('Select a file to upload.');
      return;
    }
    setDocUploading(true);
    setDocMsg(null);
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
      await loadDocuments(client.id);
      setDocMsg('Document uploaded.');
    } catch (e: any) {
      setDocMsg(e?.message || 'Failed to upload document.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDocumentDownload = async (doc: Document, preview = false) => {
    try {
      const buffer = await api.get<ArrayBuffer>(`/documents/${doc.id}/${preview ? 'preview' : 'download'}`);
      const blob = new Blob([buffer], { type: doc.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      if (preview) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.originalName || doc.filename || `document-${doc.id}`;
        a.click();
      }
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setDocMsg(e?.message || 'Failed to download document.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const ok = window.confirm('Delete this document?');
    if (!ok || !client?.id) return;
    setDocDeleting((prev) => ({ ...prev, [docId]: true }));
    setDocMsg(null);
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (e: any) {
      setDocMsg(e?.message || 'Failed to delete document.');
    } finally {
      setDocDeleting((prev) => ({ ...prev, [docId]: false }));
    }
  };

  // Subtitle under big title
  const subtitle = useMemo((): string | undefined => {
    if (!client) return undefined;
    const parts: string[] = [client.type];
    if (typeof client.portfolioCode === 'number') parts.push(`Portfolio #${client.portfolioCode}`);
    parts.push(`Status: ${client.status}`);
    return parts.join(' • ');
  }, [client]);

  // Header actions (right side)
  const actions = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn-outline-gold" onClick={() => router.back()}>
        ← Back
      </button>
      <button className="btn-outline-gold" onClick={() => id && router.push(`/clients/${id}/edit`)}>
        Edit
      </button>
      <button className="btn-outline-gold" onClick={() => router.refresh()}>
        Sync
      </button>
      <button className="btn-gold" onClick={() => id && router.push(`/clients/${id}/report`)}>
        Generate Report
      </button>
    </div>
  );

  return (
    <MDJLayout
      title={client?.name || 'Client'}
      subtitle={subtitle}
      actions={actions}
    >
      {/* Section pills (Overview / Services / Tasks / Filing / Docs / Calendar) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['Overview', 'Services', 'Tasks', 'Filing History', 'Documents', 'Calendar'] as const).map((p) => (
          <Pill key={p} label={p} active={tab === p} onClick={() => setTab(p)} />
        ))}
      </div>

      {/* Content body */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading client…</div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>
          {error}{' '}
          <button className="btn-outline-gold" style={{ marginLeft: 8 }} onClick={() => router.refresh()}>
            Retry
          </button>
        </div>
      ) : !client ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Client not found.</div>
      ) : tab === 'Overview' ? (
        <>
          {/* Responsive 2-col grid for the core info (like your PDF layout) */}
          <style>{`
            .mdj-two-col { display: grid; grid-template-columns: 1fr; gap: 16px; }
            @media (min-width: 980px) { .mdj-two-col { grid-template-columns: 1.15fr 1fr; } }
            .mdj-info-grid { display: grid; grid-template-columns: 180px 1fr; row-gap: 8px; }
          `}</style>

          <div className="mdj-two-col" style={{ marginBottom: 16 }}>
            <Card title="Company Information">
              <div className="mdj-info-grid">
                <span style={{ color: '#6b7280' }}>Reference</span>
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: '#c8a652' }}>
                  {client.registeredNumber || client.id || '—'}
                </span>

                <span style={{ color: '#6b7280' }}>Company Number</span>
                <span>{client.registeredNumber || '—'}</span>

                <span style={{ color: '#6b7280' }}>Type</span>
                <span>{client.type}</span>

                <span style={{ color: '#6b7280' }}>Created</span>
                <span>{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—'}</span>

                <span style={{ color: '#6b7280' }}>Updated</span>
                <span>{client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : '—'}</span>
              </div>
            </Card>

            <Card title="Registered Address">
              <div style={{ lineHeight: 1.6 }}>
                {[client.address?.line1, client.address?.line2].filter(Boolean).join(', ')}
                <br />
                {[client.address?.city, client.address?.county].filter(Boolean).join(', ')}
                <br />
                {client.address?.postcode}
                {client.address?.country ? `, ${client.address?.country}` : ''}
              </div>
            </Card>
          </div>

          <div className="mdj-two-col" style={{ marginBottom: 16 }}>
            <Card title="Annual Accounts">
              <div className="mdj-info-grid">
                <span style={{ color: '#6b7280' }}>Year End</span>
                <span>—</span>

                <span style={{ color: '#6b7280' }}>Next Accounts Due</span>
                <span>—</span>
              </div>
            </Card>

            <Card title="Directors &amp; Officers">
              <div style={{ color: '#6b7280' }}>No officers recorded.</div>
            </Card>
          </div>

          <Card title="Primary Contact">
            <div className="mdj-info-grid">
              <span style={{ color: '#6b7280' }}>Email</span>
              <span>
                {client.mainEmail ? (
                  <Link href={`mailto:${client.mainEmail}`} className="link-gold">
                    {client.mainEmail}
                  </Link>
                ) : (
                  '—'
                )}
              </span>

              <span style={{ color: '#6b7280' }}>Phone</span>
              <span>{client.mainPhone || '—'}</span>
            </div>
          </Card>
        </>
      ) : tab === 'Services' ? (
        <Card title="Services">
          <div style={{ color: '#6b7280' }}>No services yet.</div>
        </Card>
      ) : tab === 'Tasks' ? (
        <Card title="Tasks">
          <div style={{ color: '#6b7280' }}>No tasks yet.</div>
        </Card>
      ) : tab === 'Filing History' ? (
        <Card title="Filing History">
          <div style={{ color: '#6b7280' }}>No filings yet.</div>
        </Card>
      ) : tab === 'Documents' ? (
        <Card title="Documents">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
              <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
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
                style={{ minWidth: 220 }}
              />
              <button className="btn-gold" onClick={handleUploadDocument} disabled={docUploading}>
                {docUploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            {docMsg && <div style={{ color: '#6b7280' }}>{docMsg}</div>}
            {docsLoading ? (
              <div style={{ color: '#6b7280' }}>Loading documents…</div>
            ) : documents.length === 0 ? (
              <div style={{ color: '#6b7280' }}>No documents yet.</div>
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
                        <td>{doc.filename || doc.originalName || doc.id}</td>
                        <td>{doc.category || '—'}</td>
                        <td>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn-outline-gold btn-xs" onClick={() => handleDocumentDownload(doc, true)} style={{ marginRight: 6 }}>
                            Preview
                          </button>
                          <button className="btn-outline-gold btn-xs" onClick={() => handleDocumentDownload(doc, false)} style={{ marginRight: 6 }}>
                            Download
                          </button>
                          <button
                            className="btn-outline-gold btn-xs"
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
        </Card>
      ) : (
        <Card title="Calendar">
          <div style={{ color: '#6b7280' }}>No events yet.</div>
        </Card>
      )}
    </MDJLayout>
  );
}
