'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MDJLayout from '@/components/mdj-ui/MDJLayout';
import { MDJSection, MDJCard, MDJButton, MDJInput, MDJSelect, MDJTextarea } from '@/components/mdj-ui';
import { api } from '@/lib/api';
import { Client } from '@/lib/types';

interface CreateServiceData {
  clientId: string;
  kind: string;
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  fee: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  nextDue?: string;
  description?: string;
}

interface FormErrors {
  clientId?: string;
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

export default function NewServicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateServiceData>({
    clientId: '',
    kind: '',
    frequency: 'ANNUAL',
    fee: 0,
    status: 'ACTIVE',
    nextDue: '',
    description: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await api.getClients({ status: 'ACTIVE', limit: '1000' });
      const items = Array.isArray(data) ? data : [];
      setClients(items.map((c: any) => c.node ?? c));
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }

    if (!formData.kind.trim()) {
      newErrors.kind = 'Service type is required';
    }

    if (!formData.frequency) {
      newErrors.frequency = 'Frequency is required';
    }

    if (formData.fee <= 0) {
      newErrors.fee = 'Fee must be greater than 0';
    }

    if (formData.nextDue && new Date(formData.nextDue) < new Date()) {
      newErrors.nextDue = 'Next due date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        fee: Number(formData.fee),
        nextDue: formData.nextDue ? new Date(formData.nextDue).toISOString() : undefined,
      };

      await api.post('/services', submitData);
      router.push('/services');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateServiceData, value: any) => {
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

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: `${client.ref} - ${client.name}`,
  }));

  const serviceTypeOptions = COMMON_SERVICE_TYPES.map(type => ({
    value: type,
    label: type,
  }));

  return (
    <MDJLayout title="Add New Service">
      <div style={{ marginBottom: '2rem' }}>
        <MDJSection
          title="Add New Service"
          subtitle="Create a new service subscription for a client"
          actions={
            <MDJButton
              variant="ghost"
              onClick={() => router.push('/services')}
            >
              Cancel
            </MDJButton>
          }
        >
          <></>
        </MDJSection>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <MDJCard title="Service Details" padding="lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Client *
                    </label>
                    <MDJSelect
                      placeholder="Select a client..."
                      value={formData.clientId}
                      onChange={(e) => handleInputChange('clientId', e.target.value)}
                      options={clientOptions}
                      error={errors.clientId}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Service Type *
                    </label>
                    <MDJSelect
                      placeholder="Select or type service type..."
                      value={formData.kind}
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
                        value={formData.frequency}
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
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        options={SERVICE_STATUSES}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Fee ({formData.frequency.toLowerCase()}) *
                      </label>
                      <MDJInput
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.fee || ''}
                        onChange={(e) => handleInputChange('fee', parseFloat(e.target.value) || 0)}
                        error={errors.fee}
                        leftIcon={
                          <span className="text-sm">£</span>
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Next Due Date
                      </label>
                      <MDJInput
                        type="date"
                        value={formData.nextDue}
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
                      placeholder="Optional description or notes about this service..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </MDJCard>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
              <MDJCard title="Service Summary" padding="lg">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--dim-light)' }}>
                      {formData.frequency} Fee:
                    </span>
                    <span className="font-mono">
                      {formatCurrency(formData.fee || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--dim-light)' }}>
                      Annualized Value:
                    </span>
                    <span className="font-mono font-bold" style={{ color: 'var(--brand-primary)' }}>
                      {formatCurrency(calculateAnnualizedFee(formData.fee || 0, formData.frequency))}
                    </span>
                  </div>

                  {formData.nextDue && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'var(--dim-light)' }}>
                        Next Due:
                      </span>
                      <span className="text-sm">
                        {new Date(formData.nextDue).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  )}

                  <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'var(--dim-light)' }}>
                        Status:
                      </span>
                      <span className={`text-sm font-medium ${
                        formData.status === 'ACTIVE' ? 'text-green-500' :
                        formData.status === 'INACTIVE' ? 'text-yellow-500' :
                        'text-gray-500'
                      }`}>
                        {formData.status}
                      </span>
                    </div>
                  </div>
                </div>
              </MDJCard>

              <MDJCard title="Actions" padding="lg">
                <div className="space-y-3">
                  <MDJButton
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={loading}
                    disabled={!formData.clientId || !formData.kind || !formData.fee}
                  >
                    Create Service
                  </MDJButton>

                  <MDJButton
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => router.push('/services')}
                    disabled={loading}
                  >
                    Cancel
                  </MDJButton>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </MDJCard>
            </div>
          </div>
        </form>
      </div>
    </MDJLayout>
  );
}
