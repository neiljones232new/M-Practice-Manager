'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

interface TaxCalculationDetail {
  id: string;
  clientId: string;
  calculationType: 'SALARY_OPTIMIZATION' | 'SCENARIO_COMPARISON' | 'CORPORATION_TAX' | 'DIVIDEND_TAX' | 'INCOME_TAX';
  taxYear: string;
  parameters: {
    totalIncome?: number;
    availableProfit?: number;
    profit?: number;
    salary?: number;
    dividends?: number;
    pensionContributions?: number;
    otherIncome?: number;
    corporationTaxRate?: number;
    dividendTaxRate?: number;
    scenarios?: Array<{
      name?: string;
      salary: number;
      dividend: number;
      pensionContributions?: number;
    }>;
  };
  result: {
    summary?: {
      totalTax: number;
      effectiveTaxRate: number;
      netIncome: number;
      grossIncome: number;
    };
    breakdown?: {
      incomeTax: number;
      nationalInsurance: number;
      corporationTax: number;
      dividendTax: number;
    };
    optimizedSalary?: number;
    optimizedDividend?: number;
    scenarios?: Array<{
      id?: string;
      name?: string;
      salary: number;
      dividend: number;
      totalTax: number;
      netIncome?: number;
      takeHome?: number;
      effectiveRate: number;
      incomeTax?: number;
      employeeNI?: number;
      employerNI?: number;
      corporationTax?: number;
      dividendTax?: number;
    }>;
    recommendations?: Array<{
      title: string;
      description: string;
      potentialSaving: number;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    comparison?: {
      summary: {
        totalScenarios: number;
        incomeRange: { min: number; max: number };
        taxRange: { min: number; max: number };
        takeHomeRange: { min: number; max: number };
      };
      recommendations: Array<{
        scenario: {
          id?: string;
          name?: string;
          salary: number;
          dividend: number;
          totalTax: number;
          takeHome: number;
          effectiveRate: number;
          incomeTax?: number;
          employeeNI?: number;
          employerNI?: number;
          corporationTax?: number;
          dividendTax?: number;
        };
        reason: string;
        benefit: string;
      }>;
      insights: string[];
    };
  };
  report?: {
    results?: {
      personal?: {
        totalGrossIncome: number;
        taxableIncome: number;
        incomeTaxByBand: {
          basicRate: number;
          higherRate: number;
          additionalRate: number;
        };
        dividendTaxByBand: {
          basicRate: number;
          higherRate: number;
          additionalRate: number;
        };
        nationalInsurance: {
          employeeNIC: number;
          employerNIC: number;
        };
        personalAllowance?: number;
        dividendAllowance?: number;
        totalTax: number;
        netTakeHome: number;
      };
      company?: {
        profitBeforeTax: number;
        salaryExpense: number;
        employerNIC: number;
        taxableProfit: number;
        corporationTax: number;
        dividendsPaid: number;
        netCompanyCashAfterTax: number;
      };
      optimisation?: {
        optimalSalary: number;
        optimalDividends: number;
        takeHomeOptimised: number;
        effectiveTaxRate: number;
        totalTaxAndNI?: number;
        netTakeHome?: number;
      };
      scenarioComparison?: Array<{
        scenarioName: string;
        company: {
          availableProfit: number;
          salary: number;
          employerNI: number;
          taxableProfit: number;
          corporationTax: number;
          dividendPool: number;
        };
        personal: {
          salary: number;
          dividends: number;
          otherIncome: number;
          incomeTax: number;
          employeeNI: number;
          dividendTax: number;
          totalPersonalTax: number;
          netPersonalIncome: number;
        };
        summary: {
          totalTaxAndNI: number;
          netTakeHome: number;
          effectiveRate: number;
        };
      }>;
    };
  };
  estimatedSavings?: number;
  createdAt: string;
  updatedAt: string;
}

export default function TaxCalculationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [calculation, setCalculation] = useState<TaxCalculationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculationId = params.id as string;

  useEffect(() => {
    const fetchCalculation = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get(`/tax-calculations/enhanced/${calculationId}`);
        setCalculation(data);
      } catch (e) {
        console.error('Failed to load tax calculation', e);
        setError('Failed to load tax calculation details');
      } finally {
        setLoading(false);
      }
    };

