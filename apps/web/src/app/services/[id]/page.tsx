'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MDJSection, MDJCard, MDJButton, MDJInput, MDJSelect, MDJTextarea, MDJBadge } from '@/components/mdj-ui';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { api, API_BASE_URL } from '@/lib/api';
import type { Service, Client, Task } from '@/lib/types';
import type { ServiceFrequency, ServiceStatus } from '@/lib/types';

interface ComplianceItem {
  id: string;
  clientId: string;
  serviceId?: string;
  type: string;
  description: string;
  dueDate?: string;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: string;
  updatedAt: string;
}

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
  generatedAt: string;
  status: 'DRAFT' | 'GENERATED' | 'DOWNLOADED' | 'SENT' | 'ARCHIVED';
  downloadCount: number;
  lastDownloadedAt?: string;
}

interface ServiceDetails {
  service: Service;
  tasks: Task[];
  complianceItems: ComplianceItem[];
  summary: {
    totalTasks: number;
    openTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    cancelledTasks: number;
    overdueTasks: number;
    pendingCompliance: number;
    filedCompliance: number;
    overdueCompliance: number;
    exemptCompliance: number;
    totalCompliance: number;
  };
}

interface UpdateServiceData {
  kind?: string;
  frequency?: string;
  fee?: number;
  status?: string;
  nextDue?: string;
  description?: string;
}

interface FormErrors {
  kind?: string;
  frequency?: string;
  fee?: string;
  nextDue?: string;
  description?: string;
}

const SERVICE_FREQUENCIES = [
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
];

