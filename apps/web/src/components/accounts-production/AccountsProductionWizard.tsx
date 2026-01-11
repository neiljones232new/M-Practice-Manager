'use client';

import { useState, useCallback, useEffect } from 'react';
import { WizardShell } from './WizardShell';
import { CompanyPeriodStep } from './steps/CompanyPeriodStep';
import { FrameworkDisclosuresStep } from './steps/FrameworkDisclosuresStep';
import { AccountingPoliciesStep } from './steps/AccountingPoliciesStep';
import { ProfitAndLossStep } from './steps/ProfitAndLossStep';
import { BalanceSheetStep } from './steps/BalanceSheetStep';
import { NotesStep } from './steps/NotesStep';
import { DirectorsApprovalStep } from './steps/DirectorsApprovalStep';
import { ReviewAndOutputsStep } from './steps/ReviewAndOutputsStep';
import { AccountsSet, WizardStep, WizardStepConfig } from '@/lib/types';
import { api } from '@/lib/api';

interface AccountsProductionWizardProps {
  accountsSet: AccountsSet;
  onUpdate: (updatedAccountsSet: AccountsSet) => void;
}

const WIZARD_STEPS: WizardStepConfig[] = [
  {
    key: 'companyPeriod',
    title: 'Company & Period',
    description: 'Company information and accounting period',
    isComplete: (accountsSet) => {
      const section = accountsSet.sections.companyPeriod;
      return !!(section?.company.name && section?.company.companyNumber && section?.period.startDate && section?.period.endDate);
    },
    hasErrors: (accountsSet) => {
      return accountsSet.validation.errors.some(error => error.section === 'companyPeriod');
    }
  },
  {
    key: 'frameworkDisclosures',
    title: 'Framework & Disclosures',
    description: 'Accounting framework and disclosure options',
    isComplete: (accountsSet) => {
      const section = accountsSet.sections.frameworkDisclosures;
      return !!(section?.framework && section?.auditExemption);
    },
    hasErrors: (accountsSet) => {
      return accountsSet.validation.errors.some(error => error.section === 'frameworkDisclosures');
    }
  },
  {
    key: 'accountingPolicies',
    title: 'Accounting Policies',
    description: 'Accounting policies and basis of preparation',
    isComplete: (accountsSet) => {
      const section = accountsSet.sections.accountingPolicies;
      return !!(section?.basisOfPreparation && section?.goingConcern);
    },
    hasErrors: (accountsSet) => {
      return accountsSet.validation.errors.some(error => error.section === 'accountingPolicies');
    }
  },
  {
    key: 'profitAndLoss',
    title: 'Profit & Loss',
    description: 'Income statement figures and calculations',
    isComplete: (accountsSet) => {
      const section = accountsSet.sections.profitAndLoss;
      return !!(section?.lines);
    },
    hasErrors: (accountsSet) => {
      return accountsSet.validation.errors.some(error => error.section === 'profitAndLoss');
    }
  },
  {
    key: 'balanceSheet',
    title: 'Balance Sheet',
    description: 'Statement of financial position',
    isComplete: (accountsSet) => {
      const section = accountsSet.sections.balanceSheet;
      return !!(section?.assets && section?.liabilities && section?.equity);
    },
    hasErrors: (accountsSet) => {
      return accountsSet.validation.errors.some(error => error.section === 'balanceSheet');
    }
  },
  {
    key: 'notes',
    title: 'Notes',
    description: 'Additional notes and disclosures',
    isComplete: (accountsSet) => {
      const section = accountsSet.sections.notes;
      return !!(section?.countryOfIncorporation && section?.shareCapital);
    },
    hasErrors: (accountsSet) => {
      return accountsSet.validation.errors.some(error => error.section === 'notes');
    }
  },
  {
    key: 'directorsApproval',
    title: 'Directors Approval',
    description: 'Director approval and signing',
    isComplete: (accountsSet) => {
      const section = accountsSet.sections.directorsApproval;
      return !!(section?.approved && section?.directorName && section?.approvalDate);
    },
    hasErrors: (accountsSet) => {
      return accountsSet.validation.errors.some(error => error.section === 'directorsApproval');
    }
  },
  {
    key: 'reviewAndOutputs',
    title: 'Review & Outputs',
    description: 'Final review and output generation',
    isComplete: (accountsSet) => {
      return accountsSet.status === 'READY' || accountsSet.status === 'LOCKED';
    },
    hasErrors: (accountsSet) => {
      return accountsSet.validation.errors.length > 0;
    }
  }
];

export function AccountsProductionWizard({ accountsSet, onUpdate }: AccountsProductionWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('companyPeriod');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-save debounced function
  const debouncedSave = useCallback(
    debounce(async (sectionKey: string, data: any) => {
      try {
        setIsSaving(true);
        setSaveError(null);
        
        const updatedAccountsSet = await api.patch<AccountsSet>(
          `/accounts-sets/${accountsSet.id}/sections/${sectionKey}`,
          { data }
        );
        
        onUpdate(updatedAccountsSet);
        setLastSaved(new Date());
      } catch (error: any) {
        setSaveError(error?.message || 'Failed to save changes');
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, 750),
    [accountsSet.id, onUpdate]
  );

  const handleSectionUpdate = useCallback((sectionKey: string, data: any) => {
    // Optimistically update the local state
    const updatedAccountsSet = {
      ...accountsSet,
      sections: {
        ...accountsSet.sections,
        [sectionKey]: data
      },
      updatedAt: new Date().toISOString()
    };
    
    onUpdate(updatedAccountsSet);
    
    // Trigger auto-save
    debouncedSave(sectionKey, data);
  }, [accountsSet, onUpdate, debouncedSave]);

  const handleStepChange = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'companyPeriod':
        return (
          <CompanyPeriodStep
            accountsSet={accountsSet}
            onUpdate={(data) => handleSectionUpdate('companyPeriod', data)}
          />
        );
      case 'frameworkDisclosures':
        return (
          <FrameworkDisclosuresStep
            accountsSet={accountsSet}
            onUpdate={(data) => handleSectionUpdate('frameworkDisclosures', data)}
          />
        );
      case 'accountingPolicies':
        return (
          <AccountingPoliciesStep
            accountsSet={accountsSet}
            onUpdate={(data) => handleSectionUpdate('accountingPolicies', data)}
          />
        );
      case 'profitAndLoss':
        return (
          <ProfitAndLossStep
            accountsSet={accountsSet}
            onUpdate={(data) => handleSectionUpdate('profitAndLoss', data)}
          />
        );
      case 'balanceSheet':
        return (
          <BalanceSheetStep
            accountsSet={accountsSet}
            onUpdate={(data) => handleSectionUpdate('balanceSheet', data)}
          />
        );
      case 'notes':
        return (
          <NotesStep
            accountsSet={accountsSet}
            onUpdate={(data) => handleSectionUpdate('notes', data)}
          />
        );
      case 'directorsApproval':
        return (
          <DirectorsApprovalStep
            accountsSet={accountsSet}
            onUpdate={(data) => handleSectionUpdate('directorsApproval', data)}
          />
        );
      case 'reviewAndOutputs':
        return (
          <ReviewAndOutputsStep
            accountsSet={accountsSet}
            onUpdate={onUpdate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <WizardShell
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      accountsSet={accountsSet}
      onStepChange={handleStepChange}
      autosaveState={{
        isSaving,
        lastSaved,
        hasUnsavedChanges: false, // We auto-save immediately
        error: saveError
      }}
    >
      {renderCurrentStep()}
    </WizardShell>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}