'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';

const TAX_YEARS = [
  { value: '2025-26', label: '2025-26 (Current)' },
  { value: '2024-25', label: '2024-25' },
  { value: '2023-24', label: '2023-24' },
  { value: '2022-23', label: '2022-23' },
];

type CalculationType = 'COMPANY_TAX' | 'PERSONAL_TAX' | 'SALARY_DIVIDEND' | 'SOLE_TRADER';

const CALCULATION_TYPES: Array<{
  value: CalculationType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'COMPANY_TAX',
    label: 'Company Tax',
    description: 'Corporation tax from company profit before tax',
    icon: '🏢',
  },
  {
    value: 'PERSONAL_TAX',
    label: 'Personal Tax',
    description: 'Personal tax calculation with SA302-style breakdown',
    icon: '👤',
  },
  {
    value: 'SALARY_DIVIDEND',
    label: 'Salary & Dividend Optimisation',
    description: 'Best split from available profit, plus optional salary checks',
    icon: '🎯',
  },
  {
    value: 'SOLE_TRADER',
    label: 'Sole Trader Tax',
    description: 'Income tax and Class 4 NICs on trading profits',
    icon: '🧾',
  },
];

const getTaxYearEndYear = (taxYear: string) => {
  const startYear = Number(taxYear.split('-')[0]);
  return Number.isFinite(startYear) ? startYear + 1 : new Date().getFullYear();
};

const padDatePart = (value: number) => String(value).padStart(2, '0');

const buildYearEndDate = (day?: number | null, month?: number | null, endYear?: number) => {
  if (!day || !month || !endYear) return '';
  return `${endYear}-${padDatePart(month)}-${padDatePart(day)}`;
};

