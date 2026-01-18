'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

interface TaxCalculationResult {
  id: string;
  clientId: string;
  calculationType: 'SALARY_OPTIMIZATION' | 'SCENARIO_COMPARISON' | 'CORPORATION_TAX' | 'DIVIDEND_TAX' | 'INCOME_TAX' | 'SOLE_TRADER';
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
  report?: {
    results?: {
      personal?: {
        totalTax: number;
        netTakeHome: number;
      };
      company?: {
        corporationTax: number;
        netCompanyCashAfterTax: number;
        effectiveTaxRate?: number;
      };
    };
  };
  totalTaxLiability?: number;
  totalTakeHome?: number;
  estimatedSavings?: number;
  createdAt: string;
  updatedAt: string;
}

type LandingCalculationType = 'SALARY_DIVIDEND' | 'PERSONAL_TAX' | 'COMPANY_TAX' | 'SOLE_TRADER';

const LANDING_TYPES: Array<{
  value: LandingCalculationType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'SALARY_DIVIDEND',
    label: 'Salary & Dividend Optimisation',
    description: 'Model the most tax-efficient director split and compare scenarios.',
    icon: '🎯',
  },
  {
    value: 'PERSONAL_TAX',
    label: 'Personal Tax',
    description: 'SA302-style breakdown covering salary, dividends, and other income.',
    icon: '👤',
  },
  {
    value: 'COMPANY_TAX',
    label: 'Company Tax',
    description: 'Estimate corporation tax using profit before tax and year-end.',
    icon: '🏢',
  },
  {
    value: 'SOLE_TRADER',
    label: 'Sole Trader Tax',
    description: 'Income tax and Class 4 NICs on trading profits.',
    icon: '🧾',
  },
];

