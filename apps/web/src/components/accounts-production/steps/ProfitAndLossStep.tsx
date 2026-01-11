'use client';

import { useState, useEffect } from 'react';
import { AccountsSet, ProfitAndLossSection } from '@/lib/types';
import { MDJCard, MDJInput } from '@/components/mdj-ui';

interface ProfitAndLossStepProps {
  accountsSet: AccountsSet;
  onUpdate: (data: ProfitAndLossSection) => void;
}

export function ProfitAndLossStep({ accountsSet, onUpdate }: ProfitAndLossStepProps) {
  const isFirstYear = accountsSet.period?.isFirstYear ?? true;
  
  const [formData, setFormData] = useState<ProfitAndLossSection>(() => {
    const defaultLines = {
      turnover: 0,
      costOfSales: 0,
      otherIncome: 0,
      adminExpenses: 0,
      wages: 0,
      rent: 0,
      motor: 0,
      professionalFees: 0,
      otherExpenses: 0,
      interestPayable: 0,
      taxCharge: 0,
      dividendsDeclared: 0
    };

    const existingData = accountsSet.sections.profitAndLoss || {
      lines: defaultLines
    };

    const normalizedLines = {
      ...defaultLines,
      ...(existingData.lines || {})
    };

    const normalizedComparatives = existingData.comparatives?.priorYearLines
      ? { ...defaultLines, ...existingData.comparatives.priorYearLines }
      : { ...defaultLines };

    const normalizedData: ProfitAndLossSection = {
      ...existingData,
      lines: normalizedLines,
      ...(existingData.comparatives
        ? { comparatives: { priorYearLines: normalizedComparatives } }
        : {})
    };

    // For subsequent year accounts, ensure comparatives exist
    if (!isFirstYear && !normalizedData.comparatives) {
      normalizedData.comparatives = {
        priorYearLines: { ...defaultLines }
      };
    }

    return normalizedData;
  });

  // Ensure the parent component gets the properly validated data on mount
  useEffect(() => {
    onUpdate(formData);
  }, []); // Only run on mount

  const handleInputChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    
    setFormData(prev => {
      const safeLines = prev.lines || {
        turnover: 0,
        costOfSales: 0,
        otherIncome: 0,
        adminExpenses: 0,
        wages: 0,
        rent: 0,
        motor: 0,
        professionalFees: 0,
        otherExpenses: 0,
        interestPayable: 0,
        taxCharge: 0,
        dividendsDeclared: 0
      };

      const newData = {
        ...prev,
        lines: {
          ...safeLines,
          [field]: numericValue
        }
      };

      // For subsequent year accounts, ensure comparatives exist
      if (!isFirstYear && !newData.comparatives) {
        newData.comparatives = {
          priorYearLines: {
            turnover: 0,
            costOfSales: 0,
            otherIncome: 0,
            adminExpenses: 0,
            wages: 0,
            rent: 0,
            motor: 0,
            professionalFees: 0,
            otherExpenses: 0,
            interestPayable: 0,
            taxCharge: 0,
            dividendsDeclared: 0
          }
        };
      }
      
      // Call onUpdate with the new data immediately when user makes changes
      onUpdate(newData);
      
      return newData;
    });
  };

  const handleComparativeChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setFormData(prev => {
      const comparatives = prev.comparatives?.priorYearLines || {
        turnover: 0,
        costOfSales: 0,
        otherIncome: 0,
        adminExpenses: 0,
        wages: 0,
        rent: 0,
        motor: 0,
        professionalFees: 0,
        otherExpenses: 0,
        interestPayable: 0,
        taxCharge: 0,
        dividendsDeclared: 0
      };

      const newData: ProfitAndLossSection = {
        ...prev,
        comparatives: {
          priorYearLines: {
            ...comparatives,
            [field]: numericValue
          }
        }
      };

      onUpdate(newData);
      return newData;
    });
  };

  // Calculate derived values
  const grossProfit = formData.lines.turnover - formData.lines.costOfSales;
  const totalIncome = grossProfit + formData.lines.otherIncome;
  const totalExpenses = formData.lines.adminExpenses + formData.lines.wages + formData.lines.rent + 
                       formData.lines.motor + formData.lines.professionalFees + formData.lines.otherExpenses;
  const operatingProfit = totalIncome - totalExpenses;
  const profitBeforeTax = operatingProfit - formData.lines.interestPayable;
  const profitAfterTax = profitBeforeTax - formData.lines.taxCharge;
  const retainedProfitForYear = profitAfterTax - formData.lines.dividendsDeclared;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCalculationStyle = (amount: number) => ({
    fontWeight: 600,
    color: amount < 0 ? 'var(--danger)' : 'var(--success)',
    fontSize: '1rem'
  });

  const inputRowStyle = {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: isFirstYear ? '1fr' : '1fr 1fr'
  };

  const fullRowStyle = isFirstYear ? undefined : { gridColumn: '1 / -1' };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Revenue Section */}
      <MDJCard title="Revenue">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Turnover' : 'Turnover (Current Year)'}
              type="number"
              value={formData.lines.turnover.toString()}
              onChange={(e) => handleInputChange('turnover', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Turnover (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.turnover ?? 0).toString()}
                onChange={(e) => handleComparativeChange('turnover', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Cost of Sales' : 'Cost of Sales (Current Year)'}
              type="number"
              value={formData.lines.costOfSales.toString()}
              onChange={(e) => handleInputChange('costOfSales', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Cost of Sales (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.costOfSales ?? 0).toString()}
                onChange={(e) => handleComparativeChange('costOfSales', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...fullRowStyle
          }}>
            <strong>Gross Profit:</strong>
            <span style={getCalculationStyle(grossProfit)}>
              {formatCurrency(grossProfit)}
            </span>
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Other Income' : 'Other Income (Current Year)'}
              type="number"
              value={formData.lines.otherIncome.toString()}
              onChange={(e) => handleInputChange('otherIncome', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Other Income (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.otherIncome ?? 0).toString()}
                onChange={(e) => handleComparativeChange('otherIncome', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--status-info-bg)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...fullRowStyle
          }}>
            <strong>Total Income:</strong>
            <span style={getCalculationStyle(totalIncome)}>
              {formatCurrency(totalIncome)}
            </span>
          </div>
        </div>
      </MDJCard>

      {/* Expenses Section */}
      <MDJCard title="Operating Expenses">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Administrative Expenses' : 'Administrative Expenses (Current Year)'}
              type="number"
              value={formData.lines.adminExpenses.toString()}
              onChange={(e) => handleInputChange('adminExpenses', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Administrative Expenses (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.adminExpenses ?? 0).toString()}
                onChange={(e) => handleComparativeChange('adminExpenses', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Wages & Salaries' : 'Wages & Salaries (Current Year)'}
              type="number"
              value={formData.lines.wages.toString()}
              onChange={(e) => handleInputChange('wages', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Wages & Salaries (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.wages ?? 0).toString()}
                onChange={(e) => handleComparativeChange('wages', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Rent & Rates' : 'Rent & Rates (Current Year)'}
              type="number"
              value={formData.lines.rent.toString()}
              onChange={(e) => handleInputChange('rent', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Rent & Rates (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.rent ?? 0).toString()}
                onChange={(e) => handleComparativeChange('rent', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Motor Expenses' : 'Motor Expenses (Current Year)'}
              type="number"
              value={formData.lines.motor.toString()}
              onChange={(e) => handleInputChange('motor', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Motor Expenses (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.motor ?? 0).toString()}
                onChange={(e) => handleComparativeChange('motor', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Professional Fees' : 'Professional Fees (Current Year)'}
              type="number"
              value={formData.lines.professionalFees.toString()}
              onChange={(e) => handleInputChange('professionalFees', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Professional Fees (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.professionalFees ?? 0).toString()}
                onChange={(e) => handleComparativeChange('professionalFees', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Other Expenses' : 'Other Expenses (Current Year)'}
              type="number"
              value={formData.lines.otherExpenses.toString()}
              onChange={(e) => handleInputChange('otherExpenses', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Other Expenses (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.otherExpenses ?? 0).toString()}
                onChange={(e) => handleComparativeChange('otherExpenses', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...fullRowStyle
          }}>
            <strong>Total Operating Expenses:</strong>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--status-info-bg)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...fullRowStyle
          }}>
            <strong>Operating Profit:</strong>
            <span style={getCalculationStyle(operatingProfit)}>
              {formatCurrency(operatingProfit)}
            </span>
          </div>
        </div>
      </MDJCard>

      {/* Finance & Tax Section */}
      <MDJCard title="Finance Costs & Taxation">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Interest Payable' : 'Interest Payable (Current Year)'}
              type="number"
              value={formData.lines.interestPayable.toString()}
              onChange={(e) => handleInputChange('interestPayable', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Interest Payable (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.interestPayable ?? 0).toString()}
                onChange={(e) => handleComparativeChange('interestPayable', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...fullRowStyle
          }}>
            <strong>Profit Before Tax:</strong>
            <span style={getCalculationStyle(profitBeforeTax)}>
              {formatCurrency(profitBeforeTax)}
            </span>
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Tax Charge' : 'Tax Charge (Current Year)'}
              type="number"
              value={formData.lines.taxCharge.toString()}
              onChange={(e) => handleInputChange('taxCharge', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Tax Charge (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.taxCharge ?? 0).toString()}
                onChange={(e) => handleComparativeChange('taxCharge', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: 'var(--brand-primary)', 
            color: 'white',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...fullRowStyle
          }}>
            <strong style={{ fontSize: '1.1rem' }}>Profit After Tax:</strong>
            <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>
              {formatCurrency(profitAfterTax)}
            </span>
          </div>

          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Dividends Declared' : 'Dividends Declared (Current Year)'}
              type="number"
              value={formData.lines.dividendsDeclared.toString()}
              onChange={(e) => handleInputChange('dividendsDeclared', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Dividends Declared (Prior Year)"
                type="number"
                value={(formData.comparatives?.priorYearLines?.dividendsDeclared ?? 0).toString()}
                onChange={(e) => handleComparativeChange('dividendsDeclared', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>

          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...fullRowStyle
          }}>
            <strong>Retained Profit for the Year:</strong>
            <span style={getCalculationStyle(retainedProfitForYear)}>
              {formatCurrency(retainedProfitForYear)}
            </span>
          </div>
        </div>
      </MDJCard>

      {/* Summary Card */}
      <MDJCard title="Profit & Loss Summary">
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span>Turnover:</span>
            <span>{formatCurrency(formData.lines.turnover)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span>Cost of Sales:</span>
            <span>({formatCurrency(formData.lines.costOfSales)})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
            <strong>Gross Profit:</strong>
            <strong style={getCalculationStyle(grossProfit)}>{formatCurrency(grossProfit)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span>Operating Expenses:</span>
            <span>({formatCurrency(totalExpenses)})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
            <strong>Operating Profit:</strong>
            <strong style={getCalculationStyle(operatingProfit)}>{formatCurrency(operatingProfit)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span>Interest & Tax:</span>
            <span>({formatCurrency(formData.lines.interestPayable + formData.lines.taxCharge)})</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '1rem 0', 
            borderTop: '2px solid var(--brand-primary)',
            marginTop: '0.5rem'
          }}>
            <strong style={{ fontSize: '1.1rem' }}>Net Profit:</strong>
            <strong style={{ ...getCalculationStyle(profitAfterTax), fontSize: '1.1rem' }}>
              {formatCurrency(profitAfterTax)}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span>Dividends Declared:</span>
            <span>({formatCurrency(formData.lines.dividendsDeclared)})</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '0.75rem 0', 
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <strong>Retained Profit for the Year:</strong>
            <strong style={getCalculationStyle(retainedProfitForYear)}>
              {formatCurrency(retainedProfitForYear)}
            </strong>
          </div>
        </div>
      </MDJCard>

    </div>
  );
}
