'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api, API_BASE_URL } from '@/lib/api';

type LetterStatus = 'DRAFT' | 'GENERATED' | 'DOWNLOADED' | 'SENT' | 'ARCHIVED';

interface GeneratedLetter {
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
  generatedAt: string | Date;
  status: LetterStatus;
  downloadCount: number;
  lastDownloadedAt?: string | Date;
}

const STATUS_LABELS: Record<LetterStatus, string> = {
  DRAFT: 'Draft',
  GENERATED: 'Generated',
  DOWNLOADED: 'Downloaded',
  SENT: 'Sent',
  ARCHIVED: 'Archived',
};

const STATUS_COLORS: Record<LetterStatus, string> = {
  DRAFT: 'mdj-badge-muted',
  GENERATED: 'mdj-badge-success',
  DOWNLOADED: 'mdj-badge-info',
  SENT: 'mdj-badge-gold',
  ARCHIVED: 'mdj-badge-muted',
};

export default function LettersSearchPage() {
  const router = useRouter();
  const [allLetters, setAllLetters] = useState<GeneratedLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<LetterStatus | ''>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const data = await api.get('/letters');
      const items = Array.isArray(data) ? data : [];
      setAllLetters(items);
    } catch (e) {
      console.error('Failed to load letters', e);
      setAllLetters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await fetchLetters();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Get unique template names for filter dropdown
  const uniqueTemplates = useMemo(() => {
    return Array.from(new Set(allLetters.map((l) => l.templateName))).sort();
  }, [allLetters]);

  // Filter and search letters
  const filteredLetters = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    
    return allLetters.filter((letter) => {
      // Filter by search text (client name, template name, service name)
      if (needle) {
        const searchableContent = [
          letter.clientName,
          letter.templateName,
          letter.serviceName || '',
        ].join(' ').toLowerCase();

        if (!searchableContent.includes(needle)) {
          return false;
        }
      }

      // Filter by template
      if (selectedTemplate && letter.templateName !== selectedTemplate) {
        return false;
      }

      // Filter by status
      if (selectedStatus && letter.status !== selectedStatus) {
        return false;
      }

      // Filter by date range
      if (dateFrom && new Date(typeof letter.generatedAt === 'string' ? letter.generatedAt : letter.generatedAt) < new Date(dateFrom)) {
        return false;
      }

      if (dateTo && new Date(typeof letter.generatedAt === 'string' ? letter.generatedAt : letter.generatedAt) > new Date(dateTo)) {
        return false;
      }

      return true;
    });
  }, [allLetters, searchQuery, selectedTemplate, selectedStatus, dateFrom, dateTo]);

  // Sort by relevance (most recent first) and then by client name
  const sortedLetters = useMemo(() => {
    return [...filteredLetters].sort((a, b) => {
      // If there's a search query, prioritize exact matches
      if (searchQuery.trim()) {
        const needle = searchQuery.trim().toLowerCase();
        const aExact = a.clientName.toLowerCase().includes(needle) || a.templateName.toLowerCase().includes(needle);
        const bExact = b.clientName.toLowerCase().includes(needle) || b.templateName.toLowerCase().includes(needle);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }

      // Sort by date (most recent first)
      const dateA = new Date(typeof a.generatedAt === 'string' ? a.generatedAt : a.generatedAt).getTime();
      const dateB = new Date(typeof b.generatedAt === 'string' ? b.generatedAt : b.generatedAt).getTime();
      
      if (dateA !== dateB) {
        return dateB - dateA;
      }

      // Then by client name
      return a.clientName.localeCompare(b.clientName);
    });
  }, [filteredLetters, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTemplate('');
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
  };

  const handleDownload = async (letterId: string, format: 'PDF' | 'DOCX', letter: GeneratedLetter) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/letters/${letterId}/download?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate a clean filename
      const cleanTemplateName = letter.templateName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const cleanClientName = letter.clientName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const dateStr = new Date(typeof letter.generatedAt === 'string' ? letter.generatedAt : letter.generatedAt).toISOString().split('T')[0];
      
      a.download = `${cleanTemplateName}_${cleanClientName}_${dateStr}.${format.toLowerCase()}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Refresh letters to update download count
      await fetchLetters();
    } catch (e: any) {
      alert(e?.message || 'Download failed');
    }
  };

  const handlePreview = async (letter: GeneratedLetter) => {
    if (!letter.documentId) {
      alert('No document available for preview');
      return;
    }
    try {
      const buffer = await api.get<ArrayBuffer>(`/documents/${letter.documentId}/preview`);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Preview failed');
    }
  };

  const formatDate = (dateStr: string | Date) => {
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  // Generate content snippet from placeholder values
  const getContentSnippet = (letter: GeneratedLetter): string => {
    const values = letter.placeholderValues || {};
    const snippetParts: string[] = [];

    // Try to extract meaningful content
    if (values.subject) snippetParts.push(values.subject);
    if (values.regarding) snippetParts.push(values.regarding);
    if (values.description) snippetParts.push(values.description);
    if (values.message) snippetParts.push(values.message);

    const snippet = snippetParts.join(' • ');
    
    // Truncate to 100 characters
    if (snippet.length > 100) {
      return snippet.substring(0, 100) + '...';
    }

    return snippet || 'No content preview available';
  };

  return (
    <MDJShell
      pageTitle="Letter Search"
      pageSubtitle="Search and manage all generated client letters"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Letter Search' },
      ]}
      actions={[
        { label: 'Refresh', onClick: fetchLetters, variant: 'outline' },
        { label: 'Templates', href: '/templates', variant: 'outline' },
        { label: 'Generate Letter', href: '/templates/generate', variant: 'primary' },
      ]}
    >
      {/* Search and Filters */}
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Search input */}
          <div>
            <input
              aria-label="Search letters"
              placeholder="Search by client name, template, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mdj-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Filter row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Template
              </label>
              <select
                aria-label="Filter by template"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="mdj-select"
                style={{ width: '100%' }}
              >
                <option value="">All Templates</option>
                {uniqueTemplates.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Status
              </label>
              <select
                aria-label="Filter by status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as LetterStatus | '')}
                className="mdj-select"
                style={{ width: '100%' }}
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                From Date
              </label>
              <input
                type="date"
                aria-label="Filter from date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mdj-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                To Date
              </label>
              <input
                type="date"
                aria-label="Filter to date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mdj-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Filter actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {loading ? 'Loading...' : `${sortedLetters.length} letter${sortedLetters.length !== 1 ? 's' : ''} found`}
            </div>
            <button type="button" className="btn-outline-gold" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div className="card-mdj">
            <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading letters...</p>
          </div>
        ) : sortedLetters.length === 0 ? (
          <div className="card-mdj">
            <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>
              {allLetters.length === 0
                ? 'No letters have been generated yet.'
                : 'No letters match your search criteria. Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          sortedLetters.map((letter) => (
            <div
              key={letter.id}
              className="card-mdj"
              style={{
                padding: '1.25rem',
                transition: 'box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                {/* Letter info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: 'var(--text-dark)',
                      }}
                    >
                      {letter.templateName}
                    </h3>
                    <span className={`badge ${STATUS_COLORS[letter.status]}`}>
                      {STATUS_LABELS[letter.status]}
                    </span>
                    <span
                      className="mdj-badge"
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--bg-muted)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      v{letter.templateVersion}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Client: </span>
                      <button
                        onClick={() => router.push(`/clients/${letter.clientId}`)}
                        className="mdj-link"
                        style={{ fontWeight: 600 }}
                      >
                        {letter.clientName}
                      </button>
                    </div>
                    {letter.serviceName && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Service: </span>
                        <span style={{ fontWeight: 500 }}>{letter.serviceName}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Generated: </span>
                      <span>{formatDate(letter.generatedAt)}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>By: </span>
                      <span>{letter.generatedBy}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-soft)',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                    }}
                  >
                    {getContentSnippet(letter)}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <span>📥 {letter.downloadCount} download{letter.downloadCount !== 1 ? 's' : ''}</span>
                    {letter.lastDownloadedAt && (
                      <span>Last downloaded: {formatDate(letter.lastDownloadedAt)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                  <button
                    className="btn-outline-gold btn-sm"
                    onClick={() => handlePreview(letter)}
                    style={{ width: '100%' }}
                  >
                    Preview
                  </button>
                  <button
                    className="btn-outline-gold btn-sm"
                    onClick={() => handleDownload(letter.id, 'PDF', letter)}
                    style={{ width: '100%' }}
                  >
                    Download PDF
                  </button>
                  <button
                    className="btn-outline-gold btn-sm"
                    onClick={() => handleDownload(letter.id, 'DOCX', letter)}
                    style={{ width: '100%' }}
                  >
                    Download DOCX
                  </button>
                  <button
                    className="btn-gold btn-sm"
                    onClick={() => router.push(`/clients/${letter.clientId}`)}
                    style={{ width: '100%' }}
                  >
                    View Client
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </MDJShell>
  );
}
