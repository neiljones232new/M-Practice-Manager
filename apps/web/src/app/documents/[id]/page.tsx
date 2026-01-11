'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { apiClient, api, API_BASE_URL } from '@/lib/api';

interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  clientId?: string;
  serviceId?: string;
  taskId?: string;
  category: string;
  tags: string[];
  description?: string;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  isArchived: boolean;
  metadata?: any;
}

const DOCUMENT_CATEGORIES = [
  'ACCOUNTS',
  'VAT',
  'PAYROLL',
  'CORRESPONDENCE',
  'CONTRACTS',
  'COMPLIANCE',
  'REPORTS',
  'INVOICES',
  'RECEIPTS',
  'BANK_STATEMENTS',
  'OTHER'
];

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    category: '',
    tags: '',
    description: '',
    clientId: '',
    serviceId: '',
    taskId: ''
  });
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (documentId) {
      loadDocument();
      loadClients();
    }
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const docData = await api.get<Document>(`/documents/${documentId}`);
      setDocument(docData);
      
      // Initialize edit data
      setEditData({
        category: docData.category,
        tags: docData.tags.join(', '),
        description: docData.description || '',
        clientId: docData.clientId || '',
        serviceId: docData.serviceId || '',
        taskId: docData.taskId || ''
      });

      // Load services for the client if clientId exists
      if (docData.clientId) {
        loadServices(docData.clientId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const clientsData = await api.getClients();
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadServices = async (clientId: string) => {
    try {
      const servicesData = await api.get<any[]>(`/services/client/${clientId}`);
      setServices(servicesData);
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  const handleSave = async () => {
    if (!document) return;

    try {
      const updateData = {
        category: editData.category,
        tags: editData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        description: editData.description,
        clientId: editData.clientId || undefined,
        serviceId: editData.serviceId || undefined,
        taskId: editData.taskId || undefined
      };

      const res = await api.put<{ data: Document }>(`/documents/${document.id}`, updateData);
      const updatedDoc = (res as any)?.data ?? res;
      setDocument(updatedDoc as Document);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.originalName;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleArchive = async () => {
    if (!document) return;

    try {
      if (document.isArchived) {
        await api.post(`/documents/${document.id}/unarchive`);
      } else {
        await api.post(`/documents/${document.id}/archive`);
      }
      await loadDocument();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive operation failed');
    }
  };

  const handleDelete = async () => {
    if (!document || !confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/documents/${document.id}`);
      router.push('/documents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.kind : 'Unknown Service';
  };

  if (loading) {
    return (
      <MDJShell pageTitle="Document" pageSubtitle="Loading" showBack backHref="/documents" backLabel="Back to Documents" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documents', href: '/documents' }, { label: 'Document' }]}>
        <div className="card-mdj">Loading…</div>
      </MDJShell>
    );
  }

  if (!document) {
    return (
      <MDJShell pageTitle="Document Not Found" pageSubtitle="" showBack backHref="/documents" backLabel="Back to Documents" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documents', href: '/documents' }, { label: 'Not Found' }]}>
        <div className="card-mdj">Document not found</div>
      </MDJShell>
    );
  }

  return (
    <MDJShell pageTitle="Document Details" pageSubtitle={document.originalName} showBack backHref="/documents" backLabel="Back to Documents" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documents', href: '/documents' }, { label: 'Details' }]}>
      <div className="page-content space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={() => router.push('/documents')}
                className="text-gray-400 hover:text-white"
              >
                ← Back to Documents
              </button>
            </div>
            <h1 className="text-2xl font-bold text-white">{document.originalName}</h1>
            <p className="text-gray-400 mt-1">
              {formatFileSize(document.size)} • {document.mimeType} • Uploaded {formatDate(document.uploadedAt)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.open(`/api/documents/${document.id}/preview`, '_blank')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-500 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={handleDownload}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 transition-colors"
            >
              Download
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-medium hover:bg-yellow-300 transition-colors"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {document.isArchived && (
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg">
            This document is archived
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Preview */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
              <div className="bg-gray-700 rounded-lg p-8 text-center">
                {document.mimeType.startsWith('image/') ? (
                  <img
                    src={`/api/documents/${document.id}/preview`}
                    alt={document.originalName}
                    className="max-w-full max-h-96 mx-auto rounded"
                  />
                ) : document.mimeType === 'application/pdf' ? (
                  <div>
                    <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold">PDF</span>
                    </div>
                    <p className="text-gray-300">PDF Document</p>
                    <button
                      onClick={() => window.open(`/api/documents/${document.id}/preview`, '_blank')}
                      className="mt-2 text-yellow-400 hover:text-yellow-300"
                    >
                      Open in new tab
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold">DOC</span>
                    </div>
                    <p className="text-gray-300">Document file</p>
                    <p className="text-sm text-gray-400 mt-1">Preview not available for this file type</p>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            {document.metadata && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">File Metadata</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(document.metadata).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </dt>
                      <dd className="text-sm text-white mt-1">
                        {value ? value.toString() : '-'}
                      </dd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Document Details</h2>
              
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={editData.category}
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      {DOCUMENT_CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
                    <select
                      value={editData.clientId}
                      onChange={(e) => {
                        setEditData({ ...editData, clientId: e.target.value, serviceId: '' });
                        if (e.target.value) {
                          loadServices(e.target.value);
                        } else {
                          setServices([]);
                        }
                      }}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value="">No Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  {editData.clientId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Service</label>
                      <select
                        value={editData.serviceId}
                        onChange={(e) => setEditData({ ...editData, serviceId: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="">No Service</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>{service.kind}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                    <input
                      type="text"
                      value={editData.tags}
                      onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                      placeholder="tag1, tag2, tag3"
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 bg-yellow-400 text-black px-4 py-2 rounded-lg font-medium hover:bg-yellow-300 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-400">Category</dt>
                    <dd className="text-sm text-white mt-1">
                      <span className="inline-block bg-gray-600 text-xs text-gray-300 px-2 py-1 rounded">
                        {document.category}
                      </span>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-400">Client</dt>
                    <dd className="text-sm text-white mt-1">
                      {document.clientId ? getClientName(document.clientId) : 'No client assigned'}
                    </dd>
                  </div>

                  {document.serviceId && (
                    <div>
                      <dt className="text-sm font-medium text-gray-400">Service</dt>
                      <dd className="text-sm text-white mt-1">
                        {getServiceName(document.serviceId)}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-gray-400">Tags</dt>
                    <dd className="text-sm text-white mt-1">
                      {document.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {document.tags.map(tag => (
                            <span key={tag} className="inline-block bg-gray-600 text-xs text-gray-300 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        'No tags'
                      )}
                    </dd>
                  </div>

                  {document.description && (
                    <div>
                      <dt className="text-sm font-medium text-gray-400">Description</dt>
                      <dd className="text-sm text-white mt-1">{document.description}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-gray-400">Uploaded by</dt>
                    <dd className="text-sm text-white mt-1">{document.uploadedBy}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-400">Last updated</dt>
                    <dd className="text-sm text-white mt-1">{formatDate(document.updatedAt)}</dd>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={handleArchive}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
                >
                  {document.isArchived ? 'Unarchive' : 'Archive'}
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-500 transition-colors"
                >
                  Delete Document
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </MDJShell>
  );
}
