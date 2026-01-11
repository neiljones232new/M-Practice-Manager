'use client';

import { useState, useEffect } from 'react';
import { AccountsSet, FrameworkDisclosuresSection } from '@/lib/types';
import { MDJSelect, MDJCheckbox, MDJCard } from '@/components/mdj-ui';

interface FrameworkDisclosuresStepProps {
  accountsSet: AccountsSet;
  onUpdate: (data: FrameworkDisclosuresSection) => void;
}

export function FrameworkDisclosuresStep({ accountsSet, onUpdate }: FrameworkDisclosuresStepProps) {
  const [formData, setFormData] = useState<FrameworkDisclosuresSection>(() => {
    return accountsSet.sections.frameworkDisclosures || {
      framework: accountsSet.framework,
      auditExemption: {
        isAuditExempt: true,
        exemptionStatementKey: accountsSet.framework === 'MICRO_FRS105' ? 'MICRO_ENTITY' : 'CA2006_S477_SMALL'
      },
      includePLInClientPack: true,
      includeDirectorsReport: false,
      includeAccountantsReport: false
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

  const getExemptionOptions = () => {
    switch (formData.framework) {
      case 'MICRO_FRS105':
        return [
          { value: 'MICRO_ENTITY', label: 'Micro-entity exemption' }
        ];
      case 'SMALL_FRS102_1A':
        return [
          { value: 'CA2006_S477_SMALL', label: 'Small company exemption (CA2006 S477)' }
        ];
      case 'DORMANT':
        return [
          { value: 'DORMANT', label: 'Dormant company exemption' }
        ];
      default:
        return [];
    }
  };

  const getFrameworkDescription = () => {
    switch (formData.framework) {
      case 'MICRO_FRS105':
        return 'Micro-entity accounts under FRS 105. These are the simplest form of statutory accounts for very small companies.';
      case 'SMALL_FRS102_1A':
        return 'Small company accounts under FRS 102 Section 1A. These provide more detailed disclosure than micro-entity accounts.';
      case 'DORMANT':
        return 'Dormant company accounts. For companies that have had no significant accounting transactions during the period.';
      default:
        return '';
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Framework Selection */}
      <MDJCard title="Accounting Framework">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJSelect
            label="Accounting Framework"
            value={formData.framework}
            onChange={(e) => handleInputChange('framework', e.target.value)}
            required
          >
            <option value="MICRO_FRS105">Micro-entity (FRS 105)</option>
            <option value="SMALL_FRS102_1A">Small company (FRS 102 1A)</option>
            <option value="DORMANT">Dormant company</option>
          </MDJSelect>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--status-info-bg)',
            borderRadius: '6px',
            border: '1px solid var(--status-info-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {formData.framework.replace('_', ' ')}
                </strong>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {getFrameworkDescription()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </MDJCard>

      {/* Audit Exemption */}
      <MDJCard title="Audit Exemption">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJCheckbox
            label="Company is exempt from audit"
            checked={formData.auditExemption.isAuditExempt}
            onChange={(e) => handleInputChange('auditExemption.isAuditExempt', e.target.checked)}
          />
          
          {formData.auditExemption.isAuditExempt && (
            <MDJSelect
              label="Exemption Statement"
              value={formData.auditExemption.exemptionStatementKey}
              onChange={(e) => handleInputChange('auditExemption.exemptionStatementKey', e.target.value)}
              required
            >
              {getExemptionOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </MDJSelect>
          )}
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Most small companies qualify for audit exemption. The exemption statement will be included 
              in the statutory accounts to confirm the company's eligibility.
            </p>
          </div>
        </div>
      </MDJCard>

      {/* Additional Disclosures */}
      <MDJCard title="Additional Disclosures">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJCheckbox
            label="Include Profit & Loss in client pack"
            checked={formData.includePLInClientPack}
            onChange={(e) => handleInputChange('includePLInClientPack', e.target.checked)}
          />
          
          <MDJCheckbox
            label="Include Directors' Report"
            checked={formData.includeDirectorsReport}
            onChange={(e) => handleInputChange('includeDirectorsReport', e.target.checked)}
          />
          
          <MDJCheckbox
            label="Include Accountants' Report"
            checked={formData.includeAccountantsReport}
            onChange={(e) => handleInputChange('includeAccountantsReport', e.target.checked)}
          />
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
              Disclosure Options
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <li><strong>Profit & Loss:</strong> Include detailed P&L in the client pack (not filed with Companies House)</li>
              <li><strong>Directors' Report:</strong> Additional report on company activities and future developments</li>
              <li><strong>Accountants' Report:</strong> Statement from the preparing accountant</li>
            </ul>
          </div>
        </div>
      </MDJCard>

      {/* Framework-Specific Information */}
      {formData.framework === 'MICRO_FRS105' && (
        <MDJCard title="Micro-Entity Specific">
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--status-success-bg)',
            borderRadius: '6px',
            border: '1px solid var(--status-success-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Simplified Reporting
                </strong>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Micro-entity accounts have minimal disclosure requirements. Only a simplified 
                  balance sheet and notes are required to be filed with Companies House.
                </p>
              </div>
            </div>
          </div>
        </MDJCard>
      )}

      {formData.framework === 'DORMANT' && (
        <MDJCard title="Dormant Company">
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--status-warning-bg)',
            borderRadius: '6px',
            border: '1px solid var(--status-warning-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Dormant Company Requirements
                </strong>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Ensure the company has had no significant accounting transactions during the period. 
                  Dormant companies still need to file annual accounts and confirmation statements.
                </p>
              </div>
            </div>
          </div>
        </MDJCard>
      )}
    </div>
  );
}