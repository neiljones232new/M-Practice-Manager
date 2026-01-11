'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

type TemplateCategory = 'TAX' | 'HMRC' | 'VAT' | 'COMPLIANCE' | 'GENERAL' | 'ENGAGEMENT' | 'CLIENT' | 'REPORTS' | 'COMMERCIAL';

interface TemplatePlaceholder {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  format?: string;
  source?: string;
  sourcePath?: string;
}

interface TemplateMetadata {
  author?: string;
  tags?: string[];
  usageCount?: number;
  lastUsed?: Date;
  notes?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fileName: string;
  filePath?: string;
  fileFormat?: 'DOCX' | 'MD';
  fileType?: string;
  placeholders?: TemplatePlaceholder[];
  requiredFields?: string[];
  optionalFields?: string[];
  version: number | string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: TemplateMetadata;
  tags?: string[];
  subcategory?: string;
  templateEngine?: string;
  outputFormats?: string[];
  isSystemTemplate?: boolean;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  TAX: 'Tax',
  HMRC: 'HMRC',
  VAT: 'VAT',
  COMPLIANCE: 'Compliance',
  GENERAL: 'General',
  ENGAGEMENT: 'Engagement',
  CLIENT: 'Client',
  REPORTS: 'Reports',
  COMMERCIAL: 'Commercial',
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  TAX: 'var(--category-tax)',
  HMRC: 'var(--category-hmrc)',
  VAT: 'var(--category-vat)',
  COMPLIANCE: 'var(--category-compliance)',
  GENERAL: 'var(--category-general)',
  ENGAGEMENT: 'var(--category-engagement)',
  CLIENT: 'var(--category-client)',
  REPORTS: 'var(--category-reports)',
  COMMERCIAL: 'var(--category-commercial)',
};

