'use client';

import { ReactNode } from 'react';
import { AccountsSet, WizardStep, WizardStepConfig, AutosaveState } from '@/lib/types';

interface WizardShellProps {
  steps: WizardStepConfig[];
  currentStep: WizardStep;
  accountsSet: AccountsSet;
  onStepChange: (step: WizardStep) => void;
  autosaveState: AutosaveState;
  children: ReactNode;
}

export function WizardShell({
  steps,
  currentStep,
  accountsSet,
  onStepChange,
  autosaveState,
  children
}: WizardShellProps) {
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const currentStepConfig = steps[currentStepIndex];

  const canNavigateToStep = (stepIndex: number) => {
    // Can always navigate to current step or previous steps
    if (stepIndex <= currentStepIndex) return true;
    
    // Can navigate to next step if current step is complete and has no errors
    if (stepIndex === currentStepIndex + 1) {
      const currentStepComplete = currentStepConfig?.isComplete(accountsSet);
      const currentStepHasErrors = currentStepConfig?.hasErrors(accountsSet);
      return currentStepComplete && !currentStepHasErrors;
    }
    
    // Can't skip ahead more than one step
    return false;
  };

  const getStepStatus = (step: WizardStepConfig, index: number) => {
    const isComplete = step.isComplete(accountsSet);
    const hasErrors = step.hasErrors(accountsSet);
    const isCurrent = step.key === currentStep;
    const canNavigate = canNavigateToStep(index);

    if (isCurrent) return 'current';
    if (hasErrors) return 'error';
    if (isComplete) return 'complete';
    if (canNavigate) return 'available';
    return 'disabled';
  };

  const handleStepClick = (step: WizardStepConfig, index: number) => {
    if (canNavigateToStep(index)) {
      onStepChange(step.key);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1];
      if (canNavigateToStep(currentStepIndex + 1)) {
        onStepChange(nextStep.key);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1];
      onStepChange(prevStep.key);
    }
  };

  const formatLastSaved = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const completedSteps = steps.filter(step => step.isComplete(accountsSet)).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="wizard-shell">
      {/* Progress Header */}
      <div className="card-mdj" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              {currentStepConfig?.title}
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {currentStepConfig?.description}
            </p>
          </div>
          
          {/* Autosave Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
            {autosaveState.isSaving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <div
                  style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid var(--border-subtle)',
                    borderTopColor: 'var(--brand-primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Saving...
              </div>
            )}
            
            {!autosaveState.isSaving && autosaveState.lastSaved && (
              <div style={{ color: 'var(--text-muted)' }}>
                Saved {formatLastSaved(autosaveState.lastSaved)}
              </div>
            )}
            
            {autosaveState.error && (
              <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>
                Save failed: {autosaveState.error}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Progress: {completedSteps} of {totalSteps} steps complete
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: 'var(--surface-subtle)', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: 'var(--brand-primary)',
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>

        {/* Step Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);
            const canNavigate = canNavigateToStep(index);
            
            return (
              <button
                key={step.key}
                onClick={() => handleStepClick(step, index)}
                disabled={!canNavigate}
                className={`wizard-step-button ${status}`}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  background: status === 'current' 
                    ? 'var(--brand-primary)' 
                    : status === 'complete'
                    ? 'var(--status-success-bg)'
                    : status === 'error'
                    ? 'var(--status-danger-bg)'
                    : 'var(--surface)',
                  color: status === 'current'
                    ? 'white'
                    : status === 'complete'
                    ? 'var(--status-success-text)'
                    : status === 'error'
                    ? 'var(--status-danger-text)'
                    : status === 'disabled'
                    ? 'var(--text-muted)'
                    : 'var(--text-primary)',
                  cursor: canNavigate ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: status === 'current' ? 600 : 500,
                  opacity: status === 'disabled' ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>
                  {status === 'complete' ? '✓' : 
                   status === 'error' ? '!' : 
                   status === 'current' ? '●' : 
                   index + 1}
                </span>
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {children}
      </div>

      {/* Navigation Controls */}
      <div className="card-mdj" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="btn-outline-primary"
            style={{ opacity: currentStepIndex === 0 ? 0.5 : 1 }}
          >
            ← Previous
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Validation Status */}
            {accountsSet.validation.errors.length > 0 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: 'var(--danger)',
                fontSize: '0.875rem'
              }}>
                <span>!</span>
                {accountsSet.validation.errors.length} error{accountsSet.validation.errors.length !== 1 ? 's' : ''}
              </div>
            )}
            
            {accountsSet.validation.warnings.length > 0 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: 'var(--warning)',
                fontSize: '0.875rem'
              }}>
                <span>⚠</span>
                {accountsSet.validation.warnings.length} warning{accountsSet.validation.warnings.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={currentStepIndex === steps.length - 1 || !canNavigateToStep(currentStepIndex + 1)}
            className="btn-primary"
            style={{ 
              opacity: (currentStepIndex === steps.length - 1 || !canNavigateToStep(currentStepIndex + 1)) ? 0.5 : 1 
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}