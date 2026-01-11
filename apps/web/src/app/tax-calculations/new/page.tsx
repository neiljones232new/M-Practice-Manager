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

type CalculationType = 'COMPANY_TAX' | 'PERSONAL_TAX' | 'SALARY_DIVIDEND';

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

  const [companyProfitBeforeTax, setCompanyProfitBeforeTax] = useState(78000);

  const [personalSalary, setPersonalSalary] = useState(12570);
  const [personalDividends, setPersonalDividends] = useState(0);
  const [personalOtherIncome, setPersonalOtherIncome] = useState(0);
  const [personalPension, setPersonalPension] = useState(0);

  const [availableProfit, setAvailableProfit] = useState(78000);
  const [currentSalary, setCurrentSalary] = useState(12570);
  const [currentDividend, setCurrentDividend] = useState(0);
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(78000);
  const [salaryStep, setSalaryStep] = useState(1000);
  const [salaryChecks, setSalaryChecks] = useState('');
  const [includeNI, setIncludeNI] = useState(true);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId), [clients, clientId]);
  const isCompanyClient = selectedClient?.type === 'COMPANY';

  useEffect(() => {
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

    fetchClients();
  }, []);

  useEffect(() => {
    const clientIdParam = searchParams.get('clientId');
    if (clientIdParam) {
      setClientId(clientIdParam);
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
        if (companyProfitBeforeTax <= 0) {
          alert('Please enter a valid profit before tax.');
          return;
        }
        result = await api.post('/tax-calculations/enhanced/corporation-tax', {
          clientId,
          profit: companyProfitBeforeTax,
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
            dividend: availableProfit,
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
      <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Client & Calculation Type</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Company Tax Inputs</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Use profit before tax from the accounts. Adjustments can be added later.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
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
        </div>
      )}

      {calculationType === 'PERSONAL_TAX' && (
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Personal Tax Inputs</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Enter all personal income sources to calculate an SA302-style breakdown.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
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
        <div className="card-mdj" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Salary & Dividend Optimisation</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Available profit is pre-extraction company profit (before salary, employer NI, corporation tax, and dividends).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
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

      <div className="card-mdj">
        <h3 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>Ready to calculate</h3>
        <div style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          We’ll generate a full report and take you to the calculation detail screen.
        </div>
        <button className="btn-gold" onClick={handleCalculate} disabled={calculating || !clientId}>
          {calculating ? 'Calculating...' : 'Run Calculation'}
        </button>
      </div>
    </MDJShell>
  );
}
