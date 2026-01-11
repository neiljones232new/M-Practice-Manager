'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api, API_BASE_URL } from '@/lib/api';

// TypeScript interfaces
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

interface ComplianceSummary {
  total: number;
  pending: number;
  overdue: number;
  upcoming: number;
  filed: number;
}

interface FilingHistoryItem {
  date: string;
  type: string;
  description: string;
}

interface Document {
  id: string;
  filename: string;
  originalName?: string;
  mimeType?: string;
  category?: string;
  uploadedAt?: string;
}

type Client = {
  id: string;
  ref?: string;
  name: string;
  registeredNumber?: string;
  accountsNextDue?: string;
  confirmationNextDue?: string;
};

// Helper function to format dates
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-GB');
  } catch {
    return '-';
  }
};

// Helper function to determine status badge class
const getStatusBadgeClass = (item: ComplianceItem): string => {
  if (item.status === 'OVERDUE') {
    return 'mdj-badge-danger';
  }
  if (item.status === 'FILED') {
    return 'mdj-badge-success';
  }
  if (item.status === 'EXEMPT') {
    return 'mdj-badge-muted';
  }
  // PENDING status - check if due within 30 days
  if (item.status === 'PENDING' && item.dueDate) {
    const now = new Date();
    const dueDate = new Date(item.dueDate);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    if (dueDate <= thirtyDaysFromNow) {
      return 'mdj-badge-warn';
    }
  }
  // PENDING but not urgent
  return 'mdj-badge-muted';
};

// Helper function to check if item is overdue
const isOverdue = (item: ComplianceItem): boolean => {
  if (item.status === 'OVERDUE') {
    return true;
  }
  if (item.status === 'PENDING' && item.dueDate) {
    return new Date(item.dueDate) < new Date();
  }
  return false;
};

// Function to calculate summary statistics from compliance items
const calculateSummary = (items: ComplianceItem[]): ComplianceSummary => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Filter out exempt items from all counts
  const activeItems = items.filter(i => i.status !== 'EXEMPT');
  
  return {
    total: activeItems.length,
    pending: activeItems.filter(i => i.status === 'PENDING').length,
    overdue: activeItems.filter(i => 
      i.dueDate && new Date(i.dueDate) < now && i.status === 'PENDING'
    ).length,
    upcoming: activeItems.filter(i => 
      i.dueDate && 
      new Date(i.dueDate) >= now && 
      new Date(i.dueDate) <= thirtyDaysFromNow &&
      i.status === 'PENDING'
    ).length,
    filed: activeItems.filter(i => i.status === 'FILED').length,
  };
};