    if (calculationId) {
      fetchCalculation();
    }
  }, [calculationId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'var(--danger)';
      case 'MEDIUM':
        return 'var(--warning)';
      case 'LOW':
        return 'var(--success)';
      default:
        return 'var(--text-muted)';
    }
  };

  const handleRecalculate = async () => {
    if (!calculationId) return;
    try {
      const updated = await api.post(`/tax-calculations/enhanced/${calculationId}/recalculate`, {});
      setCalculation(updated);
    } catch (e) {
      console.error('Failed to recalculate tax calculation', e);
      alert('Failed to recalculate. Please try again.');
    }
  };

  const getPreferredScenario = (calc: TaxCalculationDetail) => {
    const comparisonRecs = calc.result?.comparison?.recommendations;
    const takeHomeRec = comparisonRecs?.find((rec) => rec.reason.toLowerCase().includes('take-home'));
    const comparisonScenario = takeHomeRec?.scenario || comparisonRecs?.[0]?.scenario;
    const scenarioList = (calc.result?.scenarios || []) as NonNullable<TaxCalculationDetail['result']['scenarios']>;
    return comparisonScenario || scenarioList.reduce((best, current) => {
      if (!best) return current;
      const bestNet = 'netIncome' in best ? best.netIncome : undefined;
      const currentNet = 'netIncome' in current ? current.netIncome : undefined;
      const bestTakeHome = best.takeHome ?? bestNet ?? 0;
      const currentTakeHome = current.takeHome ?? currentNet ?? 0;
      return currentTakeHome > bestTakeHome ? current : best;
    }, null as NonNullable<TaxCalculationDetail['result']['scenarios']>[number] | null);
  };

  const resolveSummary = (calc: TaxCalculationDetail) => {
    if (calc.result?.summary) {
      return calc.result.summary;
    }
    const scenario = getPreferredScenario(calc);
    if (!scenario) return null;
    const grossIncome = (scenario.salary || 0) + (scenario.dividend || 0);
    const totalTax = scenario.totalTax ?? 0;
    const netIncome = ('netIncome' in scenario ? scenario.netIncome : undefined) ?? scenario.takeHome ?? (grossIncome - totalTax);
    const effectiveTaxRate = scenario.effectiveRate ?? (grossIncome ? totalTax / grossIncome : 0);
    return { grossIncome, totalTax, netIncome, effectiveTaxRate };
  };

  const resolveBreakdown = (calc: TaxCalculationDetail) => {
    if (calc.result?.breakdown) {
      const breakdown = calc.result.breakdown;
      if (Number.isFinite(breakdown.nationalInsurance)) {
        return breakdown;
      }
      const scenario = getPreferredScenario(calc);
      const fallbackNationalInsurance = (scenario?.employeeNI ?? 0) + (scenario?.employerNI ?? 0);
      return { ...breakdown, nationalInsurance: fallbackNationalInsurance };
    }
    const scenario = getPreferredScenario(calc);
    if (!scenario) return null;
    const incomeTax = scenario.incomeTax ?? 0;
    const nationalInsurance = (scenario.employeeNI ?? 0) + (scenario.employerNI ?? 0);
    const corporationTax = scenario.corporationTax ?? 0;
    const dividendTax = scenario.dividendTax ?? 0;
    return { incomeTax, nationalInsurance, corporationTax, dividendTax };
  };

  const handleExportReport = async () => {
    if (!calculation) {
      alert('No calculation data available to export');
      return;
    }

    try {
      const summary = resolveSummary(calculation);
      const breakdown = resolveBreakdown(calculation);
      const reportPersonal = calculation.report?.results?.personal;
      const reportCompany = calculation.report?.results?.company;
      const reportRate = reportPersonal
        ? (reportPersonal.totalTax / Math.max(1, reportPersonal.totalGrossIncome))
        : summary?.effectiveTaxRate;
      // Create a simple PDF report using the browser's print functionality
      // In a production environment, you'd want to call an API endpoint that generates a proper PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export the report');
        return;
      }

      const reportContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tax Calculation Report - ${calculation.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
            :root{
              --brand-primary:#6D28D9;
              --brand-muted:#EDE9FE;
              --text-primary:#0F172A;
              --text-secondary:#475569;
              --border-subtle:rgba(2,6,23,0.12);
            }
            body { font-family: 'Poppins', Arial, sans-serif; margin: 20px; color: var(--text-primary); background: #fff; }
            .header { border-bottom: 2px solid var(--brand-primary); padding-bottom: 10px; margin-bottom: 20px; }
            .title { color: var(--brand-primary); font-size: 24px; font-weight: 700; }
            .subtitle { color: var(--text-secondary); font-size: 13px; margin-top: 5px; }
            .section { margin: 20px 0; }
            .section h3 { color: var(--brand-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 5px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0; }
            .kpi-card { border: 1px solid var(--border-subtle); padding: 15px; border-radius: 10px; text-align: center; background: var(--brand-muted); }
            .kpi-value { font-size: 20px; font-weight: 700; color: var(--brand-primary); }
            .kpi-label { font-size: 12px; color: var(--text-secondary); margin-top: 5px; }
            .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
            .breakdown-item { padding: 10px; background: #f9f9fb; border-radius: 8px; border: 1px solid var(--border-subtle); }
            .optimization { background: var(--brand-muted); border: 2px solid var(--brand-primary); padding: 20px; border-radius: 10px; text-align: center; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-secondary); }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${getCalculationTypeLabel(calculation.calculationType)}</div>
            <div class="subtitle">Client: ${calculation.clientId} • Tax Year: ${calculation.taxYear} • Generated: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="section">
            <h3>Calculation Summary</h3>
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-value">${reportCompany ? formatCurrency(reportCompany.profitBeforeTax) : (summary ? formatCurrency(summary.grossIncome) : '—')}</div>
                <div class="kpi-label">Available Company Profit (Pre-Extraction)</div>
                ${reportPersonal ? `<div style="margin-top:6px;font-size:12px;color:var(--text-secondary);">Personal gross income: ${formatCurrency(reportPersonal.totalGrossIncome)}</div>` : ''}
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${reportPersonal ? formatCurrency(reportPersonal.totalTax) : (summary ? formatCurrency(summary.totalTax) : '—')}</div>
                <div class="kpi-label">Personal Tax (Income + NI + Dividends)</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${reportPersonal ? formatCurrency(reportPersonal.netTakeHome) : (summary ? formatCurrency(summary.netIncome) : '—')}</div>
                <div class="kpi-label">Net Personal Cash</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${reportRate !== undefined ? formatPercentage(reportRate) : '—'}</div>
                <div class="kpi-label">Effective Personal Tax Rate</div>
              </div>
            </div>
            ${calculation.estimatedSavings && calculation.estimatedSavings > 0 ? `
              <div style="text-align: center; margin: 20px 0; padding: 15px; background: #e8fbef; border: 1px solid #22c55e; border-radius: 8px;">
                <div style="font-size: 18px; font-weight: bold; color: #22c55e;">💰 ${formatCurrency(calculation.estimatedSavings)} Annual Savings</div>
                <div style="color: #22c55e; font-size: 14px;">Potential tax savings with optimization</div>
              </div>
            ` : ''}
          </div>

          ${breakdown ? `
          <div class="section">
            <h3>Tax Breakdown</h3>
            <div class="breakdown-grid">
              <div class="breakdown-item">
                <div style="font-weight: bold;">Income Tax</div>
                <div style="font-size: 16px; color: var(--brand-primary);">${formatCurrency(breakdown.incomeTax)}</div>
              </div>
              <div class="breakdown-item">
                <div style="font-weight: bold;">National Insurance</div>
                <div style="font-size: 16px; color: var(--brand-primary);">${formatCurrency(breakdown.nationalInsurance)}</div>
              </div>
              <div class="breakdown-item">
                <div style="font-weight: bold;">Corporation Tax</div>
                <div style="font-size: 16px; color: var(--brand-primary);">${formatCurrency(breakdown.corporationTax)}</div>
              </div>
              <div class="breakdown-item">
                <div style="font-weight: bold;">Dividend Tax</div>
                <div style="font-size: 16px; color: var(--brand-primary);">${formatCurrency(breakdown.dividendTax)}</div>
              </div>
            </div>
          </div>
          ` : ''}

          ${(reportCompany || reportPersonal) ? `
          <div class="section">
            <h3>Company → Personal Reconciliation</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
              ${reportCompany ? `
              <div>
                <div style="font-weight:600;margin-bottom:8px;">Company Layer</div>
                <div style="color:var(--text-secondary);display:grid;gap:6px;">
                  <div>Available profit (pre-extraction): ${formatCurrency(reportCompany.profitBeforeTax)}</div>
                  <div>Director salary expense: ${formatCurrency(reportCompany.salaryExpense)}</div>
                  <div>Employer NIC: ${formatCurrency(reportCompany.employerNIC)}</div>
                  <div>Taxable profit: ${formatCurrency(reportCompany.taxableProfit)}</div>
                  <div>Corporation tax: ${formatCurrency(reportCompany.corporationTax)}</div>
                  <div>Post-CT dividend pool: ${formatCurrency(reportCompany.taxableProfit - reportCompany.corporationTax)}</div>
                  <div>Dividends paid: ${formatCurrency(reportCompany.dividendsPaid)}</div>
                  <div>Retained profit: ${formatCurrency(reportCompany.netCompanyCashAfterTax)}</div>
                </div>
              </div>
              ` : ''}
              ${reportPersonal ? `
              <div>
                <div style="font-weight:600;margin-bottom:8px;">Personal Layer</div>
                <div style="color:var(--text-secondary);display:grid;gap:6px;">
                  <div>Salary received: ${formatCurrency(reportCompany?.salaryExpense ?? 0)}</div>
                  <div>Dividends received: ${formatCurrency(reportCompany?.dividendsPaid ?? 0)}</div>
                  <div>Other income: ${formatCurrency(calculation.parameters.otherIncome ?? 0)}</div>
                  <div>Income tax: ${formatCurrency(reportPersonal.incomeTaxByBand.basicRate + reportPersonal.incomeTaxByBand.higherRate + reportPersonal.incomeTaxByBand.additionalRate)}</div>
                  <div>Employee NI: ${formatCurrency(reportPersonal.nationalInsurance.employeeNIC)}</div>
                  <div>Dividend tax: ${formatCurrency(reportPersonal.dividendTaxByBand.basicRate + reportPersonal.dividendTaxByBand.higherRate + reportPersonal.dividendTaxByBand.additionalRate)}</div>
                  <div style="font-weight:600;color:var(--text-primary);">Net personal cash: ${formatCurrency(reportPersonal.netTakeHome)}</div>
                </div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          ${calculation.calculationType === 'SALARY_OPTIMIZATION' && calculation.result?.optimizedSalary && calculation.result?.optimizedDividend ? `
            <div class="section">
              <h3>Optimized Structure</h3>
              <div class="optimization">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div>
                    <div style="font-size: 14px; font-weight: bold; color: var(--brand-primary); margin-bottom: 5px;">OPTIMIZED SALARY</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--brand-primary);">${formatCurrency(calculation.result?.optimizedSalary || 0)}</div>
                  </div>
                  <div>
                    <div style="font-size: 14px; font-weight: bold; color: var(--brand-primary); margin-bottom: 5px;">OPTIMIZED DIVIDEND</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--brand-primary);">${formatCurrency(calculation.result?.optimizedDividend || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="footer">
            <div>Generated by M Practice Manager - M Powered™ Tax Engine</div>
            <div>Calculation ID: ${calculation.id}</div>
            <div>Report generated on ${formatDate(new Date().toISOString())}</div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(reportContent);
      printWindow.document.close();
      
      // Wait a moment for content to load, then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
      
    } catch (e) {
      console.error('Failed to export report', e);
      alert('Failed to export report. Please try again.');
    }
  };

  if (loading) {
    return (
      <MDJShell
        pageTitle="Tax Calculation Details"
        showBack
        backHref="/tax-calculations"
        backLabel="Back to Tax Calculations"
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🧮</div>
          <p style={{ color: 'var(--text-muted)' }}>Loading calculation details...</p>
        </div>
      </MDJShell>
    );
  }

  if (error || !calculation) {
    return (
      <MDJShell
        pageTitle="Tax Calculation Details"
        showBack
        backHref="/tax-calculations"
        backLabel="Back to Tax Calculations"
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
          <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Calculation Not Found</h4>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {error || 'The requested tax calculation could not be found.'}
          </p>
          <button className="btn-gold" onClick={() => router.push('/tax-calculations')}>
            Back to Tax Calculations
          </button>
        </div>
      </MDJShell>
    );
  }

  const summary = resolveSummary(calculation);
  const breakdown = resolveBreakdown(calculation);
  const recommendations = calculation.result?.recommendations || [];
  const comparisonRecommendations = calculation.result?.comparison?.recommendations || [];
  const reportPersonal = calculation.report?.results?.personal;
  const reportCompany = calculation.report?.results?.company;
  const reportOptimisation = calculation.report?.results?.optimisation;
  const reportScenarioComparison = calculation.report?.results?.scenarioComparison;
  const preferredScenario = getPreferredScenario(calculation);
  const optimisationScenario = reportScenarioComparison?.find(
    (entry) => entry.company.salary === reportOptimisation?.optimalSalary
  ) ?? reportScenarioComparison?.[0];
  const availableProfit =
    reportCompany?.profitBeforeTax
    ?? calculation.parameters.availableProfit
    ?? summary?.grossIncome
    ?? 0;
  const scenarioSalary = optimisationScenario?.company.salary
    ?? preferredScenario?.salary
    ?? reportCompany?.salaryExpense
    ?? 0;
  const scenarioEmployerNI = optimisationScenario?.company.employerNI
    ?? preferredScenario?.employerNI
    ?? reportCompany?.employerNIC
    ?? 0;
  const taxableProfit = optimisationScenario?.company.taxableProfit ?? 0;
  const scenarioCorporationTax = optimisationScenario?.company.corporationTax
    ?? preferredScenario?.corporationTax
    ?? reportCompany?.corporationTax
    ?? 0;
  const scenarioDividendPool = optimisationScenario?.company.dividendPool ?? 0;
  const personalTaxTotal = optimisationScenario?.personal.totalPersonalTax
    ?? reportPersonal?.totalTax
    ?? 0;
  const totalBurden = reportOptimisation?.totalTaxAndNI
    ?? optimisationScenario?.summary.totalTaxAndNI
    ?? 0;
  const netTakeHome = reportOptimisation?.netTakeHome
    ?? optimisationScenario?.summary.netTakeHome
    ?? 0;
  const effectiveTotalRate = reportOptimisation?.effectiveTaxRate
    ?? optimisationScenario?.summary.effectiveRate
    ?? (availableProfit > 0 ? totalBurden / availableProfit : 0);
  const personalTaxRate = reportPersonal
    ? (reportPersonal.totalTax / Math.max(1, reportPersonal.totalGrossIncome))
    : summary?.effectiveTaxRate;
  const hasScenarioData = Boolean(reportScenarioComparison && reportScenarioComparison.length > 0);

  return (
    <MDJShell
      pageTitle={getCalculationTypeLabel(calculation.calculationType)}
      pageSubtitle={`Client: ${calculation.clientId} • Tax Year: ${calculation.taxYear}`}
      showBack
      backHref="/tax-calculations"
      backLabel="Back to Tax Calculations"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Tax Calculations', href: '/tax-calculations' },
        { label: 'Details' },
      ]}
      actions={[
        { label: 'Export Report', onClick: handleExportReport, variant: 'outline' },
        { label: 'Edit', onClick: () => router.push(`/tax-calculations/new?edit=${calculationId}`), variant: 'outline' },
        { label: 'Recalculate', onClick: handleRecalculate, variant: 'primary' },
        { 
          label: 'Delete', 
          onClick: async () => {
            if (confirm('Are you sure you want to delete this tax calculation? This action cannot be undone.')) {
              try {
                await api.delete(`/tax-calculations/${calculationId}`);
                router.push('/tax-calculations');
              } catch (e) {
                console.error('Failed to delete calculation', e);
                alert('Failed to delete calculation. Please try again.');
              }
            }
          }, 
          variant: 'outline'
        },
      ]}
    >
      {calculation.calculationType === 'CORPORATION_TAX' && (
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>🏢 Company Tax Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <div>Profit before tax: {formatCurrency(calculation.parameters.profit ?? reportCompany?.profitBeforeTax ?? summary?.grossIncome ?? 0)}</div>
              <div>Taxable profit: {formatCurrency(reportCompany?.taxableProfit ?? (calculation.parameters.profit ?? 0))}</div>
              <div>Corporation tax: {formatCurrency(reportCompany?.corporationTax ?? breakdown?.corporationTax ?? 0)}</div>
              <div>Net profit after CT: {formatCurrency((reportCompany?.taxableProfit ?? (calculation.parameters.profit ?? 0)) - (reportCompany?.corporationTax ?? breakdown?.corporationTax ?? 0))}</div>
            </div>
          </div>
        </div>
      )}

      {calculation.calculationType === 'INCOME_TAX' && reportPersonal && (
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>👤 Personal Tax Summary (SA302)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <div>Salary: {formatCurrency(calculation.parameters.salary ?? 0)}</div>
              <div>Dividends: {formatCurrency(calculation.parameters.dividends ?? 0)}</div>
              <div>Other income: {formatCurrency(calculation.parameters.otherIncome ?? 0)}</div>
              <div>Personal allowance: {formatCurrency(reportPersonal.personalAllowance ?? 0)}</div>
              <div>Dividend allowance: {formatCurrency(reportPersonal.dividendAllowance ?? 0)}</div>
              <div>Income tax (basic): {formatCurrency(reportPersonal.incomeTaxByBand.basicRate)}</div>
              <div>Income tax (higher): {formatCurrency(reportPersonal.incomeTaxByBand.higherRate)}</div>
              <div>Income tax (additional): {formatCurrency(reportPersonal.incomeTaxByBand.additionalRate)}</div>
              <div>Dividend tax (basic): {formatCurrency(reportPersonal.dividendTaxByBand.basicRate)}</div>
              <div>Dividend tax (higher): {formatCurrency(reportPersonal.dividendTaxByBand.higherRate)}</div>
              <div>Dividend tax (additional): {formatCurrency(reportPersonal.dividendTaxByBand.additionalRate)}</div>
              <div>Employee NI: {formatCurrency(reportPersonal.nationalInsurance.employeeNIC)}</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Total personal tax: {formatCurrency(personalTaxTotal)}
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Net personal income: {formatCurrency(reportPersonal.netTakeHome)}
              </div>
            </div>
          </div>
        </div>
      )}

      {(calculation.calculationType === 'SALARY_OPTIMIZATION' || calculation.calculationType === 'SCENARIO_COMPARISON') && (
        <>
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>🏢 Company Reconciliation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <div>Profit available (input): {hasScenarioData ? formatCurrency(availableProfit) : '—'}</div>
                <div>Director salary (scenario): {hasScenarioData ? formatCurrency(scenarioSalary) : '—'}</div>
                <div>Employer NI: {hasScenarioData ? formatCurrency(scenarioEmployerNI) : '—'}</div>
                <div>Taxable profit: {hasScenarioData ? formatCurrency(taxableProfit) : '—'}</div>
                <div>Corporation tax: {hasScenarioData ? formatCurrency(scenarioCorporationTax) : '—'}</div>
                <div>Profit after CT (dividend pool): {hasScenarioData ? formatCurrency(scenarioDividendPool) : '—'}</div>
              </div>
            </div>
          </div>

          {reportPersonal && (
            <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>👤 Personal Tax Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <div>Salary: {hasScenarioData ? formatCurrency(scenarioSalary) : '—'}</div>
                  <div>Dividends: {hasScenarioData ? formatCurrency(scenarioDividendPool) : '—'}</div>
                  <div>Other income: {formatCurrency(calculation.parameters.otherIncome ?? 0)}</div>
                  <div>Income tax (by band): {formatCurrency(reportPersonal.incomeTaxByBand.basicRate + reportPersonal.incomeTaxByBand.higherRate + reportPersonal.incomeTaxByBand.additionalRate)}</div>
                  <div>Employee NI: {formatCurrency(reportPersonal.nationalInsurance.employeeNIC)}</div>
                  <div>Dividend tax (by band): {formatCurrency(reportPersonal.dividendTaxByBand.basicRate + reportPersonal.dividendTaxByBand.higherRate + reportPersonal.dividendTaxByBand.additionalRate)}</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Total personal tax: {hasScenarioData ? formatCurrency(reportPersonal.totalTax) : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>📊 Combined Extraction Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="kpi-card">
                <div className="kpi-value">{hasScenarioData ? formatCurrency(availableProfit) : '—'}</div>
                <div className="kpi-label">A — Profit Available</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{hasScenarioData ? formatCurrency(totalBurden) : '—'}</div>
                <div className="kpi-label">B — Total Tax & NI</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{hasScenarioData ? formatCurrency(netTakeHome) : '—'}</div>
                <div className="kpi-label">Net Take Home (A - B)</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{hasScenarioData ? formatPercentage(effectiveTotalRate) : '—'}</div>
                <div className="kpi-label">Effective Tax % (B / A)</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', color: 'var(--text-muted)' }}>
              <div>Employer NI: {hasScenarioData ? formatCurrency(scenarioEmployerNI) : '—'}</div>
              <div>Employee NI: {hasScenarioData ? formatCurrency(reportPersonal?.nationalInsurance.employeeNIC ?? 0) : '—'}</div>
              <div>Corporation tax: {hasScenarioData ? formatCurrency(scenarioCorporationTax) : '—'}</div>
              <div>Personal tax: {hasScenarioData ? formatCurrency(personalTaxTotal) : '—'}</div>
            </div>

            {calculation.estimatedSavings && calculation.estimatedSavings > 0 && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--success-bg)',
                border: '1px solid var(--success)',
                borderRadius: '8px',
                textAlign: 'center',
                marginTop: '1rem'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.25rem' }}>
                  💰 {formatCurrency(calculation.estimatedSavings)} Annual Savings
                </div>
                <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>
                  Potential tax savings with optimization
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Optimization Results */}
      {calculation.calculationType === 'SALARY_OPTIMIZATION' && calculation.result?.optimizedSalary && calculation.result?.optimizedDividend && (
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>🎯 Optimized Structure</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: 'var(--gold-bg)', 
              border: '2px solid var(--gold)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '0.5rem' }}>
                OPTIMIZED SALARY
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)' }}>
                {formatCurrency(calculation.result?.optimizedSalary || 0)}
              </div>
            </div>
            
            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: 'var(--gold-bg)', 
              border: '2px solid var(--gold)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '0.5rem' }}>
                OPTIMIZED DIVIDEND
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)' }}>
                {formatCurrency(calculation.result?.optimizedDividend || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenarios Comparison */}
      {(calculation.calculationType === 'SALARY_OPTIMIZATION' || calculation.calculationType === 'SCENARIO_COMPARISON') && reportScenarioComparison && reportScenarioComparison.length > 0 && (
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>📈 Scenario Comparison</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Salary</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Employer NI</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Taxable Profit</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Corporation Tax</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Dividend Pool</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Personal Tax</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Net Personal Cash</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Effective Rate</th>
                </tr>
              </thead>
              <tbody>
                {[...reportScenarioComparison]
                  .sort((a, b) => a.summary.effectiveRate - b.summary.effectiveRate)
                  .map((row, index) => (
                    <tr key={`${row.scenarioName}-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{formatCurrency(row.company.salary)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatCurrency(row.company.employerNI)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatCurrency(row.company.taxableProfit)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatCurrency(row.company.corporationTax)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatCurrency(row.company.dividendPool)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatCurrency(row.personal.totalPersonalTax)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        {formatCurrency(row.personal.netPersonalIncome)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{formatPercentage(row.summary.effectiveRate)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {(calculation.calculationType === 'SALARY_OPTIMIZATION' || calculation.calculationType === 'SCENARIO_COMPARISON') && recommendations.length > 0 && (
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>💡 Tax Planning Recommendations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recommendations.map((rec, index) => (
              <div
                key={index}
                style={{
                  padding: '1.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--gold)' }}>{rec.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: getPriorityColor(rec.priority),
                        color: 'white',
                      }}
                    >
                      {rec.priority}
                    </span>
                    {rec.potentialSaving > 0 && (
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        +{formatCurrency(rec.potentialSaving)}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(calculation.calculationType === 'SALARY_OPTIMIZATION' || calculation.calculationType === 'SCENARIO_COMPARISON') && recommendations.length === 0 && comparisonRecommendations.length > 0 && (
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>💡 Scenario Recommendations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comparisonRecommendations.map((rec, index) => (
              <div
                key={index}
                style={{
                  padding: '1.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--gold)' }}>{rec.reason}</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{rec.benefit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calculation Metadata */}
      <div className="card-mdj">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>📋 Calculation Details</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Calculation ID</div>
            <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{calculation.id}</div>
          </div>
          
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Created</div>
            <div style={{ color: 'var(--text-muted)' }}>{formatDate(calculation.createdAt)}</div>
          </div>
          
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Last Updated</div>
            <div style={{ color: 'var(--text-muted)' }}>{formatDate(calculation.updatedAt)}</div>
          </div>
          
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Parameters</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Income: {formatCurrency(calculation.parameters.totalIncome ?? 0)}
              {calculation.parameters.pensionContributions && calculation.parameters.pensionContributions > 0 && (
                <><br />Pension: {formatCurrency(calculation.parameters.pensionContributions)}</>
              )}
            </div>
          </div>
        </div>
      </div>
    </MDJShell>
  );
}
