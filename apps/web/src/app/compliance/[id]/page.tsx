'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';

interface ComplianceItem {
  id: string;
  clientId: string;
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

export default function ComplianceItemPage() {
  const params = useParams();
  const router = useRouter();
  const [complianceItem, setComplianceItem] = useState<ComplianceItem | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ComplianceItem>>({});

  useEffect(() => {
    if (params.id) {
      loadComplianceItem(params.id as string);
    }
  }, [params.id]);

  const loadComplianceItem = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/compliance/${id}`) as any;
      const item = response.data || response;
      setComplianceItem(item);
      setEditForm(item);

      // Load client information
      if (item.clientId) {
        try {
          const clientResponse = await api.get(`/clients/${item.clientId}`) as any;
          setClient(clientResponse.data || clientResponse);
        } catch (err) {
          console.error('Error loading client:', err);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error loading compliance item:', err);
      setError('Failed to load compliance item');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!complianceItem) return;

    try {
      const updateData = {
        type: editForm.type,
        description: editForm.description,
        dueDate: editForm.dueDate,
        status: editForm.status,
        reference: editForm.reference,
        period: editForm.period,
      };

      await api.put(`/compliance/${complianceItem.id}`, updateData);
      await loadComplianceItem(complianceItem.id);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating compliance item:', err);
      setError('Failed to update compliance item');
    }
  };

  const handleDelete = async () => {
    if (!complianceItem) return;

    if (confirm('Are you sure you want to delete this compliance item?')) {
      try {
        await api.delete(`/compliance/${complianceItem.id}`);
        router.push('/compliance');
      } catch (err) {
        console.error('Error deleting compliance item:', err);
        setError('Failed to delete compliance item');
      }
    }
  };

  const handleMarkFiled = async () => {
    if (!complianceItem) return;

    try {
      await api.put(`/compliance/${complianceItem.id}/filed`, {
        filedDate: new Date().toISOString(),
      });
      await loadComplianceItem(complianceItem.id);
    } catch (err) {
      console.error('Error marking compliance item as filed:', err);
      setError('Failed to mark item as filed');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FILED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXEMPT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <MDJShell pageTitle="Compliance" pageSubtitle="Loading" showBack backHref="/compliance" backLabel="Back to Compliance" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Compliance', href: '/compliance' }, { label: 'Item' }]}>
        <div className="card-mdj">Loading compliance item...</div>
      </MDJShell>
    );
  }

  if (error || !complianceItem) {
    return (
      <MDJShell pageTitle="Compliance" pageSubtitle="Error" showBack backHref="/compliance" backLabel="Back to Compliance" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Compliance', href: '/compliance' }, { label: 'Error' }]}>
        <div className="card-mdj" style={{ color: 'var(--danger)' }}>{error || 'Compliance item not found'}</div>
      </MDJShell>
    );
  }

  return (
    <MDJShell pageTitle="Compliance Item" pageSubtitle={complianceItem?.type || ''} showBack backHref="/compliance" backLabel="Back to Compliance" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Compliance', href: '/compliance' }, { label: complianceItem?.type || 'Item' }]}>
      <div className="page-content p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            
            <h1 className="text-2xl font-bold text-white">
              {complianceItem.type.replace(/_/g, ' ')}
            </h1>
            {client && (
              <p className="text-gray-400">
                Client: <span className="text-white">{client.name} ({client.registeredNumber || client.id})</span>
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            {!isEditing && complianceItem.status === 'PENDING' && (
              <button
                onClick={handleMarkFiled}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Mark Filed
              </button>
            )}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#f0c84b] text-black px-4 py-2 rounded-lg hover:bg-[#e6b73d]"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(complianceItem);
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-lg border border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.type || ''}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                />
              ) : (
                <p className="text-white">{complianceItem.type.replace(/_/g, ' ')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              {isEditing ? (
                <select
                  value={editForm.status || ''}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                >
                  <option value="PENDING">Pending</option>
                  <option value="FILED">Filed</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="EXEMPT">Exempt</option>
                </select>
              ) : (
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadgeClass(complianceItem.status)}`}>
                  {complianceItem.status}
                </span>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                />
              ) : (
                <p className="text-white">{complianceItem.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Due Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={formatDate(editForm.dueDate)}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                />
              ) : (
                <p className="text-white">{formatDisplayDate(complianceItem.dueDate)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source
              </label>
              <p className="text-white">{complianceItem.source.replace(/_/g, ' ')}</p>
            </div>

            {complianceItem.reference && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reference
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.reference || ''}
                    onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                  />
                ) : (
                  <p className="text-white">{complianceItem.reference}</p>
                )}
              </div>
            )}

            {complianceItem.period && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Period
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.period || ''}
                    onChange={(e) => setEditForm({ ...editForm, period: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f0c84b]"
                  />
                ) : (
                  <p className="text-white">{complianceItem.period}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
              <div>
                <span className="font-medium">Created:</span> {new Date(complianceItem.createdAt).toLocaleString('en-GB')}
              </div>
              <div>
                <span className="font-medium">Updated:</span> {new Date(complianceItem.updatedAt).toLocaleString('en-GB')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MDJShell>
  );
}
