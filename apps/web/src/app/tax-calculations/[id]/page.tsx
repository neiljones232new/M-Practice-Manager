'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

interface TaxCalculationDetail {
  id: string;
  clientId: string;
  calculationType: 'SALARY_OPTIMIZATION' | 'SCENARIO_COMPARISON' | 'CORPORATION_TAX' | 'DIVIDEND_TAX' | 'INCOME_TAX' | 'SOLE_TRADER';
  taxYear: string;
  parameters: {
    totalIncome?: number;
    availableProfit?: number;
    profit?: number;
    revenue?: number;
    expenses?: number;
    profitBeforeTax?: number;
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
  scenarioResults?: Array<{
    input: {
      availableProfit: number;
      salary: number;
      taxYear: string;
      personal: {
        otherIncome?: number;
      };
    };
    company: {
      salary: number;
      employerNI: number;
      taxableProfit: number;
      corporationTax: number;
      profitAfterTax: number;
      dividendPool: number;
    };
    personal: {
      salary: number;
      dividends: number;
      incomeTax: number;
      employeeNI: number;
      dividendTax: number;
      totalPersonalTax: number;
      netPersonalCash: number;
    };
    summary: {
      totalTax: number;
      effectiveTaxRate: number;
    };
  }>;
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
      class4NIC?: number;
      class2NIC?: number;
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
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [clientName, setClientName] = useState<string | null>(null);

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

  useEffect(() => {
    if (!calculation?.clientId) return;
    let isMounted = true;
    const loadClientName = async () => {
      try {
        const client = await api.get<{ name?: string }>(`/clients/${calculation.clientId}`);
        if (isMounted) {
          setClientName(client?.name || null);
        }
      } catch (e) {
        console.warn('Failed to load client name', e);
      }
    };
    loadClientName();
    return () => {
      isMounted = false;
    };
  }, [calculation?.clientId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  const formatCost = (value: number) => {
    if (!Number.isFinite(value)) return '—';
    return value === 0 ? '£0.00' : `(${formatCurrency(value)})`;
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

  const handleSaveScenarioResult = async () => {
    if (!calculation || !selectedScenario) {
      alert('No scenario selected to save.');
      return;
    }

    const summaryPayload = {
      grossIncome: selectedScenario.personal.salary
        + selectedScenario.personal.dividends
        + (selectedScenario.input.personal.otherIncome || 0),
      totalTax: selectedScenario.summary.totalTax,
      netIncome: selectedScenario.personal.netPersonalCash,
      effectiveTaxRate: selectedScenario.summary.effectiveTaxRate,
    };

    const breakdownPayload = {
      incomeTax: selectedScenario.personal.incomeTax,
      nationalInsurance: selectedScenario.personal.employeeNI + selectedScenario.company.employerNI,
      corporationTax: selectedScenario.company.corporationTax,
      dividendTax: selectedScenario.personal.dividendTax,
    };

    try {
      const updated = await api.post(
        `/tax-calculations/${calculationId}/save-result`,
        { summary: summaryPayload, breakdown: breakdownPayload }
      );
      setCalculation(updated);
      alert('Saved selected scenario for reports.');
    } catch (e) {
      console.error('Failed to save selected scenario', e);
      alert('Failed to save selected scenario. Please try again.');
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
    if (calc.scenarioResults && calc.scenarioResults.length > 0) {
      const best = calc.scenarioResults.reduce((currentBest, scenario) => {
        if (!currentBest) return scenario;
        return scenario.personal.netPersonalCash > currentBest.personal.netPersonalCash ? scenario : currentBest;
      }, null as NonNullable<TaxCalculationDetail['scenarioResults']>[number] | null);
      if (!best) return null;
      const grossIncome = best.personal.salary + best.personal.dividends + (best.input.personal.otherIncome || 0);
      return {
        grossIncome,
        totalTax: best.summary.totalTax,
        netIncome: best.personal.netPersonalCash,
        effectiveTaxRate: best.summary.effectiveTaxRate,
      };
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

  const resolveScenarioResults = (calc: TaxCalculationDetail) => {
    if (calc.scenarioResults && calc.scenarioResults.length > 0) {
      return calc.scenarioResults;
    }
    const fallback = calc.report?.results?.scenarioComparison;
    if (!fallback) return [];
    return fallback.map((row) => ({
      input: {
        availableProfit: row.company.availableProfit,
        salary: row.company.salary,
        taxYear: calc.taxYear,
        personal: {
          otherIncome: row.personal.otherIncome,
        },
      },
      company: {
        salary: row.company.salary,
        employerNI: row.company.employerNI,
        taxableProfit: row.company.taxableProfit,
        corporationTax: row.company.corporationTax,
        profitAfterTax: row.company.dividendPool,
        dividendPool: row.company.dividendPool,
      },
      personal: {
        salary: row.personal.salary,
        dividends: row.personal.dividends,
        incomeTax: row.personal.incomeTax,
        employeeNI: row.personal.employeeNI,
        dividendTax: row.personal.dividendTax,
        totalPersonalTax: row.personal.totalPersonalTax,
        netPersonalCash: row.personal.netPersonalIncome,
      },
      summary: {
        totalTax: row.summary.totalTaxAndNI,
        effectiveTaxRate: row.summary.effectiveRate,
      },
    }));
  };

  useEffect(() => {
    if (!calculation) return;
    const scenarios = resolveScenarioResults(calculation);
    if (scenarios.length === 0) return;
    const bestIndex = scenarios.reduce((best, current, index) => {
      if (best === null) return index;
      const bestCash = scenarios[best].personal.netPersonalCash;
      return current.personal.netPersonalCash > bestCash ? index : best;
    }, null as number | null);
    if (bestIndex !== null) {
      setSelectedScenarioIndex(bestIndex);
    }
  }, [calculation]);

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
      const scenarioResults = resolveScenarioResults(calculation);
      const selectedScenario = scenarioResults[selectedScenarioIndex] ?? scenarioResults[0];
      const useScenario = Boolean(
        selectedScenario && (calculation.calculationType === 'SALARY_OPTIMIZATION' || calculation.calculationType === 'SCENARIO_COMPARISON')
      );
      const scenarioSummary = selectedScenario
        ? {
            grossIncome: selectedScenario.personal.salary
              + selectedScenario.personal.dividends
              + (selectedScenario.input.personal.otherIncome || 0),
            totalTax: selectedScenario.summary.totalTax,
            netIncome: selectedScenario.personal.netPersonalCash,
            effectiveTaxRate: selectedScenario.summary.effectiveTaxRate,
          }
        : null;
      const scenarioBreakdown = selectedScenario
        ? {
            incomeTax: selectedScenario.personal.incomeTax,
            nationalInsurance: selectedScenario.personal.employeeNI + selectedScenario.company.employerNI,
            corporationTax: selectedScenario.company.corporationTax,
            dividendTax: selectedScenario.personal.dividendTax,
          }
        : null;
      const exportSummary = useScenario && scenarioSummary ? scenarioSummary : summary;
      const exportBreakdown = useScenario && scenarioBreakdown ? scenarioBreakdown : breakdown;
      const exportCompany = useScenario && selectedScenario
        ? {
            profitBeforeTax: selectedScenario.input.availableProfit,
            salaryExpense: selectedScenario.company.salary,
            employerNIC: selectedScenario.company.employerNI,
            taxableProfit: selectedScenario.company.taxableProfit,
            corporationTax: selectedScenario.company.corporationTax,
            dividendsPaid: selectedScenario.company.dividendPool,
            netCompanyCashAfterTax: Math.max(
              0,
              (selectedScenario.company.profitAfterTax || 0) - selectedScenario.company.dividendPool
            ),
          }
        : reportCompany;
      const exportPersonal = useScenario && selectedScenario
        ? {
            totalGrossIncome: scenarioSummary?.grossIncome || 0,
            totalTax: selectedScenario.personal.totalPersonalTax,
            netTakeHome: selectedScenario.personal.netPersonalCash,
            incomeTaxByBand: {
              basicRate: selectedScenario.personal.incomeTax,
              higherRate: 0,
              additionalRate: 0,
            },
            dividendTaxByBand: {
              basicRate: selectedScenario.personal.dividendTax,
              higherRate: 0,
              additionalRate: 0,
            },
            nationalInsurance: {
              employeeNIC: selectedScenario.personal.employeeNI,
              employerNIC: selectedScenario.company.employerNI,
            },
          }
        : reportPersonal;
      const reportRate = exportSummary?.effectiveTaxRate
        ?? (exportPersonal ? (exportPersonal.totalTax / Math.max(1, exportPersonal.totalGrossIncome)) : undefined);
      const clientDisplayName = clientName || calculation.clientId;
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
            .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 15px 0; }
            .kpi-card { border: 1px solid var(--border-subtle); padding: 12px; border-radius: 10px; text-align: center; background: var(--brand-muted); min-height: 88px; display: flex; flex-direction: column; justify-content: center; }
            .kpi-value { font-size: 18px; font-weight: 700; color: var(--brand-primary); }
            .kpi-label { font-size: 12px; color: var(--text-secondary); margin-top: 5px; }
            .breakdown-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
            .breakdown-item { padding: 12px; background: #f9f9fb; border-radius: 8px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 90px; text-align: center; }
            .breakdown-title { font-weight: 600; }
            .breakdown-value { font-size: 16px; color: var(--brand-primary); font-weight: 600; }
            .optimization { background: var(--brand-muted); border: 2px solid var(--brand-primary); padding: 20px; border-radius: 10px; text-align: center; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-secondary); }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${getCalculationTypeLabel(calculation.calculationType)}</div>
            <div class="subtitle">Client: ${clientDisplayName} • Tax Year: ${calculation.taxYear} • Generated: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="section">
            <h3>Calculation Summary</h3>
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-value">${exportCompany ? formatCurrency(exportCompany.profitBeforeTax) : (exportSummary ? formatCurrency(exportSummary.grossIncome) : '—')}</div>
                <div class="kpi-label">Available Company Profit (Pre-Extraction)</div>
                ${exportPersonal ? `<div style="margin-top:6px;font-size:12px;color:var(--text-secondary);">Personal gross income: ${formatCurrency(exportPersonal.totalGrossIncome)}</div>` : ''}
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${exportPersonal ? formatCurrency(exportPersonal.totalTax) : (exportSummary ? formatCurrency(exportSummary.totalTax) : '—')}</div>
                <div class="kpi-label">Personal Tax (Income + NI + Dividends)</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${exportPersonal ? formatCurrency(exportPersonal.netTakeHome) : (exportSummary ? formatCurrency(exportSummary.netIncome) : '—')}</div>
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

          ${exportBreakdown ? `
          <div class="section">
            <h3>Tax Breakdown</h3>
            <div class="breakdown-grid">
              <div class="breakdown-item">
                <div class="breakdown-title">Income Tax</div>
                <div class="breakdown-value">${formatCurrency(exportBreakdown.incomeTax)}</div>
              </div>
              <div class="breakdown-item">
                <div class="breakdown-title">National Insurance</div>
                <div class="breakdown-value">${formatCurrency(exportBreakdown.nationalInsurance)}</div>
              </div>
              <div class="breakdown-item">
                <div class="breakdown-title">Corporation Tax</div>
                <div class="breakdown-value">${formatCurrency(exportBreakdown.corporationTax)}</div>
              </div>
              <div class="breakdown-item">
                <div class="breakdown-title">Dividend Tax</div>
                <div class="breakdown-value">${formatCurrency(exportBreakdown.dividendTax)}</div>
              </div>
            </div>
          </div>
          ` : ''}

          ${(exportCompany || exportPersonal) ? `
          <div class="section">
            <h3>Company → Personal Reconciliation</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
              ${exportCompany ? `
              <div>
                <div style="font-weight:600;margin-bottom:8px;">Company Layer</div>
                <div style="color:var(--text-secondary);display:grid;gap:6px;">
                  <div>Available profit (pre-extraction): ${formatCurrency(exportCompany.profitBeforeTax)}</div>
                  <div>Director salary expense: ${formatCurrency(exportCompany.salaryExpense)}</div>
                  <div>Employer NIC: ${formatCurrency(exportCompany.employerNIC)}</div>
                  <div>Taxable profit: ${formatCurrency(exportCompany.taxableProfit)}</div>
                  <div>Corporation tax: ${formatCurrency(exportCompany.corporationTax)}</div>
                  <div>Post-CT dividend pool: ${formatCurrency(exportCompany.taxableProfit - exportCompany.corporationTax)}</div>
                  <div>Dividends paid: ${formatCurrency(exportCompany.dividendsPaid)}</div>
                  <div>Retained profit: ${formatCurrency(exportCompany.netCompanyCashAfterTax)}</div>
                </div>
              </div>
              ` : ''}
              ${exportPersonal ? `
              <div>
                <div style="font-weight:600;margin-bottom:8px;">Personal Layer</div>
                <div style="color:var(--text-secondary);display:grid;gap:6px;">
                  <div>Salary received: ${formatCurrency(exportCompany?.salaryExpense ?? 0)}</div>
                  <div>Dividends received: ${formatCurrency(exportCompany?.dividendsPaid ?? 0)}</div>
                  <div>Other income: ${formatCurrency(calculation.parameters.otherIncome ?? 0)}</div>
                  <div>Income tax: ${formatCurrency(exportPersonal.incomeTaxByBand.basicRate + exportPersonal.incomeTaxByBand.higherRate + exportPersonal.incomeTaxByBand.additionalRate)}</div>
                  <div>Employee NI: ${formatCurrency(exportPersonal.nationalInsurance.employeeNIC)}</div>
                  <div>Dividend tax: ${formatCurrency(exportPersonal.dividendTaxByBand.basicRate + exportPersonal.dividendTaxByBand.higherRate + exportPersonal.dividendTaxByBand.additionalRate)}</div>
                  <div style="font-weight:600;color:var(--text-primary);">Net personal cash: ${formatCurrency(exportPersonal.netTakeHome)}</div>
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
      
      // Wait a moment for content to load, then print (leave tab open)
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
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
  const scenarioResults = resolveScenarioResults(calculation);
  const selectedScenario = scenarioResults[selectedScenarioIndex] ?? scenarioResults[0];
  const bestScenarioIndex = scenarioResults.reduce((best, current, index) => {
    if (best === null) return index;
    return current.personal.netPersonalCash > scenarioResults[best].personal.netPersonalCash ? index : best;
  }, null as number | null);
  const scenarioOptions = scenarioResults
    .map((scenario, originalIndex) => ({ scenario, originalIndex }))
    .sort((a, b) => b.scenario.personal.netPersonalCash - a.scenario.personal.netPersonalCash);
  const preferredScenario = getPreferredScenario(calculation);
  const clientDisplayName = clientName || calculation.clientId;
  const personalTaxTotal = selectedScenario?.personal.totalPersonalTax
    ?? reportPersonal?.totalTax
    ?? 0;

  return (
    <MDJShell
      pageTitle={getCalculationTypeLabel(calculation.calculationType)}
      pageSubtitle={`Client: ${clientDisplayName} • Tax Year: ${calculation.taxYear}`}
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
      <div className="tax-page">
        {calculation.calculationType === 'CORPORATION_TAX' && (
          <div className="card-mdj tax-section">
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>🏢 Company Tax Summary</h3>
            <div className="tax-detail-grid">
              <table className="calc-results-table report-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Annual turnover</td>
                    <td className="num">{formatCurrency(calculation.parameters.revenue ?? 0)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Less business expenses</td>
                  </tr>
                  <tr>
                    <td>Travel &amp; other</td>
                    <td className="num">{formatCurrency(calculation.parameters.expenses ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Pension contributions</td>
                    <td className="num">{formatCurrency(calculation.parameters.pensionContributions ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Gross salary</td>
                    <td className="num">{formatCurrency(calculation.parameters.salaryExpense ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Employers NIC</td>
                    <td className="num">{formatCurrency(calculation.parameters.employerNIC ?? breakdown?.employerNI ?? 0)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total expenses</td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(calculation.parameters.totalExpenses ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Profits before tax</td>
                    <td className="num">{formatCurrency(calculation.parameters.profitBeforeTax ?? reportCompany?.profitBeforeTax ?? summary?.grossIncome ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Corporation tax</td>
                    <td className="num">{formatCurrency(reportCompany?.corporationTax ?? breakdown?.corporationTax ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Net profits after tax</td>
                    <td className="num">{formatCurrency(reportCompany?.netCompanyCashAfterTax ?? summary?.netIncome ?? 0)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ color: 'var(--text-muted)' }}>
                      Available for distribution as dividends
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {calculation.calculationType === 'INCOME_TAX' && reportPersonal && (
          <div className="card-mdj tax-section">
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>👤 Personal Tax Summary (SA302)</h3>
            <div className="tax-detail-grid">
              <table className="calc-results-table report-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Salary</td>
                    <td className="num">{formatCurrency(calculation.parameters.salary ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Dividends</td>
                    <td className="num">{formatCurrency(calculation.parameters.dividends ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Other income</td>
                    <td className="num">{formatCurrency(calculation.parameters.otherIncome ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Personal allowance</td>
                    <td className="num">{formatCurrency(reportPersonal.personalAllowance ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Dividend allowance</td>
                    <td className="num">{formatCurrency(reportPersonal.dividendAllowance ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Income tax (basic)</td>
                    <td className="num">{formatCurrency(reportPersonal.incomeTaxByBand.basicRate)}</td>
                  </tr>
                  <tr>
                    <td>Income tax (higher)</td>
                    <td className="num">{formatCurrency(reportPersonal.incomeTaxByBand.higherRate)}</td>
                  </tr>
                  <tr>
                    <td>Income tax (additional)</td>
                    <td className="num">{formatCurrency(reportPersonal.incomeTaxByBand.additionalRate)}</td>
                  </tr>
                  <tr>
                    <td>Dividend tax (basic)</td>
                    <td className="num">{formatCurrency(reportPersonal.dividendTaxByBand.basicRate)}</td>
                  </tr>
                  <tr>
                    <td>Dividend tax (higher)</td>
                    <td className="num">{formatCurrency(reportPersonal.dividendTaxByBand.higherRate)}</td>
                  </tr>
                  <tr>
                    <td>Dividend tax (additional)</td>
                    <td className="num">{formatCurrency(reportPersonal.dividendTaxByBand.additionalRate)}</td>
                  </tr>
                  <tr>
                    <td>Employee NI</td>
                    <td className="num">{formatCurrency(reportPersonal.nationalInsurance.employeeNIC)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total personal tax</td>
                    <td className="num">{formatCurrency(personalTaxTotal)}</td>
                  </tr>
                  <tr>
                    <td>Net personal income</td>
                    <td className="num">{formatCurrency(reportPersonal.netTakeHome)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      {calculation.calculationType === 'SOLE_TRADER' && (
        <div className="card-mdj tax-section">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>🧾 Sole Trader Tax Summary</h3>
          <div className="tax-detail-grid">
            <table className="calc-results-table report-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Annual revenue</td>
                  <td className="num">{formatCurrency(calculation.parameters.revenue ?? 0)}</td>
                </tr>
                <tr>
                  <td>Annual expenses</td>
                  <td className="num">{formatCurrency(calculation.parameters.expenses ?? 0)}</td>
                </tr>
                <tr>
                  <td>Profits before tax</td>
                  <td className="num">{formatCurrency(calculation.parameters.profitBeforeTax ?? summary?.grossIncome ?? 0)}</td>
                </tr>
                <tr>
                  <td>Income tax</td>
                  <td className="num">{formatCurrency(breakdown?.incomeTax ?? 0)}</td>
                </tr>
                <tr>
                  <td>Class 4 NIC</td>
                  <td className="num">{formatCurrency(breakdown?.class4NIC ?? 0)}</td>
                </tr>
                <tr>
                  <td>Class 2 NIC</td>
                  <td className="num">{formatCurrency(breakdown?.class2NIC ?? 0)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Total tax</td>
                  <td className="num">{formatCurrency(summary?.totalTax ?? 0)}</td>
                </tr>
                <tr>
                  <td>Take home pay</td>
                  <td className="num">{formatCurrency(summary?.netIncome ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {(calculation.calculationType === 'SALARY_OPTIMIZATION' || calculation.calculationType === 'SCENARIO_COMPARISON') && (
        <>
          <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Scenario View</h3>
            {scenarioResults.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No scenario data available.</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ maxWidth: '520px', flex: '1 1 320px' }}>
                    <label className="form-label" htmlFor="scenarioSelect">Select salary scenario</label>
                    <select
                      id="scenarioSelect"
                      className="form-select"
                      value={selectedScenarioIndex}
                      onChange={(event) => setSelectedScenarioIndex(Number(event.target.value))}
                    >
                      {scenarioOptions.map(({ scenario, originalIndex }) => (
                        <option key={`${scenario.input.salary}-${originalIndex}`} value={originalIndex}>
                          Salary {formatCurrency(scenario.input.salary)} — Net {formatCurrency(scenario.personal.netPersonalCash)}
                          {bestScenarioIndex === originalIndex ? ' (Best)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn-outline-gold"
                    onClick={handleSaveScenarioResult}
                  >
                    Save Result
                  </button>
                </div>

                {selectedScenario && (
                  <div className="tax-detail-grid tax-detail-grid--two">
                    <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Company</div>
                      <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Available profit</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.input.availableProfit)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Director salary</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCost(selectedScenario.company.salary)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Employer NI</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCost(selectedScenario.company.employerNI)}
                          </span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Taxable profit</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.company.taxableProfit)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Corporation tax</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCost(selectedScenario.company.corporationTax)}
                          </span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', fontWeight: 600, display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Dividend pool</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.company.dividendPool)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Personal</div>
                      <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Salary received</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.personal.salary)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Income tax</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCost(selectedScenario.personal.incomeTax)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Employee NI</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCost(selectedScenario.personal.employeeNI)}
                          </span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', fontWeight: 600, display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Net salary</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.personal.salary - selectedScenario.personal.incomeTax - selectedScenario.personal.employeeNI)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Dividends received</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.personal.dividends)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Dividend tax</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCost(selectedScenario.personal.dividendTax)}
                          </span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', fontWeight: 600, display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Net dividends</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.personal.dividends - selectedScenario.personal.dividendTax)}
                          </span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', fontWeight: 700, color: 'var(--text-primary)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Net personal cash</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.personal.netPersonalCash)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Summary</div>
                      <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Total tax paid</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.summary.totalTax)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Effective tax rate</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatPercentage(selectedScenario.summary.effectiveTaxRate)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <span>Net extraction</span>
                          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(selectedScenario.personal.netPersonalCash)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Optimization Results */}
      {calculation.calculationType === 'SALARY_OPTIMIZATION' && calculation.result?.optimizedSalary && calculation.result?.optimizedDividend && (
        <div className="card-mdj tax-section">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>🎯 Optimized Structure</h3>
          <table className="calc-results-table report-table">
            <thead>
              <tr>
                <th>Structure</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Optimized salary</td>
                <td className="num">{formatCurrency(calculation.result?.optimizedSalary || 0)}</td>
              </tr>
              <tr>
                <td>Optimized dividend</td>
                <td className="num">{formatCurrency(calculation.result?.optimizedDividend || 0)}</td>
              </tr>
            </tbody>
          </table>
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
      <div className="card-mdj tax-section">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold)' }}>📋 Calculation Details</h3>
        
        <table className="calc-results-table report-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Calculation ID</td>
              <td style={{ fontFamily: 'monospace' }}>{calculation.id}</td>
            </tr>
            <tr>
              <td>Created</td>
              <td>{formatDate(calculation.createdAt)}</td>
            </tr>
            <tr>
              <td>Last Updated</td>
              <td>{formatDate(calculation.updatedAt)}</td>
            </tr>
            <tr>
              <td>Parameters</td>
              <td>
                Income: {formatCurrency(calculation.parameters.totalIncome ?? 0)}
                {calculation.parameters.pensionContributions && calculation.parameters.pensionContributions > 0 && (
                  <><br />Pension: {formatCurrency(calculation.parameters.pensionContributions)}</>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </MDJShell>
  );
}
