export interface QueryResult<T = any> {
  success: boolean;
  data?: T[];
  error?: string;
  rowCount: number;
}

export interface OperationResult {
  success: boolean;
  message: string;
  id?: string;
}

export interface Client {
  companyNumber: string;
  companyName: string;
  tradingName?: string;
  status: string;
  companyType?: string;
  incorporationDate?: string;
  registeredAddress?: string;
  
  // Practice fields
  corporationTaxUtr?: string;
  vatNumber?: string;
  vatRegistrationDate?: string;
  vatScheme?: string;
  vatStagger?: 'A' | 'B' | 'C' | 'NONE';
  payeReference?: string;
  payeAccountsOfficeReference?: string;
  authenticationCode?: string;
  accountsOfficeReference?: string;
  employeeCount?: number;
  payrollFrequency?: string;
  payrollPayDay?: number;
  payrollPeriodEndDay?: number;
  cisRegistered?: boolean;
  cisUtr?: string;
  mainContactName?: string;
  contactPosition?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  preferredContactMethod?: string;
  correspondenceAddress?: string;
  clientManager?: string;
  partnerResponsible?: string;
  engagementType?: string;
  onboardingDate?: string;
  disengagementDate?: string;
  engagementLetterSigned?: boolean;
  amlCompleted?: boolean;
  lifecycleStatus?: 'PROSPECT' | 'ONBOARDING' | 'ACTIVE' | 'DORMANT' | 'CEASED';
  onboardingStartedAt?: string;
  wentLiveAt?: string;
  ceasedAt?: string;
  dormantSince?: string;
  feeArrangement?: string;
  monthlyFee?: number;
  annualFee?: number;
  accountingPeriodEnd?: string;
  nextAccountsDueDate?: string;
  nextCorporationTaxDueDate?: string;
  statutoryYearEnd?: string;
  vatReturnFrequency?: string;
  vatQuarter?: string;
  vatPeriodStart?: string;
  vatPeriodEnd?: string;
  payrollRtiRequired?: boolean;
  businessBankName?: string;
  accountLastFour?: string;
  directDebitInPlace?: boolean;
  paymentIssues?: string;
  notes?: string;
  specialCircumstances?: string;
  seasonalBusiness?: boolean;
  dormant?: boolean;
  clientRiskRating?: string;
  doNotContact?: boolean;
  
  // Personal client fields
  personalUtr?: string;
  nationalInsuranceNumber?: string;
  dateOfBirth?: string;
  personalAddress?: string;
  personalTaxYear?: string;
  selfAssessmentTaxYear?: string;
  selfAssessmentRequired?: boolean;
  selfAssessmentFiled?: boolean;
  linkedCompanyNumber?: string;
  directorRole?: string;
  clientType?: string;
  
  // Companies House fields
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
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxCalculationResult {
  id: string;
  clientId: string;
  companyId?: string;
  calculationType: 'SALARY_OPTIMIZATION' | 'SCENARIO_COMPARISON' | 'CORPORATION_TAX' | 'DIVIDEND_TAX' | 'INCOME_TAX' | 'SOLE_TRADER';
  taxYear: string;
  parameters: any; // JSON
  optimizedSalary?: number;
  optimizedDividend?: number;
  totalTakeHome?: number;
  totalTaxLiability?: number;
  estimatedSavings?: number;
  recommendations?: any; // JSON
  calculatedAt?: Date;
  calculatedBy?: string;
  notes?: string;
  
  // Legacy support
  result?: any;
  scenarios?: any[];
}

export interface TaxScenario {
  id: string;
  calculationId: string;
  scenarioName: string;
  salary: number;
  dividend: number;
  incomeTax: number;
  employeeNi: number;
  employerNi: number;
  dividendTax: number;
  corporationTax: number;
  totalTax: number;
  takeHome: number;
  effectiveRate: number;
}

export interface GeneratedReport {
  id: string;
  clientId: string;
  calculationId?: string;
  templateId: string;
  title: string;
  content: any; // JSON
  format: 'PDF' | 'HTML';
  filePath?: string;
  generatedAt: Date;
  generatedBy: string;
}

export interface Director {
  id?: number;
  companyNumber: string;
  name: string;
  officerRole?: string;
  appointedOn?: string;
  resignedOn?: string;
  nationality?: string;
  countryOfResidence?: string;
  personNumber?: string;
}

export interface PSC {
  id?: number;
  companyNumber: string;
  name: string;
  kind?: string;
  natureOfControl?: string;
  notifiedOn?: string;
  ceasedOn?: string;
  countryOfResidence?: string;
}

// Practice-managed fields that should never be overwritten by CH refresh
export const PRACTICE_FIELDS = [
  'corporationTaxUtr', 'vatNumber', 'vatRegistrationDate', 'vatScheme',
  'vatStagger', 'vatPeriodStart', 'vatPeriodEnd',
  'payeReference', 'payeAccountsOfficeReference', 'authenticationCode',
  'accountsOfficeReference', 'employeeCount', 'payrollFrequency',
  'payrollPayDay', 'payrollPeriodEndDay',
  'cisRegistered', 'cisUtr', 'mainContactName', 'contactPosition',
  'telephone', 'mobile', 'email', 'preferredContactMethod',
  'correspondenceAddress', 'clientManager', 'partnerResponsible',
  'engagementType', 'onboardingDate', 'disengagementDate',
  'lifecycleStatus', 'onboardingStartedAt', 'wentLiveAt', 'ceasedAt', 'dormantSince',
  'engagementLetterSigned', 'amlCompleted', 'feeArrangement',
  'monthlyFee', 'annualFee', 'accountingPeriodEnd', 'statutoryYearEnd',
  'nextAccountsDueDate', 'nextCorporationTaxDueDate',
  'vatReturnFrequency', 'vatQuarter', 'payrollRtiRequired',
  'businessBankName', 'accountLastFour', 'directDebitInPlace',
  'paymentIssues', 'notes', 'specialCircumstances', 'seasonalBusiness',
  'dormant', 'clientRiskRating', 'doNotContact',
  // Personal client fields
  'personalUtr', 'nationalInsuranceNumber', 'dateOfBirth',
  'personalAddress', 'personalTaxYear', 'selfAssessmentTaxYear', 'selfAssessmentRequired',
  'selfAssessmentFiled', 'linkedCompanyNumber', 'directorRole',
  'clientType',
  // Practice-managed identifiers & descriptors
  'tradingName', 'registeredAddress'
];

// Companies House fields that can be updated automatically
export const CH_FIELDS = [
  'companyName', 'status', 'companyStatusDetail', 'companyType',
  'jurisdiction', 'incorporationDate', 'registeredAddress',
  'registeredOfficeFull', 'sicCodes', 'sicDescriptions',
  'accountsOverdue', 'confirmationStatementOverdue',
  'nextAccountsMadeUpTo', 'nextAccountsDueBy',
  'lastAccountsMadeUpTo', 'nextConfirmationStatementDate',
  'confirmationStatementDueBy', 'lastConfirmationStatementDate',
  'directorCount', 'pscCount', 'currentDirectors', 'currentPscs',
  'lastChRefresh'
];