const SERVICE_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const COMMON_SERVICE_TYPES = [
  'Annual Accounts',
  'VAT Returns',
  'Payroll Services',
  'Corporation Tax',
  'Self Assessment',
  'Bookkeeping',
  'Management Accounts',
  'Audit',
  'Tax Planning',
  'Company Secretarial',
];

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [summary, setSummary] = useState<ServiceDetails['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateServiceData>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [generatingTasks, setGeneratingTasks] = useState(false);

  useEffect(() => {
    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  const fetchService = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch service details with related tasks and compliance items
      const detailsData = await api.get<ServiceDetails>(`/services/${serviceId}/details`);
      setService(detailsData.service);
      setTasks(detailsData.tasks);
      setComplianceItems(detailsData.complianceItems);
      setSummary(detailsData.summary);

      // Fetch client details
      const clientData = await api.get<Client>(`/clients/${detailsData.service.clientId}`).catch(() => null);
      if (clientData) {
        setClient(clientData);
      }

      // Fetch letters for this service
      const lettersData = await api.get<GeneratedLetter[]>(`/letters/service/${serviceId}`).catch(() => []);
      setLetters(Array.isArray(lettersData) ? lettersData : []);

      // Initialize form data with safe type coercion
      setFormData({
        kind: detailsData.service.kind || '',
        frequency: (detailsData.service.frequency as ServiceFrequency) || 'ANNUAL',
        fee: detailsData.service.fee ?? 0,
        status: (detailsData.service.status as ServiceStatus) || 'ACTIVE',
        nextDue: detailsData.service.nextDue ? detailsData.service.nextDue.split('T')[0] : '',
        description: detailsData.service.description || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.kind?.trim()) {
      newErrors.kind = 'Service type is required';
    }

    if (!formData.frequency) {
      newErrors.frequency = 'Frequency is required';
    }

    if (!formData.fee || formData.fee <= 0) {
      newErrors.fee = 'Fee must be greater than 0';
    }

    if (formData.nextDue && new Date(formData.nextDue) < new Date()) {
      newErrors.nextDue = 'Next due date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updateData = {
        ...formData,
        fee: Number(formData.fee),
        nextDue: formData.nextDue ? new Date(formData.nextDue).toISOString() : undefined,
      };

      const updatedService = await api.put<Service>(`/services/${serviceId}`, updateData);
      setService(updatedService);
      setIsEditing(false);
      
      // Refresh the full details to get updated related items
      await fetchService();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.delete(`/services/${serviceId}`);
      router.push('/services');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!confirm('Generate tasks from service template? This will create tasks based on the service type and frequency.')) {
      return;
    }

    setGeneratingTasks(true);
    setError(null);

    try {
      const result = await api.post<{ tasks: Task[]; message: string }>(`/tasks/generate/service/${serviceId}`);
      
      // Refresh the service details to show the newly generated tasks
      await fetchService();
      
      // Show success message
      alert(`Successfully generated ${result.tasks.length} task(s) from template`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tasks');
    } finally {
      setGeneratingTasks(false);
    }
  };

  const handleInputChange = (field: keyof UpdateServiceData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const calculateAnnualizedFee = (fee: number, frequency: string): number => {
    switch (frequency) {
      case 'ANNUAL':
        return fee;
      case 'QUARTERLY':
        return fee * 4;
      case 'MONTHLY':
        return fee * 12;
      case 'WEEKLY':
        return fee * 52;
      default:
        return fee;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'SUSPENDED': return 'default';
      default: return 'default';
    }
  };

  const getFrequencyBadgeVariant = (frequency: string) => {
    switch (frequency) {
      case 'ANNUAL': return 'info';
      case 'QUARTERLY': return 'primary';
      case 'MONTHLY': return 'success';
      case 'WEEKLY': return 'warning';
      default: return 'default';
    }
  };

  const getTaskStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'warning';
      case 'OPEN': return 'info';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const getTaskPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'default';
      default: return 'default';
    }
  };

  const getComplianceStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'FILED': return 'success';
      case 'PENDING': return 'warning';
      case 'OVERDUE': return 'error';
      case 'EXEMPT': return 'default';
      default: return 'default';
    }
  };

  const serviceTypeOptions = COMMON_SERVICE_TYPES.map(type => ({
    value: type,
    label: type,
  }));

  if (loading) {
    return (
      <MDJShell pageTitle="Service" pageSubtitle="Loading" showBack backHref="/services" backLabel="Back to Services" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Services', href: '/services' }, { label: 'Service' }]}>
        <div className="card-mdj">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--brand-primary)' }}></div>
            <p>Loading service...</p>
          </div>
        </div>
      </MDJShell>
    );
  }

  if (error && !service) {
    return (
      <MDJShell pageTitle="Service" pageSubtitle="Error" showBack backHref="/services" backLabel="Back to Services" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Services', href: '/services' }, { label: 'Error' }]}>
        <div className="card-mdj">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">Error Loading Service</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </MDJShell>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <MDJShell pageTitle={`Service: ${service.kind}`} pageSubtitle={client ? `${client.ref} - ${client.name}` : ''} showBack backHref="/services" backLabel="Back to Services" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Services', href: '/services' }, { label: service.kind }]}>
      <div className="page-content space-y-6">
        <MDJSection
          title={`Service: ${service.kind}`}
          subtitle={client ? `${client.ref} - ${client.name}` : 'Loading client...'}
          actions={
            <div className="flex gap-2">
              <ExportMenu onPDF={() => window.print()} />
              {!isEditing ? (
                <>
                  <MDJButton
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Service
                  </MDJButton>
                  <MDJButton
                    variant="ghost"
                    onClick={() => router.push('/services')}
                  >
                    Back to Services
                  </MDJButton>
                </>
              ) : (
                <>
                  <MDJButton
                    variant="primary"
                    onClick={handleSave}
                    loading={saving}
                  >
                    Save Changes
                  </MDJButton>
                  <MDJButton
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        kind: service.kind || '',
                        frequency: service.frequency || 'ANNUAL',
                        fee: service.fee ?? 0,
                        status: service.status || 'ACTIVE',
                        nextDue: service.nextDue ? service.nextDue.split('T')[0] : '',
                        description: service.description || '',
                      });
                      setErrors({});
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </MDJButton>
                </>
              )}
            </div>
          }
        >
          <></>
        </MDJSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <MDJCard title="Service Details" padding="lg">
              {!isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                        Service Type
                      </label>
                      <p className="text-lg font-medium">{service.kind}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                        Frequency
                      </label>
                      <MDJBadge variant={(service.frequency === 'MONTHLY' || service.frequency === 'QUARTERLY') ? 'success' : 'info'}>
                        {service.frequency || 'ANNUAL'}
                      </MDJBadge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                        {service.frequency} Fee
                      </label>
                      <p className="text-lg font-mono">{formatCurrency(service.fee ?? 0)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                        Annual Value
                      </label>
                      <p className="text-lg font-mono font-bold" style={{ color: 'var(--brand-primary)' }}>
                        {formatCurrency(service.annualized ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                        Status
                      </label>
                      <MDJBadge variant={service.status === 'INACTIVE' || service.status === 'SUSPENDED' ? 'warning' : 'success'}>
                        {service.status || 'ACTIVE'}
                      </MDJBadge>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                        Next Due
                      </label>
                      <p>{formatDate(service.nextDue)}</p>
                    </div>
                  </div>

                  {service.description && (
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                        Description
                      </label>
                      <p className="text-sm">{service.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Service Type *
                    </label>
                    <MDJSelect
                      value={formData.kind || ''}
                      onChange={(e) => handleInputChange('kind', e.target.value)}
                      options={serviceTypeOptions}
                      error={errors.kind}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Frequency *
                      </label>
                      <MDJSelect
                        value={formData.frequency || ''}
                        onChange={(e) => handleInputChange('frequency', e.target.value)}
                        options={SERVICE_FREQUENCIES}
                        error={errors.frequency}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Status
                      </label>
                      <MDJSelect
                        value={formData.status || ''}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        options={SERVICE_STATUSES}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Fee ({formData.frequency?.toLowerCase() || 'period'}) *
                      </label>
                      <MDJInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.fee || ''}
                        onChange={(e) => handleInputChange('fee', parseFloat(e.target.value) || 0)}
                        error={errors.fee}
                        leftIcon={<span className="text-sm">£</span>}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Next Due Date
                      </label>
                      <MDJInput
                        type="date"
                        value={formData.nextDue || ''}
                        onChange={(e) => handleInputChange('nextDue', e.target.value)}
                        error={errors.nextDue}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <MDJTextarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </MDJCard>

            {client && (
              <MDJCard title="Client Information" padding="lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                      Client Reference
                    </label>
                    <button
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="text-lg font-mono hover:underline"
                      style={{ color: 'var(--brand-primary)' }}
                    >
                      {client.ref}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                      Client Name
                    </label>
                    <button
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="text-lg hover:underline"
                    >
                      {client.name}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                      Type
                    </label>
                    <p>{client.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--dim-light)' }}>
                      Portfolio
                    </label>
                    <p className="font-mono">{client.portfolioCode}</p>
                  </div>
                </div>
              </MDJCard>
            )}

            {/* Summary Statistics */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MDJCard padding="lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>
                      {summary.totalTasks}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--dim-light)' }}>
                      Total Tasks
                    </div>
                  </div>
                </MDJCard>
                <MDJCard padding="lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>
                      {summary.openTasks}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--dim-light)' }}>
                      Open Tasks
                    </div>
                  </div>
                </MDJCard>
                <MDJCard padding="lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>
                      {summary.pendingCompliance}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--dim-light)' }}>
                      Pending Compliance
                    </div>
                  </div>
                </MDJCard>
                <MDJCard padding="lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
                      {summary.filedCompliance}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--dim-light)' }}>
                      Filed Compliance
                    </div>
                  </div>
                </MDJCard>
              </div>
            )}

            {/* Related Tasks Section */}
            <MDJCard title="Related Tasks" padding="lg">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm" style={{ color: 'var(--dim-light)' }}>
                  Tasks linked to this service
                </div>
                <div className="flex gap-2">
                  <MDJButton
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateTasks}
                    loading={generatingTasks}
                    disabled={generatingTasks}
                  >
                    Generate Tasks
                  </MDJButton>
                  <MDJButton
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/tasks/new?serviceId=${serviceId}`)}
                  >
                    Add Task
                  </MDJButton>
                </div>
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--dim-light)' }}>
                  <p>No tasks linked to this service</p>
                  <p className="text-sm mt-2">Create tasks to track the workflow for this service</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Title
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Due Date
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Status
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Priority
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Assignee
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-3 px-3">
                            <div className="font-medium">{task.title}</div>
                            {task.description && (
                              <div className="text-sm mt-1" style={{ color: 'var(--dim-light)' }}>
                                {task.description.substring(0, 60)}
                                {task.description.length > 60 ? '...' : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {task.dueDate ? formatDate(task.dueDate) : '-'}
                          </td>
                          <td className="py-3 px-3">
                            <MDJBadge variant={(task.status || 'OPEN').includes('COMPLETED') ? 'success' : (task.status || 'OPEN').includes('CANCELLED') ? 'error' : 'info'}>
                              {(task.status || 'OPEN').replace('_', ' ')}
                            </MDJBadge>
                          </td>
                          <td className="py-3 px-3">
                            <MDJBadge variant={(task.priority || 'MEDIUM') === 'HIGH' || (task.priority || 'MEDIUM') === 'URGENT' ? 'warning' : 'info'}>
                              {task.priority || 'MEDIUM'}
                            </MDJBadge>
                          </td>
                          <td className="py-3 px-3">
                            {task.assignee || '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <MDJButton
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/tasks/${task.id}`)}
                            >
                              View
                            </MDJButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </MDJCard>

            {/* Compliance Items Section */}
            <MDJCard title="Compliance Items" padding="lg">
              <div className="text-sm mb-4" style={{ color: 'var(--dim-light)' }}>
                Regulatory filings linked to this service
              </div>
              {complianceItems.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--dim-light)' }}>
                  <p>No compliance items linked to this service</p>
                  <p className="text-sm mt-2">Compliance items are automatically created for services that require regulatory filings</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Type
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Description
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Due Date
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Status
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Source
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceItems.map((item) => (
                        <tr key={item.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-3 px-3 font-medium">
                            {item.type.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-3">
                            {item.description}
                          </td>
                          <td className="py-3 px-3">
                            {item.dueDate ? formatDate(item.dueDate) : '-'}
                          </td>
                          <td className="py-3 px-3">
                            <MDJBadge variant={getComplianceStatusBadgeVariant(item.status)}>
                              {item.status}
                            </MDJBadge>
                          </td>
                          <td className="py-3 px-3">
                            {item.source.replace(/_/g, ' ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </MDJCard>

            {/* Letters Section */}
            <MDJCard title="Generated Letters" padding="lg">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm" style={{ color: 'var(--dim-light)' }}>
                  Letters generated for this service
                </div>
                <MDJButton
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/templates/generate?serviceId=${serviceId}&clientId=${service?.clientId}`)}
                >
                  Generate Letter
                </MDJButton>
              </div>
              {letters.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--dim-light)' }}>
                  <p>No letters generated for this service</p>
                  <p className="text-sm mt-2">Generate letters to communicate with clients about this service</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Template
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Generated
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Generated By
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Status
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Downloads
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: 'var(--dim-light)' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {letters.map((letter) => {
                        const getLetterStatusBadgeVariant = (status: string) => {
                          switch (status) {
                            case 'GENERATED': return 'success';
                            case 'DOWNLOADED': return 'info';
                            case 'SENT': return 'gold';
                            case 'ARCHIVED': return 'default';
                            default: return 'default';
                          }
                        };

                        return (
                          <tr key={letter.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                            <td className="py-3 px-3">
                              <div className="font-medium">{letter.templateName}</div>
                              <div className="text-sm" style={{ color: 'var(--dim-light)' }}>
                                v{letter.templateVersion}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {formatDate(letter.generatedAt)}
                            </td>
                            <td className="py-3 px-3">
                              {letter.generatedBy}
                            </td>
                            <td className="py-3 px-3">
                              <MDJBadge variant={letter.status === 'SENT' || letter.status === 'GENERATED' ? 'success' : letter.status === 'DRAFT' ? 'info' : 'warning'}>
                                {letter.status}
                              </MDJBadge>
                            </td>
                            <td className="py-3 px-3">
                              {letter.downloadCount}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <MDJButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (letter.documentId) {
                                      window.open(`/documents/${letter.documentId}`, '_blank');
                                    } else {
                                      alert('No document available for preview');
                                    }
                                  }}
                                >
                                  Preview
                                </MDJButton>
                                <MDJButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`${API_BASE_URL}/letters/${letter.id}/download?format=PDF`, {
                                        headers: {
                                          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                                        },
                                      });
                                      if (!response.ok) throw new Error('Download failed');
                                      const blob = await response.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `${letter.templateName}_${letter.clientName}_${formatDate(letter.generatedAt)}.pdf`;
                                      a.click();
                                      window.URL.revokeObjectURL(url);
                                      // Refresh letters
                                      const refreshed = await api.get<GeneratedLetter[]>(`/letters/service/${serviceId}`);
                                      setLetters(Array.isArray(refreshed) ? refreshed : []);
                                    } catch (e: any) {
                                      alert(e?.message || 'Download failed');
                                    }
                                  }}
                                >
                                  Download
                                </MDJButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </MDJCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <MDJCard title="Service Summary" padding="lg">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--dim-light)' }}>
                    {isEditing ? formData.frequency || 'ANNUAL' : service.frequency} Fee:
                  </span>
                  <span className="font-mono">
                    {formatCurrency(isEditing ? (formData.fee || 0) : (service.fee ?? 0))}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--dim-light)' }}>
                    Annualized Value:
                  </span>
                  <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>
                    {formatCurrency(
                      isEditing 
                        ? calculateAnnualizedFee(formData.fee || 0, formData.frequency || 'ANNUAL')
                        : (service.annualized ?? 0)
                    )}
                  </span>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-xs" style={{ color: 'var(--dim-light)' }}>
                    Created: {formatDate(service.createdAt)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--dim-light)' }}>
                    Updated: {formatDate(service.updatedAt)}
                  </div>
                </div>
              </div>
            </MDJCard>

            {!isEditing && (
              <MDJCard title="Actions" padding="lg">
                <div className="space-y-3">
                  <MDJButton
                    variant="outline"
                    fullWidth
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Service
                  </MDJButton>

                  <MDJButton
                    variant="ghost"
                    fullWidth
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete Service
                  </MDJButton>
                </div>
              </MDJCard>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MDJShell>
  );
}
