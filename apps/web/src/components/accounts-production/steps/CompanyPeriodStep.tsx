'use client';

import { useState, useEffect } from 'react';
import { AccountsSet, CompanyPeriodSection } from '@/lib/types';
import { MDJInput, MDJSelect, MDJCard } from '@/components/mdj-ui';

interface CompanyPeriodStepProps {
  accountsSet: AccountsSet;
  onUpdate: (data: CompanyPeriodSection) => void;
}

export function CompanyPeriodStep({ accountsSet, onUpdate }: CompanyPeriodStepProps) {
  const [formData, setFormData] = useState<CompanyPeriodSection>(() => {
    return accountsSet.sections.companyPeriod || {
      framework: accountsSet.framework,
      company: {
        name: '',
        companyNumber: accountsSet.companyNumber || '',
        registeredOffice: {
          line1: '',
          line2: '',
          town: '',
          county: '',
          postcode: '',
          country: 'England'
        },
        directors: []
      },
      period: {
        startDate: accountsSet.period.startDate,
        endDate: accountsSet.period.endDate,
        isFirstYear: accountsSet.period.isFirstYear
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

  const addDirector = () => {
    setFormData(prev => {
      const newData = {
        ...prev,
        company: {
          ...prev.company,
          directors: [...prev.company.directors, { name: '' }]
        }
      };
      
      // Call onUpdate with the new data
      onUpdate(newData);
      
      return newData;
    });
  };

  const removeDirector = (index: number) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        company: {
          ...prev.company,
          directors: prev.company.directors.filter((_, i) => i !== index)
        }
      };
      
      // Call onUpdate with the new data
      onUpdate(newData);
      
      return newData;
    });
  };

  const updateDirector = (index: number, name: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        company: {
          ...prev.company,
          directors: prev.company.directors.map((director, i) => 
            i === index ? { ...director, name } : director
          )
        }
      };
      
      // Call onUpdate with the new data
      onUpdate(newData);
      
      return newData;
    });
  };

  const isSoleTrader = formData.framework === 'SOLE_TRADER' || formData.framework === 'INDIVIDUAL';

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Company / Trader Information */}
      <MDJCard title={isSoleTrader ? 'Trader Information' : 'Company Information'}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJInput
            label={isSoleTrader ? 'Trading Name' : 'Company Name'}
            value={formData.company.name}
            onChange={(e) => handleInputChange('company.name', e.target.value)}
            placeholder={isSoleTrader ? 'Enter trading name' : 'Enter company name'}
            required
          />
          {!isSoleTrader && (
            <MDJInput
              label="Company Number"
              value={formData.company.companyNumber || ''}
              onChange={(e) => handleInputChange('company.companyNumber', e.target.value)}
              placeholder="e.g. 12345678"
              required
            />
          )}
          
          <MDJSelect
            label="Accounting Framework"
            value={formData.framework}
            onChange={(e) => handleInputChange('framework', e.target.value)}
            required
          >
            {isSoleTrader ? (
              <option value={formData.framework}>Sole trader / Individual</option>
            ) : (
              <>
                <option value="MICRO_FRS105">Micro-entity (FRS 105)</option>
                <option value="SMALL_FRS102_1A">Small company (FRS 102 1A)</option>
                <option value="DORMANT">Dormant company</option>
              </>
            )}
          </MDJSelect>
        </div>
      </MDJCard>

      {/* Registered Office */}
      <MDJCard title={isSoleTrader ? 'Business Address' : 'Registered Office Address'}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJInput
            label="Address Line 1"
            value={formData.company.registeredOffice.line1}
            onChange={(e) => handleInputChange('company.registeredOffice.line1', e.target.value)}
            placeholder="Enter address line 1"
            required
          />
          
          <MDJInput
            label="Address Line 2"
            value={formData.company.registeredOffice.line2 || ''}
            onChange={(e) => handleInputChange('company.registeredOffice.line2', e.target.value)}
            placeholder="Enter address line 2 (optional)"
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <MDJInput
              label="Town/City"
              value={formData.company.registeredOffice.town || ''}
              onChange={(e) => handleInputChange('company.registeredOffice.town', e.target.value)}
              placeholder="Enter town or city"
            />
            
            <MDJInput
              label="County"
              value={formData.company.registeredOffice.county || ''}
              onChange={(e) => handleInputChange('company.registeredOffice.county', e.target.value)}
              placeholder="Enter county"
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <MDJInput
              label="Postcode"
              value={formData.company.registeredOffice.postcode}
              onChange={(e) => handleInputChange('company.registeredOffice.postcode', e.target.value)}
              placeholder="Enter postcode"
              required
            />
            
            <MDJSelect
              label="Country"
              value={formData.company.registeredOffice.country}
              onChange={(e) => handleInputChange('company.registeredOffice.country', e.target.value)}
              required
            >
              <option value="England">England</option>
              <option value="Wales">Wales</option>
              <option value="Scotland">Scotland</option>
              <option value="Northern Ireland">Northern Ireland</option>
            </MDJSelect>
          </div>
        </div>
      </MDJCard>

      {/* Accounting Period */}
      <MDJCard title="Accounting Period">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <MDJInput
              label="Period Start Date"
              type="date"
              value={formData.period.startDate}
              onChange={(e) => handleInputChange('period.startDate', e.target.value)}
              required
            />
            
            <MDJInput
              label="Period End Date"
              type="date"
              value={formData.period.endDate}
              onChange={(e) => handleInputChange('period.endDate', e.target.value)}
              required
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={!formData.period.isFirstYear}
              onChange={(e) => handleInputChange('period.isFirstYear', !e.target.checked)}
            />
            <span>{isSoleTrader ? 'This is not the business’s first accounting period' : 'This is not the company’s first accounting period'}</span>
          </label>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: formData.period.isFirstYear ? 'var(--status-info-bg)' : 'var(--surface-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>
                {formData.period.isFirstYear ? 'ℹ️' : '📊'}
              </span>
              <strong>
                {formData.period.isFirstYear ? 'First Year Accounts' : 'Subsequent Year Accounts'}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {formData.period.isFirstYear 
                ? isSoleTrader
                  ? 'This is the first set of accounts for this business. Comparative figures will not be required.'
                  : 'This is the first set of accounts for this company. Comparative figures will not be required.'
                : isSoleTrader
                  ? 'This business has filed accounts before. Comparative figures from the prior period will be required.'
                  : 'This company has filed accounts before. Comparative figures from the prior period will be required.'
              }
            </p>
          </div>
        </div>
      </MDJCard>

      {!isSoleTrader && (
        <MDJCard 
          title="Directors" 
          actions={
            <button 
              onClick={addDirector}
              className="btn-outline-primary btn-sm"
            >
              Add Director
            </button>
          }
        >
          {formData.company.directors.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem', 
              color: 'var(--text-muted)',
              backgroundColor: 'var(--surface-subtle)',
              borderRadius: '6px'
            }}>
              <p>No directors added yet.</p>
              <button onClick={addDirector} className="btn-primary btn-sm">
                Add First Director
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {formData.company.directors.map((director, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  alignItems: 'flex-end',
                  padding: '1rem',
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: '6px'
                }}>
                  <div style={{ flex: 1 }}>
                    <MDJInput
                      label={`Director ${index + 1} Name`}
                      value={director.name}
                      onChange={(e) => updateDirector(index, e.target.value)}
                      placeholder="Enter director name"
                      required
                    />
                  </div>
                  <button
                    onClick={() => removeDirector(index)}
                    className="btn-outline-primary btn-sm"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </MDJCard>
      )}
    </div>
  );
}
