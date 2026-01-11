'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

interface TaxCalculationResult {
  id: string;
  clientId: string;
  calculationType: 'SALARY_OPTIMIZATION' | 'SCENARIO_COMPARISON' | 'CORPORATION_TAX' | 'DIVIDEND_TAX' | 'INCOME_TAX';
  taxYear: string;
  result: {
    summary?: {
      totalTax: number;
      effectiveTaxRate: number;
      netIncome: number;
    };
    optimizedSalary?: number;
    optimizedDividend?: number;
    scenarios?: any[];
  };
  estimatedSavings?: number;
  createdAt: string;
  updatedAt: string;
}

interface OptimizationRequest {
  clientId: string;
  targetTakeHome: number;
  taxYear: string;
  pensionContributions?: number;
  otherIncome?: number;
}

export default function TaxCalculationsPage() {
  const [calculations, setCalculations] = useState<TaxCalculationResult[]>([]);
  const [clients, setClients] = useState<Array<{
    id: string;
    ref: string;
    name: string;
    type: 'INDIVIDUAL' | 'COMPANY';
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [optimizationForm, setOptimizationForm] = useState<OptimizationRequest>({
    clientId: '',
    targetTakeHome: 50000,
    taxYear: '2024-25',
    pensionContributions: 0,
    otherIncome: 0,
  });
  const [optimizing, setOptimizing] = useState(false);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const data = await api.get('/clients');
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load clients', e);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      // Get recent calculations across all clients
      const data = await api.get('/tax-calculations');
      setCalculations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load tax calculations', e);
      setCalculations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculations();
    fetchClients();
  }, []);

  const handleOptimize = async () => {
    if (!optimizationForm.clientId || optimizationForm.targetTakeHome <= 0) {
      alert('Please select a client and enter a valid target take-home amount');
      return;
    }

    try {
      setOptimizing(true);
      const result = await api.post('/tax-calculations/optimize-salary', optimizationForm);
      
      // Refresh calculations list
      await fetchCalculations();
      
      // Reset form and hide optimizer
      setOptimizationForm({
        clientId: '',
        targetTakeHome: 50000,
        taxYear: '2024-25',
        pensionContributions: 0,
        otherIncome: 0,
      });
      setShowOptimizer(false);
      
      alert('Tax optimization completed successfully!');
    } catch (e) {
      console.error('Failed to optimize tax', e);
      alert('Failed to optimize tax. Please try again.');
    } finally {
      setOptimizing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const getCalculationTypeLabel = (type: string) => {
    switch (type) {
      case 'SALARY_OPTIMIZATION':
        return 'Salary/Dividend Optimization';
      case 'SCENARIO_COMPARISON':
        return 'Scenario Comparison';
      case 'CORPORATION_TAX':
        return 'Corporation Tax';
      case 'DIVIDEND_TAX':
        return 'Dividend Tax';
      case 'INCOME_TAX':
        return 'Income Tax & NI';
      default:
        return type;
    }
  };

  return (
    <MDJShell
      pageTitle="Tax Calculations"
      pageSubtitle="M Powered™ Tax Engine - Salary/Dividend Optimization & Tax Planning"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tax Calculations' }]}
      actions={[
        { label: 'Refresh', onClick: fetchCalculations, variant: 'outline' },
        { label: 'Quick Optimization', onClick: () => setShowOptimizer(true), variant: 'outline' },
        { label: 'New Calculation', href: '/tax-calculations/new', variant: 'primary' },
      ]}
    >
      {/* Quick Optimization Form */}
      {showOptimizer && (
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>
            🧮 Salary/Dividend Optimization
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="label-mdj">Client</label>
              {loadingClients ? (
                <div className="input-mdj" style={{ color: 'var(--text-muted)' }}>Loading clients...</div>
              ) : (
                <select
                  className="input-mdj"
                  value={optimizationForm.clientId}
                  onChange={(e) => setOptimizationForm({ ...optimizationForm, clientId: e.target.value })}
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.ref})
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="label-mdj">Target Take-Home</label>
              <input
                type="number"
                className="input-mdj"
                value={optimizationForm.targetTakeHome}
                onChange={(e) => setOptimizationForm({ ...optimizationForm, targetTakeHome: Number(e.target.value) })}
              />
            </div>
            
            <div>
              <label className="label-mdj">Tax Year</label>
              <select
                className="input-mdj"
                value={optimizationForm.taxYear}
                onChange={(e) => setOptimizationForm({ ...optimizationForm, taxYear: e.target.value })}
              >
                <option value="2024-25">2024-25</option>
                <option value="2023-24">2023-24</option>
                <option value="2022-23">2022-23</option>
              </select>
            </div>
            
            <div>
              <label className="label-mdj">Pension Contributions</label>
              <input
                type="number"
                className="input-mdj"
                value={optimizationForm.pensionContributions}
                onChange={(e) => setOptimizationForm({ ...optimizationForm, pensionContributions: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-gold"
              onClick={handleOptimize}
              disabled={optimizing}
            >
              {optimizing ? 'Optimizing...' : 'Calculate Optimization'}
            </button>
            <button
              className="btn-outline-gold"
              onClick={() => setShowOptimizer(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tax Calculation Results */}
      <div className="card-mdj">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Recent Tax Calculations</h3>
          <span className="mdj-badge">
            {calculations.length} calculation{calculations.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
            Loading tax calculations...
          </p>
        ) : calculations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧮</div>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No Tax Calculations Yet</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Start optimizing your clients' tax efficiency with the M Powered™ Tax Engine
            </p>
            <button
              className="btn-gold"
              onClick={() => window.location.href = '/tax-calculations/new'}
            >
              Create First Calculation
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {calculations.map((calc) => (
              <div
                key={calc.id}
                style={{
                  padding: '1.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>
                      {getCalculationTypeLabel(calc.calculationType)}
                    </h4>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span>Client: {calc.clientId}</span>
                      <span>Tax Year: {calc.taxYear}</span>
                      <span>Created: {formatDate(calc.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    {calc.estimatedSavings && calc.estimatedSavings > 0 && (
                      <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '0.25rem' }}>
                        💰 {formatCurrency(calc.estimatedSavings)} savings
                      </div>
                    )}
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ID: {calc.id.slice(-8)}
                    </div>
                  </div>
                </div>

                {calc.result?.summary && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="kpi-card" style={{ padding: '0.75rem' }}>
                      <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
                        {formatCurrency(calc.result?.summary?.totalTax || 0)}
                      </div>
                      <div className="kpi-label">Total Tax</div>
                    </div>
                    
                    <div className="kpi-card" style={{ padding: '0.75rem' }}>
                      <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
                        {(((calc.result?.summary?.effectiveTaxRate || 0) * 100)).toFixed(1)}%
                      </div>
                      <div className="kpi-label">Effective Rate</div>
                    </div>
                    
                    <div className="kpi-card" style={{ padding: '0.75rem' }}>
                      <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
                        {formatCurrency(calc.result?.summary?.netIncome || 0)}
                      </div>
                      <div className="kpi-label">Net Income</div>
                    </div>
                  </div>
                )}

                {calc.calculationType === 'SALARY_OPTIMIZATION' && calc.result?.optimizedSalary && calc.result?.optimizedDividend && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-muted)', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--gold)' }}>Optimized Salary</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                        {formatCurrency(calc.result?.optimizedSalary || 0)}
                      </div>
                    </div>
                    
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-muted)', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--gold)' }}>Optimized Dividend</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                        {formatCurrency(calc.result?.optimizedDividend || 0)}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <Link
                    href={`/tax-calculations/${calc.id}`}
                    className="btn-outline-gold btn-sm"
                  >
                    View Details
                  </Link>
                  <button
                    className="btn-outline-gold btn-sm"
                    onClick={() => {
                      // Copy calculation settings to form for editing
                      setOptimizationForm({
                        clientId: calc.clientId,
                        targetTakeHome: calc.result?.summary?.netIncome || 50000,
                        taxYear: calc.taxYear,
                        pensionContributions: 0,
                        otherIncome: 0,
                      });
                      setShowOptimizer(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-outline-gold btn-sm"
                    onClick={() => {
                      // Copy calculation settings to form
                      setOptimizationForm({
                        clientId: calc.clientId,
                        targetTakeHome: calc.result?.summary?.netIncome || 50000,
                        taxYear: calc.taxYear,
                        pensionContributions: 0,
                        otherIncome: 0,
                      });
                      setShowOptimizer(true);
                    }}
                  >
                    Recalculate
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this tax calculation? This action cannot be undone.')) {
                        try {
                          await api.delete(`/tax-calculations/${calc.id}`);
                          await fetchCalculations(); // Refresh the list
                          alert('Tax calculation deleted successfully');
                        } catch (e) {
                          console.error('Failed to delete calculation', e);
                          alert('Failed to delete calculation. Please try again.');
                        }
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MDJShell>
  );
}
