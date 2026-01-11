import React, { useState } from 'react';
import { MDJCard, MDJButton, MDJBadge } from './index';

interface MDJReportsPanelProps {
  onGenerateReport?: (reportType: string, format: 'json' | 'csv') => Promise<void>;
  loading?: boolean;
}

export function MDJReportsPanel({ onGenerateReport, loading = false }: MDJReportsPanelProps) {
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const handleGenerateReport = async (reportType: string, format: 'json' | 'csv') => {
    if (!onGenerateReport) {
      console.log(`Would generate ${reportType} report in ${format} format`);
      return;
    }
    
    try {
      setGeneratingReport(`${reportType}-${format}`);
      await onGenerateReport(reportType, format);
    } finally {
      setGeneratingReport(null);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reports = [
    {
      id: 'clients',
      title: 'Client List Report',
      description: 'Comprehensive client list with fee analysis, service breakdown, and activity summary',
      icon: '👥',
      features: [
        'Client details and contact information',
        'Annual fee analysis per client',
        'Active services and task status',
        'Last activity tracking'
      ]
    },
    {
      id: 'compliance',
      title: 'Compliance Report',
      description: 'Deadline tracking and compliance status across all clients',
      icon: '📊',
      features: [
        'Upcoming filing deadlines',
        'Overdue compliance items',
        'Status breakdown by type',
        'Client-specific compliance view'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {reports.map((report) => (
        <MDJCard key={report.id} title={`${report.icon} ${report.title}`}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--dim-light)' }}>{report.description}</p>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium" style={{ color: 'var(--text-light)' }}>Features:</h4>
              <ul className="text-xs space-y-1" style={{ color: 'var(--dim-light)' }}>
                {report.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span style={{ color: 'var(--brand-primary)' }}>•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
              <MDJButton
                size="sm"
                variant="outline"
                onClick={() => handleGenerateReport(report.id, 'json')}
                disabled={loading || generatingReport !== null}
                loading={generatingReport === `${report.id}-json`}
              >
                View Report
              </MDJButton>
              
              <MDJButton
                size="sm"
                variant="primary"
                onClick={() => handleGenerateReport(report.id, 'csv')}
                disabled={loading || generatingReport !== null}
                loading={generatingReport === `${report.id}-csv`}
              >
                Export CSV
              </MDJButton>
            </div>
          </div>
        </MDJCard>
      ))}

      {/* Quick Export Options */}
      <MDJCard title="📋 Quick Exports">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--dim-light)' }}>
            Generate and download reports instantly
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded border" style={{ borderColor: 'var(--border-light)' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium" style={{ color: 'var(--text-light)' }}>All Clients</h4>
                <MDJBadge variant="info" size="sm">CSV</MDJBadge>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--dim-light)' }}>
                Complete client database export
              </p>
              <MDJButton
                size="sm"
                variant="ghost"
                fullWidth
                onClick={() => handleGenerateReport('clients', 'csv')}
                disabled={loading || generatingReport !== null}
                loading={generatingReport === 'clients-csv'}
              >
                Download
              </MDJButton>
            </div>

            <div className="p-3 rounded border" style={{ borderColor: 'var(--border-light)' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium" style={{ color: 'var(--text-light)' }}>Compliance Status</h4>
                <MDJBadge variant="warning" size="sm">CSV</MDJBadge>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--dim-light)' }}>
                All compliance items and deadlines
              </p>
              <MDJButton
                size="sm"
                variant="ghost"
                fullWidth
                onClick={() => handleGenerateReport('compliance', 'csv')}
                disabled={loading || generatingReport !== null}
                loading={generatingReport === 'compliance-csv'}
              >
                Download
              </MDJButton>
            </div>
          </div>
        </div>
      </MDJCard>
    </div>
  );
}
