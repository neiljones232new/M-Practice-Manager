'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createRoot } from 'react-dom/client';
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
    salaryExpense?: number;
    dividends?: number;
    pensionContributions?: number;
    otherIncome?: number;
    corporationTaxRate?: number;
    dividendTaxRate?: number;
    employerNIC?: number;
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

interface ReportLayoutProps {
  reportTitle: string;
  clientName: string;
  taxYear: string;
  reportDate: string;
  grossProfit: string;
  totalTax: string;
  netTakeHome: string;
  effectiveRate: string;
  salary: string;
  dividends: string;
  companyLedger: {
    availableProfit: string;
    directorSalary: string;
    employerNIC: string;
    taxableProfit: string;
    corporationTax: string;
    dividendPool: string;
  };
  personalLedger: {
    grossSalary: string;
    incomeTaxAndNI: string;
    grossDividends: string;
    dividendTax: string;
    netTakeHome: string;
  };
  taxBreakdown: {
    corporationTax: string;
    employerNI: string;
    dividendTax: string;
    payeNI: string;
  };
  totalTaxLiability: string;
  reportId: string;
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

  const formatMaybeCurrency = (value?: number) => {
    if (!Number.isFinite(value)) return '—';
    return formatCurrency(value as number);
  };

  const reportStyles = `
    :root{
      --purple-900:#2e1065;
      --purple-800:#4c1d95;
      --purple-700:#6d28d9;
      --purple-600:#7c3aed;
      --purple-500:#8b5cf6;
      --purple-400:#a78bfa;
      --purple-300:#d8b4fe;
      --purple-200:#c4b5fd;
      --purple-100:#ede9fe;
      --purple-50:#f5f3ff;

      --ink:#1e293b;
      --muted:#64748b;
      --line:#e2e8f0;
      --panel:#ffffff;
      --panel-soft:#f8fafc;
      --bg-soft:#f1f5f9;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08);
    }

    *{box-sizing:border-box}
    body{
      margin:0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size:13.5px;
      color:var(--ink);
      background: var(--bg-soft);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .app{
      max-width:920px;
      margin:40px auto;
      padding:0 24px;
    }

    .reportHeader{
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 32px;
      box-shadow: var(--shadow-lg);
      margin-bottom: 24px;
    }
    .reportHeaderInner{
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap: 24px;
    }

    .clientIdentity .label {
      font-size: 11px;
      font-weight: 700;
      color: var(--purple-600);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }
    .clientIdentity .clientName {
      font-size: 26px;
      font-weight: 900;
      color: var(--purple-900);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .clientIdentity .meta {
      margin-top: 8px;
      font-size: 13px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .clientIdentity .meta .dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--line);
    }

    .reportBrand{
      display:flex;
      align-items:center;
      gap: 12px;
      padding-bottom: 4px;
    }
    .reportLogo{
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #fff;
      border: 1px solid var(--line);
      display:flex;
      align-items:center;
      justify-content:center;
      overflow: hidden;
    }
    .reportLogo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .reportBrandText {
      text-align: right;
    }
    .reportBrandText .firm{
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
    }
    .reportBrandText .tagline{
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .panel{
      background:var(--panel);
      border:1px solid var(--line);
      border-radius:20px;
      padding:32px;
      margin-bottom:24px;
      box-shadow: var(--shadow);
    }
    .panel.soft{
      background: linear-gradient(145deg, #ffffff, var(--panel-soft));
    }

    .sectionHeader {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .sectionHeader svg {
      width: 20px;
      height: 20px;
      color: var(--purple-600);
    }
    h2 {
      font-size: 17px;
      font-weight: 700;
      margin: 0;
      color: var(--purple-900);
      letter-spacing: -0.01em;
    }

    .kpis{
      display:grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi{
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 16px;
      padding: 16px;
      transition: all 0.2s ease;
    }
    .kpi .label{
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .kpi .value{
      font-size: 18px;
      font-weight: 800;
      margin: 8px 0 4px;
      color: var(--ink);
    }
    .kpi .hint{
      font-size: 10.5px;
      color: var(--muted);
      line-height: 1.3;
    }

    .kpi.primary{
      background: var(--purple-50);
      border: 1px solid var(--purple-200);
    }
    .kpi.primary .label { color: var(--purple-700); }
    .kpi.primary .value { color: var(--purple-900); }
    .kpi.primary .hint { color: var(--purple-500); }

    table{
      width:100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    th, td{
      padding: 12px 0;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    th{
      text-align: left;
      font-weight: 500;
      color: var(--muted);
      width: 65%;
    }
    td{
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .total-row th, .total-row td {
      border-bottom: none;
      padding-top: 16px;
      font-size: 15px;
      color: var(--purple-900);
    }
    .total-row td {
      color: var(--purple-700);
    }

    .cols{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }
    .card h3 {
      margin-top: 0;
      padding-bottom: 8px;
      border-bottom: 1.5px solid var(--purple-100);
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
    }

    .note{
      background: var(--purple-50);
      border: 1px solid var(--purple-100);
      padding: 16px;
      border-radius: 14px;
      margin: 16px 0;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .note svg {
      width: 18px;
      height: 18px;
      color: var(--purple-600);
      flex-shrink: 0;
      margin-top: 2px;
    }
    .note-content {
      font-size: 12.5px;
      color: var(--purple-900);
    }

    .approvalGrid{
      display:grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 24px;
    }
    .sig{
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px;
      background: var(--panel-soft);
    }
    .sig .label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--muted);
      margin-bottom: 12px;
    }
    .sig .line{
      border-bottom: 1.5px solid var(--line);
      height: 24px;
    }

    .footer{
      margin-top: 40px;
      padding: 24px;
      text-align: center;
      border-top: 1px solid var(--line);
      font-size: 11px;
      color: var(--muted);
    }

    @media (max-width: 860px){
      .kpis{ grid-template-columns: repeat(2, 1fr); }
      .cols{ grid-template-columns: 1fr; gap: 24px; }
      .reportHeaderInner{ flex-direction:column; align-items:flex-start; text-align:left; }
      .reportBrandText { text-align: left; }
      .reportBrand { flex-direction: row-reverse; align-self: flex-start; }
    }

    @media print{
      body{ background: #fff; }
      .app{ margin: 0; max-width: 100%; padding: 0; }
      .panel, .reportHeader { box-shadow: none; border: 1px solid #eee; }
      .kpi.primary { background: #fff !important; color: #000 !important; border: 1.5px solid #000 !important; }
      .kpi.primary * { color: #000 !important; }
    }
  `;