export default function TemplatesPage() {
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | ''>('');
  const [showInactiveTemplates, setShowInactiveTemplates] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.get('/templates');
      const items = Array.isArray(data) ? data : [];
      
      // Debug: Log template data to see what categories we're getting
      console.log('Templates loaded:', items.length);
      items.forEach((template, index) => {
        if (!template.category || !CATEGORY_LABELS[template.category as TemplateCategory]) {
          console.warn(`Template ${index} has invalid category:`, template.category, template);
        }
      });
      
      setAllTemplates(items);
    } catch (e) {
      console.error('Failed to load templates', e);
      setAllTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await fetchTemplates();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter templates
  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return allTemplates.filter((t) => {
      const matchesSearch =
        !needle ||
        t.name.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        (t.metadata?.tags || []).some((tag) => tag.toLowerCase().includes(needle)) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(needle));

      const matchesCategory = !selectedCategory || t.category === selectedCategory;
      const matchesActive = showInactiveTemplates || t.isActive;

      return matchesSearch && matchesCategory && matchesActive;
    });
  }, [allTemplates, searchQuery, selectedCategory, showInactiveTemplates]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<TemplateCategory, Template[]> = {
      TAX: [],
      HMRC: [],
      VAT: [],
      COMPLIANCE: [],
      GENERAL: [],
      ENGAGEMENT: [],
      CLIENT: [],
      REPORTS: [],
      COMMERCIAL: [],
    };

    filtered.forEach((template) => {
      // Ensure the template has a valid category, default to GENERAL if not
      const category = template.category && CATEGORY_LABELS[template.category] 
        ? template.category 
        : 'GENERAL';
      
      if (groups[category]) {
        groups[category].push(template);
      }
    });

    return groups;
  }, [filtered]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setShowInactiveTemplates(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <MDJShell
      pageTitle="Letter Templates"
      pageSubtitle="Browse and manage client letter templates"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Templates' }]}
      actions={[
        { label: 'Refresh', onClick: fetchTemplates, variant: 'outline' },
        { label: 'Letter Search', href: '/letters', variant: 'outline' },
        { label: 'Bulk Generate', href: '/templates/bulk-generate', variant: 'outline' },
        { label: 'Generate Letter', href: '/templates/generate', variant: 'primary' },
      ]}
    >
      {/* Filters */}
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <div className="filter-grid">
          <input
            aria-label="Search templates"
            placeholder="Search by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mdj-input"
          />

          <select
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | '')}
            className="mdj-select"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <div className="filter-actions">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={showInactiveTemplates}
                onChange={(e) => setShowInactiveTemplates(e.target.checked)}
              />
              <span className="mdj-sub">Show inactive templates</span>
            </label>
            <button type="button" className="btn-outline-gold" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Templates grouped by category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {loading ? (
          <div className="card-mdj">
            <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading templates...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-mdj">
            <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>
              No templates found. {searchQuery || selectedCategory ? 'Try adjusting your filters.' : ''}
            </p>
          </div>
        ) : (
          Object.entries(groupedTemplates).map(([category, templates]) => {
            if (templates.length === 0) return null;

            return (
              <div key={category} className="card-mdj">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '2px solid var(--border-color)',
                  }}
                >
                  <div
                    style={{
                      width: '4px',
                      height: '24px',
                      backgroundColor: CATEGORY_COLORS[category as TemplateCategory],
                      borderRadius: '2px',
                    }}
                  />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                    {CATEGORY_LABELS[category as TemplateCategory]}
                  </h3>
                  <span
                    className="mdj-badge"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[category as TemplateCategory]}20`,
                      color: CATEGORY_COLORS[category as TemplateCategory],
                    }}
                  >
                    {templates.length} {templates.length === 1 ? 'template' : 'templates'}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: template.isActive ? 'transparent' : 'var(--bg-muted)',
                        opacity: template.isActive ? 1 : 0.7,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <Link
                            href={`/templates/${template.id}`}
                            className="mdj-link"
                            style={{ fontSize: '1.1rem', fontWeight: 600 }}
                          >
                            {template.name}
                          </Link>
                          {!template.isActive && (
                            <span className="mdj-badge mdj-badge-muted">Inactive</span>
                          )}
                          <span
                            className="mdj-badge"
                            style={{
                              fontSize: '0.75rem',
                              backgroundColor: 'var(--bg-muted)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            v{template.version}
                          </span>
                        </div>

                        <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                          {template.description}
                        </p>

                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          <span>
                            📄 {template.fileFormat || template.fileType || 'Unknown'}
                          </span>
                          <span>
                            🔤 {(() => {
                              const placeholderCount = (template.placeholders?.length || 0);
                              const requiredCount = (template.requiredFields?.length || 0);
                              const optionalCount = (template.optionalFields?.length || 0);
                              const totalCount = placeholderCount + requiredCount + optionalCount;
                              return `${totalCount} placeholder${totalCount !== 1 ? 's' : ''}`;
                            })()}
                          </span>
                          <span>
                            📅 Updated {formatDate(template.updatedAt)}
                          </span>
                          {template.metadata?.usageCount !== undefined && (
                            <span>
                              📊 Used {template.metadata.usageCount} time{template.metadata.usageCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {((template.metadata?.tags && template.metadata.tags.length > 0) || (template.tags && template.tags.length > 0)) && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                            {(template.metadata?.tags || template.tags || []).map((tag) => (
                              <span
                                key={tag}
                                className="mdj-badge"
                                style={{
                                  fontSize: '0.75rem',
                                  backgroundColor: 'var(--bg-muted)',
                                  color: 'var(--text-dim)',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                        <Link
                          href={`/templates/${template.id}`}
                          className="btn-outline-gold btn-sm"
                        >
                          View Details
                        </Link>
                        {template.isActive && (
                          <Link
                            href={`/templates/generate?templateId=${template.id}`}
                            className="btn-primary btn-sm"
                          >
                            Generate Letter
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </MDJShell>
  );
}
