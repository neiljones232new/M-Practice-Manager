'use client';

import { useEffect, useMemo, useState } from 'react';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api, API_BASE_URL } from '@/lib/api';

type DocCategory =
  | 'TAX' | 'ACCOUNTS' | 'COMPLIANCE' | 'REPORTS' | 'INVOICES' | 'RECEIPTS'
  | 'BANK_STATEMENTS' | 'OTHER';

interface DocumentItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  clientId?: string;
  serviceId?: string;
  taskId?: string;
  category: DocCategory;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

interface ClientRef {
  id: string;
  name: string;
}

interface Stats {
  totalDocuments: number;
  totalSize: number;
  documentsByCategory?: Record<string, number>;
  recentUploads?: DocumentItem[];
}

const CATEGORIES: DocCategory[] = [
  'TAX','ACCOUNTS','COMPLIANCE','REPORTS','INVOICES','RECEIPTS','BANK_STATEMENTS','OTHER'
];

// Build a base URL for endpoints that must bypass the JSON client (file upload/download).
const API_BASE = API_BASE_URL;

const normalizeDocs = (items: any[]): DocumentItem[] =>
  items.map((d) => ({
    ...d,
    createdAt: d.createdAt || d.uploadedAt || d.updatedAt,
  }));

export default function DocumentsPage() {
  // Data
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [clients, setClients] = useState<ClientRef[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState('');
  const [archived, setArchived] = useState('');

  // Selection
  const [selected, setSelected] = useState<string[]>([]);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({
    category: 'OTHER' as DocCategory,
    clientId: '',
    serviceId: '',
    taskId: '',
  });

  // ---------- Loaders ----------
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [docRes, cliRes, stRes] = await Promise.all([
          api.get('/documents'),
          api.getClients(),
          api.get('/documents/stats').catch(() => null),
        ]);

        if (!on) return;

        setDocs(normalizeDocs(Array.isArray(docRes) ? docRes : (((docRes as any)?.data) ?? [])));
        setClients(
          (Array.isArray(cliRes) ? cliRes : [])
            .map((c: any) => c.node ?? c)
            .map((c: any) => ({ id: c.id, name: c.name }))
        );
        const statsVal = (stRes as any)?.data ?? stRes ?? null;
        if (statsVal?.recentUploads) {
          statsVal.recentUploads = normalizeDocs(statsVal.recentUploads);
        }
        setStats(statsVal as any);
      } catch (e: any) {
        if (!on) return;
        console.error('Failed to load documents', e);
        setErr(e?.message || 'Failed to load documents');
        setDocs([]);
        setClients([]);
        setStats(null);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  // ---------- Derived ----------
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return docs.filter(d => {
      const matchesQ =
        !needle ||
        d.originalName.toLowerCase().includes(needle) ||
        d.category.toLowerCase().includes(needle);

      const matchesClient = !clientId || d.clientId === clientId;
      const matchesCat = !category || d.category === category;
      const matchesArchived =
        archived === '' ? true
        : archived === 'true' ? d.isArchived
        : !d.isArchived;

      return matchesQ && matchesClient && matchesCat && matchesArchived;
    });
  }, [docs, q, clientId, category, archived]);

  // ---------- Helpers ----------
  const fmtSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  const fmtDate = (s: string) =>
    new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

  const clientName = (id?: string) =>
    clients.find(c => c.id === id)?.name ?? (id ? 'Unknown Client' : '-');

  // ---------- Upload ----------
  const doUpload = async () => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', uploadMeta.category);
      if (uploadMeta.clientId) fd.append('clientId', uploadMeta.clientId);
      if (uploadMeta.serviceId) fd.append('serviceId', uploadMeta.serviceId);
      if (uploadMeta.taskId) fd.append('taskId', uploadMeta.taskId);

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: {
          // do NOT set Content-Type; browser sets multipart/form-data boundary
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');

      // Refresh docs & stats
      const [docRes, stRes] = await Promise.all([
        api.get('/documents'),
        api.get('/documents/stats').catch(() => null),
      ]);
      setDocs(normalizeDocs(Array.isArray(docRes) ? docRes : (((docRes as any)?.data) ?? [])));
      const statsVal2 = (stRes as any)?.data ?? stRes ?? null;
      if (statsVal2?.recentUploads) {
        statsVal2.recentUploads = normalizeDocs(statsVal2.recentUploads);
      }
      setStats(statsVal2 as any);

      // Reset modal
      setShowUpload(false);
      setFile(null);
      setUploadMeta({ category: 'OTHER', clientId: '', serviceId: '', taskId: '' });
    } catch (e: any) {
      setErr(e?.message || 'Upload failed');
    }
  };

  // ---------- Preview / Download ----------
  const preview = async (id: string) => {
    try {
      const doc = docs.find((d) => d.id === id);
      const buffer = await api.get<ArrayBuffer>(`/documents/${id}/preview`);
      const blob = new Blob([buffer], { type: doc?.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.message || 'Preview failed');
    }
  };
  const download = async (id: string) => {
    try {
      const doc = docs.find((d) => d.id === id);
      const buffer = await api.get<ArrayBuffer>(`/documents/${id}/download`);
      const blob = new Blob([buffer], { type: doc?.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const suggested = doc?.originalName || doc?.filename || 'document';
      a.href = url; a.download = suggested;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); a.remove();
    } catch (e: any) {
      setErr(e?.message || 'Download failed');
    }
  };

  // ---------- Bulk ----------
  const bulk = async (action: 'archive'|'unarchive'|'delete') => {
    if (selected.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/documents/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify({ documentIds: selected, operation: action }),
      });
      if (!res.ok) throw new Error('Bulk action failed');

      // Refresh documents
      const docRes = await api.get('/documents');
      setDocs(normalizeDocs(Array.isArray(docRes) ? docRes : (((docRes as any)?.data) ?? [])));
      setSelected([]);
    } catch (e: any) {
      setErr(e?.message || 'Bulk action failed');
    }
  };

  // ---------- Render ----------
  return (
    <MDJShell
      pageTitle="Documents"
      pageSubtitle="Manage client documents and files"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documents' }]}
      actions={[
        { label: 'Upload Document', onClick: () => setShowUpload(true), variant: 'primary' },
      ]}
    >
      {/* Stats */}
      {stats && (
        <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem', marginBottom:'1rem' }}>
          <div className="card-mdj">
            <div style={{ fontSize:'2rem', fontWeight:800, color:'var(--gold)' }}>{stats.totalDocuments ?? 0}</div>
            <div className="mdj-sub">Total Documents</div>
          </div>
          <div className="card-mdj">
            <div style={{ fontSize:'2rem', fontWeight:800, color:'var(--text-dark)' }}>{fmtSize(stats.totalSize ?? 0)}</div>
            <div className="mdj-sub">Total Size</div>
          </div>
          <div className="card-mdj">
            <div style={{ fontSize:'2rem', fontWeight:800, color:'var(--text-dark)' }}>
              {Object.keys(stats.documentsByCategory ?? {}).length}
            </div>
            <div className="mdj-sub">Categories</div>
          </div>
          <div className="card-mdj">
            <div style={{ fontSize:'2rem', fontWeight:800, color:'var(--text-dark)' }}>
              {(stats.recentUploads ?? []).filter(d =>
                new Date(d.createdAt).getMonth() === new Date().getMonth()
              ).length}
            </div>
            <div className="mdj-sub">This Month</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card-mdj" style={{ marginBottom:'1rem' }}>
        <div
          style={{
            display:'grid',
            gridTemplateColumns:'1fr auto auto auto',
            gap:'.5rem',
            alignItems:'center'
          }}
        >
          <input
            className="mdj-input"
            placeholder="Search by name or category…"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
          <select
            className="mdj-select"
            value={category}
            onChange={(e)=>setCategory(e.target.value)}
            aria-label="Category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="mdj-select"
            value={clientId}
            onChange={(e)=>setClientId(e.target.value)}
            aria-label="Client"
          >
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="mdj-select"
            value={archived}
            onChange={(e)=>setArchived(e.target.value)}
            aria-label="Archived"
          >
            <option value="">All Documents</option>
            <option value="false">Active</option>
            <option value="true">Archived</option>
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="card-mdj" style={{ marginBottom:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>{selected.length} selected</span>
            <div style={{ display:'flex', gap:'.5rem' }}>
              <button className="btn-outline-gold" onClick={()=>bulk('archive')}>Archive</button>
              <button className="btn-outline-gold" onClick={()=>bulk('unarchive')}>Unarchive</button>
              <button className="btn-gold" style={{ background:'var(--danger)', borderColor:'var(--danger)' }} onClick={()=>bulk('delete')}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-mdj" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1rem', color:'var(--text-muted)' }}>Loading…</div>
        ) : err ? (
          <div style={{ padding:'1rem' }}>
            <div style={{ color:'var(--danger)', marginBottom:'.75rem' }}>{err}</div>
            <button
              className="btn-gold"
              onClick={async ()=>{
                try {
                  setLoading(true); setErr(null);
                  const data = await api.get('/documents');
                  setDocs(normalizeDocs(Array.isArray(data) ? data : (((data as any)?.data) ?? [])));
                } catch (e:any) {
                  setErr(e?.message || 'Failed to load documents');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'2rem', color:'var(--text-muted)' }}>No documents found</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th style={{ width:40 }}>
                    <input
                      type="checkbox"
                      checked={selected.length > 0 && selected.length === filtered.length}
                      onChange={(e)=>setSelected(e.target.checked ? filtered.map(d=>d.id) : [])}
                    />
                  </th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Client</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(d.id)}
                        onChange={(e)=> setSelected(
                          e.target.checked ? [...selected, d.id] : selected.filter(id=>id!==d.id)
                        )}
                      />
                    </td>
                    <td>
                      <div style={{ display:'grid', gap:'2px' }}>
                        <strong>{d.originalName}</strong>
                      </div>
                    </td>
                    <td><span className="mdj-badge mdj-badge-soft">{d.category}</span></td>
                    <td>{clientName(d.clientId)}</td>
                    <td>{fmtSize(d.size)}</td>
                    <td>{fmtDate(d.createdAt)}</td>
                    <td className="right">
                      <button className="btn-outline-gold btn-xs" onClick={()=>preview(d.id)}>Preview</button>{' '}
                      <button className="btn-outline-gold btn-xs" onClick={()=>download(d.id)}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
            display:'grid', placeItems:'center', zIndex:50
          }}
        >
          <div className="card-mdj" style={{ width:'min(560px, 92vw)' }}>
            <h3 style={{ marginTop:0 }}>Upload Document</h3>
            <hr className="mdj-gold-rule" />

            <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <label className="mdj-sub" style={{ display:'block', marginBottom:6 }}>File</label>
                <input type="file" className="mdj-input" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
              </div>

              <div>
                <label className="mdj-sub" style={{ display:'block', marginBottom:6 }}>Category</label>
                <select
                  className="mdj-select"
                  value={uploadMeta.category}
                  onChange={(e)=>setUploadMeta({...uploadMeta, category: e.target.value as DocCategory})}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="mdj-sub" style={{ display:'block', marginBottom:6 }}>Client (optional)</label>
                <select
                  className="mdj-select"
                  value={uploadMeta.clientId}
                  onChange={(e)=>setUploadMeta({...uploadMeta, clientId: e.target.value})}
                >
                  <option value="">—</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:'1rem' }}>
              <button className="btn-outline-gold" onClick={()=>setShowUpload(false)}>Cancel</button>
              <button className="btn-gold" disabled={!file} onClick={doUpload}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast error (bottom-right) */}
      {err && (
        <div
          style={{
            position:'fixed', right:'1rem', bottom:'1rem',
            background:'var(--danger)', color:'#fff',
            padding:'.5rem .75rem', borderRadius:'10px',
            display:'flex', alignItems:'center', gap:8, zIndex:60
          }}
        >
          <span>{err}</span>
          <button
            onClick={()=>setErr(null)}
            style={{ background:'transparent', border:'0', color:'#fff', fontSize:18, lineHeight:1, cursor:'pointer' }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
    </MDJShell>
  );
}
