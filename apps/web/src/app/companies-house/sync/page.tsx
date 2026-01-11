'use client';

import { useState, useEffect } from 'react';
import { MDJLayout } from '@/components/mdj-ui';
import { apiClient, api } from '@/lib/api';
import type { Client } from '@/lib/types';
export default function CompaniesHouseSyncPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingClients, setSyncingClients] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyClients();
  }, []);

  const loadCompanyClients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allClients = await apiClient.getClients({
        type: 'COMPANY',
      });
      
      // Filter clients that have registered numbers (Companies House companies)
      const companyClients = allClients.filter(client => client.registeredNumber);
      setClients(companyClients);
    } catch (err: any) {
      setError(err.message || 'Failed to load company clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (clientRef: string) => {
    setSyncingClients(prev => new Set(prev).add(clientRef));
    setError(null);
    setSuccessMessage(null);

    try {
      await api.post<{ message?: string }>(`/companies-house/sync/${clientRef}`);
      setSuccessMessage(`Successfully synced data for client ${clientRef}`);
      
      // Reload the client data to show updated information
      await loadCompanyClients();
    } catch (err: any) {
      setError(err.message || `Failed to sync client ${clientRef}`);
    } finally {
      setSyncingClients(prev => {
        const newSet = new Set(prev);
        newSet.delete(clientRef);
        return newSet;
      });
    }
  };

  const handleSyncAll = async () => {
    const companyClients = clients.filter(client => client.registeredNumber);
    
    for (const client of companyClients) {
      if (!client.ref) continue;
      if (!syncingClients.has(client.ref)) {
        await handleSync(client.ref);
        // Add a small delay between syncs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'mdj-badge-success';
      case 'inactive':
        return 'mdj-badge-warning';
      case 'archived':
        return 'mdj-badge-secondary';
      default:
        return 'mdj-badge-secondary';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'COMPANY':
        return 'mdj-badge-primary';
      case 'LLP':
        return 'mdj-badge-info';
      default:
        return 'mdj-badge-secondary';
    }
  };

  if (isLoading) {
    return (
      <MDJLayout>
        <div className="mdj-section">
          <div className="mdj-card">
            <div className="mdj-card-content text-center py-8">
              <div className="mdj-loader"></div>
              <p className="mt-4 text-gray-600">Loading company clients...</p>
            </div>
          </div>
        </div>
      </MDJLayout>
    );
  }

  return (
    <MDJLayout>
      <div className="mdj-section">
        <div className="mdj-section-header">
          <h1 className="mdj-section-title">Companies House Sync</h1>
          <p className="mdj-section-subtitle">
            Monitor and synchronize Companies House data for your company clients
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mdj-alert mdj-alert-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mdj-alert mdj-alert-success">
            <strong>Success:</strong> {successMessage}
          </div>
        )}

        {/* Sync Controls */}
        <div className="mdj-card">
          <div className="mdj-card-header">
            <h2 className="mdj-card-title">Sync Controls</h2>
            <div className="flex gap-2">
              <button
                className="mdj-button mdj-button-primary"
                onClick={handleSyncAll}
                disabled={syncingClients.size > 0}
              >
                {syncingClients.size > 0 ? (
                  <>
                    <div className="mdj-loader mdj-loader-sm"></div>
                    Syncing...
                  </>
                ) : (
                  'Sync All Companies'
                )}
              </button>
              <button
                className="mdj-button mdj-button-secondary"
                onClick={loadCompanyClients}
                disabled={syncingClients.size > 0}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="mdj-card-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
                <div className="text-sm text-gray-600">Total Company Clients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {clients.filter(c => c.status === 'ACTIVE').length}
                </div>
                <div className="text-sm text-gray-600">Active Companies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{syncingClients.size}</div>
                <div className="text-sm text-gray-600">Currently Syncing</div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Clients Table */}
        {clients.length > 0 ? (
          <div className="mdj-card">
            <div className="mdj-card-header">
              <h2 className="mdj-card-title">Company Clients</h2>
              <span className="mdj-badge mdj-badge-secondary">
                {clients.length} companies
              </span>
            </div>
            <div className="mdj-card-content">
              <div className="mdj-table-container">
                <table className="mdj-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Company Number</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.ref ?? '—'}</div>
                        </td>
                        <td className="font-mono">{client.registeredNumber}</td>
                        <td>
                          <span className={`mdj-badge ${getTypeBadgeClass(client.type)}`}>
                            {client.type}
                          </span>
                        </td>
                        <td>
                          <span className={`mdj-badge ${getStatusBadgeClass(client.status)}`}>
                            {client.status}
                          </span>
                        </td>
                        <td>{client.updatedAt ? formatDate(client.updatedAt) : '—'}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="mdj-button mdj-button-secondary mdj-button-sm"
                              onClick={() => client.ref && handleSync(client.ref)}
                              disabled={!client.ref || syncingClients.has(client.ref)}
                            >
                              {client.ref && syncingClients.has(client.ref) ? (
                                <>
                                  <div className="mdj-loader mdj-loader-xs"></div>
                                  Syncing...
                                </>
                              ) : (
                                client.ref ? 'Sync' : 'No ref'
                              )}
                            </button>
                            <a
                              href={`/clients/${client.id}`}
                              className="mdj-button mdj-button-outline mdj-button-sm"
                            >
                              View
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="mdj-card">
            <div className="mdj-card-content text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Company Clients Found
              </h3>
              <p className="text-gray-600 mb-4">
                You don't have any company clients with Companies House registration numbers yet.
              </p>
              <a
                href="/companies-house"
                className="mdj-button mdj-button-primary"
              >
                Import Companies
              </a>
            </div>
          </div>
        )}
      </div>
    </MDJLayout>
  );
}
