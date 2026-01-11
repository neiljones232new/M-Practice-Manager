'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

type TemplateCategory = 'TAX' | 'HMRC' | 'VAT' | 'COMPLIANCE' | 'GENERAL' | 'ENGAGEMENT';
type PlaceholderType = 'TEXT' | 'DATE' | 'CURRENCY' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'ADDRESS' | 'LIST' | 'CONDITIONAL';
type PlaceholderSource = 'CLIENT' | 'SERVICE' | 'USER' | 'MANUAL' | 'SYSTEM';

interface TemplatePlaceholder {
  key: string;
  label: string;
  type: PlaceholderType;
  required: boolean;
  defaultValue?: string;
  format?: string;
  source?: PlaceholderSource;
  sourcePath?: string;
}

interface TemplateMetadata {
  author?: string;
  tags?: string[];
  usageCount?: number;
  lastUsed?: string;
  notes?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fileName: string;
  filePath: string;
  fileFormat: 'DOCX' | 'MD';
  placeholders: TemplatePlaceholder[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: TemplateMetadata;
}

interface TemplatePreview {
  template: Template;
  content: string;
  placeholders: TemplatePlaceholder[];
  metadata: {
    totalPlaceholders: number;
    requiredPlaceholders: number;
    optionalPlaceholders: number;
  };
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  TAX: 'Tax',
  HMRC: 'HMRC',
  VAT: 'VAT',
  COMPLIANCE: 'Compliance',
  GENERAL: 'General',
  ENGAGEMENT: 'Engagement',
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  TAX: '#8B5CF6',
  HMRC: '#EF4444',
  VAT: '#10B981',
  COMPLIANCE: '#F59E0B',
  GENERAL: '#6B7280',
  ENGAGEMENT: '#3B82F6',
};

const PLACEHOLDER_TYPE_ICONS: Record<PlaceholderType, string> = {
  TEXT: '📝',
  DATE: '📅',
  CURRENCY: '💷',
  NUMBER: '🔢',
  EMAIL: '📧',
  PHONE: '📞',
  ADDRESS: '🏠',
  LIST: '📋',
  CONDITIONAL: '🔀',
};

const PLACEHOLDER_SOURCE_LABELS: Record<PlaceholderSource, string> = {
  CLIENT: 'Client Data',
  SERVICE: 'Service Data',
  USER: 'User Data',
  MANUAL: 'Manual Entry',
  SYSTEM: 'System Data',
};

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!templateId) return;

    const fetchTemplate = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch template details
        const templateData = await api.get(`/templates/${templateId}`);
        setTemplate(templateData as Template);

        // Fetch preview data
        const previewData = await api.get(`/templates/${templateId}/preview`);
        setPreview(previewData as TemplatePreview);
      } catch (e: any) {
        console.error('Failed to load template', e);
        setError(e?.message || 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <MDJShell
        pageTitle="Loading..."
        showBack
        backHref="/templates"
        backLabel="Back to Templates"
      >
        <div className="card-mdj">
          <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading template details...</p>
        </div>
      </MDJShell>
    );
  }

  if (error || !template || !preview) {
    return (
      <MDJShell
        pageTitle="Error"
        showBack
        backHref="/templates"
        backLabel="Back to Templates"
      >
        <div className="card-mdj">
          <p style={{ color: 'var(--danger)', padding: '1rem' }}>
            {error || 'Template not found'}
          </p>
        </div>
      </MDJShell>
    );
  }

  return (
    <MDJShell
      pageTitle={template.name}
      pageSubtitle={template.description}
      showBack
      backHref="/templates"
      backLabel="Back to Templates"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Templates', href: '/templates' },
        { label: template.name },
      ]}
      actions={[
        {
          label: showPreview ? 'Hide Preview' : 'Show Preview',
          onClick: () => setShowPreview(!showPreview),
          variant: 'outline',
        },
        ...(template.isActive ? [{
          label: 'Use Template',
          href: `/templates/generate?templateId=${template.id}`,
          variant: 'primary' as const,
        }] : []),
      ]}
    >
      {/* Template Information */}
      <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Template Information</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="mdj-label">Category</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '4px',
                  height: '20px',
                  backgroundColor: CATEGORY_COLORS[template.category],
                  borderRadius: '2px',
                }}
              />
              <span style={{ fontWeight: 500 }}>{CATEGORY_LABELS[template.category]}</span>
            </div>
          </div>

          <div>
            <label className="mdj-label">Status</label>
            <span
              className={`mdj-badge ${template.isActive ? 'mdj-badge-success' : 'mdj-badge-muted'}`}
            >
              {template.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div>
            <label className="mdj-label">Version</label>
            <span style={{ fontWeight: 500 }}>v{template.version}</span>
          </div>

          <div>
            <label className="mdj-label">File Format</label>
            <span style={{ fontWeight: 500 }}>{template.fileFormat}</span>
          </div>

          <div>
            <label className="mdj-label">Created</label>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {formatDate(template.createdAt)}
            </span>
          </div>

          <div>
            <label className="mdj-label">Last Updated</label>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {formatDate(template.updatedAt)}
            </span>
          </div>

          {template.metadata?.usageCount !== undefined && (
            <div>
              <label className="mdj-label">Usage Count</label>
              <span style={{ fontWeight: 500 }}>
                {template.metadata.usageCount} time{template.metadata.usageCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {template.metadata?.lastUsed && (
            <div>
              <label className="mdj-label">Last Used</label>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {formatDate(template.metadata.lastUsed)}
              </span>
            </div>
          )}
        </div>

        {template.metadata?.tags && template.metadata.tags.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <label className="mdj-label">Tags</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {template.metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className="mdj-badge"
                  style={{
                    backgroundColor: 'var(--bg-muted)',
                    color: 'var(--text-dim)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {template.metadata?.notes && (
          <div style={{ marginTop: '1rem' }}>
            <label className="mdj-label">Notes</label>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {template.metadata.notes}
            </p>
          </div>
        )}
      </div>

      {/* Placeholder Summary */}
      <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Placeholder Summary</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-muted)',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)' }}>
              {preview.metadata.totalPlaceholders}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Total Placeholders
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-muted)',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#EF4444' }}>
              {preview.metadata.requiredPlaceholders}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Required Fields
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-muted)',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10B981' }}>
              {preview.metadata.optionalPlaceholders}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Optional Fields
            </div>
          </div>
        </div>
      </div>

      {/* Placeholders List */}
      <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Placeholders ({template.placeholders.length})</h3>

        {template.placeholders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>This template has no placeholders.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mdj-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Required</th>
                  <th>Format</th>
                  <th>Default Value</th>
                </tr>
              </thead>
              <tbody>
                {template.placeholders.map((placeholder) => (
                  <tr key={placeholder.key}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{placeholder.label}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {`{{${placeholder.key}}}`}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{PLACEHOLDER_TYPE_ICONS[placeholder.type]}</span>
                        <span>{placeholder.type}</span>
                      </span>
                    </td>
                    <td>
                      {placeholder.source ? (
                        <span className="mdj-badge" style={{ fontSize: '0.8rem' }}>
                          {PLACEHOLDER_SOURCE_LABELS[placeholder.source]}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {placeholder.required ? (
                        <span className="mdj-badge mdj-badge-danger" style={{ fontSize: '0.8rem' }}>
                          Required
                        </span>
                      ) : (
                        <span className="mdj-badge mdj-badge-muted" style={{ fontSize: '0.8rem' }}>
                          Optional
                        </span>
                      )}
                    </td>
                    <td>
                      {placeholder.format ? (
                        <code style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {placeholder.format}
                        </code>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {placeholder.defaultValue ? (
                        <span style={{ fontSize: '0.9rem' }}>{placeholder.defaultValue}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Template Preview */}
      {showPreview && (
        <div className="card-mdj">
          <h3 style={{ marginBottom: '1rem' }}>Template Preview</h3>
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--bg-muted)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '600px',
              overflowY: 'auto',
            }}
          >
            {preview.content || 'No preview available'}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Note: Placeholders are shown in their raw format (e.g., {`{{clientName}}`}). They will be replaced with actual data when generating a letter.
          </p>
        </div>
      )}
    </MDJShell>
  );
}
