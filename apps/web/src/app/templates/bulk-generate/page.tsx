'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api, API_BASE_URL } from '@/lib/api';

// Types
type TemplateCategory = 'TAX' | 'HMRC' | 'VAT' | 'COMPLIANCE' | 'GENERAL' | 'ENGAGEMENT';
type ClientType = 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
type Frequency = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';

interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fileName: string;
  filePath: string;
  fileFormat: 'DOCX' | 'MD';
  placeholders: any[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  ref: string;
  name: string;
  type: ClientType;
  mainEmail?: string;
  mainPhone?: string;
  registeredNumber?: string;
  portfolioCode?: number;
}

interface Service {
  id: string;
  clientId: string;
  kind: string;
  frequency: Frequency;
  fee: number;
  status: string;
  nextDue?: string;
}

interface BulkGenerationResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BulkGenerationItem[];
  zipFileId?: string;
  summary: string;
}

interface BulkGenerationItem {
  clientId: string;
  clientName: string;
  success: boolean;
  letterId?: string;
  error?: string;
}

// Wizard steps
type WizardStep = 'setup' | 'progress' | 'results';

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

export default function BulkGenerateLettersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplateId = searchParams?.get('templateId');

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('setup');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkGenerationResult | null>(null);

  // Data loading
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template selection filters
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | ''>('');

  // Client selection filters
  const [clientSearch, setClientSearch] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Array<'PDF' | 'DOCX'>>(['PDF']);
  const [currentProcessing, setCurrentProcessing] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const data = await api.get('/templates');
        // Show all templates, including inactive ones for flexibility
        const allTemplates = Array.isArray(data) ? data : [];
        setTemplates(allTemplates);

        // If preselected template, auto-select it
        if (preselectedTemplateId) {
          const template = allTemplates.find((t: Template) => t.id === preselectedTemplateId);
          if (template) {
            setSelectedTemplate(template);
          }
        }
      } catch (e: any) {
        console.error('Failed to load templates', e);
        setError(e?.message || 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [preselectedTemplateId]);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const data = await api.get('/clients');
        const activeClients = (Array.isArray(data) ? data : []).filter(
          (c: any) => c.status === 'ACTIVE'
        );
        setClients(activeClients);
      } catch (e: any) {
        console.error('Failed to load clients', e);
        setError(e?.message || 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, []);

  // Load services when needed
  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await api.get('/services/with-client-details');
        const allServices = Array.isArray(data) ? data : [];
        setServices(allServices);
      } catch (e: any) {
        console.error('Failed to load services', e);
        setServices([]);
      }
    };

    loadServices();
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    const needle = templateSearch.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesSearch =
        !needle ||
        t.name.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle);

      const matchesCategory = !templateCategory || t.category === templateCategory;

      return matchesSearch && matchesCategory;
    });
  }, [templates, templateSearch, templateCategory]);

  // Filter clients
  const filteredClients = useMemo(() => {
    const needle = clientSearch.trim().toLowerCase();
    return clients.filter((c) => {
      return (
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        (c.ref ?? '').toLowerCase().includes(needle) ||
        (c.mainEmail ?? '').toLowerCase().includes(needle)
      );
    });
  }, [clients, clientSearch]);

  // Handle template selection
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
  };

  // Handle client selection toggle
  const handleToggleClient = (clientId: string) => {
    setSelectedClients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  // Handle select all clients
  const handleSelectAllClients = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map((c) => c.id)));
    }
  };

  // Handle service selection
  const handleSelectService = (service: Service | null) => {
    setSelectedService(service);
  };

  // Toggle format selection
  const toggleFormat = (format: 'PDF' | 'DOCX') => {
    setSelectedFormats((prev) => {
      if (prev.includes(format)) {
        if (prev.length === 1) return prev;
        return prev.filter((f) => f !== format);
      } else {
        return [...prev, format];
      }
    });
  };

  // Start bulk generation
  const handleStartBulkGeneration = async () => {
    if (!selectedTemplate || selectedClients.size === 0) {
      return;
    }

    try {
      setGenerating(true);
      setCurrentStep('progress');
      setProcessedCount(0);
      setError(null);

      const response = await api.post<BulkGenerationResult>('/letters/generate/bulk', {
        templateId: selectedTemplate.id,
        clientIds: Array.from(selectedClients),
        serviceId: selectedService?.id,
        outputFormats: selectedFormats,
      });

      if (response) {
        setBulkResult(response);
        setCurrentStep('results');
      }
    } catch (e: any) {
      console.error('Failed to generate bulk letters', e);
      setError(e?.message || 'Failed to generate bulk letters');
    } finally {
      setGenerating(false);
    }
  };

  // Download ZIP file
  const handleDownloadZip = async () => {
    if (!bulkResult?.zipFileId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/letters/bulk/${bulkResult.zipFileId}/download`,
        {
          headers: {
            Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk_letters_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      console.error('Download failed', e);
      alert('Failed to download ZIP file. Please try again.');
    }
  };

  // Start new bulk generation
  const handleStartNew = () => {
    setSelectedTemplate(null);
    setSelectedClients(new Set());
    setSelectedService(null);
    setBulkResult(null);
    setSelectedFormats(['PDF']);
    setCurrentStep('setup');
  };

  const canProceed = selectedTemplate !== null && selectedClients.size > 0;

  return (
    <MDJShell
      pageTitle="Bulk Generate Letters"
      pageSubtitle="Generate letters for multiple clients at once"
      showBack
      backHref="/templates"
      backLabel="Back to Templates"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Templates', href: '/templates' },
        { label: 'Bulk Generate' },
      ]}
    >
      {/* Wizard Progress */}
      <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(['setup', 'progress', 'results'] as WizardStep[]).map((step, index) => {
            const stepLabels = {
              setup: 'Setup',
              progress: 'Generating',
              results: 'Results',
            };

            const isActive = currentStep === step;
            const isCompleted =
              (step === 'setup' && (currentStep === 'progress' || currentStep === 'results')) ||
              (step === 'progress' && currentStep === 'results');

            return (
              <React.Fragment key={step}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isCompleted
                        ? 'var(--gold)'
                        : isActive
                        ? 'var(--gold)'
                        : 'var(--bg-muted)',
                      color: isCompleted || isActive ? 'white' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}
                  >
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'var(--text-dark)' : 'var(--text-muted)',
                      }}
                    >
                      {stepLabels[step]}
                    </div>
                  </div>
                </div>
                {index < 2 && (
                  <div
                    style={{
                      width: '40px',
                      height: '2px',
                      backgroundColor: isCompleted ? 'var(--gold)' : 'var(--border-color)',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Setup Step */}
      {currentStep === 'setup' && (
        <div>
          {/* Template Selection */}
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>1. Select Template</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                aria-label="Search templates"
                placeholder="Search by name or description..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="mdj-input"
              />

              <select
                aria-label="Filter by category"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value as TemplateCategory | '')}
                className="mdj-select"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading templates...</p>
            ) : error ? (
              <p style={{ color: 'var(--danger)', padding: '1rem' }}>{error}</p>
            ) : filteredTemplates.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>
                No templates found. {templateSearch || templateCategory ? 'Try adjusting your filters.' : ''}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      border:
                        selectedTemplate?.id === template.id
                          ? '2px solid var(--gold)'
                          : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      backgroundColor:
                        selectedTemplate?.id === template.id ? 'var(--gold-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>{template.name}</span>
                        <span
                          className="mdj-badge"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[template.category]}20`,
                            color: CATEGORY_COLORS[template.category],
                          }}
                        >
                          {CATEGORY_LABELS[template.category]}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        {template.description}
                      </p>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <div style={{ color: 'var(--gold)', fontSize: '1.5rem' }}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client Selection */}
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>2. Select Clients</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="mdj-badge mdj-badge-gold">
                  {selectedClients.size} selected
                </span>
                <button
                  type="button"
                  className="btn-outline-gold btn-sm"
                  onClick={handleSelectAllClients}
                >
                  {selectedClients.size === filteredClients.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <input
              aria-label="Search clients"
              placeholder="Search by name, reference, or email..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="mdj-input"
              style={{ marginBottom: '1rem' }}
            />

            {loading ? (
              <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading clients...</p>
            ) : filteredClients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>
                No active clients found. {clientSearch ? 'Try adjusting your search.' : ''}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                {filteredClients.map((client) => (
                  <label
                    key={client.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      border: selectedClients.has(client.id)
                        ? '2px solid var(--gold)'
                        : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      backgroundColor: selectedClients.has(client.id) ? 'var(--gold-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClients.has(client.id)}
                      onChange={() => handleToggleClient(client.id)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <span className="mdj-ref">{client.ref}</span>
                        <span style={{ fontWeight: 600 }}>{client.name}</span>
                        <span className="mdj-badge mdj-badge-soft">{client.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {client.mainEmail && <span>📧 {client.mainEmail}</span>}
                        {client.mainPhone && <span>📞 {client.mainPhone}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Optional Service Selection */}
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>3. Link to Service (Optional)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Optionally link all letters to a specific service. Leave unselected for general letters.
            </p>

            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
              <div
                style={{
                  padding: '1rem',
                  border: selectedService === null ? '2px solid var(--gold)' : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: selectedService === null ? 'var(--gold-light)' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => handleSelectService(null)}
              >
                <span style={{ fontWeight: 600 }}>No service (General letters)</span>
              </div>
              {services.slice(0, 10).map((service) => (
                <div
                  key={service.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border:
                      selectedService?.id === service.id
                        ? '2px solid var(--gold)'
                        : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor:
                      selectedService?.id === service.id ? 'var(--gold-light)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSelectService(service)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{service.kind}</div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span className="mdj-badge mdj-badge-soft">{service.frequency}</span>
                      <span>£{service.fee.toFixed(2)}</span>
                    </div>
                  </div>
                  {selectedService?.id === service.id && (
                    <div style={{ color: 'var(--gold)', fontSize: '1.5rem' }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>4. Select Output Format(s)</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: selectedFormats.includes('PDF')
                    ? '2px solid var(--gold)'
                    : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1,
                  backgroundColor: selectedFormats.includes('PDF') ? 'var(--gold-light)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedFormats.includes('PDF')}
                  onChange={() => toggleFormat('PDF')}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>PDF</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Portable Document Format
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: selectedFormats.includes('DOCX')
                    ? '2px solid var(--gold)'
                    : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1,
                  backgroundColor: selectedFormats.includes('DOCX') ? 'var(--gold-light)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedFormats.includes('DOCX')}
                  onChange={() => toggleFormat('DOCX')}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>DOCX</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Microsoft Word Document
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card-mdj" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-outline-gold"
              onClick={() => router.push('/templates')}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-gold"
              onClick={handleStartBulkGeneration}
              disabled={!canProceed || generating}
            >
              Generate {selectedClients.size} Letter{selectedClients.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Progress Step */}
      {currentStep === 'progress' && (
        <div>
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Generating Letters...</h3>

            {/* Progress Bar */}
            <div style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'var(--bg-muted)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${bulkResult ? (bulkResult.successCount + bulkResult.failureCount) / bulkResult.totalRequested * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: 'var(--gold)',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: 'var(--text-dark)',
                  }}
                >
                  {bulkResult
                    ? `${bulkResult.successCount + bulkResult.failureCount} / ${bulkResult.totalRequested}`
                    : '0 / ' + selectedClients.size}
                </div>
              </div>
            </div>

            {/* Status Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-muted)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '0.25rem' }}>
                  {bulkResult ? bulkResult.totalRequested : selectedClients.size}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total</div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--success-light)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.25rem' }}>
                  {bulkResult ? bulkResult.successCount : 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Successful</div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--danger-light)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.25rem' }}>
                  {bulkResult ? bulkResult.failureCount : 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Failed</div>
              </div>
            </div>

            {/* Current Processing */}
            {generating && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  padding: '1.5rem',
                  backgroundColor: 'var(--gold-light)',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid var(--gold-light)',
                    borderTop: '3px solid var(--gold)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Processing...</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Generating letters for selected clients
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Step */}
      {currentStep === 'results' && bulkResult && (
        <div>
          {/* Success Message */}
          <div
            className="card-mdj"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: bulkResult.failureCount === 0 ? 'var(--success-light)' : 'var(--warning-light)',
              border: `2px solid ${bulkResult.failureCount === 0 ? 'var(--success)' : 'var(--warning)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: bulkResult.failureCount === 0 ? 'var(--success)' : 'var(--warning)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                {bulkResult.failureCount === 0 ? '✓' : '⚠'}
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    marginBottom: '0.25rem',
                    color: bulkResult.failureCount === 0 ? 'var(--success)' : 'var(--warning)',
                  }}
                >
                  {bulkResult.failureCount === 0
                    ? 'All Letters Generated Successfully!'
                    : 'Bulk Generation Completed with Some Errors'}
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{bulkResult.summary}</p>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-muted)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '0.25rem' }}>
                  {bulkResult.totalRequested}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Requested</div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--success-light)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.25rem' }}>
                  {bulkResult.successCount}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Successful</div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--danger-light)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.25rem' }}>
                  {bulkResult.failureCount}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Failed</div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--gold-light)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '0.25rem' }}>
                  {Math.round((bulkResult.successCount / bulkResult.totalRequested) * 100)}%
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Success Rate</div>
              </div>
            </div>
          </div>

          {/* Download ZIP */}
          {bulkResult.zipFileId && bulkResult.successCount > 0 && (
            <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Download All Letters</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                All successfully generated letters have been packaged into a ZIP file for easy download.
              </p>
              <button
                type="button"
                className="btn-gold"
                onClick={handleDownloadZip}
                style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
              >
                📦 Download ZIP File ({bulkResult.successCount} letter{bulkResult.successCount !== 1 ? 's' : ''})
              </button>
            </div>
          )}

          {/* Successful Generations */}
          {bulkResult.successCount > 0 && (
            <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>
                ✅ Successful Generations ({bulkResult.successCount})
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                {bulkResult.results
                  .filter((r) => r.success)
                  .map((result) => (
                    <div
                      key={result.clientId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        backgroundColor: 'var(--success-light)',
                        border: '1px solid var(--success)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {result.clientName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Letter ID: {result.letterId}
                        </div>
                      </div>
                      <div style={{ color: 'var(--success)', fontSize: '1.5rem' }}>✓</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Failed Generations */}
          {bulkResult.failureCount > 0 && (
            <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>
                ❌ Failed Generations ({bulkResult.failureCount})
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                The following clients could not be processed. Review the errors below and try again if needed.
              </p>
              <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                {bulkResult.results
                  .filter((r) => !r.success)
                  .map((result) => (
                    <div
                      key={result.clientId}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--danger-light)',
                        border: '1px solid var(--danger)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ color: 'var(--danger)', fontSize: '1.25rem' }}>⚠</div>
                        <div style={{ fontWeight: 600 }}>{result.clientName}</div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--danger)',
                          paddingLeft: '2rem',
                        }}
                      >
                        {result.error || 'Unknown error occurred'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="card-mdj" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-outline-gold"
              onClick={() => router.push('/templates')}
            >
              Back to Templates
            </button>
            <button type="button" className="btn-gold" onClick={handleStartNew}>
              Generate More Letters
            </button>
          </div>
        </div>
      )}

      {/* Add CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </MDJShell>
  );
}
