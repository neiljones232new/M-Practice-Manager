export type AccountingFramework = 'MICRO_FRS105' | 'SMALL_FRS102_1A' | 'DORMANT';
export type AccountsSetStatus = 'DRAFT' | 'IN_REVIEW' | 'READY' | 'LOCKED';
export type DepreciationMethod = 'STRAIGHT_LINE' | 'REDUCING_BALANCE';
export type ExemptionStatementKey = 'CA2006_S477_SMALL' | 'MICRO_ENTITY' | 'DORMANT';
export type SignatureType = 'TYPED_NAME' | 'UPLOADED_SIGNATURE';

export interface Address {
  line1: string;
  line2?: string;
  town?: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface Director {
  name: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  section?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  section?: string;
}

export interface CompanyPeriodSection {
  framework: AccountingFramework;
  company: {
    name: string;
    companyNumber: string;
    registeredOffice: Address;
    directors: Director[];
  };
  period: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    isFirstYear: boolean;
  };
}

export interface FrameworkDisclosuresSection {
  framework: AccountingFramework;
  auditExemption: {
    isAuditExempt: boolean;
    exemptionStatementKey: ExemptionStatementKey;
  };
  includePLInClientPack: boolean;
  includeDirectorsReport: boolean;
  includeAccountantsReport: boolean;
}

export interface AccountingPoliciesSection {
  basisOfPreparation: string;
  goingConcern: {
    isGoingConcern: boolean;
    noteText?: string;
  };
  turnoverPolicyText?: string;
  tangibleFixedAssets?: {
    hasAssets: boolean;
    depreciationMethod?: DepreciationMethod;
    rates?: Array<{
      category: string;
      ratePercent: number;
    }>;
  };
}

export interface ProfitAndLossLines {
  turnover: number;
  costOfSales: number;
  otherIncome: number;
  adminExpenses: number;
  wages: number;
  rent: number;
  motor: number;
  professionalFees: number;
  otherExpenses: number;
  interestPayable: number;
  taxCharge: number;
  dividendsDeclared: number;
}

export interface ProfitAndLossSection {
  lines: ProfitAndLossLines;
  comparatives?: {
    priorYearLines: ProfitAndLossLines;
  };
}

export interface FixedAssets {
  tangibleFixedAssets: number;
  intangibleAssets: number;
  investments: number;
}

export interface CurrentAssets {
  stock: number;
  debtors: number;
  cash: number;
  prepayments: number;
}

export interface Creditors {
  tradeCreditors: number;
  taxes: number;
  accrualsDeferredIncome: number;
  directorsLoan: number;
  otherCreditors: number;
}

export interface CreditorsAfterOneYear {
  loans: number;
  other: number;
}

export interface Equity {
  shareCapital: number;
  retainedEarnings: number;
  otherReserves: number;
}

export interface BalanceSheetData {
  assets: {
    fixedAssets: FixedAssets;
    currentAssets: CurrentAssets;
  };
  liabilities: {
    creditorsWithinOneYear: Creditors;
    creditorsAfterOneYear: CreditorsAfterOneYear;
  };
  equity: Equity;
}

export interface BalanceSheetSection extends BalanceSheetData {
  comparatives?: {
    prior: BalanceSheetData;
  };
}

export interface NotesSection {
  principalActivity?: string;
  countryOfIncorporation: string;
  employees?: {
    include: boolean;
    averageEmployees?: number;
  };
  tangibleAssets?: {
    columns: string[];
    rows: Array<{
      label: string;
      values: number[];
    }>;
  };
  shareCapital: {
    shareClass: string;
    numberOfShares: number;
    nominalValue: number;
    currency: string;
  };
  directorsLoanNote?: {
    include: boolean;
    text?: string;
  };
  commitmentsContingencies?: {
    include: boolean;
    text?: string;
  };
  additionalNotes?: Array<{
    title: string;
    text: string;
  }>;
}

export interface DirectorsApprovalSection {
  approved: boolean;
  directorName?: string;
  approvalDate?: string; // YYYY-MM-DD
  signatureType?: SignatureType;
}

export interface AccountsSet {
  id: string;
  clientId: string;
  companyNumber: string;
  framework: AccountingFramework;
  status: AccountsSetStatus;
  period: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    isFirstYear: boolean;
  };
  sections: {
    companyPeriod?: CompanyPeriodSection;
    frameworkDisclosures?: FrameworkDisclosuresSection;
    accountingPolicies?: AccountingPoliciesSection;
    profitAndLoss?: ProfitAndLossSection;
    balanceSheet?: BalanceSheetSection;
    notes?: NotesSection;
    directorsApproval?: DirectorsApprovalSection;
  };
  validation: {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    isBalanced: boolean;
  };
  outputs: {
    htmlUrl: string | null;
    pdfUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastEditedBy: string;
}

export interface CalculatedTotals {
  profitAndLoss: {
    grossProfit: number;
    operatingProfit: number;
    profitBeforeTax: number;
    profitAfterTax: number;
  };
  balanceSheet: {
    totalFixedAssets: number;
    totalCurrentAssets: number;
    totalAssets: number;
    totalCurrentLiabilities: number;
    totalLiabilities: number;
    totalEquity: number;
    netCurrentAssets: number;
    netAssets: number;
  };
}
