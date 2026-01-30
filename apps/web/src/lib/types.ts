// Common API response types used by the web frontend

export type ClientType =
  | 'COMPANY'
  | 'INDIVIDUAL'
  | 'SOLE_TRADER'
  | 'PARTNERSHIP'
  | 'LLP';

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Client {
  id: string;
  ref?: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  mainEmail?: string;
  mainPhone?: string;
  registeredNumber?: string | null;
  portfolioCode?: number | null;
  utrNumber?: string | null;
  vatNumber?: string | null;
  payeReference?: string | null;
  accountsOfficeReference?: string | null;
  cisUtr?: string | null;
  mtdVatEnabled?: boolean;
  mtdItsaEnabled?: boolean;
  eoriNumber?: string | null;
  hmrcCtStatus?: string | null;
  hmrcSaStatus?: string | null;
  hmrcVatStatus?: string | null;
  hmrcPayeStatus?: string | null;
  hmrcCisStatus?: string | null;
  hmrcMtdVatStatus?: string | null;
  hmrcMtdItsaStatus?: string | null;
  hmrcEoriStatus?: string | null;
  incorporationDate?: string | null;
  confirmationLastMadeUpTo?: string | null;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
  // optional augmented fields used by UI
  mainContact?: string;
  yearEnd?: string | null;
  confirmationStatementDue?: string | null;
  annualFees?: number;
  tasksDueCount?: number;
  accountsNextDue?: string | null;
  accountsLastMadeUpTo?: string | null;
  accountsAccountingReferenceDay?: number | null;
  accountsAccountingReferenceMonth?: number | null;
  confirmationNextDue?: string | null;
  compAccounts?: 'overdue' | 'dueSoon' | 'ok' | null;
  compCS?: 'overdue' | 'dueSoon' | 'ok' | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ClientProfileSubset {
  mainContactName?: string;
  partnerResponsible?: string;
  clientManager?: string;
  lifecycleStatus?: 'PROSPECT' | 'ONBOARDING' | 'ACTIVE' | 'DORMANT' | 'CEASED';
  engagementType?: string;
  engagementLetterSigned?: boolean;
  onboardingDate?: string;
  disengagementDate?: string;
  onboardingStartedAt?: string;
  wentLiveAt?: string;
  ceasedAt?: string;
  dormantSince?: string;
  accountingPeriodEnd?: string;
  nextAccountsDueDate?: string;
  nextCorporationTaxDueDate?: string;
  statutoryYearEnd?: string;
  vatRegistrationDate?: string;
  vatPeriodStart?: string;
  vatPeriodEnd?: string;
  vatStagger?: 'A' | 'B' | 'C' | 'NONE';
  payrollPayDay?: number;
  payrollPeriodEndDay?: number;
  corporationTaxUtr?: string;
  vatNumber?: string;
  vatScheme?: string;
  vatReturnFrequency?: string;
  vatQuarter?: string;
  payeReference?: string;
  payeAccountsOfficeReference?: string;
  accountsOfficeReference?: string;
  cisRegistered?: boolean;
  cisUtr?: string;
  payrollRtiRequired?: boolean;
  amlCompleted?: boolean;
  clientRiskRating?: string;
  annualFee?: number;
  monthlyFee?: number;
  personalUtr?: string;
  selfAssessmentRequired?: boolean;
  selfAssessmentFiled?: boolean;
  tradingName?: string;
  companyType?: string;
  registeredAddress?: string;
  authenticationCode?: string;
  employeeCount?: number;
  payrollFrequency?: string;
  contactPosition?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  preferredContactMethod?: string;
  correspondenceAddress?: string;
  feeArrangement?: string;
  businessBankName?: string;
  accountLastFour?: string;
  directDebitInPlace?: boolean;
  paymentIssues?: string;
  notes?: string;
  specialCircumstances?: string;
  seasonalBusiness?: boolean;
  dormant?: boolean;
  doNotContact?: boolean;
  nationalInsuranceNumber?: string;
  dateOfBirth?: string;
  personalAddress?: string;
  personalTaxYear?: string;
  selfAssessmentTaxYear?: string;
  linkedCompanyNumber?: string;
  directorRole?: string;
  clientType?: string;
  companyStatusDetail?: string;
  jurisdiction?: string;
  registeredOfficeFull?: string;
  sicCodes?: string;
  sicDescriptions?: string;
  accountsOverdue?: boolean;
  confirmationStatementOverdue?: boolean;
  nextAccountsMadeUpTo?: string;
  nextAccountsDueBy?: string;
  lastAccountsMadeUpTo?: string;
  nextConfirmationStatementDate?: string;
  confirmationStatementDueBy?: string;
  lastConfirmationStatementDate?: string;
  directorCount?: number;
  pscCount?: number;
  currentDirectors?: string;
  currentPscs?: string;
  lastChRefresh?: string;
}

export interface ServiceEligibility {
  status: 'active' | 'blocked' | 'warning';
  reasons: string[];
  eligible: boolean;
}

export interface ClientContext {
  node: Client;
  profile: ClientProfileSubset;
  computed: {
    isVatRegistered: boolean;
    isEmployer: boolean;
    isCisRegistered: boolean;
    isCorporationTaxRegistered: boolean;
    isCompany: boolean;
    isActive: boolean;
    isAmlComplete: boolean;
    amlReviewDue: boolean;
    taxFlags: {
      vat: boolean;
      paye: boolean;
      cis: boolean;
      ct: boolean;
    };
    eligibility: ServiceEligibility;
  };
}

export interface ClientParty {
  id: string;
  clientId: string;
  personId?: string;
  primaryContact?: boolean;
  suffixLetter?: string | null;
  ownershipPercent?: number;
  appointedAt?: string;
  resignedAt?: string;
  role?: string;
  partyRef?: string;
}

export interface ClientContextWithParties extends ClientContext {
  partiesDetails: ClientParty[];
  companiesHouse?: {
    companyNumber?: string;
    officers?: any[];
    lastFetched?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  clientId?: string;
  serviceId?: string;
  description?: string;
  dueDate?: string;
  assignee?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type ServiceFrequency = string; // Allow any frequency string
export type ServiceStatus = string; // Allow any status string

export interface Service {
  id: string;
  clientId?: string;
  kind: string;
  frequency?: string;
  fee?: number;
  annualized?: number;
  status?: string;
  nextDue?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  eligibility?: ServiceEligibility;
}

export interface Party {
  id: string;
  clientId: string;
  personId?: string;
  primaryContact?: boolean;
  suffixLetter?: string | null;
}

export interface Person {
  id: string;
  fullName?: string;
  email?: string;
}

export interface ApiListResult<T> {
  results: T[];
  total: number;
  offset?: number;
  limit?: number;
  hasMore?: boolean;
}

// Accounts Production Types (imported from backend interfaces)
export type AccountingFramework =
  | 'MICRO_FRS105'
  | 'SMALL_FRS102_1A'
  | 'DORMANT'
  | 'SOLE_TRADER'
  | 'INDIVIDUAL';
export type AccountsSetStatus = 'DRAFT' | 'IN_REVIEW' | 'READY' | 'LOCKED';
export type DepreciationMethod = 'STRAIGHT_LINE' | 'REDUCING_BALANCE';
export type ExemptionStatementKey = 'CA2006_S477_SMALL' | 'MICRO_ENTITY' | 'DORMANT' | 'NOT_APPLICABLE';
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
    companyNumber?: string;
    registeredOffice: Address;
    directors?: Director[];
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
  shareCapital?: {
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

// Wizard-specific types
export type WizardStep = 
  | 'companyPeriod'
  | 'frameworkDisclosures'
  | 'accountingPolicies'
  | 'profitAndLoss'
  | 'balanceSheet'
  | 'notes'
  | 'directorsApproval'
  | 'reviewAndOutputs';

export interface WizardStepConfig {
  key: WizardStep;
  title: string;
  description: string;
  isComplete: (accountsSet: AccountsSet) => boolean;
  hasErrors: (accountsSet: AccountsSet) => boolean;
}

export interface AutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export default {} as const;
