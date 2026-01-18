import { Injectable, Logger } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  AccountsSet,
  ValidationError,
  ValidationWarning,
} from './interfaces/accounts-set.interface';
import { FinancialCalculationService } from './financial-calculation.service';
import { companyPeriodSchema } from './schemas/company-period.schema';
import { frameworkDisclosuresSchema } from './schemas/framework-disclosures.schema';
import { accountingPoliciesSchema } from './schemas/accounting-policies.schema';
import { profitAndLossSchema } from './schemas/profit-and-loss.schema';
import { balanceSheetSchema } from './schemas/balance-sheet.schema';
import { notesSchema } from './schemas/notes.schema';
import { directorsApprovalSchema } from './schemas/directors-approval.schema';

@Injectable()
export class AccountsSetValidationService {
  private readonly logger = new Logger(AccountsSetValidationService.name);
  private readonly ajv: Ajv;
  private readonly schemas: Record<string, any>;

  constructor(private readonly calculationService: FinancialCalculationService) {
    this.ajv = new Ajv({ allErrors: true, removeAdditional: false });
    addFormats(this.ajv);

    this.schemas = {
      companyPeriod: companyPeriodSchema,
      frameworkDisclosures: frameworkDisclosuresSchema,
      accountingPolicies: accountingPoliciesSchema,
      profitAndLoss: profitAndLossSchema,
      balanceSheet: balanceSheetSchema,
      notes: notesSchema,
      directorsApproval: directorsApprovalSchema,
    };

    // Compile all schemas
    Object.keys(this.schemas).forEach(key => {
      this.ajv.compile(this.schemas[key]);
    });
  }

  async validateSection(
    sectionKey: string,
    sectionData: any,
    accountsSet: AccountsSet,
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // JSON Schema validation
    const schema = this.schemas[sectionKey];
    if (schema) {
      const validate = this.ajv.compile(schema);
      const valid = validate(sectionData);

      if (!valid && validate.errors) {
        validate.errors.forEach(error => {
          errors.push({
            field: error.instancePath || sectionKey,
            message: error.message || 'Validation error',
            code: 'SCHEMA_VALIDATION',
            section: sectionKey,
          });
        });
      }
    }

    // Business rule validation
    const businessRuleValidation = await this.validateBusinessRules(
      sectionKey,
      sectionData,
      accountsSet,
    );
    errors.push(...businessRuleValidation.errors);
    warnings.push(...businessRuleValidation.warnings);

    return { errors, warnings };
  }

  async validateAccountsSet(accountsSet: AccountsSet): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    isBalanced: boolean;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate each section
    for (const [sectionKey, sectionData] of Object.entries(accountsSet.sections)) {
      if (sectionData) {
        const sectionValidation = await this.validateSection(
          sectionKey,
          sectionData,
          accountsSet,
        );
        errors.push(...sectionValidation.errors);
        warnings.push(...sectionValidation.warnings);
      }
    }

    // Cross-section validation
    const crossSectionValidation = await this.validateCrossSectionRules(accountsSet);
    errors.push(...crossSectionValidation.errors);
    warnings.push(...crossSectionValidation.warnings);

    // Balance sheet validation
    const isBalanced = this.calculationService.isBalanceSheetBalanced(
      accountsSet.sections.balanceSheet,
    );

    if (!isBalanced && accountsSet.sections.balanceSheet) {
      const totals = this.calculationService.calculateTotals(accountsSet);
      const difference = totals.balanceSheet.netAssets - totals.balanceSheet.totalEquity;
      
      errors.push({
        field: 'balanceSheet',
        message: `Balance sheet does not balance. Difference: £${Math.abs(difference).toFixed(2)}`,
        code: 'BALANCE_SHEET_IMBALANCE',
        section: 'balanceSheet',
      });
    }