export default function NewTaxCalculationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [yearEndTouched, setYearEndTouched] = useState(false);

  const [clientId, setClientId] = useState('');
  const [calculationType, setCalculationType] = useState<CalculationType>('SALARY_DIVIDEND');
  const [taxYear, setTaxYear] = useState('2025-26');
  const [companyYearEndDate, setCompanyYearEndDate] = useState('');
  const [companyInputMode, setCompanyInputMode] = useState<'PROFIT' | 'TURNOVER'>('PROFIT');

  const [companyProfitBeforeTax, setCompanyProfitBeforeTax] = useState(78000);
  const [annualRevenue, setAnnualRevenue] = useState(88000);
  const [annualExpenses, setAnnualExpenses] = useState(5000);
  const [annualPension, setAnnualPension] = useState(5000);
  const [annualGrossSalary, setAnnualGrossSalary] = useState(12570);

  const [personalSalary, setPersonalSalary] = useState(12570);
  const [personalDividends, setPersonalDividends] = useState(0);
  const [personalOtherIncome, setPersonalOtherIncome] = useState(0);
  const [personalPension, setPersonalPension] = useState(0);

  const [soleRevenue, setSoleRevenue] = useState(50000);
  const [soleExpenses, setSoleExpenses] = useState(10000);
  const [solePayClass2, setSolePayClass2] = useState(false);

  const [availableProfit, setAvailableProfit] = useState(78000);
  const [currentSalary, setCurrentSalary] = useState(12570);
  const [currentDividend, setCurrentDividend] = useState(0);
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(78000);
  const [salaryStep, setSalaryStep] = useState(1000);
  const [salaryChecks, setSalaryChecks] = useState('');
  const [includeNI, setIncludeNI] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    totalIncome: number;
    totalTaxableIncome: number;
    incomeTax: number;
    employeeNI: number;
    dividendTax: number;
    totalTax: number;
    netIncome: number;
  } | null>(null);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId), [clients, clientId]);
  const isCompanyClient = selectedClient?.type === 'COMPANY';

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const data = await api.getClients();
        const items = Array.isArray(data) ? data : [];
        setClients(items.map((c: any) => c.node ?? c));
      } catch (e) {
        console.error('Failed to load clients', e);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  useEffect(() => {
    const clientIdParam = searchParams.get('clientId');
    if (clientIdParam) {
      setClientId(clientIdParam);
    }
    const typeParam = searchParams.get('type');
    if (typeParam && CALCULATION_TYPES.some((type) => type.value === typeParam)) {
      setCalculationType(typeParam as CalculationType);
    }
    const taxYearParam = searchParams.get('taxYear');
    if (taxYearParam && TAX_YEARS.some((year) => year.value === taxYearParam)) {
      setTaxYear(taxYearParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!clientId || yearEndTouched) return;
    const selected = clients.find((client) => client.id === clientId);
    if (!selected || selected.type !== 'COMPANY') return;
    const endYear = getTaxYearEndYear(taxYear);
    const defaultDate = buildYearEndDate(
      selected.accountsAccountingReferenceDay ?? 31,
      selected.accountsAccountingReferenceMonth ?? 3,
      endYear
    );
    if (!defaultDate) return;
    setCompanyYearEndDate(defaultDate);
  }, [clients, clientId, taxYear, yearEndTouched]);

  const accountingPeriodEndYear = companyYearEndDate ? Number(companyYearEndDate.split('-')[0]) : undefined;

  const salaryChecksList = useMemo(() => {
    if (!salaryChecks.trim()) return [] as number[];
    return salaryChecks
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
  }, [salaryChecks]);

  const handleCalculate = async () => {
    if (!clientId) {
      alert('Please select a client.');
      return;
    }

    if (isCompanyClient && !companyYearEndDate && calculationType !== 'PERSONAL_TAX') {
      alert('Please enter the company year end date.');
      return;
    }

    try {
      setCalculating(true);
      let result;

      if (calculationType === 'COMPANY_TAX') {
        const profitBeforeTax = companyInputMode === 'TURNOVER'
          ? annualRevenue - annualExpenses - annualPension - annualGrossSalary
          : companyProfitBeforeTax;

        if (profitBeforeTax <= 0) {
          alert('Please enter a valid profit before tax.');
          return;
        }
        result = await api.post('/tax-calculations/enhanced/corporation-tax', {
          clientId,
          profit: companyInputMode === 'TURNOVER' ? undefined : profitBeforeTax,
          revenue: companyInputMode === 'TURNOVER' ? annualRevenue : undefined,
          expenses: companyInputMode === 'TURNOVER' ? annualExpenses : undefined,
          pensionContributions: companyInputMode === 'TURNOVER' ? annualPension : undefined,
          salaryExpense: companyInputMode === 'TURNOVER' ? annualGrossSalary : undefined,
          taxYear,
          accountingPeriodEndYear,
        });
      }

      if (calculationType === 'PERSONAL_TAX') {
        result = await api.post('/tax-calculations/enhanced/personal-tax', {
          clientId,
          salary: personalSalary,
          dividends: personalDividends,
          otherIncome: personalOtherIncome,
          pensionContributions: personalPension,
          taxYear,
        });
      }

      if (calculationType === 'SALARY_DIVIDEND') {
        if (availableProfit <= 0) {
          alert('Please enter a valid available profit.');
          return;
        }

        if (salaryChecksList.length > 0) {
          const scenarios = salaryChecksList.map((salary, index) => ({
            name: `Salary £${salary.toLocaleString('en-GB')}`,
            salary,
            dividend: 0,
          }));
          result = await api.post('/tax-calculations/enhanced/compare-scenarios', {
            scenarios,
            params: {
              clientId,
              taxYear,
              availableProfit,
              otherIncome: personalOtherIncome,
              personalAllowanceUsed: 0,
              dividendAllowanceUsed: 0,
              accountingPeriodEndYear,
            },
          });
        } else {
          result = await api.post('/tax-calculations/enhanced/optimize-salary', {
            clientId,
            availableProfit,
            taxYear,
            accountingPeriodEndYear,
            minSalary: salaryMin,
            maxSalary: salaryMax || availableProfit,
            salaryIncrement: salaryStep,
            currentSalary: currentSalary || undefined,
            currentDividend: currentDividend || undefined,
            otherIncome: personalOtherIncome,
            personalAllowanceUsed: 0,
            dividendAllowanceUsed: 0,
            considerEmployerNI: includeNI,
          });
        }
      }

      if (calculationType === 'SOLE_TRADER') {
        if (soleRevenue <= 0) {
          alert('Please enter a valid annual revenue.');
          return;
        }

        result = await api.post('/tax-calculations/enhanced/sole-trader', {
          clientId,
          revenue: soleRevenue,
          expenses: soleExpenses,
          taxYear,
          payClass2: solePayClass2,
        });
      }

      if (result?.id) {
        router.push(`/tax-calculations/${result.id}`);
        return;
      }

      alert('Calculation completed successfully.');
      router.push('/tax-calculations');
    } catch (e: any) {
      console.error('Failed to calculate tax', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'Unknown error';
      alert(`Failed to calculate tax: ${errorMessage}.`);
    } finally {
      setCalculating(false);
    }
  };

  const handlePreview = async () => {
    if (!clientId) {
      alert('Please select a client first.');
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const salary = currentSalary || 0;
      const dividends = currentDividend || 0;
      const otherIncome = personalOtherIncome || 0;

      const [incomeTaxResult, dividendTaxResult] = await Promise.all([
        api.post('/tax-calculations/calculate-income-tax', {
          salary,
          taxYear,
          pensionContributions: personalPension || 0,
        }),
        api.post('/tax-calculations/calculate-dividend-tax', {
          dividendAmount: dividends,
          otherIncome: salary + otherIncome,
          taxYear,
        }),
      ]);

      const totalIncome = salary + dividends + otherIncome;
      const totalTaxableIncome =
        (incomeTaxResult?.taxableIncome || 0) + (dividendTaxResult?.taxableDividend || 0);
      const incomeTax = incomeTaxResult?.incomeTax || 0;
      const employeeNI = incomeTaxResult?.employeeNI || 0;
      const dividendTax = dividendTaxResult?.totalDividendTax || 0;
      const totalTax = incomeTax + employeeNI + dividendTax;
      const netIncome = totalIncome - totalTax;

      setPreviewData({
        totalIncome,
        totalTaxableIncome,
        incomeTax,
        employeeNI,
        dividendTax,
        totalTax,
        netIncome,
      });
    } catch (e: any) {
      console.error('Failed to preview tax', e);
      const message = e?.response?.data?.message || e?.message || 'Unable to load preview.';
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <MDJShell
      pageTitle="New Tax Calculation"
      pageSubtitle="M Powered™ Tax Engine"
      showBack
      backHref="/tax-calculations"
      backLabel="Back to Tax Calculations"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Tax Calculations', href: '/tax-calculations' },
        { label: 'New Calculation' },
      ]}
      actions={[{ label: calculating ? 'Calculating...' : 'Run Calculation', onClick: handleCalculate, variant: 'primary' }]}
    >
      <div className="tax-page">
        <div className="card-mdj tax-section">
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Client & Calculation Type</h3>

          <div className="tax-form-grid" style={{ marginBottom: '1.5rem' }}>
            <div>
              <label className="label-mdj">Client</label>
              {loadingClients ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading clients...</p>
              ) : (
                <select
                  className="input-mdj"
                  value={clientId}
                  onChange={(e) => {
                    setYearEndTouched(false);
                    setClientId(e.target.value);
                  }}
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}{client.ref ? ` (${client.ref})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="label-mdj">Tax Year</label>
              <select
                className="input-mdj"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
              >
                {TAX_YEARS.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>

            {isCompanyClient && calculationType !== 'PERSONAL_TAX' && (
              <div>
                <label className="label-mdj">Company year end</label>
                <input
                  type="date"
                  className="input-mdj"
                  value={companyYearEndDate}
                  onChange={(e) => {
                    setYearEndTouched(true);
                    setCompanyYearEndDate(e.target.value);
                  }}
                />
              </div>
            )}
          </div>

          <div className="tax-card-grid">
            {CALCULATION_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setCalculationType(type.value)}
                className="card-mdj"
                style={{
                  textAlign: 'left',
                  border: calculationType === type.value ? '2px solid var(--gold)' : '1px solid var(--border-color)',
                  backgroundColor: calculationType === type.value ? 'var(--gold-bg)' : 'var(--bg-subtle)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
                  <strong style={{ color: calculationType === type.value ? 'var(--gold)' : 'inherit' }}>{type.label}</strong>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{type.description}</div>
              </button>
            ))}
          </div>
        </div>

      {calculationType === 'COMPANY_TAX' && (
        <div className="card-mdj tax-section">
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Company Tax Inputs</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Choose profit before tax or build it from turnover and expenses.
          </p>

          <div className="tax-toggle-group" style={{ marginBottom: '1.5rem' }}>
            <button
              type="button"
              className={`btn-outline-gold ${companyInputMode === 'PROFIT' ? 'btn-gold' : ''}`}
              onClick={() => setCompanyInputMode('PROFIT')}
            >
              Use profit before tax
            </button>
            <button
              type="button"
              className={`btn-outline-gold ${companyInputMode === 'TURNOVER' ? 'btn-gold' : ''}`}
              onClick={() => setCompanyInputMode('TURNOVER')}
            >
              Use turnover & expenses
            </button>
          </div>

          {companyInputMode === 'PROFIT' ? (
            <div className="tax-form-grid">
              <div>
                <label className="label-mdj">Profit before tax</label>
                <input
                  type="number"
                  className="input-mdj"
                  value={companyProfitBeforeTax}
                  onChange={(e) => setCompanyProfitBeforeTax(Number(e.target.value))}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="tax-form-grid">
                <div>
                  <label className="label-mdj">Annual revenue</label>
                  <input
                    type="number"
                    className="input-mdj"
                    value={annualRevenue}
                    onChange={(e) => setAnnualRevenue(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label-mdj">Annual business expenses</label>
                  <input
                    type="number"
                    className="input-mdj"
                    value={annualExpenses}
                    onChange={(e) => setAnnualExpenses(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label-mdj">Annual pension contribution</label>
                  <input
                    type="number"
                    className="input-mdj"
                    value={annualPension}
                    onChange={(e) => setAnnualPension(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label-mdj">Annual gross salary</label>
                  <input
                    type="number"
                    className="input-mdj"
                    value={annualGrossSalary}
                    onChange={(e) => setAnnualGrossSalary(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <div className="tax-preview-row">
                  <strong>Profit before tax</strong>
                  <strong>
                    £{(annualRevenue - annualExpenses - annualPension - annualGrossSalary).toFixed(2)}
                  </strong>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                  Employer NIC is calculated in the final summary based on tax year rules.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {calculationType === 'PERSONAL_TAX' && (
        <div className="card-mdj tax-section">
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Personal Tax Inputs</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Enter all personal income sources to calculate an SA302-style breakdown.
          </p>
          <div className="tax-form-grid">
            <div>
              <label className="label-mdj">Salary</label>
              <input
                type="number"
                className="input-mdj"
                value={personalSalary}
                onChange={(e) => setPersonalSalary(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Dividends</label>
              <input
                type="number"
                className="input-mdj"
                value={personalDividends}
                onChange={(e) => setPersonalDividends(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Other income</label>
              <input
                type="number"
                className="input-mdj"
                value={personalOtherIncome}
                onChange={(e) => setPersonalOtherIncome(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Pension contributions</label>
              <input
                type="number"
                className="input-mdj"
                value={personalPension}
                onChange={(e) => setPersonalPension(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {calculationType === 'SALARY_DIVIDEND' && (
        <div className="card-mdj tax-section">
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Salary & Dividend Optimisation</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Available profit is pre-extraction company profit (before salary, employer NI, corporation tax, and dividends).
          </p>

          <div className="tax-form-grid" style={{ marginBottom: '1.5rem' }}>
            <div>
              <label className="label-mdj">Available profit</label>
              <input
                type="number"
                className="input-mdj"
                value={availableProfit}
                onChange={(e) => setAvailableProfit(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Current salary (optional)</label>
              <input
                type="number"
                className="input-mdj"
                value={currentSalary}
                onChange={(e) => setCurrentSalary(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Current dividend (optional)</label>
              <input
                type="number"
                className="input-mdj"
                value={currentDividend}
                onChange={(e) => setCurrentDividend(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Other income</label>
              <input
                type="number"
                className="input-mdj"
                value={personalOtherIncome}
                onChange={(e) => setPersonalOtherIncome(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="tax-preview" style={{ marginBottom: '1.5rem' }}>
            <div className="tax-preview-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <strong>Quick Salary & Dividend Preview</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Preview personal tax based on the current salary/dividend inputs.
                </div>
              </div>
              <button className="btn-outline-gold" onClick={handlePreview} disabled={previewLoading || !clientId}>
                {previewLoading ? 'Previewing...' : 'Preview Tax'}
              </button>
            </div>

            {previewError && (
              <div style={{ color: 'var(--danger)', marginTop: '0.75rem' }}>{previewError}</div>
            )}

            {previewData && (
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div className="tax-preview-row">
                  <span>Your Total Income</span>
                  <strong>£{previewData.totalIncome.toFixed(2)}</strong>
                </div>
                <div className="tax-preview-row">
                  <span>Your Total Taxable Income</span>
                  <strong>£{previewData.totalTaxableIncome.toFixed(2)}</strong>
                </div>
                <div className="tax-preview-row">
                  <span>Income Tax on Salary</span>
                  <strong>£{previewData.incomeTax.toFixed(2)}</strong>
                </div>
                <div className="tax-preview-row">
                  <span>Employees NI on Salary (Paid by You)</span>
                  <strong>£{previewData.employeeNI.toFixed(2)}</strong>
                </div>
                <div className="tax-preview-highlight">
                  <span>Total Dividend Tax</span>
                  <span>£{previewData.dividendTax.toFixed(2)}</span>
                </div>
                <div className="tax-preview-row">
                  <span>Total Personal Tax Liability</span>
                  <strong>£{previewData.totalTax.toFixed(2)}</strong>
                </div>
                <div className="tax-preview-row">
                  <span>Your Take Home Pay</span>
                  <strong>£{previewData.netIncome.toFixed(2)}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="tax-form-grid" style={{ marginBottom: '1.5rem' }}>
            <div>
              <label className="label-mdj">Minimum salary</label>
              <input
                type="number"
                className="input-mdj"
                value={salaryMin}
                onChange={(e) => setSalaryMin(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Maximum salary</label>
              <input
                type="number"
                className="input-mdj"
                value={salaryMax}
                onChange={(e) => setSalaryMax(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Salary step</label>
              <input
                type="number"
                className="input-mdj"
                value={salaryStep}
                onChange={(e) => setSalaryStep(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Include employer NI</label>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={includeNI}
                    onChange={(e) => setIncludeNI(e.target.checked)}
                  />
                  <span>Yes</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="label-mdj">Salary checks (comma-separated, optional)</label>
            <input
              className="input-mdj"
              placeholder="e.g. 5000, 10000, 12570, 15000"
              value={salaryChecks}
              onChange={(e) => setSalaryChecks(e.target.value)}
            />
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
              When provided, we will run scenario checks for each salary instead of optimisation.
            </div>
          </div>
        </div>
      )}

      {calculationType === 'SOLE_TRADER' && (
        <div className="card-mdj tax-section">
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Sole Trader Tax Calculator</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Income tax and Class 4 NICs are based on your annual profits after expenses.
          </p>
          <div className="tax-form-grid" style={{ marginBottom: '1.5rem' }}>
            <div>
              <label className="label-mdj">Annual revenue</label>
              <input
                type="number"
                className="input-mdj"
                value={soleRevenue}
                onChange={(e) => setSoleRevenue(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-mdj">Annual expenses</label>
              <input
                type="number"
                className="input-mdj"
                value={soleExpenses}
                onChange={(e) => setSoleExpenses(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={solePayClass2}
                onChange={(e) => setSolePayClass2(e.target.checked)}
              />
              <span>Pay Class 2 NICs if profits are below £6,845</span>
            </label>
          </div>

          <div className="tax-preview">
            <div className="tax-preview-row" style={{ marginBottom: '0.5rem' }}>
              <span>Annual Revenue</span>
              <strong>£{soleRevenue.toFixed(2)}</strong>
            </div>
            <div className="tax-preview-row" style={{ marginBottom: '0.5rem' }}>
              <span>Annual Expenses</span>
              <strong>£{soleExpenses.toFixed(2)}</strong>
            </div>
            <div className="tax-preview-row" style={{ marginBottom: '0.5rem' }}>
              <strong>Profits before tax</strong>
              <strong>£{Math.max(0, soleRevenue - soleExpenses).toFixed(2)}</strong>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Class 4 NICs: 6% on profits between £12,570 and £50,270, then 2% above.
            </div>
          </div>
        </div>
      )}

      <div className="card-mdj tax-section">
        <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Ready to calculate</h3>
        <div style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          We’ll generate a full report and take you to the calculation detail screen.
        </div>
        <button className="btn-gold" onClick={handleCalculate} disabled={calculating || !clientId}>
          {calculating ? 'Calculating...' : 'Run Calculation'}
        </button>
      </div>
      </div>
    </MDJShell>
  );
}
