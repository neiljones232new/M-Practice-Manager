'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api, API_BASE_URL } from '@/lib/api';

// Types
type TemplateCategory = 'TAX' | 'HMRC' | 'VAT' | 'COMPLIANCE' | 'GENERAL' | 'ENGAGEMENT' | 'CLIENT';
type PlaceholderType = 'TEXT' | 'DATE' | 'CURRENCY' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'ADDRESS' | 'LIST' | 'CONDITIONAL';
type PlaceholderSource = 'CLIENT' | 'SERVICE' | 'USER' | 'MANUAL' | 'SYSTEM';
type ClientType = 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
type Frequency = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';

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
  metadata?: {
    author?: string;
    tags?: string[];
    usageCount?: number;
    lastUsed?: string;
    notes?: string;
  };
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

interface GeneratedLetter {
  id: string;
  templateId: string;
  templateName: string;
  clientId: string;
  clientName: string;
  documentId: string;
  generatedAt: string;
  formats: Array<{ format: 'PDF' | 'DOCX'; url: string; size: number }>;
}

// Wizard steps
type WizardStep = 'template' | 'client' | 'placeholders' | 'preview' | 'complete';

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  TAX: 'Tax',
  HMRC: 'HMRC',
  VAT: 'VAT',
  COMPLIANCE: 'Compliance',
  GENERAL: 'General',
  ENGAGEMENT: 'Engagement',
  CLIENT: 'Client',
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  TAX: '#8B5CF6',
  HMRC: '#EF4444',
  VAT: '#10B981',
  COMPLIANCE: '#F59E0B',
  GENERAL: '#6B7280',
  ENGAGEMENT: '#3B82F6',
  CLIENT: '#EC4899',
};

