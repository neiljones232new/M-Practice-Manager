'use client';

import { useState, useEffect } from 'react';
import MDJLayout from '@/components/mdj-ui/MDJLayout';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { MDJSection, MDJCard, MDJButton, MDJInput, MDJSelect, MDJTextarea } from '@/components/mdj-ui';
import { api, API_BASE_URL } from '@/lib/api';

interface ReportOptions {
  includeCompaniesHouseData: boolean;
  includeServices: boolean;
  includeParties: boolean;
  includeDocuments: boolean;
  customSections: string[];
}

export default function ReportsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    includeCompaniesHouseData: true,
    includeServices: true,
    includeParties: true,
    includeDocuments: true,
    customSections: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await api.getClients();
      setClients(clientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    }
  };

  const handlePreview = async () => {
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeCompaniesHouseData: String(reportOptions.includeCompaniesHouseData),
        includeServices: String(reportOptions.includeServices),
        includeParties: String(reportOptions.includeParties),
        includeDocuments: String(reportOptions.includeDocuments),
        customSections: reportOptions.customSections.join(','),
      }).toString();
      const url = `${API_BASE_URL}/documents/reports/client/${selectedClient}/preview?${params}`;
      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/documents/reports/client/${selectedClient}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(reportOptions),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client-report-${selectedClient}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };



  return (
    <MDJLayout title="Client Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-dim">Generate comprehensive PDF reports for clients</p>
          <ExportMenu onPDF={() => window.print()} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Report Configuration */}
          <div className="card-mdj">
            <h2 className="text-gold">Report Configuration</h2>
            
            <div style={{ marginTop: '1rem' }}>
              {/* Client Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Select Client</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="input-dark"
                  style={{ width: '100%' }}
                >
                  <option value="">Choose a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name} ({client.ref})</option>
                  ))}
                </select>
              </div>

              {/* Report Sections */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Include Sections</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={reportOptions.includeServices}
                      onChange={(e) => setReportOptions({
                        ...reportOptions,
                        includeServices: e.target.checked
                      })}
                      style={{ marginRight: '0.5rem', accentColor: 'var(--gold)' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>Services & Fees</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={reportOptions.includeParties}
                      onChange={(e) => setReportOptions({
                        ...reportOptions,
                        includeParties: e.target.checked
                      })}
                      style={{ marginRight: '0.5rem', accentColor: 'var(--gold)' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>Associated Parties</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={reportOptions.includeCompaniesHouseData}
                      onChange={(e) => setReportOptions({
                        ...reportOptions,
                        includeCompaniesHouseData: e.target.checked
                      })}
                      style={{ marginRight: '0.5rem', accentColor: 'var(--gold)' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>Companies House Data</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={reportOptions.includeDocuments}
                      onChange={(e) => setReportOptions({
                        ...reportOptions,
                        includeDocuments: e.target.checked
                      })}
                      style={{ marginRight: '0.5rem', accentColor: 'var(--gold)' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>Document List</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
                <button
                  onClick={handlePreview}
                  disabled={!selectedClient || loading}
                  className="btn-outline-gold"
                  style={{ flex: 1 }}
                >
                  {loading ? 'Generating...' : 'Preview'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!selectedClient || loading}
                  className="btn-gold"
                  style={{ flex: 1 }}
                >
                  {loading ? 'Generating...' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>

          {/* Report Preview */}
          <div className="card-mdj">
            <h2 className="text-gold">Report Preview</h2>
            
            <div style={{ marginTop: '1rem' }}>
              {previewUrl ? (
                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                  <div style={{ aspectRatio: '3/4', background: 'white', borderRadius: 'var(--radius)' }}>
                    <iframe
                      src={previewUrl}
                      style={{ width: '100%', height: '100%', borderRadius: 'var(--radius)', border: 'none' }}
                      title="Report Preview"
                    />
                  </div>
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => window.open(previewUrl, '_blank')}
                      style={{ color: 'var(--gold)', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Open in new tab
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--dim)', marginBottom: '1rem' }}>
                    <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p style={{ color: 'var(--dim)' }}>Select a client and click Preview to see the report</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Information */}
        <div className="card-mdj">
          <h2 className="text-gold">Report Information</h2>
          <div className="grid md:grid-cols-2 gap-6" style={{ marginTop: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.5rem' }}>What's Included</h3>
              <ul style={{ fontSize: '14px', color: 'var(--dim)', lineHeight: '1.6' }}>
                <li>• Client basic information and contact details</li>
                <li>• Associated parties with roles and ownership</li>
                <li>• Service subscriptions and fee analysis</li>
                <li>• Companies House data and filing history</li>
                <li>• Document library summary</li>
                <li>• Professional branding and formatting</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Report Features</h3>
              <ul style={{ fontSize: '14px', color: 'var(--dim)', lineHeight: '1.6' }}>
                <li>• PDF format for easy sharing</li>
                <li>• Professional M branding</li>
                <li>• Comprehensive data tables</li>
                <li>• Automatic date stamping</li>
                <li>• Customizable sections</li>
                <li>• Print-ready formatting</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-mdj">
          <h2 className="text-gold">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4" style={{ marginTop: '1rem' }}>
            <button
              onClick={() => {
                setReportOptions({
                  includeCompaniesHouseData: true,
                  includeServices: true,
                  includeParties: true,
                  includeDocuments: false,
                  customSections: []
                });
              }}
              style={{ 
                background: 'var(--surface)', 
                color: 'var(--text-light)', 
                padding: '1rem', 
                borderRadius: 'var(--radius)', 
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--gold)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--border-light)';
              }}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Standard Report</h3>
              <p style={{ fontSize: '14px', color: 'var(--dim)' }}>Basic client info, services, and parties</p>
            </button>
            
            <button
              onClick={() => {
                setReportOptions({
                  includeCompaniesHouseData: true,
                  includeServices: false,
                  includeParties: true,
                  includeDocuments: false,
                  customSections: []
                });
              }}
              style={{ 
                background: 'var(--surface)', 
                color: 'var(--text-light)', 
                padding: '1rem', 
                borderRadius: 'var(--radius)', 
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--gold)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--border-light)';
              }}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Compliance Report</h3>
              <p style={{ fontSize: '14px', color: 'var(--dim)' }}>Focus on Companies House data and filings</p>
            </button>
            
            <button
              onClick={() => {
                setReportOptions({
                  includeCompaniesHouseData: false,
                  includeServices: true,
                  includeParties: false,
                  includeDocuments: true,
                  customSections: []
                });
              }}
              style={{ 
                background: 'var(--surface)', 
                color: 'var(--text-light)', 
                padding: '1rem', 
                borderRadius: 'var(--radius)', 
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--gold)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--border-light)';
              }}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Service Report</h3>
              <p style={{ fontSize: '14px', color: 'var(--dim)' }}>Services, fees, and document summary</p>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ 
            position: 'fixed', 
            bottom: '1rem', 
            right: '1rem', 
            background: 'var(--danger)', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'rgba(255,255,255,0.8)', 
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </MDJLayout>
  );
}
