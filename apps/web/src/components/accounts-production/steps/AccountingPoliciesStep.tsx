'use client';

import { useState, useEffect } from 'react';
import { AccountsSet, AccountingPoliciesSection } from '@/lib/types';
import { MDJTextarea, MDJSelect, MDJCheckbox, MDJCard, MDJInput } from '@/components/mdj-ui';

interface AccountingPoliciesStepProps {
  accountsSet: AccountsSet;
  onUpdate: (data: AccountingPoliciesSection) => void;
}

export function AccountingPoliciesStep({ accountsSet, onUpdate }: AccountingPoliciesStepProps) {
  const isSoleTrader = accountsSet.framework === 'SOLE_TRADER' || accountsSet.framework === 'INDIVIDUAL';
  const [formData, setFormData] = useState<AccountingPoliciesSection>(() => {
    return accountsSet.sections.accountingPolicies || {
      basisOfPreparation: 'These accounts have been prepared under the historical cost convention and in accordance with applicable UK accounting standards.',
      goingConcern: {
        isGoingConcern: true,
        noteText: ''
      },
      turnoverPolicyText: '',
      tangibleFixedAssets: {
        hasAssets: false,
        depreciationMethod: 'STRAIGHT_LINE',
        rates: []
      }
    };
  });

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

  const addDepreciationRate = () => {
    setFormData(prev => {
      const newData = {
        ...prev,
        tangibleFixedAssets: {
          ...prev.tangibleFixedAssets!,
          rates: [
            ...(prev.tangibleFixedAssets?.rates || []),
            { category: '', ratePercent: 0 }
          ]
        }
      };
      
      // Call onUpdate with the new data
      onUpdate(newData);
      
      return newData;
    });
  };

  const removeDepreciationRate = (index: number) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        tangibleFixedAssets: {
          ...prev.tangibleFixedAssets!,
          rates: prev.tangibleFixedAssets?.rates?.filter((_, i) => i !== index) || []
        }
      };
      
      // Call onUpdate with the new data
      onUpdate(newData);
      
      return newData;
    });
  };

  const updateDepreciationRate = (index: number, field: 'category' | 'ratePercent', value: string | number) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        tangibleFixedAssets: {
          ...prev.tangibleFixedAssets!,
          rates: prev.tangibleFixedAssets?.rates?.map((rate, i) => 
            i === index ? { ...rate, [field]: value } : rate
          ) || []
        }
      };
      
      // Call onUpdate with the new data
      onUpdate(newData);
      
      return newData;
    });
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Basis of Preparation */}
      <MDJCard title="Basis of Preparation">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJTextarea
            label="Basis of Preparation Statement"
            value={formData.basisOfPreparation}
            onChange={(e) => handleInputChange('basisOfPreparation', e.target.value)}
            rows={4}
            placeholder="Describe the basis on which the accounts have been prepared..."
            helperText="This statement explains the accounting framework and conventions used in preparing the accounts."
            required
          />
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
              Standard Basis Statements
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-outline-primary btn-sm"
                onClick={() => handleInputChange('basisOfPreparation', 
                  'These accounts have been prepared under the historical cost convention and in accordance with applicable UK accounting standards.'
                )}
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              >
                Standard historical cost basis
              </button>
              <button
                type="button"
                className="btn-outline-primary btn-sm"
                onClick={() => handleInputChange('basisOfPreparation', 
                  'These accounts have been prepared under the historical cost convention and in accordance with FRS 105 "The Financial Reporting Standard applicable to the Micro-entities Regime".'
                )}
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              >
                FRS 105 micro-entity basis
              </button>
            </div>
          </div>
        </div>
      </MDJCard>

      {/* Going Concern */}
      <MDJCard title="Going Concern">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJCheckbox
            label={isSoleTrader ? 'Business is a going concern' : 'Company is a going concern'}
            checked={formData.goingConcern.isGoingConcern}
            onChange={(e) => handleInputChange('goingConcern.isGoingConcern', e.target.checked)}
          />
          
          {!formData.goingConcern.isGoingConcern && (
            <MDJTextarea
              label="Going Concern Note"
              value={formData.goingConcern.noteText || ''}
              onChange={(e) => handleInputChange('goingConcern.noteText', e.target.value)}
              rows={3}
              placeholder="Explain the going concern issues and management's assessment..."
              helperText="Required when going concern is uncertain. Explain the circumstances and management's plans."
              required
            />
          )}
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: formData.goingConcern.isGoingConcern ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
            borderRadius: '6px',
            border: `1px solid ${formData.goingConcern.isGoingConcern ? 'var(--status-success-border)' : 'var(--status-warning-border)'}`
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {formData.goingConcern.isGoingConcern 
                ? isSoleTrader
                  ? 'The proprietor has assessed that the business will continue as a going concern for the foreseeable future.'
                  : 'The directors have assessed that the company will continue as a going concern for the foreseeable future.'
                : 'Going concern issues require additional disclosure and may affect the audit opinion.'
              }
            </p>
          </div>
        </div>
      </MDJCard>

      {/* Turnover Policy */}
      <MDJCard title="Turnover Recognition Policy">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJTextarea
            label="Turnover Policy (Optional)"
            value={formData.turnoverPolicyText || ''}
            onChange={(e) => handleInputChange('turnoverPolicyText', e.target.value)}
            rows={3}
            placeholder="Describe how turnover is recognized and measured..."
            helperText="Optional policy statement explaining how revenue is recognized. Leave blank if not required."
          />
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
              Example Turnover Policies
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-outline-primary btn-sm"
                onClick={() => handleInputChange('turnoverPolicyText', 
                  isSoleTrader
                    ? 'Turnover represents the amounts derived from the provision of goods and services falling within the business\'s ordinary activities, after deduction of trade discounts, VAT and other sales related taxes.'
                    : 'Turnover represents the amounts derived from the provision of goods and services falling within the company\'s ordinary activities, after deduction of trade discounts, VAT and other sales related taxes.'
                )}
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              >
                {isSoleTrader ? 'Standard service business policy' : 'Standard service company policy'}
              </button>
              <button
                type="button"
                className="btn-outline-primary btn-sm"
                onClick={() => handleInputChange('turnoverPolicyText', 
                  'Turnover represents the invoiced value of goods sold and services provided, excluding VAT.'
                )}
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              >
                Simple trading policy
              </button>
            </div>
          </div>
        </div>
      </MDJCard>

      {/* Tangible Fixed Assets */}
      <MDJCard title="Tangible Fixed Assets">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJCheckbox
            label={isSoleTrader ? 'Business has tangible fixed assets' : 'Company has tangible fixed assets'}
            checked={formData.tangibleFixedAssets?.hasAssets || false}
            onChange={(e) => handleInputChange('tangibleFixedAssets.hasAssets', e.target.checked)}
          />
          
          {formData.tangibleFixedAssets?.hasAssets && (
            <>
              <MDJSelect
                label="Depreciation Method"
                value={formData.tangibleFixedAssets.depreciationMethod || 'STRAIGHT_LINE'}
                onChange={(e) => handleInputChange('tangibleFixedAssets.depreciationMethod', e.target.value)}
                required
              >
                <option value="STRAIGHT_LINE">Straight line</option>
                <option value="REDUCING_BALANCE">Reducing balance</option>
              </MDJSelect>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Depreciation Rates</h4>
                  <button
                    type="button"
                    onClick={addDepreciationRate}
                    className="btn-outline-primary btn-sm"
                  >
                    Add Rate
                  </button>
                </div>
                
                {(!formData.tangibleFixedAssets.rates || formData.tangibleFixedAssets.rates.length === 0) ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem', 
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--surface-subtle)',
                    borderRadius: '6px'
                  }}>
                    <p>No depreciation rates defined yet.</p>
                    <button onClick={addDepreciationRate} className="btn-primary btn-sm">
                      Add First Rate
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {formData.tangibleFixedAssets.rates.map((rate, index) => (
                      <div key={index} style={{ 
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        gap: '1rem', 
                        alignItems: 'flex-end',
                        padding: '1rem',
                        backgroundColor: 'var(--surface-subtle)',
                        borderRadius: '6px'
                      }}>
                        <MDJInput
                          label="Asset Category"
                          value={rate.category}
                          onChange={(e) => updateDepreciationRate(index, 'category', e.target.value)}
                          placeholder="e.g. Plant and machinery"
                          required
                        />
                        <MDJInput
                          label="Rate %"
                          type="number"
                          value={rate.ratePercent}
                          onChange={(e) => updateDepreciationRate(index, 'ratePercent', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.1"
                          required
                          style={{ width: '100px' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeDepreciationRate(index)}
                          className="btn-outline-primary btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {formData.tangibleFixedAssets?.hasAssets 
                ? 'Depreciation policies will be included in the accounts notes. Ensure rates are appropriate for the asset types.'
                : isSoleTrader
                  ? 'If the business has no tangible fixed assets, no depreciation policy is required.'
                  : 'If the company has no tangible fixed assets, no depreciation policy is required.'
              }
            </p>
          </div>
        </div>
      </MDJCard>
    </div>
  );
}