export default function GenerateLetterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplateId = searchParams?.get('templateId');

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, any>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [generatedLetter, setGeneratedLetter] = useState<GeneratedLetter | null>(null);

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autoPopulating, setAutoPopulating] = useState(false);

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
            setCurrentStep('client');
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

  // Load clients when moving to client step
  useEffect(() => {
    if (currentStep === 'client' && clients.length === 0) {
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
    }
  }, [currentStep, clients.length]);

  // Load services when client is selected
  useEffect(() => {
    if (selectedClient) {
      const loadServices = async () => {
        try {
          const data = await api.get(`/services?clientId=${selectedClient.id}`);
          const clientServices = Array.isArray(data) ? data : [];
          setServices(clientServices);
        } catch (e: any) {
          console.error('Failed to load services', e);
          setServices([]);
        }
      };

      loadServices();
    }
  }, [selectedClient]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    // Ensure templates is always an array
    const templateList = Array.isArray(templates) ? templates : [];
    const needle = templateSearch.trim().toLowerCase();
    return templateList.filter((t) => {
      const matchesSearch =
        !needle ||
        t.name.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        (t.metadata?.tags || []).some((tag) => tag.toLowerCase().includes(needle));

      const matchesCategory = !templateCategory || t.category === templateCategory;

      return matchesSearch && matchesCategory;
    });
  }, [templates, templateSearch, templateCategory]);

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
    };

    // Ensure filteredTemplates is always an array
    const templateList = Array.isArray(filteredTemplates) ? filteredTemplates : [];
    templateList.forEach((template) => {
      if (groups[template.category]) {
        groups[template.category].push(template);
      }
    });

    return groups;
  }, [filteredTemplates]);

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
    setCurrentStep('client');
  };

  // Handle client selection
  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setCurrentStep('placeholders');
    
    // Auto-populate placeholder values from client/service data
    if (selectedTemplate) {
      await autoPopulatePlaceholders(selectedTemplate, client, selectedService);
    }
  };

  // Auto-populate placeholders from client and service data
  const autoPopulatePlaceholders = async (
    template: Template,
    client: Client,
    service: Service | null
  ) => {
    try {
      setAutoPopulating(true);
      
      const initialValues: Record<string, any> = {};
      
      // Auto-populate from template placeholders
      (template?.placeholders || []).forEach((placeholder) => {
        let value = placeholder.defaultValue || '';
        
        // Smart auto-population based on placeholder key patterns
        const key = placeholder.key.toLowerCase();
        const label = placeholder.label.toLowerCase();
        
        // Client name variations
        if (key.includes('client') && (key.includes('name') || label.includes('name')) || 
            key === 'name' || key === 'clientname' || key === 'client_name') {
          value = client.name;
        }
        // Client reference variations
        else if (key.includes('ref') || key.includes('reference') || key === 'client_ref') {
          value = client.ref || '';
        }
        // Company name (same as client name for companies)
        else if (key.includes('company') && key.includes('name')) {
          value = client.name;
        }
        // Company number variations
        else if (key.includes('company') && (key.includes('number') || key.includes('registration')) ||
                 key.includes('registerednumber') || key.includes('company_number')) {
          value = client.registeredNumber || '';
        }
        // Email variations
        else if (key.includes('email') || key.includes('e-mail')) {
          value = client.mainEmail || '';
        }
        // Phone variations
        else if (key.includes('phone') || key.includes('telephone') || key.includes('tel')) {
          value = client.mainPhone || '';
        }
        // Client type
        else if (key.includes('type') && (key.includes('client') || key.includes('entity'))) {
          value = client.type.replace(/_/g, ' ');
        }
        // Portfolio code
        else if (key.includes('portfolio')) {
          value = client.portfolioCode?.toString() || '';
        }
        // Date fields - current date
        else if (placeholder.type === 'DATE' || key.includes('date')) {
          if (key.includes('today') || key.includes('current') || key.includes('letter')) {
            value = new Date().toLocaleDateString('en-GB');
          }
        }
        // Year fields
        else if (key.includes('year')) {
          value = new Date().getFullYear().toString();
        }
        
        // Service-related fields (if service is selected)
        if (service) {
          if (key.includes('service') && key.includes('name') || key === 'service' || key === 'servicename') {
            value = service.kind || '';
          }
          else if (key.includes('frequency')) {
            value = service.frequency || '';
          }
          else if (key.includes('fee') || key.includes('cost') || key.includes('price')) {
            value = service.fee ? `£${service.fee.toFixed(2)}` : '';
          }
          else if (key.includes('due') && key.includes('date')) {
            value = service.nextDue ? new Date(service.nextDue).toLocaleDateString('en-GB') : '';
          }
        }
        
        // Practice/Firm information (you might want to make this configurable)
        if (key.includes('practice') || key.includes('firm')) {
          if (key.includes('name')) {
            value = 'M Practice Manager'; // This should come from settings
          }
        }
        
        // Original source-based logic (keep for backward compatibility)
        if (placeholder.source === 'CLIENT' || placeholder.source?.toLowerCase() === 'client') {
          const sourcePath = placeholder.sourcePath;
          if (sourcePath) {
            switch (sourcePath.toLowerCase()) {
              case 'name':
                value = client.name;
                break;
              case 'ref':
              case 'reference':
                value = client.ref;
                break;
              case 'email':
              case 'mainemail':
                value = client.mainEmail || '';
                break;
              case 'phone':
              case 'mainphone':
                value = client.mainPhone || '';
                break;
              case 'type':
                value = client.type;
                break;
              case 'registerednumber':
              case 'company_number':
                value = client.registeredNumber || '';
                break;
              default:
                value = (client as any)[sourcePath] || value;
            }
          }
        }
        
        if (placeholder.source === 'SERVICE' || placeholder.source?.toLowerCase() === 'service') {
          if (service && placeholder.sourcePath) {
            const sourcePath = placeholder.sourcePath;
            switch (sourcePath.toLowerCase()) {
              case 'kind':
              case 'type':
                value = service.kind;
                break;
              case 'frequency':
                value = service.frequency;
                break;
              case 'fee':
              case 'amount':
                value = service.fee.toString();
                break;
              case 'nextdue':
              case 'due_date':
                value = service.nextDue || '';
                break;
              default:
                value = (service as any)[sourcePath] || value;
            }
          }
        }
        
        if (placeholder.source === 'SYSTEM' || placeholder.source?.toLowerCase() === 'system') {
          switch (placeholder.key.toLowerCase()) {
            case 'date':
            case 'current_date':
            case 'today':
              value = new Date().toLocaleDateString('en-GB');
              break;
            case 'year':
            case 'current_year':
              value = new Date().getFullYear().toString();
              break;
          }
        }
        
        initialValues[placeholder.key] = value;
      });
      
      setPlaceholderValues(initialValues);
    } catch (e: any) {
      console.error('Failed to auto-populate placeholders', e);
      // Fallback to default values
      const initialValues: Record<string, any> = {};
      (template?.placeholders || []).forEach((p) => {
        if (p.defaultValue) {
          initialValues[p.key] = p.defaultValue;
        }
      });
      setPlaceholderValues(initialValues);
    } finally {
      setAutoPopulating(false);
    }
  };

  // Handle service selection
  const handleSelectService = (service: Service | null) => {
    setSelectedService(service);
  };

  // Navigate between steps
  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const canProceedFromTemplate = selectedTemplate !== null;
  const canProceedFromClient = selectedClient !== null;

  // Handle placeholder value change
  const handlePlaceholderChange = (key: string, value: any) => {
    setPlaceholderValues((prev) => ({ ...prev, [key]: value }));
    
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // Validate placeholders
  const validatePlaceholders = (): boolean => {
    if (!selectedTemplate) return false;

    const errors: Record<string, string> = {};
    
    (selectedTemplate?.placeholders || []).forEach((placeholder) => {
      const value = placeholderValues[placeholder.key];
      
      // Check required fields
      if (placeholder.required && (!value || String(value).trim() === '')) {
        errors[placeholder.key] = `${placeholder.label} is required`;
      }
      
      // Type-specific validation
      if (value && String(value).trim() !== '') {
        switch (placeholder.type) {
          case 'EMAIL':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
              errors[placeholder.key] = 'Invalid email format';
            }
            break;
          case 'PHONE':
            if (!/^[\d\s\-\+\(\)]+$/.test(String(value))) {
              errors[placeholder.key] = 'Invalid phone number format';
            }
            break;
          case 'NUMBER':
          case 'CURRENCY':
            if (isNaN(Number(value))) {
              errors[placeholder.key] = 'Must be a valid number';
            }
            break;
          case 'DATE':
            if (isNaN(new Date(value).getTime())) {
              errors[placeholder.key] = 'Invalid date format';
            }
            break;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Generate preview
  const handleGeneratePreview = async () => {
    if (!validatePlaceholders()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post<{ preview?: string }>('/letters/preview', {
        templateId: selectedTemplate?.id,
        clientId: selectedClient?.id,
        serviceId: selectedService?.id,
        placeholderValues,
      });

      if (response?.preview) {
        setPreviewHtml(response.preview);
        setCurrentStep('preview');
      }
    } catch (e: any) {
      console.error('Failed to generate preview', e);
      setError(e?.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  // Generate final letter
  const handleGenerateLetter = async () => {
    if (!validatePlaceholders()) {
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const response = await api.post<GeneratedLetter>('/letters/generate', {
        templateId: selectedTemplate?.id,
        clientId: selectedClient?.id,
        serviceId: selectedService?.id,
        placeholderValues,
        outputFormats: selectedFormats,
        autoSave: true,
      });

      if (response) {
        setGeneratedLetter(response);
        setCurrentStep('complete');
      }
    } catch (e: any) {
      console.error('Failed to generate letter', e);
      setError(e?.message || 'Failed to generate letter');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle format selection
  const toggleFormat = (format: 'PDF' | 'DOCX') => {
    setSelectedFormats((prev) => {
      if (prev.includes(format)) {
        // Don't allow deselecting if it's the only format
        if (prev.length === 1) return prev;
        return prev.filter((f) => f !== format);
      } else {
        return [...prev, format];
      }
    });
  };

  // Download letter
  const handleDownload = async (letterId: string, format: 'PDF' | 'DOCX') => {
    try {
      const response = await fetch(`${API_BASE_URL}/letters/${letterId}/download?format=${format}`, {
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedClient?.ref}-${selectedTemplate?.name}-${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      console.error('Download failed', e);
      alert('Failed to download letter. Please try again.');
    }
  };

  // Start new letter
  const handleGenerateAnother = () => {
    setSelectedTemplate(null);
    setSelectedClient(null);
    setSelectedService(null);
    setPlaceholderValues({});
    setPreviewHtml('');
    setGeneratedLetter(null);
    setValidationErrors({});
    setSelectedFormats(['PDF']);
    setCurrentStep('template');
  };

  // Render placeholder input based on type
  const renderPlaceholderInput = (placeholder: TemplatePlaceholder) => {
    const value = placeholderValues[placeholder.key] || '';
    const hasError = !!validationErrors[placeholder.key];

    const commonProps = {
      id: `placeholder-${placeholder.key}`,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handlePlaceholderChange(placeholder.key, e.target.value),
      className: `mdj-input ${hasError ? 'error' : ''}`,
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `error-${placeholder.key}` : undefined,
    };

    switch (placeholder.type) {
      case 'DATE':
        return <input type="date" {...commonProps} />;
      
      case 'EMAIL':
        return <input type="email" {...commonProps} />;
      
      case 'PHONE':
        return <input type="tel" {...commonProps} />;
      
      case 'NUMBER':
        return <input type="number" {...commonProps} />;
      
      case 'CURRENCY':
        return (
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            >
              £
            </span>
            <input
              type="number"
              step="0.01"
              {...commonProps}
              style={{ paddingLeft: '28px' }}
            />
          </div>
        );
      
      case 'ADDRESS':
        return <textarea {...commonProps} rows={3} />;
      
      case 'TEXT':
      default:
        if (placeholder.key.toLowerCase().includes('address') || 
            placeholder.key.toLowerCase().includes('notes') ||
            placeholder.key.toLowerCase().includes('description')) {
          return <textarea {...commonProps} rows={3} />;
        }
        return <input type="text" {...commonProps} />;
    }
  };

  return (
    <MDJShell
      pageTitle="Generate Letter"
      pageSubtitle="Create personalized client letters from templates"
      showBack
      backHref="/templates"
      backLabel="Back to Templates"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Templates', href: '/templates' },
        { label: 'Generate Letter' },
      ]}
    >
      {/* Wizard Progress */}
      <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(['template', 'client', 'placeholders', 'preview', 'complete'] as WizardStep[]).map(
            (step, index) => {
              const stepLabels = {
                template: 'Select Template',
                client: 'Select Client',
                placeholders: 'Fill Details',
                preview: 'Preview & Generate',
                complete: 'Complete',
              };

              const isActive = currentStep === step;
              const isCompleted =
                (step === 'template' && selectedTemplate) ||
                (step === 'client' && selectedClient) ||
                (step === 'placeholders' && currentStep !== 'template' && currentStep !== 'client') ||
                (step === 'preview' && currentStep === 'complete') ||
                (step === 'complete' && generatedLetter);

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
                  {index < 4 && (
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
            }
          )}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'template' && (
        <div>
          {/* Template Selection Filters */}
          <div className="card-mdj" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
              <input
                aria-label="Search templates"
                placeholder="Search by name, description, or tags..."
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
          </div>

          {/* Template List */}
          {loading ? (
            <div className="card-mdj">
              <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading templates...</p>
            </div>
          ) : error ? (
            <div className="card-mdj">
              <p style={{ color: 'var(--danger)', padding: '1rem' }}>{error}</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="card-mdj">
              <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>
                No templates found. {templateSearch || templateCategory ? 'Try adjusting your filters.' : ''}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
                if (categoryTemplates.length === 0) return null;

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
                        {categoryTemplates.length}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {categoryTemplates.map((template) => (
                        <div
                          key={template.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
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
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                marginBottom: '0.5rem',
                              }}
                            >
                              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{template.name}</span>
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

                            <div
                              style={{
                                display: 'flex',
                                gap: '1.5rem',
                                fontSize: '0.9rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <span>📄 {template.fileFormat}</span>
                              <span>
                                🔤 {(template.placeholders || []).length} placeholder
                                {(template.placeholders || []).length !== 1 ? 's' : ''}
                              </span>
                              <span>
                                ✅ {(template.placeholders || []).filter((p) => p.required).length} required
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn-gold btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTemplate(template);
                            }}
                          >
                            Select Template
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Client Selection Step */}
      {currentStep === 'client' && (
        <div>
          {/* Selected Template Summary */}
          {selectedTemplate && (
            <div className="card-mdj" style={{ marginBottom: '1rem', backgroundColor: 'var(--gold-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '4px',
                    height: '40px',
                    backgroundColor: CATEGORY_COLORS[selectedTemplate.category],
                    borderRadius: '2px',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                    {selectedTemplate.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {selectedTemplate.description}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-outline-gold btn-sm"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setCurrentStep('template');
                  }}
                >
                  Change Template
                </button>
              </div>
            </div>
          )}

          {/* Client Search */}
          <div className="card-mdj" style={{ marginBottom: '1rem' }}>
            <input
              aria-label="Search clients"
              placeholder="Search by name, reference, or email..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="mdj-input"
            />
          </div>

          {/* Client List */}
          {loading ? (
            <div className="card-mdj">
              <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading clients...</p>
            </div>
          ) : error ? (
            <div className="card-mdj">
              <p style={{ color: 'var(--danger)', padding: '1rem' }}>{error}</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="card-mdj">
              <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>
                No active clients found. {clientSearch ? 'Try adjusting your search.' : ''}
              </p>
            </div>
          ) : (
            <div className="card-mdj">
              <h3 style={{ marginBottom: '1rem' }}>Select Client ({filteredClients.length})</h3>
              <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      border:
                        selectedClient?.id === client.id
                          ? '2px solid var(--gold)'
                          : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      backgroundColor:
                        selectedClient?.id === client.id ? 'var(--gold-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleSelectClient(client)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span className="mdj-ref">{client.ref}</span>
                        <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{client.name}</span>
                        <span className="mdj-badge mdj-badge-soft">{client.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {client.mainEmail && <span>📧 {client.mainEmail}</span>}
                        {client.mainPhone && <span>📞 {client.mainPhone}</span>}
                        {client.registeredNumber && <span>🏢 {client.registeredNumber}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-gold btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectClient(client);
                      }}
                    >
                      Select Client
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Service Selection */}
          {selectedClient && services.length > 0 && (
            <div className="card-mdj" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Link to Service (Optional)</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
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
                  <span style={{ fontWeight: 600 }}>No service (General letter)</span>
                </div>
                {(services || []).map((service) => (
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
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <span className="mdj-badge mdj-badge-soft">{service.frequency}</span>
                        <span>£{service.fee.toFixed(2)}</span>
                        {service.nextDue && (
                          <span>Due: {new Date(service.nextDue).toLocaleDateString('en-GB')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      {currentStep === 'template' && (
        <div
          className="card-mdj"
          style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}
        >
          <button
            type="button"
            className="btn-gold"
            disabled={!canProceedFromTemplate}
            onClick={() => goToStep('client')}
          >
            Next: Select Client
          </button>
        </div>
      )}

      {currentStep === 'client' && (
        <div
          className="card-mdj"
          style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}
        >
          <button type="button" className="btn-outline-gold" onClick={() => goToStep('template')}>
            Back to Templates
          </button>
          <button
            type="button"
            className="btn-gold"
            disabled={!canProceedFromClient}
            onClick={() => goToStep('placeholders')}
          >
            Next: Fill Details
          </button>
        </div>
      )}

      {/* Placeholder Form Step */}
      {currentStep === 'placeholders' && selectedTemplate && selectedClient && (
        <div>
          {/* Context Summary */}
          <div className="card-mdj" style={{ marginBottom: '1rem', backgroundColor: 'var(--gold-light)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="mdj-label">Template</label>
                <div style={{ fontWeight: 600 }}>{selectedTemplate.name}</div>
              </div>
              <div>
                <label className="mdj-label">Client</label>
                <div style={{ fontWeight: 600 }}>
                  {selectedClient.ref} - {selectedClient.name}
                </div>
              </div>
              {selectedService && (
                <div>
                  <label className="mdj-label">Service</label>
                  <div style={{ fontWeight: 600 }}>{selectedService.kind}</div>
                </div>
              )}
            </div>
          </div>

          {/* Auto-population status */}
          {autoPopulating && (
            <div className="card-mdj" style={{ marginBottom: '1rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Auto-populating fields from client data...
              </p>
            </div>
          )}

          {/* Placeholder Form */}
          <div className="card-mdj">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Letter Details</h3>
              <span className="mdj-badge mdj-badge-soft">
                {(selectedTemplate?.placeholders || []).filter((p) => p.required).length} required fields
              </span>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Fields marked with <span style={{ color: 'var(--danger)' }}>*</span> are required. 
              Values have been auto-populated where possible - please review and edit as needed.
            </p>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {(selectedTemplate?.placeholders || []).map((placeholder) => (
                <div key={placeholder.key}>
                  <label htmlFor={`placeholder-${placeholder.key}`} className="mdj-label">
                    {placeholder.label}
                    {placeholder.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                    {placeholder.source && (
                      <span
                        className="mdj-badge"
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--bg-muted)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {placeholder.source}
                      </span>
                    )}
                  </label>

                  {renderPlaceholderInput(placeholder)}

                  {validationErrors[placeholder.key] && (
                    <div
                      id={`error-${placeholder.key}`}
                      style={{
                        color: 'var(--danger)',
                        fontSize: '0.85rem',
                        marginTop: '0.25rem',
                      }}
                      role="alert"
                    >
                      {validationErrors[placeholder.key]}
                    </div>
                  )}

                  {placeholder.format && !validationErrors[placeholder.key] && (
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      Format: {placeholder.format}
                    </div>
                  )}

                  {placeholder.defaultValue && !placeholderValues[placeholder.key] && (
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      Default: {placeholder.defaultValue}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {Object.keys(validationErrors).length > 0 && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                }}
                role="alert"
              >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--danger)' }}>
                  Please fix the following errors:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {Object.entries(validationErrors).map(([key, message]) => (
                    <li key={key} style={{ color: 'var(--danger)' }}>
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Real-time Preview (Optional Enhancement) */}
          <div className="card-mdj" style={{ marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Preview</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Click "Generate Preview" to see how your letter will look with the current values.
            </p>
          </div>
        </div>
      )}

      {currentStep === 'placeholders' && (
        <div
          className="card-mdj"
          style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}
        >
          <button type="button" className="btn-outline-gold" onClick={() => goToStep('client')}>
            Back to Client Selection
          </button>
          <button
            type="button"
            className="btn-gold"
            onClick={handleGeneratePreview}
            disabled={loading}
          >
            {loading ? 'Generating Preview...' : 'Generate Preview'}
          </button>
        </div>
      )}

      {/* Preview and Generate Step */}
      {currentStep === 'preview' && selectedTemplate && selectedClient && (
        <div>
          {/* Context Summary */}
          <div className="card-mdj" style={{ marginBottom: '1rem', backgroundColor: 'var(--gold-light)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="mdj-label">Template</label>
                <div style={{ fontWeight: 600 }}>{selectedTemplate.name}</div>
              </div>
              <div>
                <label className="mdj-label">Client</label>
                <div style={{ fontWeight: 600 }}>
                  {selectedClient.ref} - {selectedClient.name}
                </div>
              </div>
              {selectedService && (
                <div>
                  <label className="mdj-label">Service</label>
                  <div style={{ fontWeight: 600 }}>{selectedService.kind}</div>
                </div>
              )}
            </div>
          </div>

          {/* Format Selection */}
          <div className="card-mdj" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Select Output Format(s)</h3>
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

          {/* Letter Preview */}
          <div className="card-mdj">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Letter Preview</h3>
              <button
                type="button"
                className="btn-outline-gold btn-sm"
                onClick={() => goToStep('placeholders')}
              >
                Edit Details
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  color: 'var(--danger)',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <div
              style={{
                padding: '2rem',
                backgroundColor: 'white',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                minHeight: '600px',
                maxHeight: '800px',
                overflowY: 'auto',
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#000',
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              This is a preview of how your letter will appear. The final document will be formatted according to the selected output format.
            </p>
          </div>

          {/* Generation Progress */}
          {generating && (
            <div className="card-mdj" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                  <div style={{ fontWeight: 600 }}>Generating letter...</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Creating {selectedFormats.join(' and ')} format(s)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 'preview' && (
        <div
          className="card-mdj"
          style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}
        >
          <button
            type="button"
            className="btn-outline-gold"
            onClick={() => goToStep('placeholders')}
            disabled={generating}
          >
            Back to Edit Details
          </button>
          <button
            type="button"
            className="btn-gold"
            onClick={handleGenerateLetter}
            disabled={generating || selectedFormats.length === 0}
          >
            {generating ? 'Generating...' : `Generate Letter (${selectedFormats.join(' + ')})`}
          </button>
        </div>
      )}

      {/* Completion Step */}
      {currentStep === 'complete' && generatedLetter && selectedTemplate && selectedClient && (
        <div>
          {/* Success Message */}
          <div
            className="card-mdj"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: 'var(--success-light)',
              border: '2px solid var(--success)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, marginBottom: '0.25rem', color: 'var(--success)' }}>
                  Letter Generated Successfully!
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  Your letter has been generated and saved to the client's documents.
                </p>
              </div>
            </div>
          </div>

          {/* Letter Details */}
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Letter Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="mdj-label">Template</label>
                <div style={{ fontWeight: 600 }}>{generatedLetter.templateName}</div>
              </div>
              <div>
                <label className="mdj-label">Client</label>
                <div style={{ fontWeight: 600 }}>{generatedLetter.clientName}</div>
              </div>
              <div>
                <label className="mdj-label">Generated</label>
                <div style={{ fontWeight: 600 }}>
                  {new Date(generatedLetter.generatedAt).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <label className="mdj-label">Document ID</label>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {generatedLetter.documentId}
                </div>
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Download Letter</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Your letter is available in the following format(s):
            </p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {(generatedLetter.formats || []).map((formatInfo) => (
                <div
                  key={formatInfo.format}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-muted)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {formatInfo.format === 'PDF' ? '📄 PDF Document' : '📝 Word Document'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {(formatInfo.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-gold"
                    onClick={() => handleDownload(generatedLetter.id, formatInfo.format)}
                  >
                    Download {formatInfo.format}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-mdj">
            <h3 style={{ marginBottom: '1rem' }}>What's Next?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <button
                type="button"
                className="btn-gold"
                onClick={handleGenerateAnother}
                style={{ padding: '1rem', height: 'auto', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Generate Another Letter</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Create a new letter from a template
                </div>
              </button>

              <button
                type="button"
                className="btn-outline-gold"
                onClick={() => router.push(`/clients/${selectedClient.id}`)}
                style={{ padding: '1rem', height: 'auto', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>View Client</div>
                <div style={{ fontSize: '0.85rem' }}>
                  Go to {selectedClient.name}'s profile
                </div>
              </button>

              <button
                type="button"
                className="btn-outline-gold"
                onClick={() => router.push(`/clients/${selectedClient.id}/letters`)}
                style={{ padding: '1rem', height: 'auto', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Letter History</div>
                <div style={{ fontSize: '0.85rem' }}>
                  View all letters for this client
                </div>
              </button>

              <button
                type="button"
                className="btn-outline-gold"
                onClick={() => router.push('/templates')}
                style={{ padding: '1rem', height: 'auto', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Browse Templates</div>
                <div style={{ fontSize: '0.85rem' }}>
                  View all available templates
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </MDJShell>
  );
}
