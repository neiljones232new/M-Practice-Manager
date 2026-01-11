'use client';
import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { MDJButton, MDJCard, MDJBadge, MDJInput } from './index';

interface QueryTemplate {
  id: string;
  category: 'client' | 'deadline' | 'task' | 'business' | 'compliance' | 'general';
  title: string;
  description: string;
  prompt: string;
  icon?: string;
  requiresContext?: boolean;
  contextFields?: string[];
  examples?: string[];
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  template: QueryTemplate;
  defaultContext?: any;
}

interface MDJQueryTemplatesProps {
  onExecuteTemplate?: (templateId: string, context?: any) => Promise<void>;
  onExecuteQuickAction?: (action: QuickAction) => Promise<void>;
  className?: string;
  showSearch?: boolean;
  showCategories?: boolean;
  compact?: boolean;
}

export const MDJQueryTemplates: React.FC<MDJQueryTemplatesProps> = ({
  onExecuteTemplate,
  onExecuteQuickAction,
  className,
  showSearch = true,
  showCategories = true,
  compact = false,
}) => {
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<QueryTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [executingTemplate, setExecutingTemplate] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Templates', icon: '📋' },
    { id: 'client', label: 'Client Management', icon: '👥' },
    { id: 'deadline', label: 'Deadlines', icon: '📅' },
    { id: 'task', label: 'Tasks', icon: '✅' },
    { id: 'business', label: 'Business Insights', icon: '📊' },
    { id: 'compliance', label: 'Compliance', icon: '🛡️' },
    { id: 'general', label: 'General Help', icon: '💬' },
  ];

  useEffect(() => {
    fetchTemplates();
    fetchQuickActions();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const fetchTemplates = async () => {
    try {
      const data = await api.get<{ templates: any[] }>('/assist/templates');
      setTemplates(((data as any)?.templates) || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuickActions = async () => {
    try {
      const data = await api.get<{ quickActions: any[] }>('/assist/quick-actions');
      setQuickActions(((data as any)?.quickActions) || []);
    } catch (error) {
      console.error('Error fetching quick actions:', error);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.examples?.some((e) => e.toLowerCase().includes(query))
      );
    }
    setFilteredTemplates(filtered);
  };

  const handleExecuteTemplate = async (template: QueryTemplate) => {
    if (!onExecuteTemplate) return;
    setExecutingTemplate(template.id);
    try {
      await onExecuteTemplate(template.id);
    } finally {
      setExecutingTemplate(null);
    }
  };

  const handleExecuteQuickAction = async (action: QuickAction) => {
    if (!onExecuteQuickAction) return;
    setExecutingTemplate(action.id);
    try {
      await onExecuteQuickAction(action);
    } finally {
      setExecutingTemplate(null);
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    const variants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
      client: 'info',
      deadline: 'warning',
      task: 'success',
      business: 'primary',
      compliance: 'error',
      general: 'default',
    };
    return variants[category] || 'default';
  };

  if (loading) {
    return (
      <MDJCard className={className}>
        <div className="flex items-center justify-center py-8">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: 'var(--brand-primary)' }}
          />
        </div>
      </MDJCard>
    );
  }

  if (compact) {
    return (
      <div className={clsx('space-y-4', className)}>
        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--brand-primary)' }}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {quickActions.slice(0, 4).map((a) => (
            <MDJButton
              key={a.id}
              variant="outline"
              size="sm"
              onClick={() => handleExecuteQuickAction(a)}
              loading={executingTemplate === a.id}
              disabled={!!executingTemplate}
              className="justify-start text-left"
            >
              <div>
                <div className="font-medium">{a.label}</div>
                <div className="text-xs opacity-70">{a.description}</div>
              </div>
            </MDJButton>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-8', className)}>
      {/* Quick Actions */}
      <section>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--brand-primary)' }}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <MDJCard
              key={action.id}
              className="p-4 hover:shadow-md bg-white transition-all cursor-pointer border border-[var(--border-light)]"
            >
              <div className="flex items-start justify-between" onClick={() => handleExecuteQuickAction(action)} role="button">
                <div className="flex-1">
                  <h4 className="font-medium mb-1" style={{ color: 'var(--text-dark)' }}>
                    {action.label}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {action.description}
                  </p>
                </div>
                <MDJButton
                  variant="ghost"
                  size="sm"
                  loading={executingTemplate === action.id}
                  disabled={!!executingTemplate}
                >
                  →
                </MDJButton>
              </div>
            </MDJCard>
          ))}
        </div>
      </section>

      {/* Search & Filters */}
      {showSearch && (
        <section className="space-y-4">
          <MDJInput
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />

          {showCategories && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <MDJButton
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </MDJButton>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Template List */}
      <section>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--brand-primary)' }}>
          Templates
          {filteredTemplates.length > 0 && (
            <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
              ({filteredTemplates.length})
            </span>
          )}
        </h3>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
            {searchQuery ? 'No templates match your search.' : 'No templates available.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTemplates.map((t) => (
              <MDJCard
                key={t.id}
                className="p-4 border border-[var(--border-light)] bg-white hover:bg-[var(--surface-card-hover)] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium" style={{ color: 'var(--text-dark)' }}>
                        {t.title}
                      </h4>
                      <MDJBadge variant={getCategoryBadgeVariant(t.category)} size="sm">
                        {t.category}
                      </MDJBadge>
                      {t.requiresContext && (
                        <MDJBadge variant="warning" size="sm">
                          Requires Context
                        </MDJBadge>
                      )}
                    </div>
                    <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                      {t.description}
                    </p>

                    {t.examples?.length ? (
                      <div className="mb-3">
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                          Examples:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {t.examples.slice(0, 2).map((ex, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 rounded bg-[var(--status-info-bg)] text-[var(--text-dark)]"
                            >
                              “{ex}”
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <MDJButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleExecuteTemplate(t)}
                    loading={executingTemplate === t.id}
                    disabled={!!executingTemplate}
                  >
                    Use
                  </MDJButton>
                </div>
              </MDJCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