  const ReportLayout = ({
    reportTitle,
    clientName: reportClientName,
    taxYear,
    reportDate,
    grossProfit,
    totalTax,
    netTakeHome,
    effectiveRate,
    salary,
    dividends,
    companyLedger,
    personalLedger,
    taxBreakdown,
    totalTaxLiability,
    reportId,
  }: ReportLayoutProps) => (
    <div className="app">
      <header className="reportHeader">
        <div className="reportHeaderInner">
          <div className="clientIdentity">
            <div className="label">{reportTitle}</div>
            <div className="clientName">{reportClientName}</div>
            <div className="meta">
              <span>Tax Year {taxYear}</span>
              <span className="dot" />
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Salary and Dividend Optimisation</span>
            </div>
          </div>

          <div className="reportBrand">
            <div className="reportBrandText">
              <div className="tagline">Prepared By</div>
              <div className="firm">M Practice Manager</div>
            </div>
            <div className="reportLogo">
              <img src="/mdj_goldlogo.png" alt="M Practice Manager Logo" />
            </div>
          </div>
        </div>
      </header>

      <section className="panel soft">
        <div className="sectionHeader">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <h2>Executive Summary</h2>
        </div>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
          This report outlines the recommended extraction strategy for <strong>{reportClientName}</strong>. Our objective is to
          utilise the personal tax allowances to minimise the effective tax rate on company profits.
        </p>

        <div className="note">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          <div className="note-content">
            <strong>Optimal Extraction:</strong> The figures below represent the highest possible net take-home income while ensuring all corporate and personal liabilities are fully accounted for.
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          <h2>Performance Indicators</h2>
        </div>

        <div className="kpis">
          <div className="kpi">
            <div className="label">Gross Profit</div>
            <div className="value">{grossProfit}</div>
            <div className="hint">Pre-extraction earnings</div>
          </div>

          <div className="kpi">
            <div className="label">Total Tax</div>
            <div className="value">{totalTax}</div>
            <div className="hint">Combined Liability</div>
          </div>

          <div className="kpi primary">
            <div className="label">Net Take-Home</div>
            <div className="value">{netTakeHome}</div>
            <div className="hint">Extracted net income</div>
          </div>

          <div className="kpi">
            <div className="label">Effective Rate</div>
            <div className="value">{effectiveRate}</div>
            <div className="hint">Tax efficiency ratio</div>
          </div>
        </div>

        <div style={{ background: 'var(--panel-soft)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--purple-900)' }}>Recommended Strategy</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Salary: <strong style={{ color: 'var(--ink)' }}>{salary}</strong> &nbsp;•&nbsp;
            Dividends: <strong style={{ color: 'var(--ink)' }}>{dividends}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v5h5"/><path d="M9 7h1"/><path d="M9 11h6"/><path d="M9 15h6"/></svg>
          <h2>Financial Reconciliation</h2>
        </div>

        <div className="cols">
          <div className="card">
            <h3>Company Ledger</h3>
            <table>
              <tbody>
                <tr><th>Available Profit</th><td>{companyLedger.availableProfit}</td></tr>
                <tr><th>Director Salary</th><td>({companyLedger.directorSalary})</td></tr>
                <tr><th>Employer NIC</th><td>({companyLedger.employerNIC})</td></tr>
                <tr style={{ borderTop: '1.5px solid var(--purple-100)' }}><th>Taxable Profit</th><td>{companyLedger.taxableProfit}</td></tr>
                <tr><th>Corporation Tax</th><td>({companyLedger.corporationTax})</td></tr>
                <tr className="total-row"><th>Dividend Pool</th><td>{companyLedger.dividendPool}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Personal Ledger</h3>
            <table>
              <tbody>
                <tr><th>Gross Salary</th><td>{personalLedger.grossSalary}</td></tr>
                <tr><th>Income Tax &amp; NI</th><td>{personalLedger.incomeTaxAndNI}</td></tr>
                <tr style={{ borderTop: '1.5px solid var(--purple-100)' }}><th>Gross Dividends</th><td>{personalLedger.grossDividends}</td></tr>
                <tr><th>Dividend Tax</th><td>({personalLedger.dividendTax})</td></tr>
                <tr className="total-row"><th>Net Take-Home</th><td>{personalLedger.netTakeHome}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel soft">
        <div className="sectionHeader">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <h2>Tax Liability Summary</h2>
        </div>

        <div className="cols" style={{ marginBottom: '24px' }}>
          <div className="card">
            <h3>Corporate Taxes</h3>
            <table>
              <tbody>
                <tr><th>Corporation Tax</th><td>{taxBreakdown.corporationTax}</td></tr>
                <tr><th>Employer NI</th><td>{taxBreakdown.employerNI}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3>Personal Taxes</h3>
            <table>
              <tbody>
                <tr><th>Dividend Tax</th><td>{taxBreakdown.dividendTax}</td></tr>
                <tr><th>PAYE/NI</th><td>{taxBreakdown.payeNI}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1.5px solid var(--purple-100)', borderRadius: '16px', padding: '20px' }}>
          <table style={{ margin: 0 }}>
            <tbody>
              <tr className="total-row">
                <th style={{ fontWeight: 800, color: 'var(--ink)' }}>Total Consolidated Tax Liability</th>
                <td style={{ fontSize: '20px', fontWeight: 800, color: 'var(--purple-700)' }}>{totalTaxLiability}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          <h2>Director Approval</h2>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
          I confirm the accuracy of the figures presented and authorise the implementation of this strategy.
        </p>

        <div className="approvalGrid">
          <div className="sig">
            <div className="label">Authorised Name</div>
            <div className="line" />
          </div>
          <div className="sig">
            <div className="label">Signature</div>
            <div className="line" />
          </div>
          <div className="sig">
            <div className="label">Date of Approval</div>
            <div className="line" />
          </div>
          <div className="sig">
            <div className="label">Method</div>
            <div className="line" style={{ border: 'none', fontSize: '12px', color: 'var(--ink)', paddingTop: '8px' }}>Digital Confirmation</div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>M Practice Manager</div>
        <div>Report Generated via M Powered Tax Engine &nbsp;•&nbsp; Ref: {reportId}</div>
        <div style={{ marginTop: '8px', opacity: 0.6 }}>Report generated on {reportDate}. Professional advice recommended.</div>
      </footer>
    </div>
  );

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
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export the report');
        return;
      }
      const reportRateLabel = reportRate !== undefined ? formatPercentage(reportRate) : '—';
      const incomeTaxTotal = exportPersonal
        ? exportPersonal.incomeTaxByBand.basicRate + exportPersonal.incomeTaxByBand.higherRate + exportPersonal.incomeTaxByBand.additionalRate
        : exportBreakdown?.incomeTax;
      const dividendTaxTotal = exportPersonal
        ? exportPersonal.dividendTaxByBand.basicRate + exportPersonal.dividendTaxByBand.higherRate + exportPersonal.dividendTaxByBand.additionalRate
        : exportBreakdown?.dividendTax;
      const employeeNI = exportPersonal?.nationalInsurance.employeeNIC ?? 0;
      const employerNI = exportPersonal?.nationalInsurance.employerNIC ?? exportCompany?.employerNIC ?? 0;

      const reportData: ReportLayoutProps = {
        reportTitle: getCalculationTypeLabel(calculation.calculationType),
        clientName: clientDisplayName,
        taxYear: calculation.taxYear,
        reportDate: formatDate(new Date().toISOString()),
        grossProfit: formatMaybeCurrency(exportCompany?.profitBeforeTax ?? exportSummary?.grossIncome),
        totalTax: formatMaybeCurrency(exportSummary?.totalTax ?? exportPersonal?.totalTax),
        netTakeHome: formatMaybeCurrency(exportSummary?.netIncome ?? exportPersonal?.netTakeHome),
        effectiveRate: reportRateLabel,
        salary: formatMaybeCurrency(exportCompany?.salaryExpense ?? calculation.parameters.salary),
        dividends: formatMaybeCurrency(exportCompany?.dividendsPaid ?? calculation.parameters.dividends),
        companyLedger: {
          availableProfit: formatMaybeCurrency(exportCompany?.profitBeforeTax ?? exportSummary?.grossIncome),
          directorSalary: formatMaybeCurrency(exportCompany?.salaryExpense ?? calculation.parameters.salary),
          employerNIC: formatMaybeCurrency(exportCompany?.employerNIC ?? 0),
          taxableProfit: formatMaybeCurrency(exportCompany?.taxableProfit ?? 0),
          corporationTax: formatMaybeCurrency(exportCompany?.corporationTax ?? 0),
          dividendPool: formatMaybeCurrency(exportCompany?.dividendsPaid ?? 0),
        },
        personalLedger: {
          grossSalary: formatMaybeCurrency(exportCompany?.salaryExpense ?? calculation.parameters.salary),
          incomeTaxAndNI: formatMaybeCurrency((incomeTaxTotal ?? 0) + employeeNI),
          grossDividends: formatMaybeCurrency(exportCompany?.dividendsPaid ?? 0),
          dividendTax: formatMaybeCurrency(dividendTaxTotal ?? 0),
          netTakeHome: formatMaybeCurrency(exportPersonal?.netTakeHome ?? exportSummary?.netIncome),
        },
        taxBreakdown: {
          corporationTax: formatMaybeCurrency(exportBreakdown?.corporationTax ?? exportCompany?.corporationTax ?? 0),
          employerNI: formatMaybeCurrency(employerNI),
          dividendTax: formatMaybeCurrency(dividendTaxTotal ?? 0),
          payeNI: formatMaybeCurrency((incomeTaxTotal ?? 0) + employeeNI),
        },
        totalTaxLiability: formatMaybeCurrency(exportSummary?.totalTax ?? exportPersonal?.totalTax),
        reportId: calculation.id,
      };

      const reportContent = `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>${reportData.reportTitle} | M Practice Manager</title>
            <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');</style>
            <style>${reportStyles}</style>
          </head>
          <body>
            <div id="report-root"></div>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(reportContent);
      printWindow.document.close();

      const rootNode = printWindow.document.getElementById('report-root');
      if (!rootNode) {
        alert('Failed to render report output.');
        return;
      }
      const root = createRoot(rootNode);
      root.render(<ReportLayout {...reportData} />);
      
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
  const corpSalaryExpense = calculation.parameters.salaryExpense ?? calculation.parameters.salary ?? 0;
  const corpEmployerNIC = calculation.parameters.employerNIC ?? reportCompany?.employerNIC ?? 0;
  const corpTotalExpenses =
    (calculation.parameters.expenses ?? 0)
    + (calculation.parameters.pensionContributions ?? 0)
    + (corpSalaryExpense ?? 0)
    + (corpEmployerNIC ?? 0);

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
                    <td className="num">{formatCurrency(corpSalaryExpense ?? 0)}</td>
                  </tr>
                  <tr>
                    <td>Employers NIC</td>
                    <td className="num">{formatCurrency(corpEmployerNIC ?? 0)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total expenses</td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(corpTotalExpenses ?? 0)}</td>
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