    return { errors, warnings, isBalanced };
  }

  private async validateBusinessRules(
    sectionKey: string,
    sectionData: any,
    accountsSet: AccountsSet,
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (sectionKey) {
      case 'companyPeriod':
        this.validateCompanyPeriodRules(sectionData, errors, warnings);
        break;
      case 'profitAndLoss':
        this.validateProfitAndLossRules(sectionData, accountsSet, errors, warnings);
        break;
      case 'balanceSheet':
        this.validateBalanceSheetRules(sectionData, accountsSet, errors, warnings);
        break;
      case 'notes':
        this.validateNotesRules(sectionData, accountsSet, errors, warnings);
        break;
      case 'directorsApproval':
        this.validateDirectorsApprovalRules(sectionData, errors, warnings);
        break;
    }

    return { errors, warnings };
  }

  private validateCompanyPeriodRules(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    if (data.period) {
      const startDate = new Date(data.period.startDate);
      const endDate = new Date(data.period.endDate);

      if (startDate >= endDate) {
        errors.push({
          field: 'period.endDate',
          message: 'Period end date must be after start date',
          code: 'INVALID_PERIOD',
          section: 'companyPeriod',
        });
      }

      // Check period length
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 18 * 30) { // Approximately 18 months
        warnings.push({
          field: 'period',
          message: 'Accounting period is longer than 18 months',
          code: 'LONG_PERIOD',
          section: 'companyPeriod',
        });
      }
    }

    const isSoleTrader = data.framework === 'SOLE_TRADER' || data.framework === 'INDIVIDUAL';
    if (!isSoleTrader && data.company?.directors?.length === 0) {
      errors.push({
        field: 'company.directors',
        message: 'At least one director is required',
        code: 'NO_DIRECTORS',
        section: 'companyPeriod',
      });
    }
  }

  private validateProfitAndLossRules(
    data: any,
    accountsSet: AccountsSet,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    const isFirstYear = accountsSet.period.isFirstYear;

    if (isFirstYear && data.comparatives?.priorYearLines) {
      errors.push({
        field: 'comparatives',
        message: 'First year accounts cannot have comparative figures',
        code: 'FIRST_YEAR_COMPARATIVES',
        section: 'profitAndLoss',
      });
    }

    if (!isFirstYear && !data.comparatives?.priorYearLines) {
      errors.push({
        field: 'comparatives.priorYearLines',
        message: 'Subsequent year accounts must have comparative figures',
        code: 'MISSING_COMPARATIVES',
        section: 'profitAndLoss',
      });
    }

    // Validate negative values where inappropriate
    if (data.lines) {
      if (data.lines.turnover < 0) {
        warnings.push({
          field: 'lines.turnover',
          message: 'Turnover is negative - please verify this is correct',
          code: 'NEGATIVE_TURNOVER',
          section: 'profitAndLoss',
        });
      }
    }
  }

  private validateBalanceSheetRules(
    data: any,
    accountsSet: AccountsSet,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    const isFirstYear = accountsSet.period.isFirstYear;

    if (isFirstYear && data.comparatives?.prior) {
      errors.push({
        field: 'comparatives',
        message: 'First year accounts cannot have comparative figures',
        code: 'FIRST_YEAR_COMPARATIVES',
        section: 'balanceSheet',
      });
    }

    if (!isFirstYear && !data.comparatives?.prior) {
      errors.push({
        field: 'comparatives.prior',
        message: 'Subsequent year accounts must have comparative figures',
        code: 'MISSING_COMPARATIVES',
        section: 'balanceSheet',
      });
    }

    // Validate negative values where inappropriate
    if (data.assets?.currentAssets?.cash < 0) {
      warnings.push({
        field: 'assets.currentAssets.cash',
        message: 'Cash balance is negative - this may indicate an overdraft',
        code: 'NEGATIVE_CASH',
        section: 'balanceSheet',
      });
    }

    if (data.equity?.shareCapital < 0) {
      errors.push({
        field: 'equity.shareCapital',
        message: 'Share capital cannot be negative',
        code: 'NEGATIVE_SHARE_CAPITAL',
        section: 'balanceSheet',
      });
    }
  }

  private validateNotesRules(
    data: any,
    accountsSet: AccountsSet,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    const isSoleTrader =
      accountsSet.framework === 'SOLE_TRADER' || accountsSet.framework === 'INDIVIDUAL';
    if (!isSoleTrader && !data.shareCapital) {
      errors.push({
        field: 'shareCapital',
        message: 'Share capital is required for company accounts',
        code: 'MISSING_SHARE_CAPITAL',
        section: 'notes',
      });
    }

    if (data.employees?.include && !data.employees?.averageEmployees) {
      errors.push({
        field: 'employees.averageEmployees',
        message: 'Average employees must be provided when employee note is included',
        code: 'MISSING_EMPLOYEE_COUNT',
        section: 'notes',
      });
    }

    if (data.directorsLoanNote?.include && !data.directorsLoanNote?.text) {
      errors.push({
        field: 'directorsLoanNote.text',
        message: 'Directors loan note text must be provided when note is included',
        code: 'MISSING_DIRECTORS_LOAN_TEXT',
        section: 'notes',
      });
    }

    if (data.commitmentsContingencies?.include && !data.commitmentsContingencies?.text) {
      errors.push({
        field: 'commitmentsContingencies.text',
        message: 'Commitments and contingencies text must be provided when note is included',
        code: 'MISSING_COMMITMENTS_TEXT',
        section: 'notes',
      });
    }

    if (data.shareCapital) {
      if (data.shareCapital.numberOfShares < 0) {
        errors.push({
          field: 'shareCapital.numberOfShares',
          message: 'Number of shares cannot be negative',
          code: 'NEGATIVE_SHARES',
          section: 'notes',
        });
      }

      if (data.shareCapital.nominalValue < 0) {
        errors.push({
          field: 'shareCapital.nominalValue',
          message: 'Nominal value cannot be negative',
          code: 'NEGATIVE_NOMINAL_VALUE',
          section: 'notes',
        });
      }
    }
  }

  private validateDirectorsApprovalRules(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    if (data.approved) {
      if (!data.directorName) {
        errors.push({
          field: 'directorName',
          message: 'Director name is required when accounts are approved',
          code: 'MISSING_DIRECTOR_NAME',
          section: 'directorsApproval',
        });
      }

      if (!data.approvalDate) {
        errors.push({
          field: 'approvalDate',
          message: 'Approval date is required when accounts are approved',
          code: 'MISSING_APPROVAL_DATE',
          section: 'directorsApproval',
        });
      }
    }
  }

  private async validateCrossSectionRules(accountsSet: AccountsSet): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate framework consistency
    const companyPeriod = accountsSet.sections.companyPeriod;
    const frameworkDisclosures = accountsSet.sections.frameworkDisclosures;

    if (companyPeriod?.framework && frameworkDisclosures?.framework) {
      if (companyPeriod.framework !== frameworkDisclosures.framework) {
        errors.push({
          field: 'framework',
          message: 'Framework must be consistent across all sections',
          code: 'INCONSISTENT_FRAMEWORK',
          section: 'cross-section',
        });
      }
    }

    // Validate retained earnings consistency
    const balanceSheet = accountsSet.sections.balanceSheet;
    const profitAndLoss = accountsSet.sections.profitAndLoss;

    if (balanceSheet && profitAndLoss && accountsSet.period.isFirstYear) {
      const calculations = this.calculationService.calculateTotals(accountsSet);
      const profitAfterTax = calculations.profitAndLoss.profitAfterTax;
      const retainedEarnings = balanceSheet.equity.retainedEarnings;

      if (Math.abs(profitAfterTax - retainedEarnings) > 1) {
        warnings.push({
          field: 'retainedEarnings',
          message: 'For first year accounts, retained earnings should equal profit after tax',
          code: 'RETAINED_EARNINGS_MISMATCH',
          section: 'cross-section',
        });
      }
    }

    return { errors, warnings };
  }
}