export default function ClientCompliancePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<React.ReactNode | null>(null);
  const [itemTasks, setItemTasks] = useState<Record<string, any[]>>({});
  const [summary, setSummary] = useState<ComplianceSummary>({
    total: 0,
    pending: 0,
    overdue: 0,
    upcoming: 0,
    filed: 0,
  });
  const [filingHistory, setFilingHistory] = useState<FilingHistoryItem[]>([]);
  const [filingHistoryLoading, setFilingHistoryLoading] = useState(false);
  const [filingHistoryError, setFilingHistoryError] = useState<string | null>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [showExempt, setShowExempt] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState<string>('OTHER');
  const [docDescription, setDocDescription] = useState<string>('');
  const [docUploading, setDocUploading] = useState(false);
  const [docMsg, setDocMsg] = useState<string | null>(null);
  const [docDeleting, setDocDeleting] = useState<Record<string, boolean>>({});

  // Retry function for loading client data
  const retryLoadClient = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const clientData = await api.get<Client>(`/clients/${clientId}`);
      setClient(clientData);
    } catch (e: any) {
      // Handle 404 specifically
      if (e?.response?.status === 404 || e?.message?.includes('404') || e?.message?.includes('not found')) {
        setError('Client not found. The client may have been deleted or you may not have permission to view it.');
      } else if (e?.message?.includes('Network') || e?.message?.includes('fetch') || e?.code === 'ECONNREFUSED') {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(e?.message || 'An unexpected error occurred while loading client data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    
    let mounted = true;
    
    (async () => {
      if (mounted) {
        await retryLoadClient();
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, [clientId]);

  // Load compliance items with retry capability
  const loadComplianceItems = async () => {
    if (!clientId) return;
    
    try {
      setComplianceLoading(true);
      setComplianceError(null);
      
      const items = await api.get<ComplianceItem[]>(`/compliance?clientId=${clientId}`);
      
      // If no compliance items exist and client has Companies House data, generate them
      if (items.length === 0 && client?.registeredNumber) {
        await generateComplianceItems();
        // Reload after generation
        const newItems = await api.get<ComplianceItem[]>(`/compliance?clientId=${clientId}`);
        const sortedNewItems = [...newItems].sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        setComplianceItems(sortedNewItems);
        const summaryStats = calculateSummary(sortedNewItems);
        setSummary(summaryStats);
        
        // Load tasks for new items
        const tasksMap: Record<string, any[]> = {};
        for (const item of sortedNewItems) {
          try {
            const tasks = await api.get<any[]>(`/compliance/${item.id}/tasks`);
            tasksMap[item.id] = tasks;
          } catch (e) {
            tasksMap[item.id] = [];
          }
        }
        setItemTasks(tasksMap);
        return;
      }
      
      // Sort by due date (earliest first)
      const sortedItems = [...items].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      setComplianceItems(sortedItems);
      
      // Calculate and update summary statistics
      const summaryStats = calculateSummary(sortedItems);
      setSummary(summaryStats);
      
      // Load tasks for each compliance item
      const tasksMap: Record<string, any[]> = {};
      for (const item of sortedItems) {
        try {
          const tasks = await api.get<any[]>(`/compliance/${item.id}/tasks`);
          tasksMap[item.id] = tasks;
        } catch (e) {
          // If error loading tasks, assume no tasks exist
          tasksMap[item.id] = [];
        }
      }
      setItemTasks(tasksMap);
    } catch (e: any) {
      console.error('Failed to load compliance items:', e);
      if (e?.message?.includes('Network') || e?.message?.includes('fetch') || e?.code === 'ECONNREFUSED') {
        setComplianceError('Unable to connect to the server. Please check your connection and try again.');
      } else {
        setComplianceError(e?.message || 'Failed to load compliance items. Please try again.');
      }
    } finally {
      setComplianceLoading(false);
    }
  };

  // Generate compliance items from client data
  const generateComplianceItems = async () => {
    if (!client || !clientId) return;
    
    try {
      // Create accounts compliance item if due date exists
      if (client.accountsNextDue) {
        await api.post('/compliance', {
          clientId,
          type: 'ANNUAL_ACCOUNTS',
          description: `Annual Accounts`,
          dueDate: client.accountsNextDue,
          status: new Date(client.accountsNextDue) < new Date() ? 'OVERDUE' : 'PENDING',
          source: 'COMPANIES_HOUSE',
          reference: client.registeredNumber,
        });
      }
      
      // Create confirmation statement compliance item if due date exists
      if (client.confirmationNextDue) {
        await api.post('/compliance', {
          clientId,
          type: 'CONFIRMATION_STATEMENT',
          description: `Confirmation Statement`,
          dueDate: client.confirmationNextDue,
          status: new Date(client.confirmationNextDue) < new Date() ? 'OVERDUE' : 'PENDING',
          source: 'COMPANIES_HOUSE',
          reference: client.registeredNumber,
        });
      }
    } catch (e: any) {
      console.error('Failed to generate compliance items:', e);
    }
  };

  // Load Companies House filing history with retry capability
  const loadFilingHistory = async () => {
    if (!client?.registeredNumber) {
      // No company number, don't fetch filing history
      return;
    }
    
    try {
      setFilingHistoryLoading(true);
      setFilingHistoryError(null);
      
      const history = await api.get<FilingHistoryItem[]>(
        `/companies-house/company/${client.registeredNumber}/filing-history`
      );
      
      // Ensure history is an array before slicing
      const historyArray = Array.isArray(history) ? history : [];
      
      // Display most recent 20 filings only
      const recentFilings = historyArray.slice(0, 20);
      setFilingHistory(recentFilings);
    } catch (e: any) {
      console.error('Failed to load filing history:', e);
      if (e?.message?.includes('Network') || e?.message?.includes('fetch') || e?.code === 'ECONNREFUSED') {
        setFilingHistoryError('Unable to connect to Companies House API. Please check your connection and try again.');
      } else if (e?.response?.status === 404) {
        setFilingHistoryError('No filing history found for this company number.');
      } else {
        setFilingHistoryError(e?.message || 'Failed to load filing history. Please try again.');
      }
    } finally {
      setFilingHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId || !client) return;
    
    let mounted = true;
    
    (async () => {
      if (mounted) {
        await loadComplianceItems();
        await loadFilingHistory();
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, [clientId, client]);

  const loadDocuments = async () => {
    if (!clientId) return;
    setDocsLoading(true);
    setDocMsg(null);
    try {
      const res = await api.get(`/documents/client/${clientId}`).catch(() => null);
      const docs = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
      setDocuments(docs);
    } catch (e: any) {
      setDocMsg(e?.message || 'Failed to load documents.');
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    loadDocuments();
  }, [clientId]);

  const handleUploadDocument = async () => {
    if (!clientId) return;
    if (!docFile) {
      setDocMsg('Select a file to upload.');
      return;
    }
    setDocUploading(true);
    setDocMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('clientId', clientId);
      formData.append('category', docCategory);
      if (docDescription) formData.append('description', docDescription);

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Upload failed');
      }

      setDocFile(null);
      setDocDescription('');
      await loadDocuments();
      setDocMsg('Document uploaded.');
    } catch (e: any) {
      setDocMsg(e?.message || 'Failed to upload document.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDocumentDownload = async (doc: Document, preview = false) => {
    try {
      const buffer = await api.get<ArrayBuffer>(`/documents/${doc.id}/${preview ? 'preview' : 'download'}`);
      const blob = new Blob([buffer], { type: doc.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      if (preview) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.originalName || doc.filename || `document-${doc.id}`;
        a.click();
      }
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setDocMsg(e?.message || 'Failed to download document.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const ok = window.confirm('Delete this document?');
    if (!ok) return;
    setDocDeleting((prev) => ({ ...prev, [docId]: true }));
    setDocMsg(null);
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (e: any) {
      setDocMsg(e?.message || 'Failed to delete document.');
    } finally {
      setDocDeleting((prev) => ({ ...prev, [docId]: false }));
    }
  };

  // Handle marking compliance item as filed with inline error handling
  const handleMarkFiled = async (id: string, description: string) => {
    try {
      setUpdatingItemId(id);
      setError(null);
      setSuccessMessage(null);
      setItemErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
      
      await api.put(`/compliance/${id}/filed`, {
        filedDate: new Date().toISOString(),
      });
      
      // Refresh compliance items list
      await loadComplianceItems();
      
      // Display success message
      setSuccessMessage(`Successfully marked "${description}" as filed`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (e: any) {
      console.error('Failed to mark item as filed:', e);
      
      // Set inline error for this specific item
      let errorMessage = 'Failed to mark as filed. ';
      if (e?.message?.includes('Network') || e?.message?.includes('fetch') || e?.code === 'ECONNREFUSED') {
        errorMessage += 'Connection error. Please check your internet and try again.';
      } else if (e?.response?.status === 404) {
        errorMessage += 'Item not found. It may have been deleted.';
      } else if (e?.response?.status === 403) {
        errorMessage += 'You do not have permission to update this item.';
      } else {
        errorMessage += e?.message || 'Please try again.';
      }
      
      setItemErrors((prev) => ({ ...prev, [id]: errorMessage }));
      
      // Clear inline error after 8 seconds
      setTimeout(() => {
        setItemErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      }, 8000);
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Handle marking compliance item as exempt (ignore/not needed)
  const handleMarkExempt = async (id: string, description: string) => {
    try {
      setUpdatingItemId(id);
      setError(null);
      setSuccessMessage(null);
      setItemErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
      
      await api.put(`/compliance/${id}`, {
        status: 'EXEMPT',
      });
      
      // Refresh compliance items list
      await loadComplianceItems();
      
      // Display success message
      setSuccessMessage(`Successfully marked "${description}" as exempt (not needed)`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (e: any) {
      console.error('Failed to mark item as exempt:', e);
      
      // Set inline error for this specific item
      let errorMessage = 'Failed to mark as exempt. ';
      if (e?.message?.includes('Network') || e?.message?.includes('fetch') || e?.code === 'ECONNREFUSED') {
        errorMessage += 'Connection error. Please check your internet and try again.';
      } else if (e?.response?.status === 404) {
        errorMessage += 'Item not found. It may have been deleted.';
      } else if (e?.response?.status === 403) {
        errorMessage += 'You do not have permission to update this item.';
      } else {
        errorMessage += e?.message || 'Please try again.';
      }
      
      setItemErrors((prev) => ({ ...prev, [id]: errorMessage }));
      
      // Clear inline error after 8 seconds
      setTimeout(() => {
        setItemErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      }, 8000);
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Handle creating task from compliance item with inline error handling
  const handleCreateTask = async (id: string, description: string) => {
    try {
      setCreatingTaskId(id);
      setError(null);
      setSuccessMessage(null);
      setItemErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
      
      const result = await api.post<{ taskId: string }>(`/compliance/${id}/create-task`, {});
      
      // Refresh compliance items to update button state
      await loadComplianceItems();
      
      // Display success message with link to new task
      setSuccessMessage(
        <>
          Task created successfully for "{description}".{' '}
          <a 
            href={`/tasks/${result.taskId}`}
            style={{ 
              color: 'var(--gold)', 
              textDecoration: 'underline',
              fontWeight: 600
            }}
            onClick={(e) => {
              e.preventDefault();
              router.push(`/tasks/${result.taskId}`);
            }}
          >
            View Task
          </a>
        </>
      );
      
      // Clear success message after 10 seconds (longer for task creation)
      setTimeout(() => {
        setSuccessMessage(null);
      }, 10000);
    } catch (e: any) {
      console.error('Failed to create task:', e);
      
      // Set inline error for this specific item
      let errorMessage = 'Failed to create task. ';
      if (e?.message?.includes('Network') || e?.message?.includes('fetch') || e?.code === 'ECONNREFUSED') {
        errorMessage += 'Connection error. Please check your internet and try again.';
      } else if (e?.response?.status === 404) {
        errorMessage += 'Compliance item not found.';
      } else if (e?.response?.status === 403) {
        errorMessage += 'You do not have permission to create tasks.';
      } else if (e?.message?.includes('already exists')) {
        errorMessage += 'A task already exists for this item.';
      } else {
        errorMessage += e?.message || 'Please try again.';
      }
      
      setItemErrors((prev) => ({ ...prev, [id]: errorMessage }));
      
      // Clear inline error after 8 seconds
      setTimeout(() => {
        setItemErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      }, 8000);
    } finally {
      setCreatingTaskId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <MDJShell
        pageTitle="Compliance & Filings"
        pageSubtitle="Loading compliance information"
        showBack
        backHref={`/clients/${clientId}`}
        backLabel="Back to Client"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
          { label: 'Client', href: `/clients/${clientId}` },
          { label: 'Compliance & Filings' },
        ]}
      >
        <hr className="mdj-gold-rule" />
        <div className="card-mdj" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '2rem',
              height: '2rem',
              border: '2px solid var(--border)',
              borderTopColor: 'var(--gold)',
              borderRadius: '50%',
              margin: '0 auto .75rem',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        </div>
      </MDJShell>
    );
  }

  // Error state
  if (error || !client) {
    const isNotFound = error?.includes('not found') || !client;
    const isConnectionError = error?.includes('connect') || error?.includes('Network');
    
    return (
      <MDJShell
        pageTitle="Compliance & Filings"
        pageSubtitle="Client compliance information"
        showBack
        backHref="/clients"
        backLabel="Back to Clients"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
          { label: 'Compliance & Filings' },
        ]}
      >
        <hr className="mdj-gold-rule" />
        <div className="card-mdj" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '1rem' }}>
            {isNotFound ? '⚠️ Client Not Found' : '⚠️ Error Loading Client'}
          </div>
          <div style={{ color: 'var(--text)', marginBottom: '1rem' }}>
            {error || 'The requested client could not be found. It may have been deleted or you may not have permission to view it.'}
          </div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            {isConnectionError && !isNotFound && (
              <button 
                className="btn-gold" 
                onClick={() => retryLoadClient()}
                aria-label="Retry loading client"
              >
                Retry
              </button>
            )}
            <button 
              className="btn-outline-gold" 
              onClick={() => router.push('/clients')}
              aria-label="Return to clients list"
            >
              Back to Clients
            </button>
          </div>
        </div>
      </MDJShell>
    );
  }

  // Main page content
  return (
    <MDJShell
      pageTitle={`${client.name} - Compliance & Filings`}
      pageSubtitle="Manage compliance items, filings, and deadlines"
      showBack
      backHref={`/clients/${clientId}`}
      backLabel="Back to Client"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Clients', href: '/clients' },
        { label: client.name, href: `/clients/${clientId}` },
        { label: 'Compliance & Filings' },
      ]}
      actions={[
        { label: '← Back', onClick: () => router.push(`/clients/${clientId}`), variant: 'outline' },
      ]}
    >
      <hr className="mdj-gold-rule" />
      
      {/* Success Message - with aria-live for screen readers */}
      {successMessage && (
        <div 
          className="card-mdj" 
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            background: 'rgba(34, 197, 94, 0.1)', 
            borderColor: 'var(--success)',
            borderLeft: '4px solid var(--success)'
          }}
        >
          <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ {successMessage}</span>
        </div>
      )}
      
      {/* Error Message - with aria-live for screen readers */}
      {error && !loading && (
        <div 
          className="card-mdj" 
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            background: 'rgba(220, 38, 38, 0.1)', 
            borderColor: 'var(--danger)',
            borderLeft: '4px solid var(--danger)'
          }}
        >
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>✕ {error}</span>
        </div>
      )}
      
      {/* Summary Statistics Cards */}
      <div 
        role="region"
        aria-label="Compliance summary statistics"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          width: '100%'
        }}
      >
        {/* Total Card */}
        <div className="card-mdj" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.5rem', fontWeight: 600 }}>
            Total
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }} aria-label={`${summary.total} total compliance items`}>
            {summary.total}
          </div>
        </div>
        
        {/* Pending Card */}
        <div className="card-mdj" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.5rem', fontWeight: 600 }}>
            Pending
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }} aria-label={`${summary.pending} pending compliance items`}>
            {summary.pending}
          </div>
        </div>
        
        {/* Overdue Card */}
        <div className="card-mdj" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.5rem', fontWeight: 600 }}>
            Overdue
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }} aria-label={`${summary.overdue} overdue compliance items`}>
            {summary.overdue}
          </div>
        </div>
        
        {/* Upcoming Card */}
        <div className="card-mdj" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.5rem', fontWeight: 600 }}>
            Upcoming (30d)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warn)' }} aria-label={`${summary.upcoming} upcoming compliance items within 30 days`}>
            {summary.upcoming}
          </div>
        </div>
        
        {/* Filed Card */}
        <div className="card-mdj" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.5rem', fontWeight: 600 }}>
            Filed
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }} aria-label={`${summary.filed} filed compliance items`}>
            {summary.filed}
          </div>
        </div>
      </div>
      
      {/* Compliance Items Section */}
      <div className="card-mdj" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '.75rem' }}>
          <h3 
            id="compliance-items-heading"
            style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}
          >
            Compliance Items
          </h3>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.375rem', fontSize: '.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showExempt}
                onChange={(e) => setShowExempt(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Show Exempt Items
            </label>
            {complianceError && (
              <button
                className="btn-outline-gold"
                style={{ fontSize: '.875rem', padding: '.375rem .75rem' }}
                onClick={loadComplianceItems}
                aria-label="Retry loading compliance items"
              >
                Retry
              </button>
            )}
          </div>
        </div>
        
        {complianceError && (
          <div 
            className="card-mdj" 
            role="alert"
            aria-live="assertive"
            style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              background: 'rgba(220, 38, 38, 0.1)', 
              borderColor: 'var(--danger)',
              borderLeft: '4px solid var(--danger)'
            }}
          >
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>✕ {complianceError}</span>
          </div>
        )}
        
        {complianceLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                border: '2px solid var(--border)',
                borderTopColor: 'var(--gold)',
                borderRadius: '50%',
                margin: '0 auto .75rem',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ color: 'var(--muted)' }}>Loading compliance items…</div>
          </div>
        ) : complianceError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            Unable to load compliance items
          </div>
        ) : complianceItems.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            No compliance items
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table 
              className="mdj-table" 
              style={{ minWidth: '800px' }}
              role="table"
              aria-labelledby="compliance-items-heading"
              aria-describedby="compliance-items-description"
            >
              <caption id="compliance-items-description" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                Table showing compliance items with type, description, filing dates, due dates, status, and available actions
              </caption>
              <thead>
                <tr role="row">
                  <th role="columnheader" scope="col">Type</th>
                  <th role="columnheader" scope="col">Description</th>
                  <th role="columnheader" scope="col">Last Filed</th>
                  <th role="columnheader" scope="col">Due Date</th>
                  <th role="columnheader" scope="col">Status</th>
                  <th role="columnheader" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complianceItems
                  .filter(item => showExempt || item.status !== 'EXEMPT')
                  .map((item) => {
                  const overdueItem = isOverdue(item);
                  return (
                    <tr 
                      key={item.id}
                      role="row"
                      aria-label={overdueItem ? `Overdue: ${item.description}` : item.description}
                      style={overdueItem ? {
                        backgroundColor: 'rgba(220, 38, 38, 0.05)',
                        color: 'var(--danger)'
                      } : undefined}
                    >
                      <td role="cell" style={overdueItem ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                        {item.type}
                      </td>
                      <td role="cell" style={overdueItem ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                        {item.description}
                      </td>
                      <td role="cell">{formatDate(item.period)}</td>
                      <td role="cell" style={overdueItem ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                        {formatDate(item.dueDate)}
                      </td>
                      <td role="cell">
                        <span 
                          className={`mdj-badge ${getStatusBadgeClass(item)}`}
                          role="status"
                          aria-label={`Status: ${item.status}${overdueItem ? ' (overdue)' : ''}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td role="cell">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                            {/* Show action buttons for pending/overdue items */}
                            {item.status !== 'FILED' && item.status !== 'EXEMPT' && (
                              <>
                                <button
                                  className="btn-gold"
                                  style={{ 
                                    fontSize: '.875rem', 
                                    padding: '.375rem .75rem',
                                    minWidth: '100px'
                                  }}
                                  onClick={() => handleMarkFiled(item.id, item.description)}
                                  disabled={updatingItemId === item.id}
                                  aria-label={`Mark ${item.description} as filed`}
                                  aria-busy={updatingItemId === item.id}
                                  aria-describedby={overdueItem ? `overdue-${item.id}` : undefined}
                                >
                                  {updatingItemId === item.id ? 'Updating...' : 'Mark as Filed'}
                                </button>
                                <button
                                  className="btn-outline-gold"
                                  style={{ 
                                    fontSize: '.875rem', 
                                    padding: '.375rem .75rem',
                                    minWidth: '100px'
                                  }}
                                  onClick={() => handleMarkExempt(item.id, item.description)}
                                  disabled={updatingItemId === item.id}
                                  aria-label={`Mark ${item.description} as exempt (not needed)`}
                                  aria-busy={updatingItemId === item.id}
                                >
                                  {updatingItemId === item.id ? 'Updating...' : 'Mark as Exempt'}
                                </button>
                              </>
                            )}
                            
                            {/* Show status for filed items */}
                            {item.status === 'FILED' && (
                              <span 
                                style={{ color: 'var(--success)', fontSize: '.875rem', fontWeight: 600 }}
                                role="status"
                                aria-label={`${item.description} has been filed`}
                              >
                                ✓ Filed
                              </span>
                            )}
                            
                            {/* Show status for exempt items */}
                            {item.status === 'EXEMPT' && (
                              <span 
                                style={{ color: 'var(--muted)', fontSize: '.875rem', fontWeight: 600 }}
                                role="status"
                                aria-label={`${item.description} is marked as exempt (not needed)`}
                              >
                                ⊘ Exempt (Not Needed)
                              </span>
                            )}
                            
                            {/* Task creation/view button - only show for non-exempt items */}
                            {item.status !== 'EXEMPT' && (
                              <>
                                {itemTasks[item.id] && itemTasks[item.id].length > 0 ? (
                                  <button
                                    className="btn-outline-gold"
                                    style={{ 
                                      fontSize: '.875rem', 
                                      padding: '.375rem .75rem',
                                      minWidth: '100px'
                                    }}
                                    onClick={() => router.push(`/tasks/${itemTasks[item.id][0].id}`)}
                                    aria-label={`View existing task for ${item.description}`}
                                  >
                                    View Task
                                  </button>
                                ) : item.status !== 'FILED' && (
                                  <button
                                    className="btn-outline-gold"
                                    style={{ 
                                      fontSize: '.875rem', 
                                      padding: '.375rem .75rem',
                                      minWidth: '100px'
                                    }}
                                    onClick={() => handleCreateTask(item.id, item.description)}
                                    disabled={creatingTaskId === item.id}
                                    aria-label={`Create new task for ${item.description}`}
                                    aria-busy={creatingTaskId === item.id}
                                  >
                                    {creatingTaskId === item.id ? 'Creating...' : 'Create Task'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          {/* Inline error message for this item */}
                          {itemErrors[item.id] && (
                            <div 
                              role="alert"
                              aria-live="assertive"
                              style={{ 
                                fontSize: '.75rem', 
                                color: 'var(--danger)', 
                                padding: '.375rem .5rem',
                                background: 'rgba(220, 38, 38, 0.1)',
                                borderRadius: '4px',
                                borderLeft: '3px solid var(--danger)'
                              }}
                            >
                              ✕ {itemErrors[item.id]}
                            </div>
                          )}
                        </div>
                        {overdueItem && (
                          <span id={`overdue-${item.id}`} style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            This item is overdue
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Filing History Section - Only show if client has registered number */}
      {client.registeredNumber && (
        <div className="card-mdj" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 
              id="filing-history-heading"
              style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}
            >
              Companies House Filing History
            </h3>
            {filingHistoryError && (
              <button
                className="btn-outline-gold"
                style={{ fontSize: '.875rem', padding: '.375rem .75rem' }}
                onClick={loadFilingHistory}
                aria-label="Retry loading filing history"
              >
                Retry
              </button>
            )}
          </div>
          
          {filingHistoryLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--gold)',
                  borderRadius: '50%',
                  margin: '0 auto .75rem',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div style={{ color: 'var(--muted)' }}>Loading filing history…</div>
            </div>
          ) : filingHistoryError ? (
            <div 
              role="alert"
              aria-live="assertive"
              style={{ 
                padding: '1rem', 
                background: 'rgba(220, 38, 38, 0.1)', 
                borderColor: 'var(--danger)',
                borderLeft: '4px solid var(--danger)',
                borderRadius: '4px'
              }}
            >
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>✕ {filingHistoryError}</span>
            </div>
          ) : filingHistory.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
              No filing history available
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table 
                className="mdj-table" 
                style={{ minWidth: '600px' }}
                role="table"
                aria-labelledby="filing-history-heading"
                aria-describedby="filing-history-description"
              >
                <caption id="filing-history-description" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                  Table showing Companies House filing history with date, type, and description of each filing
                </caption>
                <thead>
                  <tr role="row">
                    <th role="columnheader" scope="col">Date</th>
                    <th role="columnheader" scope="col">Type</th>
                    <th role="columnheader" scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filingHistory.map((filing, index) => (
                    <tr key={`${filing.date}-${filing.type}-${index}`} role="row">
                      <td role="cell">{formatDate(filing.date)}</td>
                      <td role="cell">{filing.type}</td>
                      <td role="cell">{filing.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Documents Section */}
      <div className="card-mdj" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Client Documents</h3>
          <button className="btn-outline-gold" style={{ fontSize: '.875rem', padding: '.375rem .75rem' }} onClick={loadDocuments}>
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '.75rem' }}>
          <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
            {[
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
              'OTHER',
            ].map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            className="input-mdj"
            placeholder="Description (optional)"
            value={docDescription}
            onChange={(e) => setDocDescription(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <button className="btn-gold" onClick={handleUploadDocument} disabled={docUploading}>
            {docUploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>

        {docMsg && <div style={{ color: 'var(--muted)', marginBottom: '.5rem' }}>{docMsg}</div>}

        {docsLoading ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)' }}>Loading documents…</div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)' }}>No documents yet.</div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="mdj-table" style={{ minWidth: '600px' }}>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Category</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.filename || doc.originalName || doc.id}</td>
                    <td>{doc.category || '—'}</td>
                    <td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-outline-gold btn-xs" onClick={() => handleDocumentDownload(doc, true)} style={{ marginRight: 6 }}>
                        Preview
                      </button>
                      <button className="btn-outline-gold btn-xs" onClick={() => handleDocumentDownload(doc, false)} style={{ marginRight: 6 }}>
                        Download
                      </button>
                      <button
                        className="btn-outline-gold btn-xs"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={docDeleting[doc.id]}
                      >
                        {docDeleting[doc.id] ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MDJShell>
  );
}
