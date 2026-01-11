'use client';

import { useState, useEffect } from 'react';
import { AccountsSet, ValidationError, ValidationWarning } from '@/lib/types';
import { MDJCard, MDJButton } from '@/components/mdj-ui';
import { api, API_BASE_URL } from '@/lib/api';

interface ReviewAndOutputsStepProps {
  accountsSet: AccountsSet;
  onUpdate: (updatedAccountsSet: AccountsSet) => void;
}

interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isBalanced: boolean;
  isValid: boolean;
}

interface CalculationResult {
  calculations: any;
  ratios: any;
  percentageChanges?: any;
  isBalanced: boolean;
  imbalance?: number;
}

export function ReviewAndOutputsStep({ accountsSet, onUpdate }: ReviewAndOutputsStepProps) {
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [calculations, setCalculations] = useState<CalculationResult | null>(null);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);

  // Auto-validate on component mount
  useEffect(() => {
    handleValidate();
    handleGetCalculations();
  }, []);

  const handleValidate = async () => {
    try {
      setValidating(true);
      const validation = await api.post(`/accounts-sets/${accountsSet.id}/validate`);
      
      setValidationResult(validation);
      setLastValidated(new Date());
      
      // Update the accounts set with validation results
      const updatedAccountsSet = {
        ...accountsSet,
        validation: {
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          isBalanced: validation.isBalanced || false
        }
      };
      
      onUpdate(updatedAccountsSet);
    } catch (error: any) {
      console.error('Validation failed:', error);
      setValidationResult({
        errors: [{ field: 'general', message: error.message || 'Validation failed', code: 'VALIDATION_ERROR', section: 'general' }],
        warnings: [],
        isBalanced: false,
        isValid: false
      });
    } finally {
      setValidating(false);
    }
  };

  const handleGetCalculations = async () => {
    try {
      const result = await api.get(`/accounts-sets/${accountsSet.id}/calculations`);
      setCalculations(result);
    } catch (error) {
      console.error('Failed to get calculations:', error);
    }
  };

  const handleGenerateOutputs = async () => {
    try {
      setGenerating(true);
      const result = await api.post(`/accounts-sets/${accountsSet.id}/outputs`);
      
      // Update the accounts set with new output URLs
      const updatedAccountsSet = {
        ...accountsSet,
        outputs: {
          htmlUrl: result.htmlUrl,
          pdfUrl: result.pdfUrl
        }
      };
      
      onUpdate(updatedAccountsSet);
    } catch (error: any) {
      console.error('Output generation failed:', error);
      alert(`Output generation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewHtml = async () => {
    if (accountsSet.outputs.htmlUrl) {
      try {
        // Use the API client to get the file with authentication
        const filename = accountsSet.outputs.htmlUrl.split('/').pop();
        const response = await fetch(`${API_BASE_URL}/accounts-sets/${accountsSet.id}/outputs/html/${filename}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        
        if (response.ok) {
          const htmlContent = await response.text();
          // Create a blob and open it in a new window
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          // Clean up the object URL after a short delay
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          throw new Error(`Failed to fetch HTML: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Failed to preview HTML:', error);
        alert('Failed to preview HTML file. Please try again.');
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (accountsSet.outputs.pdfUrl) {
      try {
        // Use the API client to get the file with authentication
        const filename = accountsSet.outputs.pdfUrl.split('/').pop();
        const response = await fetch(`${API_BASE_URL}/accounts-sets/${accountsSet.id}/outputs/pdf/${filename}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        
        if (response.ok) {
          const pdfBlob = await response.blob();
          // Create a download link
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || 'statutory-accounts.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Clean up the object URL
          URL.revokeObjectURL(url);
        } else {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Failed to download PDF:', error);
        alert('Failed to download PDF file. Please try again.');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCompletionPercentage = () => {
    const requiredSections = ['companyPeriod', 'frameworkDisclosures', 'accountingPolicies', 'profitAndLoss', 'balanceSheet', 'notes', 'directorsApproval'];
    const completedSections = requiredSections.filter(section => accountsSet.sections[section as keyof typeof accountsSet.sections]);
    return Math.round((completedSections.length / requiredSections.length) * 100);
  };

  const isReadyForGeneration = () => {
    return validationResult?.isValid && 
           validationResult?.isBalanced && 
           accountsSet.sections.directorsApproval?.approved;
  };

  const completionPercentage = getCompletionPercentage();
  const hasOutputs = accountsSet.outputs.htmlUrl && accountsSet.outputs.pdfUrl;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Overall Status */}
      <MDJCard title="Accounts Status Overview">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: completionPercentage === 100 ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {completionPercentage}%
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Completion
              </div>
            </div>

            <div style={{ 
              padding: '1rem', 
              backgroundColor: validationResult?.isBalanced ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                {validationResult?.isBalanced ? '✅' : '❌'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Balance Sheet
              </div>
            </div>

            <div style={{ 
              padding: '1rem', 
              backgroundColor: (validationResult?.errors?.length || 0) === 0 ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {validationResult?.errors?.length || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Errors
              </div>
            </div>

            <div style={{ 
              padding: '1rem', 
              backgroundColor: hasOutputs ? 'var(--status-success-bg)' : 'var(--surface-subtle)',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                {hasOutputs ? '📄' : '⏳'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Outputs
              </div>
            </div>
          </div>
        </div>
      </MDJCard>

      {/* Validation Results */}
      <MDJCard title="Validation Summary">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Last Validated:</strong> {lastValidated ? lastValidated.toLocaleString() : 'Never'}
            </div>
            <MDJButton
              onClick={handleValidate}
              disabled={validating}
              variant="outline"
              size="sm"
            >
              {validating ? 'Validating...' : 'Re-validate'}
            </MDJButton>
          </div>

          {validationResult && (
            <>
              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--status-danger-bg)',
                  borderRadius: '6px',
                  border: '1px solid var(--danger)'
                }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--danger)' }}>
                    ❌ Errors ({validationResult.errors.length})
                  </h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {validationResult.errors.map((error, index) => (
                      <div key={index} style={{ 
                        padding: '0.5rem', 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        <strong>{error.section}:</strong> {error.message}
                        {error.field && <span style={{ color: 'var(--text-muted)' }}> (Field: {error.field})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--status-warning-bg)',
                  borderRadius: '6px',
                  border: '1px solid var(--warning)'
                }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--warning)' }}>
                    ⚠️ Warnings ({validationResult.warnings.length})
                  </h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {validationResult.warnings.map((warning, index) => (
                      <div key={index} style={{ 
                        padding: '0.5rem', 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        <strong>{warning.section}:</strong> {warning.message}
                        {warning.field && <span style={{ color: 'var(--text-muted)' }}> (Field: {warning.field})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success */}
              {validationResult.errors.length === 0 && (
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--status-success-bg)',
                  borderRadius: '6px',
                  border: '1px solid var(--success)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
                  <strong style={{ color: 'var(--success)' }}>All Validations Passed</strong>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    The accounts are ready for output generation
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </MDJCard>

      {/* Balance Sheet Check */}
      {calculations && (
        <MDJCard title="Balance Sheet Analysis">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: calculations.isBalanced ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '2rem' }}>
                {calculations.isBalanced ? '✅' : '❌'}
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {calculations.isBalanced ? 'Balance Sheet Balanced' : 'Balance Sheet Out of Balance'}
                </div>
                {!calculations.isBalanced && calculations.imbalance && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>
                    Imbalance: {formatCurrency(Math.abs(calculations.imbalance))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '0.75rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                  {formatCurrency(calculations.calculations?.balanceSheet?.totalAssets || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Assets</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--warning)' }}>
                  {formatCurrency(calculations.calculations?.balanceSheet?.totalLiabilities || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Liabilities</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>
                  {formatCurrency(calculations.calculations?.balanceSheet?.totalEquity || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Equity</div>
              </div>
            </div>
          </div>
        </MDJCard>
      )}

      {/* Output Generation */}
      <MDJCard title="Output Generation">
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ 
            padding: '1rem', 
            backgroundColor: isReadyForGeneration() ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '1.5rem' }}>
                {isReadyForGeneration() ? '✅' : '⚠️'}
              </div>
              <strong>
                {isReadyForGeneration() ? 'Ready for Output Generation' : 'Not Ready for Output Generation'}
              </strong>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {isReadyForGeneration() 
                ? 'All validations passed and accounts are approved. You can generate outputs.'
                : 'Please resolve all validation errors and ensure accounts are approved before generating outputs.'
              }
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <MDJButton
              onClick={handleGenerateOutputs}
              disabled={generating || !isReadyForGeneration()}
              variant="primary"
              size="lg"
            >
              {generating ? 'Generating Outputs...' : 'Generate HTML & PDF'}
            </MDJButton>
          </div>

          {hasOutputs && (
            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: 'var(--status-success-bg)',
              borderRadius: '8px',
              border: '2px solid var(--success)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>📄</div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                    Outputs Generated Successfully
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    HTML and PDF versions are ready for preview and download
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <MDJButton
                  onClick={handlePreviewHtml}
                  variant="outline"
                >
                  📄 Preview HTML
                </MDJButton>
                <MDJButton
                  onClick={handleDownloadPdf}
                  variant="outline"
                >
                  📥 Download PDF
                </MDJButton>
              </div>
            </div>
          )}
        </div>
      </MDJCard>

      {/* Final Status */}
      {hasOutputs && accountsSet.sections.directorsApproval?.approved && (
        <MDJCard title="Final Status">
          <div style={{ 
            padding: '2rem', 
            backgroundColor: 'var(--brand-primary)',
            color: 'white',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Accounts Production Complete</h3>
            <p style={{ margin: '0 0 1.5rem 0', opacity: 0.9 }}>
              The statutory accounts have been successfully prepared, validated, approved, and generated.
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '1rem',
              marginTop: '1.5rem'
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>Status</div>
                <div style={{ opacity: 0.9 }}>✅ Complete</div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Approved By</div>
                <div style={{ opacity: 0.9 }}>{accountsSet.sections.directorsApproval?.directorName}</div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Approval Date</div>
                <div style={{ opacity: 0.9 }}>
                  {accountsSet.sections.directorsApproval?.approvalDate 
                    ? new Date(accountsSet.sections.directorsApproval.approvalDate).toLocaleDateString('en-GB')
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>
        </MDJCard>
      )}
    </div>
  );
}