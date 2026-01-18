'use client';

import { useState, useEffect } from 'react';
import { AccountsSet, BalanceSheetSection, BalanceSheetData } from '@/lib/types';
import { MDJCard, MDJInput } from '@/components/mdj-ui';

interface BalanceSheetStepProps {
  accountsSet: AccountsSet;
  onUpdate: (data: BalanceSheetSection) => void;
}

export function BalanceSheetStep({ accountsSet, onUpdate }: BalanceSheetStepProps) {
  const isFirstYear = accountsSet.period?.isFirstYear ?? true;
  const isSoleTrader = accountsSet.framework === 'SOLE_TRADER' || accountsSet.framework === 'INDIVIDUAL';
  const minShareCapital = isSoleTrader ? 0 : 1;
  
  const [formData, setFormData] = useState<BalanceSheetSection>(() => {
    const defaultData: BalanceSheetData = {
      assets: {
        fixedAssets: {
          tangibleFixedAssets: 0,
          intangibleAssets: 0,
          investments: 0
        },
        currentAssets: {
          stock: 0,
          debtors: 0,
          cash: 0, // Required field
          prepayments: 0
        }
      },
      liabilities: {
        creditorsWithinOneYear: { // Required object
          tradeCreditors: 0,
          taxes: 0,
          accrualsDeferredIncome: 0,
          directorsLoan: 0,
          otherCreditors: 0
        },
        creditorsAfterOneYear: {
          loans: 0,
          other: 0
        }
      },
      equity: {
        shareCapital: minShareCapital,
        retainedEarnings: 0, // Required field
        otherReserves: 0
      }
    };

    // Start with existing data or default data
    let existingData: BalanceSheetSection = accountsSet.sections.balanceSheet || defaultData;
    
    // Ensure the existing data has all required fields with valid values
    const validatedData: BalanceSheetSection = {
      assets: {
        fixedAssets: {
          tangibleFixedAssets: Math.max(0, existingData.assets?.fixedAssets?.tangibleFixedAssets ?? 0),
          intangibleAssets: Math.max(0, existingData.assets?.fixedAssets?.intangibleAssets ?? 0),
          investments: Math.max(0, existingData.assets?.fixedAssets?.investments ?? 0)
        },
        currentAssets: {
          stock: Math.max(0, existingData.assets?.currentAssets?.stock ?? 0),
          debtors: Math.max(0, existingData.assets?.currentAssets?.debtors ?? 0),
          cash: Math.max(0, existingData.assets?.currentAssets?.cash ?? 0),
          prepayments: Math.max(0, existingData.assets?.currentAssets?.prepayments ?? 0)
        }
      },
      liabilities: {
        creditorsWithinOneYear: {
          tradeCreditors: Math.max(0, existingData.liabilities?.creditorsWithinOneYear?.tradeCreditors ?? 0),
          taxes: Math.max(0, existingData.liabilities?.creditorsWithinOneYear?.taxes ?? 0),
          accrualsDeferredIncome: Math.max(0, existingData.liabilities?.creditorsWithinOneYear?.accrualsDeferredIncome ?? 0),
          directorsLoan: Math.max(0, existingData.liabilities?.creditorsWithinOneYear?.directorsLoan ?? 0),
          otherCreditors: Math.max(0, existingData.liabilities?.creditorsWithinOneYear?.otherCreditors ?? 0)
        },
        creditorsAfterOneYear: {
          loans: Math.max(0, existingData.liabilities?.creditorsAfterOneYear?.loans ?? 0),
          other: Math.max(0, existingData.liabilities?.creditorsAfterOneYear?.other ?? 0)
        }
      },
      equity: {
        shareCapital: Math.max(minShareCapital, existingData.equity?.shareCapital ?? minShareCapital),
        retainedEarnings: existingData.equity?.retainedEarnings ?? 0, // Can be negative
        otherReserves: Math.max(0, existingData.equity?.otherReserves ?? 0)
      }
    };
    
    // For subsequent year accounts, ensure comparatives exist
    if (!isFirstYear) {
      validatedData.comparatives = existingData.comparatives || {
        prior: { ...defaultData }
      };
    }
    
    return validatedData;
  });

  // Ensure the parent component gets the properly validated data on mount
  useEffect(() => {
    onUpdate(formData);
  }, []); // Only run on mount

  const handleInputChange = (section: string, field: string, value: string) => {
    let numericValue = parseFloat(value);
    
    // Handle NaN and ensure it's a valid number
    if (isNaN(numericValue)) {
      numericValue = 0;
    }
    
    // Ensure certain fields cannot be negative
    const nonNegativeFields = [
      'tangibleFixedAssets', 'intangibleAssets', 'investments',
      'stock', 'debtors', 'cash', 'prepayments',
      'tradeCreditors', 'taxes', 'accrualsDeferredIncome', 'directorsLoan', 'otherCreditors',
      'loans', 'other', 'shareCapital', 'otherReserves'
    ];
    
    if (nonNegativeFields.includes(field)) {
      numericValue = Math.max(0, numericValue);
    }
    
    // Share capital must be at least 1 if it's being set
    if (field === 'shareCapital') {
      numericValue = Math.max(minShareCapital, numericValue);
    }
    
    setFormData(prev => {
      const newData = { ...prev };
      
      // Navigate to the nested property and update it
      const sections = section.split('.');
      let current: any = newData;
      
      for (let i = 0; i < sections.length; i++) {
        if (i === sections.length - 1) {
          // Last level - this is where we update the field
          current[sections[i]] = {
            ...current[sections[i]],
            [field]: numericValue
          };
        } else {
          // Intermediate levels - ensure they exist and are copied
          current[sections[i]] = { ...current[sections[i]] };
          current = current[sections[i]];
        }
      }
      
      // For subsequent year accounts, ensure comparatives exist with empty prior year data
      if (!isFirstYear && !newData.comparatives) {
        newData.comparatives = {
          prior: {
            assets: {
              fixedAssets: { tangibleFixedAssets: 0, intangibleAssets: 0, investments: 0 },
              currentAssets: { stock: 0, debtors: 0, cash: 0, prepayments: 0 }
            },
            liabilities: {
              creditorsWithinOneYear: { tradeCreditors: 0, taxes: 0, accrualsDeferredIncome: 0, directorsLoan: 0, otherCreditors: 0 },
              creditorsAfterOneYear: { loans: 0, other: 0 }
            },
            equity: { shareCapital: minShareCapital, retainedEarnings: 0, otherReserves: 0 }
          }
        };
      }
      
      // Ensure all required fields are present and valid
      if (!newData.assets) newData.assets = { fixedAssets: { tangibleFixedAssets: 0, intangibleAssets: 0, investments: 0 }, currentAssets: { stock: 0, debtors: 0, cash: 0, prepayments: 0 } };
      if (!newData.assets.currentAssets) newData.assets.currentAssets = { stock: 0, debtors: 0, cash: 0, prepayments: 0 };
      if (!newData.assets.fixedAssets) newData.assets.fixedAssets = { tangibleFixedAssets: 0, intangibleAssets: 0, investments: 0 };
      if (!newData.liabilities) newData.liabilities = { creditorsWithinOneYear: { tradeCreditors: 0, taxes: 0, accrualsDeferredIncome: 0, directorsLoan: 0, otherCreditors: 0 }, creditorsAfterOneYear: { loans: 0, other: 0 } };
      if (!newData.liabilities.creditorsWithinOneYear) newData.liabilities.creditorsWithinOneYear = { tradeCreditors: 0, taxes: 0, accrualsDeferredIncome: 0, directorsLoan: 0, otherCreditors: 0 };
      if (!newData.liabilities.creditorsAfterOneYear) newData.liabilities.creditorsAfterOneYear = { loans: 0, other: 0 };
      if (!newData.equity) newData.equity = { shareCapital: minShareCapital, retainedEarnings: 0, otherReserves: 0 };
      
      // Ensure required fields have valid values
      if (typeof newData.assets.currentAssets.cash !== 'number') newData.assets.currentAssets.cash = 0;
      if (typeof newData.equity.shareCapital !== 'number' || newData.equity.shareCapital < minShareCapital) {
        newData.equity.shareCapital = minShareCapital;
      }
      if (typeof newData.equity.retainedEarnings !== 'number') newData.equity.retainedEarnings = 0;
      
      // Call onUpdate with the new data immediately when user makes changes
      onUpdate(newData);
      
      return newData;
    });
  };

  const handleComparativeInputChange = (section: string, field: string, value: string) => {
    let numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      numericValue = 0;
    }

    const nonNegativeFields = [
      'tangibleFixedAssets', 'intangibleAssets', 'investments',
      'stock', 'debtors', 'cash', 'prepayments',
      'tradeCreditors', 'taxes', 'accrualsDeferredIncome', 'directorsLoan', 'otherCreditors',
      'loans', 'other', 'shareCapital', 'otherReserves'
    ];

    if (nonNegativeFields.includes(field)) {
      numericValue = Math.max(0, numericValue);
    }

    if (field === 'shareCapital') {
      numericValue = Math.max(minShareCapital, numericValue);
    }

    setFormData(prev => {
      const newData: BalanceSheetSection = { ...prev };
      const prior = newData.comparatives?.prior || {
        assets: {
          fixedAssets: { tangibleFixedAssets: 0, intangibleAssets: 0, investments: 0 },
          currentAssets: { stock: 0, debtors: 0, cash: 0, prepayments: 0 }
        },
        liabilities: {
          creditorsWithinOneYear: { tradeCreditors: 0, taxes: 0, accrualsDeferredIncome: 0, directorsLoan: 0, otherCreditors: 0 },
          creditorsAfterOneYear: { loans: 0, other: 0 }
        },
        equity: { shareCapital: minShareCapital, retainedEarnings: 0, otherReserves: 0 }
      };

      const sections = section.split('.');
      let current: any = prior;
      for (let i = 0; i < sections.length; i++) {
        if (i === sections.length - 1) {
          current[sections[i]] = {
            ...current[sections[i]],
            [field]: numericValue
          };
        } else {
          current[sections[i]] = { ...current[sections[i]] };
          current = current[sections[i]];
        }
      }

      newData.comparatives = { prior };
      onUpdate(newData);
      return newData;
    });
  };

  // Calculate totals
  const totalFixedAssets = formData.assets.fixedAssets.tangibleFixedAssets + 
                          formData.assets.fixedAssets.intangibleAssets + 
                          formData.assets.fixedAssets.investments;
  
  const totalCurrentAssets = formData.assets.currentAssets.stock + 
                            formData.assets.currentAssets.debtors + 
                            formData.assets.currentAssets.cash + 
                            formData.assets.currentAssets.prepayments;
  
  const totalAssets = totalFixedAssets + totalCurrentAssets;
  
  const totalCurrentLiabilities = formData.liabilities.creditorsWithinOneYear.tradeCreditors + 
                                 formData.liabilities.creditorsWithinOneYear.taxes + 
                                 formData.liabilities.creditorsWithinOneYear.accrualsDeferredIncome + 
                                 formData.liabilities.creditorsWithinOneYear.directorsLoan + 
                                 formData.liabilities.creditorsWithinOneYear.otherCreditors;
  
  const totalLongTermLiabilities = formData.liabilities.creditorsAfterOneYear.loans + 
                                  formData.liabilities.creditorsAfterOneYear.other;
  
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  
  const totalEquity = formData.equity.shareCapital + 
                     formData.equity.retainedEarnings + 
                     formData.equity.otherReserves;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const balanceDifference = totalAssets - totalLiabilitiesAndEquity;
  const isBalanced = Math.abs(balanceDifference) < 0.01; // Allow for small rounding differences

  const profitAndLossLines = accountsSet.sections.profitAndLoss?.lines;
  const profitAndLossExpenses = profitAndLossLines
    ? profitAndLossLines.adminExpenses +
      profitAndLossLines.wages +
      profitAndLossLines.rent +
      profitAndLossLines.motor +
      profitAndLossLines.professionalFees +
      profitAndLossLines.otherExpenses
    : 0;
  const profitAndLossIncome = profitAndLossLines
    ? (profitAndLossLines.turnover - profitAndLossLines.costOfSales) + profitAndLossLines.otherIncome
    : 0;
  const profitAfterTaxFromPL = profitAndLossLines
    ? profitAndLossIncome - profitAndLossExpenses - profitAndLossLines.interestPayable - profitAndLossLines.taxCharge
    : 0;
  const dividendsDeclaredFromPL = profitAndLossLines?.dividendsDeclared ?? 0;
  const retainedEarningsBroughtForward = isFirstYear
    ? 0
    : (formData.comparatives?.prior?.equity.retainedEarnings ?? 0);
  const retainedEarningsCarriedForward = retainedEarningsBroughtForward + profitAfterTaxFromPL - dividendsDeclaredFromPL;
  const capitalAndReservesFromAssets = totalAssets - totalLiabilities;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalStyle = (amount: number) => ({
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontSize: '1rem'
  });

  const getBalanceStyle = () => ({
    fontWeight: 700,
    color: isBalanced ? 'var(--success)' : 'var(--danger)',
    fontSize: '1.1rem'
  });

  const inputRowStyle = {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: isFirstYear ? '1fr' : '1fr 1fr'
  };

  const fullRowStyle = isFirstYear ? undefined : { gridColumn: '1 / -1' };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Assets Section */}
      <MDJCard title="Assets">
        {/* Fixed Assets */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Fixed Assets</h4>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Tangible Fixed Assets' : 'Tangible Fixed Assets (Current Year)'}
                type="number"
                value={formData.assets.fixedAssets.tangibleFixedAssets.toString()}
                onChange={(e) => handleInputChange('assets.fixedAssets', 'tangibleFixedAssets', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Tangible Fixed Assets (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.assets.fixedAssets.tangibleFixedAssets ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('assets.fixedAssets', 'tangibleFixedAssets', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Intangible Assets' : 'Intangible Assets (Current Year)'}
                type="number"
                value={formData.assets.fixedAssets.intangibleAssets.toString()}
                onChange={(e) => handleInputChange('assets.fixedAssets', 'intangibleAssets', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Intangible Assets (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.assets.fixedAssets.intangibleAssets ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('assets.fixedAssets', 'intangibleAssets', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Investments' : 'Investments (Current Year)'}
                type="number"
                value={formData.assets.fixedAssets.investments.toString()}
                onChange={(e) => handleInputChange('assets.fixedAssets', 'investments', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Investments (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.assets.fixedAssets.investments ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('assets.fixedAssets', 'investments', e.target.value)}
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
              <strong>Total Fixed Assets:</strong>
              <span style={getTotalStyle(totalFixedAssets)}>
                {formatCurrency(totalFixedAssets)}
              </span>
            </div>
          </div>
        </div>

        {/* Current Assets */}
        <div>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Current Assets</h4>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Stock' : 'Stock (Current Year)'}
                type="number"
                value={formData.assets.currentAssets.stock.toString()}
                onChange={(e) => handleInputChange('assets.currentAssets', 'stock', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Stock (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.assets.currentAssets.stock ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('assets.currentAssets', 'stock', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Debtors' : 'Debtors (Current Year)'}
                type="number"
                value={formData.assets.currentAssets.debtors.toString()}
                onChange={(e) => handleInputChange('assets.currentAssets', 'debtors', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Debtors (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.assets.currentAssets.debtors ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('assets.currentAssets', 'debtors', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Cash at Bank & in Hand' : 'Cash at Bank & in Hand (Current Year)'}
                type="number"
                value={formData.assets.currentAssets.cash.toString()}
                onChange={(e) => handleInputChange('assets.currentAssets', 'cash', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Cash at Bank & in Hand (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.assets.currentAssets.cash ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('assets.currentAssets', 'cash', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Prepayments' : 'Prepayments (Current Year)'}
                type="number"
                value={formData.assets.currentAssets.prepayments.toString()}
                onChange={(e) => handleInputChange('assets.currentAssets', 'prepayments', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Prepayments (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.assets.currentAssets.prepayments ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('assets.currentAssets', 'prepayments', e.target.value)}
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
              <strong>Total Current Assets:</strong>
              <span style={getTotalStyle(totalCurrentAssets)}>
                {formatCurrency(totalCurrentAssets)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'var(--status-info-bg)', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1rem',
          ...fullRowStyle
        }}>
          <strong style={{ fontSize: '1.1rem' }}>Total Assets:</strong>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            {formatCurrency(totalAssets)}
          </span>
        </div>
      </MDJCard>

      {/* Liabilities Section */}
      <MDJCard title="Liabilities">
        {/* Current Liabilities */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Creditors: amounts falling due within one year</h4>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Trade Creditors' : 'Trade Creditors (Current Year)'}
                type="number"
                value={formData.liabilities.creditorsWithinOneYear.tradeCreditors.toString()}
                onChange={(e) => handleInputChange('liabilities.creditorsWithinOneYear', 'tradeCreditors', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Trade Creditors (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.liabilities.creditorsWithinOneYear.tradeCreditors ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('liabilities.creditorsWithinOneYear', 'tradeCreditors', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Taxes & Social Security' : 'Taxes & Social Security (Current Year)'}
                type="number"
                value={formData.liabilities.creditorsWithinOneYear.taxes.toString()}
                onChange={(e) => handleInputChange('liabilities.creditorsWithinOneYear', 'taxes', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Taxes & Social Security (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.liabilities.creditorsWithinOneYear.taxes ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('liabilities.creditorsWithinOneYear', 'taxes', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Accruals & Deferred Income' : 'Accruals & Deferred Income (Current Year)'}
                type="number"
                value={formData.liabilities.creditorsWithinOneYear.accrualsDeferredIncome.toString()}
                onChange={(e) => handleInputChange('liabilities.creditorsWithinOneYear', 'accrualsDeferredIncome', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Accruals & Deferred Income (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.liabilities.creditorsWithinOneYear.accrualsDeferredIncome ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('liabilities.creditorsWithinOneYear', 'accrualsDeferredIncome', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={
                  isFirstYear
                    ? isSoleTrader ? "Owner's Loan Account" : "Directors' Loan Account"
                    : isSoleTrader ? "Owner's Loan Account (Current Year)" : "Directors' Loan Account (Current Year)"
                }
                type="number"
                value={formData.liabilities.creditorsWithinOneYear.directorsLoan.toString()}
                onChange={(e) => handleInputChange('liabilities.creditorsWithinOneYear', 'directorsLoan', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label={isSoleTrader ? "Owner's Loan Account (Prior Year)" : "Directors' Loan Account (Prior Year)"}
                  type="number"
                  value={(formData.comparatives?.prior?.liabilities.creditorsWithinOneYear.directorsLoan ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('liabilities.creditorsWithinOneYear', 'directorsLoan', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Other Creditors' : 'Other Creditors (Current Year)'}
                type="number"
                value={formData.liabilities.creditorsWithinOneYear.otherCreditors.toString()}
                onChange={(e) => handleInputChange('liabilities.creditorsWithinOneYear', 'otherCreditors', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Other Creditors (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.liabilities.creditorsWithinOneYear.otherCreditors ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('liabilities.creditorsWithinOneYear', 'otherCreditors', e.target.value)}
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
              <strong>Total Current Liabilities:</strong>
              <span style={getTotalStyle(totalCurrentLiabilities)}>
                {formatCurrency(totalCurrentLiabilities)}
              </span>
            </div>
          </div>
        </div>

        {/* Long-term Liabilities */}
        <div>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Creditors: amounts falling due after more than one year</h4>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Long-term Loans' : 'Long-term Loans (Current Year)'}
                type="number"
                value={formData.liabilities.creditorsAfterOneYear.loans.toString()}
                onChange={(e) => handleInputChange('liabilities.creditorsAfterOneYear', 'loans', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Long-term Loans (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.liabilities.creditorsAfterOneYear.loans ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('liabilities.creditorsAfterOneYear', 'loans', e.target.value)}
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
            
            <div style={inputRowStyle}>
              <MDJInput
                label={isFirstYear ? 'Other Long-term Liabilities' : 'Other Long-term Liabilities (Current Year)'}
                type="number"
                value={formData.liabilities.creditorsAfterOneYear.other.toString()}
                onChange={(e) => handleInputChange('liabilities.creditorsAfterOneYear', 'other', e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {!isFirstYear && (
                <MDJInput
                  label="Other Long-term Liabilities (Prior Year)"
                  type="number"
                  value={(formData.comparatives?.prior?.liabilities.creditorsAfterOneYear.other ?? 0).toString()}
                  onChange={(e) => handleComparativeInputChange('liabilities.creditorsAfterOneYear', 'other', e.target.value)}
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
              <strong>Total Long-term Liabilities:</strong>
              <span style={getTotalStyle(totalLongTermLiabilities)}>
                {formatCurrency(totalLongTermLiabilities)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '1rem', 
        backgroundColor: 'var(--status-warning-bg)', 
        borderRadius: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1rem',
        ...fullRowStyle
      }}>
        <strong>Total Liabilities:</strong>
        <span style={getTotalStyle(totalLiabilities)}>
          {formatCurrency(totalLiabilities)}
          </span>
        </div>
      </MDJCard>

      {/* Equity Section */}
      <MDJCard title="Capital & Reserves">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={inputRowStyle}>
            <MDJInput
              label={
                isFirstYear
                  ? isSoleTrader ? 'Capital Account' : 'Called up Share Capital'
                  : isSoleTrader ? 'Capital Account (Current Year)' : 'Called up Share Capital (Current Year)'
              }
              type="number"
              value={formData.equity.shareCapital.toString()}
              onChange={(e) => handleInputChange('equity', 'shareCapital', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label={isSoleTrader ? 'Capital Account (Prior Year)' : 'Called up Share Capital (Prior Year)'}
                type="number"
                value={(formData.comparatives?.prior?.equity.shareCapital ?? minShareCapital).toString()}
                onChange={(e) => handleComparativeInputChange('equity', 'shareCapital', e.target.value)}
                placeholder={minShareCapital.toString()}
                step="0.01"
              />
            )}
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Retained Earnings' : 'Retained Earnings (Current Year)'}
              type="number"
              value={formData.equity.retainedEarnings.toString()}
              onChange={(e) => handleInputChange('equity', 'retainedEarnings', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Retained Earnings (Prior Year)"
                type="number"
                value={(formData.comparatives?.prior?.equity.retainedEarnings ?? 0).toString()}
                onChange={(e) => handleComparativeInputChange('equity', 'retainedEarnings', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={inputRowStyle}>
            <MDJInput
              label={isFirstYear ? 'Other Reserves' : 'Other Reserves (Current Year)'}
              type="number"
              value={formData.equity.otherReserves.toString()}
              onChange={(e) => handleInputChange('equity', 'otherReserves', e.target.value)}
              placeholder="0"
              step="0.01"
            />
            {!isFirstYear && (
              <MDJInput
                label="Other Reserves (Prior Year)"
                type="number"
                value={(formData.comparatives?.prior?.equity.otherReserves ?? 0).toString()}
                onChange={(e) => handleComparativeInputChange('equity', 'otherReserves', e.target.value)}
                placeholder="0"
                step="0.01"
              />
            )}
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--status-success-bg)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...fullRowStyle
          }}>
            <strong>Total Equity:</strong>
            <span style={getTotalStyle(totalEquity)}>
              {formatCurrency(totalEquity)}
            </span>
          </div>
        </div>
      </MDJCard>

      {/* Balance Check */}
      <MDJCard title="Balance Sheet Check">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <span>Total Assets:</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(totalAssets)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <span>Total Liabilities:</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(totalLiabilities)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <span>Capital & Reserves (Assets - Liabilities):</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(capitalAndReservesFromAssets)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <span>Capital & Reserves (Equity):</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(totalEquity)}</span>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            {!isFirstYear && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Retained Earnings B/Fwd:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(retainedEarningsBroughtForward)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Profit After Tax (from P&amp;L):</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(profitAfterTaxFromPL)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Dividends Declared (from P&amp;L):</span>
              <span style={{ fontWeight: 600 }}>({formatCurrency(dividendsDeclaredFromPL)})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Retained Earnings C/Fwd:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(retainedEarningsCarriedForward)}</span>
            </div>
          </div>
          
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: isBalanced ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem'
          }}>
            <div>
              <strong style={getBalanceStyle()}>
                {isBalanced ? '✅ Balance Sheet Balanced' : '❌ Balance Sheet Out of Balance'}
              </strong>
              {!isBalanced && (
                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--danger)' }}>
                  Difference: {formatCurrency(balanceDifference)}
                </div>
              )}
            </div>
          </div>
          
          {!isBalanced && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--status-info-bg)', 
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: 'var(--text-muted)'
            }}>
              <strong>Tip:</strong> The balance sheet must balance (Assets = Liabilities + Equity). 
              Check your figures or adjust retained earnings to balance the sheet.
            </div>
          )}
        </div>
      </MDJCard>
    </div>
  );
}
