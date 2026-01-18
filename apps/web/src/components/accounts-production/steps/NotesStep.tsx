'use client';

import { useState, useEffect } from 'react';
import { AccountsSet, NotesSection } from '@/lib/types';
import { MDJCard, MDJInput, MDJSelect, MDJTextarea } from '@/components/mdj-ui';

interface NotesStepProps {
  accountsSet: AccountsSet;
  onUpdate: (data: NotesSection) => void;
}

export function NotesStep({ accountsSet, onUpdate }: NotesStepProps) {
  const isSoleTrader = accountsSet.framework === 'SOLE_TRADER' || accountsSet.framework === 'INDIVIDUAL';
  const defaultTangibleAssets = {
    columns: ['Land & Property', 'Motor Vehicles', 'Total'],
    rows: [
      { label: 'Cost b/fwd', values: [0, 0, 0] },
      { label: 'Additions', values: [0, 0, 0] },
      { label: 'Disposals', values: [0, 0, 0] },
      { label: 'Cost c/fwd', values: [0, 0, 0] },
      { label: 'Depreciation b/fwd', values: [0, 0, 0] },
      { label: 'Depreciation charge', values: [0, 0, 0] },
      { label: 'Depreciation on disposals', values: [0, 0, 0] },
      { label: 'Depreciation c/fwd', values: [0, 0, 0] },
      { label: 'Net book value (current)', values: [0, 0, 0] },
      { label: 'Net book value (prior)', values: [0, 0, 0] },
    ],
  };

  const applyTangibleTotals = (tangible: NonNullable<NotesSection['tangibleAssets']>) => {
    const totalIndex = tangible.columns.findIndex((column) => column.trim().toLowerCase() === 'total');
    if (totalIndex < 0) return tangible;

    const rows = tangible.rows.map((row) => {
      const values = [...row.values];
      const total = values.reduce((sum, current, idx) => {
        if (idx === totalIndex) return sum;
        const numeric = Number(current) || 0;
        return sum + numeric;
      }, 0);
      values[totalIndex] = total;
      return { ...row, values };
    });

    return { ...tangible, rows };
  };

  const [formData, setFormData] = useState<NotesSection>(() => {
    const existingNotes = accountsSet.sections.notes;
    const existingTangible = existingNotes?.tangibleAssets;
    const normalizedTangible = existingTangible
      ? {
          columns: existingTangible.columns?.length ? [...existingTangible.columns] : [...defaultTangibleAssets.columns],
          rows: (existingTangible.rows || defaultTangibleAssets.rows).map((row, rowIndex) => {
            const values = Array.isArray(row.values) ? [...row.values] : [];
            const targetLength = (existingTangible.columns?.length || defaultTangibleAssets.columns.length);
            while (values.length < targetLength) values.push(0);
            return {
              label: row.label || defaultTangibleAssets.rows[rowIndex]?.label || 'Row',
              values: values.slice(0, targetLength),
            };
          }),
        }
      : defaultTangibleAssets;

    if (existingNotes) {
      return {
        ...existingNotes,
        tangibleAssets: applyTangibleTotals(normalizedTangible),
      };
    }

    return {
      countryOfIncorporation: 'England and Wales',
      ...(isSoleTrader
        ? {}
        : {
            shareCapital: {
              shareClass: 'Ordinary shares',
              numberOfShares: 1,
              nominalValue: 1,
              currency: 'GBP',
            },
          }),
      principalActivity: '',
      employees: {
        include: false,
        averageEmployees: 0
      },
      tangibleAssets: applyTangibleTotals(normalizedTangible),
      additionalNotes: []
    };
  });

  // Ensure the parent component gets the properly validated data on mount
  useEffect(() => {
    onUpdate(formData);
  }, []); // Only run on mount

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      // Call onUpdate with the new data immediately when user makes changes
      onUpdate(newData);
      
      return newData;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalShareCapitalValue = (formData.shareCapital?.numberOfShares ?? 0) * (formData.shareCapital?.nominalValue ?? 0);

  const updateTangibleColumn = (index: number, value: string) => {
    const tangible = formData.tangibleAssets || defaultTangibleAssets;
    const columns = [...tangible.columns];
    columns[index] = value;
    const next = { ...tangible, columns };
    handleInputChange('tangibleAssets', applyTangibleTotals(next));
  };

  const updateTangibleValue = (rowIndex: number, columnIndex: number, value: string) => {
    const tangible = formData.tangibleAssets || defaultTangibleAssets;
    const rows = tangible.rows.map((row, idx) => {
      if (idx !== rowIndex) return row;
      const values = [...row.values];
      values[columnIndex] = parseFloat(value) || 0;
      return { ...row, values };
    });
    handleInputChange('tangibleAssets', applyTangibleTotals({ ...tangible, rows }));
  };

  const addTangibleColumn = () => {
    const tangible = formData.tangibleAssets || defaultTangibleAssets;
    const columns = [...tangible.columns, 'New Column'];
    const rows = tangible.rows.map((row) => ({
      ...row,
      values: [...row.values, 0],
    }));
    handleInputChange('tangibleAssets', applyTangibleTotals({ ...tangible, columns, rows }));
  };

  const removeTangibleColumn = (index: number) => {
    const tangible = formData.tangibleAssets || defaultTangibleAssets;
    if (tangible.columns.length <= 1) return;
    const columns = tangible.columns.filter((_, idx) => idx !== index);
    const rows = tangible.rows.map((row) => ({
      ...row,
      values: row.values.filter((_, idx) => idx !== index),
    }));
    handleInputChange('tangibleAssets', applyTangibleTotals({ ...tangible, columns, rows }));
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Company Information */}
      <MDJCard title={isSoleTrader ? 'Business Information' : 'Company Information'}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJSelect
            label={isSoleTrader ? 'Country of Residence' : 'Country of Incorporation'}
            value={formData.countryOfIncorporation}
            onChange={(e) => handleInputChange('countryOfIncorporation', e.target.value)}
            required
          >
            <option value="England and Wales">England and Wales</option>
            <option value="Scotland">Scotland</option>
            <option value="Northern Ireland">Northern Ireland</option>
          </MDJSelect>
          
          <MDJTextarea
            label={isSoleTrader ? 'Business Activity' : 'Principal Activity'}
            value={formData.principalActivity || ''}
            onChange={(e) => handleInputChange('principalActivity', e.target.value)}
            placeholder={isSoleTrader ? 'Describe the business activity...' : 'Describe the company\'s main business activity...'}
            rows={3}
          />
        </div>
      </MDJCard>

      {/* Share Capital */}
      {!isSoleTrader && (
        <MDJCard title="Share Capital">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJInput
            label="Share Class"
            value={formData.shareCapital?.shareClass || ''}
            onChange={(e) => handleInputChange('shareCapital.shareClass', e.target.value)}
            placeholder="e.g., Ordinary shares"
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <MDJInput
              label="Number of Shares"
              type="number"
              value={(formData.shareCapital?.numberOfShares ?? 0).toString()}
              onChange={(e) => {
                const value = Math.max(0, parseInt(e.target.value) || 0);
                handleInputChange('shareCapital.numberOfShares', value);
              }}
              placeholder="1"
              min="0"
            />
            
            <MDJInput
              label="Nominal Value per Share"
              type="number"
              value={(formData.shareCapital?.nominalValue ?? 0).toString()}
              onChange={(e) => {
                const value = Math.max(0, parseFloat(e.target.value) || 0);
                handleInputChange('shareCapital.nominalValue', value);
              }}
              placeholder="1.00"
              step="0.01"
              min="0"
            />
          </div>
          
          <MDJSelect
            label="Currency"
            value={formData.shareCapital?.currency || 'GBP'}
            onChange={(e) => handleInputChange('shareCapital.currency', e.target.value)}
          >
            <option value="GBP">GBP (£)</option>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
          </MDJSelect>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--status-info-bg)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong>Total Share Capital Value:</strong>
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {formatCurrency(totalShareCapitalValue)}
            </span>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            <strong>Share Capital Summary:</strong><br />
            {(formData.shareCapital?.numberOfShares ?? 0).toLocaleString()} {(formData.shareCapital?.shareClass || 'shares').toLowerCase()} 
            of {formatCurrency(formData.shareCapital?.nominalValue ?? 0)} each
          </div>
        </div>
      </MDJCard>
      )}

      {/* Employee Information */}
      <MDJCard title="Employee Information">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="includeEmployees"
              checked={formData.employees?.include || false}
              onChange={(e) => handleInputChange('employees.include', e.target.checked)}
            />
            <label htmlFor="includeEmployees" style={{ fontWeight: 600 }}>
              Include employee information in notes
            </label>
          </div>
          
          {formData.employees?.include && (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              <MDJInput
                label="Average Number of Employees"
                type="number"
                value={formData.employees?.averageEmployees?.toString() || '0'}
                onChange={(e) => handleInputChange('employees.averageEmployees', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
              />
              
              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'var(--surface-subtle)', 
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: 'var(--text-muted)'
              }}>
                <strong>Note:</strong> Include all employees (including owners or directors) who worked during the year.
              </div>
            </div>
          )}
        </div>
      </MDJCard>

      {/* Tangible Assets */}
      <MDJCard title="Tangible Assets">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Columns</strong>
            <button
              type="button"
              onClick={addTangibleColumn}
              style={{
                border: '1px solid var(--border-subtle)',
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Add Column
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {(formData.tangibleAssets?.columns || defaultTangibleAssets.columns).map((column, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                <MDJInput
                  label={`Column ${index + 1}`}
                  value={column}
                  onChange={(e) => updateTangibleColumn(index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeTangibleColumn(index)}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                    height: '42px',
                    marginTop: '22px'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {(formData.tangibleAssets?.rows || defaultTangibleAssets.rows).map((row, rowIndex) => (
              <div key={`${row.label}-${rowIndex}`} style={{ display: 'grid', gap: '0.5rem' }}>
                <strong>{row.label}</strong>
                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: `repeat(${(formData.tangibleAssets?.columns || defaultTangibleAssets.columns).length}, minmax(0, 1fr))` }}>
                  {(formData.tangibleAssets?.columns || defaultTangibleAssets.columns).map((_, colIndex) => (
                    <MDJInput
                      key={`${rowIndex}-${colIndex}`}
                      label={(formData.tangibleAssets?.columns || defaultTangibleAssets.columns)[colIndex]}
                      type="number"
                      value={(row.values[colIndex] ?? 0).toString()}
                      onChange={(e) => updateTangibleValue(rowIndex, colIndex, e.target.value)}
                      placeholder="0"
                      step="0.01"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </MDJCard>

      {/* Additional Notes */}
      <MDJCard title="Additional Notes">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJTextarea
            label="Additional Disclosures"
            value={formData.additionalNotes && formData.additionalNotes.length > 0 ? formData.additionalNotes[0]?.text || '' : ''}
            onChange={(e) => {
              const newNotes = e.target.value ? [{ title: 'Additional Disclosures', text: e.target.value }] : [];
              handleInputChange('additionalNotes', newNotes);
            }}
            placeholder="Add any additional notes, commitments, contingencies, or other disclosures required..."
            rows={5}
          />
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--status-info-bg)', 
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}>
            <strong>Common Additional Notes:</strong>
            <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
              <li>Post balance sheet events</li>
              <li>Commitments and contingencies</li>
              <li>Related party transactions</li>
              <li>{isSoleTrader ? 'Owner\'s loan account details' : 'Directors\' loan account details'}</li>
              <li>Accounting policy changes</li>
              <li>Going concern considerations</li>
            </ul>
          </div>
        </div>
      </MDJCard>

      {/* Summary */}
      <MDJCard title="Notes Summary">
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span>{isSoleTrader ? 'Country of Residence:' : 'Country of Incorporation:'}</span>
            <span style={{ fontWeight: 600 }}>{formData.countryOfIncorporation}</span>
          </div>
          {!isSoleTrader && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Share Capital:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(totalShareCapitalValue)}</span>
            </div>
          )}
          {formData.employees?.include && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Average Employees:</span>
              <span style={{ fontWeight: 600 }}>{formData.employees?.averageEmployees || 0}</span>
            </div>
          )}
          {formData.principalActivity && (
            <div style={{ padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
              <strong>{isSoleTrader ? 'Business Activity:' : 'Principal Activity:'}</strong>
              <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                {formData.principalActivity}
              </div>
            </div>
          )}
        </div>
      </MDJCard>
    </div>
  );
}
