'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api, API_BASE_URL } from '@/lib/api';

type Client = any;

export default function ClientReportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load client data for the shell
        const c = await api.get<Client>(`/clients/${id}/with-parties`);
        if (!on) return;
        setClient(c);

        // Load the HTML report using the api client
        const html = await api.get<string>(`/documents/reports/client/${id}/html?includeServices=true&includeParties=true&includeCompaniesHouseData=true&includeDocuments=true`);
        
        if (!on) return;
        setHtmlContent(html);
      } catch (e: any) {
        if (on) {
          setError(e?.message || 'Failed to load report');
        }
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [id]);

  const openHtmlInNewTab = (autoPrint = false) => {
    if (!htmlContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(htmlContent);
    win.document.close();
    if (autoPrint) {
      const triggerPrint = () => {
        win.focus();
        win.print();
      };
      // Give the browser a moment to render
      win.addEventListener('load', triggerPrint, { once: true });
      setTimeout(triggerPrint, 300);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      const response = await fetch(`${API_BASE_URL}/documents/reports/client/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          includeCompaniesHouseData: true,
          includeServices: true,
          includeParties: true,
          includeDocuments: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client-report-${client?.registeredNumber || client?.id || id}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      return;
    }
    openHtmlInNewTab(true);
  };

  if (loading) {
    return (
      <MDJShell 
        pageTitle="Client Report" 
        pageSubtitle="Loading report..."
        showBack 
        backHref={`/clients/${id}`} 
        backLabel="Back to Client"
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ color: '#999' }}>Loading report...</div>
        </div>
      </MDJShell>
    );
  }

  if (error) {
    return (
      <MDJShell 
        pageTitle="Client Report" 
        pageSubtitle="Error loading report"
        showBack 
        backHref={`/clients/${id}`} 
        backLabel="Back to Client"
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>
          <button className="btn-mdj btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </MDJShell>
    );
  }

  return (
    <MDJShell 
      pageTitle={client?.name || 'Client Report'} 
      pageSubtitle={client?.registeredNumber || client?.id || ''}
      showBack 
      backHref={`/clients/${id}`} 
      backLabel="Back to Client"
      actions={[
        <button key="print" className="btn-mdj btn-secondary" onClick={handlePrint} title="Print report">
          <span>🖨️</span> Print
        </button>,
        <button key="preview" className="btn-mdj btn-secondary" onClick={() => openHtmlInNewTab(false)} title="Open in new tab">
          <span>🔗</span> Open in New Tab
        </button>,
        <button key="pdf" className="btn-mdj btn-primary" onClick={handleDownloadPDF} title="Download PDF report">
          <span>📥</span> Download PDF
        </button>,
      ]}
    >
      <style jsx global>{`
        .report-container {
          margin: -1.5rem;
        }
        .report-container iframe {
          width: 100%;
          min-height: calc(100vh - 200px);
          border: none;
          background: #fff;
        }
        @media print {
          .mdj-topbar, .mdj-sidebar-fixed, .mdj-assist-fab, .mdj-pagehead { 
            display: none !important; 
          }
          .report-container {
            margin: 0;
          }
          .report-container iframe {
            min-height: auto;
          }
        }
      `}</style>
      
      <div className="report-container">
        <div className="card-mdj" style={{ margin: '0 1.5rem 1rem', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-mdj btn-secondary" onClick={handlePrint}>
            🖨️ Print Report
          </button>
          <button className="btn-mdj btn-secondary" onClick={() => openHtmlInNewTab(false)}>
            🔗 Open in New Tab
          </button>
          <button className="btn-mdj btn-primary" onClick={handleDownloadPDF}>
            📥 Download PDF
          </button>
        </div>
        {htmlContent ? (
          <iframe 
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Client Report"
            sandbox="allow-same-origin allow-modals"
          />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ color: '#999' }}>No report content available</div>
          </div>
        )}
      </div>
    </MDJShell>
  );
}
