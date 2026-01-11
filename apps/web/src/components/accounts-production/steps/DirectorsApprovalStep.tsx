'use client';

import { useState } from 'react';
import { AccountsSet, DirectorsApprovalSection, SignatureType } from '@/lib/types';
import { MDJCard, MDJButton, MDJInput, MDJSelect } from '@/components/mdj-ui';

interface DirectorsApprovalStepProps {
  accountsSet: AccountsSet;
  onUpdate: (data: DirectorsApprovalSection) => void;
}

export function DirectorsApprovalStep({ accountsSet, onUpdate }: DirectorsApprovalStepProps) {
  const [formData, setFormData] = useState<DirectorsApprovalSection>(() => {
    return accountsSet.sections.directorsApproval || {
      approved: false,
      directorName: '',
      approvalDate: '',
      signatureType: 'TYPED_NAME'
    };
  });

  // Get directors from company period section
  const directors = accountsSet.sections.companyPeriod?.company.directors || [];
  const hasDirectors = directors.length > 0;

  const handleInputChange = (field: keyof DirectorsApprovalSection, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Call onUpdate with the new data immediately when user makes changes
      onUpdate(newData);
      
      return newData;
    });
  };

  const handleApprovalToggle = () => {
    const newApproved = !formData.approved;
    
    // If approving, set default values
    if (newApproved) {
      const defaultDirector = directors.length > 0 ? directors[0].name : '';
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      setFormData(prev => {
        const newData = {
          ...prev,
          approved: true,
          directorName: prev.directorName || defaultDirector,
          approvalDate: prev.approvalDate || today,
          signatureType: prev.signatureType || 'TYPED_NAME' as SignatureType
        };
        
        onUpdate(newData);
        return newData;
      });
    } else {
      handleInputChange('approved', false);
    }
  };

  const isReadyForApproval = () => {
    // Check if all required sections are complete and balance sheet is balanced
    const requiredSections = ['companyPeriod', 'frameworkDisclosures', 'accountingPolicies', 'profitAndLoss', 'balanceSheet', 'notes'];
    const completedSections = requiredSections.filter(section => accountsSet.sections[section as keyof typeof accountsSet.sections]);
    const allSectionsComplete = completedSections.length === requiredSections.length;
    const isBalanced = accountsSet.validation?.isBalanced ?? false;
    const hasNoErrors = (accountsSet.validation?.errors?.length ?? 0) === 0;
    
    return allSectionsComplete && isBalanced && hasNoErrors;
  };

  const canApprove = isReadyForApproval();

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Readiness Check */}
      <MDJCard title="Approval Readiness Check">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ 
            padding: '1rem', 
            backgroundColor: canApprove ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '1.5rem' }}>
              {canApprove ? '✅' : '⚠️'}
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                {canApprove ? 'Ready for Approval' : 'Not Ready for Approval'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {canApprove 
                  ? 'All sections are complete and the balance sheet is balanced. You can now approve these accounts.'
                  : 'Please complete all sections and ensure the balance sheet is balanced before approving.'
                }
              </div>
            </div>
          </div>

          {!canApprove && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--surface-subtle)', 
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}>
              <strong>Requirements for approval:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
                <li>All sections must be completed</li>
                <li>Balance sheet must be balanced</li>
                <li>No validation errors</li>
                <li>Director must be selected</li>
                <li>Approval date must be set</li>
              </ul>
            </div>
          )}
        </div>
      </MDJCard>

      {/* Director Selection */}
      <MDJCard title="Director Selection">
        {!hasDirectors ? (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            backgroundColor: 'var(--status-warning-bg)',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              No Directors Found
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
              No directors were found in the company information. Please ensure directors are added in the Company & Period step.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <MDJSelect
              label="Signing Director"
              value={formData.directorName || ''}
              onChange={(e) => handleInputChange('directorName', e.target.value)}
              required
              disabled={!canApprove}
            >
              <option value="">Select a director...</option>
              {directors.map((director, index) => (
                <option key={index} value={director.name}>
                  {director.name}
                </option>
              ))}
            </MDJSelect>

            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--surface-subtle)', 
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: 'var(--text-muted)'
            }}>
              <strong>Note:</strong> The selected director will be shown as the signatory on the statutory accounts. 
              Ensure this director has the authority to sign on behalf of the company.
            </div>
          </div>
        )}
      </MDJCard>

      {/* Approval Details */}
      <MDJCard title="Approval Details">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MDJInput
            label="Approval Date"
            type="date"
            value={formData.approvalDate || ''}
            onChange={(e) => handleInputChange('approvalDate', e.target.value)}
            required
            disabled={!canApprove}
            max={new Date().toISOString().split('T')[0]} // Cannot be in the future
          />

          <MDJSelect
            label="Signature Type"
            value={formData.signatureType || 'TYPED_NAME'}
            onChange={(e) => handleInputChange('signatureType', e.target.value as SignatureType)}
            disabled={!canApprove}
          >
            <option value="TYPED_NAME">Typed Name</option>
            <option value="UPLOADED_SIGNATURE">Uploaded Signature</option>
          </MDJSelect>

          {formData.signatureType === 'UPLOADED_SIGNATURE' && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--status-info-bg)', 
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}>
              <strong>Uploaded Signature:</strong> This feature will allow directors to upload their signature image. 
              For now, the typed name will be used as the signature.
            </div>
          )}
        </div>
      </MDJCard>

      {/* Final Approval */}
      <MDJCard title="Final Approval">
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: formData.approved ? 'var(--status-success-bg)' : 'var(--surface-subtle)',
            borderRadius: '8px',
            border: formData.approved ? '2px solid var(--success)' : '2px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                id="approvalCheckbox"
                checked={formData.approved}
                onChange={handleApprovalToggle}
                disabled={!canApprove || !formData.directorName || !formData.approvalDate}
                style={{ transform: 'scale(1.2)' }}
              />
              <label htmlFor="approvalCheckbox" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {formData.approved ? '✅ Accounts Approved' : 'Approve Accounts'}
              </label>
            </div>

            {formData.approved ? (
              <div style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
                <strong>Approved by:</strong> {formData.directorName}<br />
                <strong>Date:</strong> {formData.approvalDate ? new Date(formData.approvalDate).toLocaleDateString('en-GB') : ''}<br />
                <strong>Signature:</strong> {formData.signatureType === 'TYPED_NAME' ? 'Typed Name' : 'Uploaded Signature'}
              </div>
            ) : (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                By checking this box, you confirm that the director named above has reviewed and approved these accounts 
                for filing with Companies House.
              </div>
            )}
          </div>

          {formData.approved && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--status-info-bg)', 
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}>
              <strong>Next Steps:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
                <li>Generate final PDF and HTML outputs</li>
                <li>Lock accounts to prevent further editing</li>
                <li>File with Companies House (if required)</li>
                <li>Distribute to relevant parties</li>
              </ul>
            </div>
          )}

          {!canApprove && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--status-warning-bg)', 
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: 'var(--warning)'
            }}>
              <strong>Cannot approve yet:</strong> Please complete all previous steps and ensure there are no validation errors.
            </div>
          )}
        </div>
      </MDJCard>

      {/* Summary */}
      {formData.approved && (
        <MDJCard title="Approval Summary">
          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Status:</span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>✅ Approved</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Signing Director:</span>
              <span style={{ fontWeight: 600 }}>{formData.directorName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Approval Date:</span>
              <span style={{ fontWeight: 600 }}>
                {formData.approvalDate ? new Date(formData.approvalDate).toLocaleDateString('en-GB') : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Signature Type:</span>
              <span style={{ fontWeight: 600 }}>
                {formData.signatureType === 'TYPED_NAME' ? 'Typed Name' : 'Uploaded Signature'}
              </span>
            </div>
            <div style={{ 
              padding: '1rem 0', 
              borderTop: '1px solid var(--border-subtle)',
              marginTop: '0.5rem',
              textAlign: 'center',
              fontStyle: 'italic',
              color: 'var(--text-muted)'
            }}>
              These accounts are ready for final output generation and filing.
            </div>
          </div>
        </MDJCard>
      )}
    </div>
  );
}