export default function TaxCalculationsPage() {
  const searchParams = useSearchParams();
  const [calculations, setCalculations] = useState<TaxCalculationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'recent'>(
    searchParams?.get('tab') === 'recent' ? 'recent' : 'overview'
  );

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
  }, []);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'recent') {
      setActiveTab('recent');
    } else if (tabParam === 'overview') {
      setActiveTab('overview');
    }
  }, [searchParams]);

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
      case 'SOLE_TRADER':
        return 'Sole Trader Tax';
      default:
        return type;
    }
  };

  const getLandingType = (type: TaxCalculationResult['calculationType']) => {
    switch (type) {
      case 'CORPORATION_TAX':
        return 'COMPANY_TAX';
      case 'INCOME_TAX':
      case 'DIVIDEND_TAX':
        return 'PERSONAL_TAX';
      case 'SOLE_TRADER':
        return 'SOLE_TRADER';
      case 'SALARY_OPTIMIZATION':
      case 'SCENARIO_COMPARISON':
      default:
        return 'SALARY_DIVIDEND';
    }
  };

  const totalSavings = useMemo(() => {
    return calculations.reduce((sum, calc) => sum + (calc.estimatedSavings || 0), 0);
  }, [calculations]);

  const groupedCalculations = useMemo(() => {
    const groups: Record<string, TaxCalculationResult[]> = {};
    calculations.forEach((calc) => {
      const label = getCalculationTypeLabel(calc.calculationType);
      if (!groups[label]) groups[label] = [];
      groups[label].push(calc);
    });
    return groups;
  }, [calculations]);

  const getDisplaySummary = (calc: TaxCalculationResult) => {
    if (calc.result?.summary) {
      return calc.result.summary;
    }
    if (typeof calc.totalTaxLiability === 'number' || typeof calc.totalTakeHome === 'number') {
      return {
        totalTax: calc.totalTaxLiability ?? 0,
        effectiveTaxRate: calc.result?.summary?.effectiveTaxRate ?? 0,
        netIncome: calc.totalTakeHome ?? 0,
      };
    }
    const personal = calc.report?.results?.personal;
    if (personal) {
      return {
        totalTax: personal.totalTax,
        effectiveTaxRate: calc.result?.summary?.effectiveTaxRate ?? 0,
        netIncome: personal.netTakeHome,
      };
    }
    const company = calc.report?.results?.company;
    if (company) {
      return {
        totalTax: company.corporationTax,
        effectiveTaxRate: company.effectiveTaxRate ?? 0,
        netIncome: company.netCompanyCashAfterTax,
      };
    }
    return null;
  };

  return (
    <MDJShell
      pageTitle="Tax Calculations"
      pageSubtitle="M Powered™ Tax Engine - Run calculations, compare scenarios, and track recent results"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tax Calculations' }]}
      actions={[
        { label: 'Refresh', onClick: fetchCalculations, variant: 'outline' },
        { label: 'New Calculation', href: '/tax-calculations/new', variant: 'primary' },
      ]}
    >
      <div className="tax-page">
        <div className="tax-hero">
          <div className="tax-tabs">
            <button
              type="button"
              className={`tax-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              className={`tax-tab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              Recent Calculations
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="card-mdj tax-section">
            <div className="tax-hero">
              <div className="tax-section-header">
                <h3>Choose your calculation</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  Start with a focused calculation or launch a full salary/dividend optimisation.
                </p>
              </div>
              <Link href="/tax-calculations/new" className="btn-gold">
                Start New Calculation
              </Link>
            </div>

            <div className="tax-card-grid">
              {LANDING_TYPES.map((type) => (
                <Link
                  key={type.value}
                  href={`/tax-calculations/new?type=${type.value}`}
                  className="card-mdj"
                  style={{
                    textAlign: 'left',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
                    <strong>{type.label}</strong>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{type.description}</div>
                </Link>
              ))}
            </div>

            <div className="tax-kpi-strip">
              <div className="kpi-card" style={{ padding: '0.75rem' }}>
                <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{calculations.length}</div>
                <div className="kpi-label">Recent calculations</div>
              </div>
              <div className="kpi-card" style={{ padding: '0.75rem' }}>
                <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
                  {formatCurrency(totalSavings)}
                </div>
                <div className="kpi-label">Savings identified</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="tax-section">
            {loading ? (
              <div className="card-mdj">
                <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
                  Loading tax calculations...
                </p>
              </div>
            ) : calculations.length === 0 ? (
              <div className="card-mdj" style={{ textAlign: 'center', padding: '3rem' }}>
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
              Object.entries(groupedCalculations).map(([typeLabel, items]) => (
                <div key={typeLabel} className="card-mdj tax-section">
                  <div className="tax-hero">
                    <h3 style={{ margin: 0 }}>{typeLabel}</h3>
                    <span className="mdj-badge">{items.length} calculation{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="tax-results-list">
                    {items.map((calc) => (
                      (() => {
                        const summary = getDisplaySummary(calc);
                        if (!summary) {
                          return (
                            <div key={calc.id} className="tax-result-card">
                              <div className="tax-hero" style={{ marginBottom: '1rem' }}>
                                <div>
                                  <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>
                                    {getCalculationTypeLabel(calc.calculationType)}
                                  </h4>
                                  <div className="tax-result-meta">
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
                              <div className="tax-result-actions">
                                <Link
                                  href={`/tax-calculations/${calc.id}`}
                                  className="btn-outline-gold btn-sm"
                                >
                                  View Details
                                </Link>
                                <Link
                                  href={`/tax-calculations/new?clientId=${encodeURIComponent(calc.clientId)}&taxYear=${encodeURIComponent(calc.taxYear)}&type=${getLandingType(calc.calculationType)}`}
                                  className="btn-outline-gold btn-sm"
                                >
                                  Recalculate
                                </Link>
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
                          );
                        }
                        return (
                      <div key={calc.id} className="tax-result-card">
                        <div className="tax-hero" style={{ marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>
                              {getCalculationTypeLabel(calc.calculationType)}
                            </h4>
                            <div className="tax-result-meta">
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

                        {summary && (
                          <div className="tax-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '1rem' }}>
                            <div className="kpi-card" style={{ padding: '0.75rem' }}>
                              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
                                {formatCurrency(summary.totalTax || 0)}
                              </div>
                              <div className="kpi-label">Total Tax</div>
                            </div>
                            <div className="kpi-card" style={{ padding: '0.75rem' }}>
                              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
                                {(((summary.effectiveTaxRate || 0) * 100)).toFixed(1)}%
                              </div>
                              <div className="kpi-label">Effective Rate</div>
                            </div>
                            <div className="kpi-card" style={{ padding: '0.75rem' }}>
                              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
                                {formatCurrency(summary.netIncome || 0)}
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

                        <div className="tax-result-actions">
                          <Link
                            href={`/tax-calculations/${calc.id}`}
                            className="btn-outline-gold btn-sm"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/tax-calculations/new?clientId=${encodeURIComponent(calc.clientId)}&taxYear=${encodeURIComponent(calc.taxYear)}&type=${getLandingType(calc.calculationType)}`}
                            className="btn-outline-gold btn-sm"
                          >
                            Recalculate
                          </Link>
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
                        );
                      })()
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </MDJShell>
  );
}
