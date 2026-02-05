'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MDJLayout } from '@/components/mdj-ui';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';

interface CreateComplianceItemDto {
  clientId: string;
  type: string;
  description: string;
  dueDate?: string;
  status?: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
}

export default function NewComplianceItemPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateComplianceItemDto>({
    clientId: '',
    type: '',
    description: '',
    dueDate: '',
    status: 'PENDING',
    source: 'MANUAL',
    reference: '',
    period: '',
  });

  const complianceTypes = [
    'ANNUAL_ACCOUNTS',
    'CONFIRMATION_STATEMENT',
    'VAT_RETURN',
    'CORPORATION_TAX',
    'PAYE_RETURN',
    'SELF_ASSESSMENT',
    'CIS_RETURN',
    'STATUTORY_ACCOUNTS',
    'DORMANT_ACCOUNTS',
    'MICRO_ENTITY_ACCOUNTS',
    'SMALL_COMPANY_ACCOUNTS',
    'MEDIUM_COMPANY_ACCOUNTS',
    'LARGE_COMPANY_ACCOUNTS',
    'CHARITY_RETURN',
    'OTHER',
  ];

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.getClients();
      const items = Array.isArray(response) ? response : [];
      setClients(items.map((c: any) => c.node ?? c));
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Failed to load clients');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.clientId || !form.type || !form.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const submitData = {
        ...form,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      };

      await api.post('/compliance/manual', submitData);
      router.push('/compliance');
    } catch (err) {
      console.error('Error creating compliance item:', err);
      setError('Failed to create compliance item');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateComplianceItemDto, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MDJLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => router.push('/compliance')}
              className="text-[#f0c84b] hover:text-[#e6b73d] mb-2"
            >
              ← Back to Compliance
            </button>
            <h1 className="text-2xl font-bold text-white">Add Manual Compliance Item</h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-[#2a2a2a] rounded-lg border border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client *
                </label>
                <select
                  value={form.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.registeredNumber || client.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                >
                  <option value="">Select compliance type</option>
                  {complianceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                  rows={3}
                  placeholder="Enter a description of the compliance requirement"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b] placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                >
                  <option value="PENDING">Pending</option>
                  <option value="FILED">Filed</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="EXEMPT">Exempt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source
                </label>
                <select
                  value={form.source}
                  onChange={(e) => handleInputChange('source', e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                >
                  <option value="MANUAL">Manual</option>
                  <option value="COMPANIES_HOUSE">Companies House</option>
                  <option value="HMRC">HMRC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  placeholder="e.g., Company number, UTR, etc."
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b] placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Period
                </label>
                <input
                  type="text"
                  value={form.period}
                  onChange={(e) => handleInputChange('period', e.target.value)}
                  placeholder="e.g., 2024-03-31, Q1 2024, etc."
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b] placeholder-gray-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/compliance')}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[#f0c84b] text-black rounded-lg hover:bg-[#e6b73d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Compliance Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MDJLayout>
  );
}
