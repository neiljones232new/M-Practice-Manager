'use client';
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

  const reports = [
    {
      id: 'clients',
      title: 'Client List Report',
      description: 'Comprehensive client list with fee analysis, service breakdown, and activity summary.',
      icon: '👥',
      features: [
        'Client contact and details',
        'Annual fee analysis',
        'Active services and tasks',
        'Last activity tracking',
      ],
    },
    {
      id: 'compliance',
      title: 'Compliance Report',
      description: 'Deadline tracking and compliance overview across all clients.',
      icon: '📊',
      features: [
        'Upcoming filing deadlines',
        'Overdue compliance items',
        'Status breakdown by type',
        'Client-specific compliance insights',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {reports.map((report) => (
        <MDJCard
          key={report.id}
          title={
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.2rem' }}>{report.icon}</span>
              <span className="font-semibold" style={{ color: 'var(--brand-primary)' }}>
                {report.title}
              </span>
            </div>
          }
          className="bg-white border border-[var(--border-light)] rounded-lg shadow-sm"
        >
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            {report.description}
          </p>

          <ul className="text-sm space-y-1 mb-4">
            {report.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span style={{ color: 'var(--brand-primary)' }}>•</span>
                {feature}
              </li>
            ))}
          </ul>

          <div
            className="flex gap-2 pt-3 border-t"
            style={{ borderColor: 'var(--border-light)' }}
          >
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
        </MDJCard>
      ))}

      {/* Quick Exports */}
      <MDJCard
        title="📋 Quick Exports"
        className="bg-white border border-[var(--border-light)] rounded-lg shadow-sm"
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Generate and download key data instantly:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="p-4 border rounded-lg hover:bg-[var(--surface-card-hover)] transition-all"
            style={{ borderColor: 'var(--border-light)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium" style={{ color: 'var(--text-dark)' }}>
                All Clients
              </h4>
              <MDJBadge variant="info" size="sm">
                CSV
              </MDJBadge>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
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

          <div
            className="p-4 border rounded-lg hover:bg-[var(--surface-card-hover)] transition-all"
            style={{ borderColor: 'var(--border-light)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium" style={{ color: 'var(--text-dark)' }}>
                Compliance Status
              </h4>
              <MDJBadge variant="warning" size="sm">
                CSV
              </MDJBadge>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Export all compliance deadlines and status
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
      </MDJCard>
    </div>
  );
}
