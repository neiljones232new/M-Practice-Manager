
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.PracticeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  legalEntityName: 'legalEntityName',
  tradingName: 'tradingName',
  description: 'description',
  website: 'website',
  mainEmail: 'mainEmail',
  mainPhone: 'mainPhone',
  fax: 'fax',
  addressId: 'addressId',
  practicingCertificateNumber: 'practicingCertificateNumber',
  professionalBody: 'professionalBody',
  membershipNumber: 'membershipNumber',
  vatNumber: 'vatNumber',
  taxReference: 'taxReference',
  bankAccountName: 'bankAccountName',
  bankAccountNumber: 'bankAccountNumber',
  bankSortCode: 'bankSortCode',
  bankIban: 'bankIban',
  bankSwift: 'bankSwift',
  piInsurer: 'piInsurer',
  piPolicyNumber: 'piPolicyNumber',
  piExpiryDate: 'piExpiryDate',
  piCoverAmount: 'piCoverAmount',
  piExcess: 'piExcess',
  moneyLaunderingSupervisor: 'moneyLaunderingSupervisor',
  amlSupervisorNumber: 'amlSupervisorNumber',
  amlRegistrationDate: 'amlRegistrationDate',
  lastAmlCheckDate: 'lastAmlCheckDate',
  nextAmlCheckDueDate: 'nextAmlCheckDueDate',
  companiesHouseApiKey: 'companiesHouseApiKey',
  companiesHouseWebhook: 'companiesHouseWebhook',
  chLastSyncDate: 'chLastSyncDate',
  hmrcClientId: 'hmrcClientId',
  hmrcClientSecret: 'hmrcClientSecret',
  hmrcEnvironment: 'hmrcEnvironment',
  mtdVatEnabled: 'mtdVatEnabled',
  mtdPayeEnabled: 'mtdPayeEnabled',
  mtdItsaEnabled: 'mtdItsaEnabled',
  defaultHourlyRate: 'defaultHourlyRate',
  currency: 'currency',
  timezone: 'timezone',
  dateFormat: 'dateFormat',
  numberFormat: 'numberFormat',
  workingDays: 'workingDays',
  workingHoursStart: 'workingHoursStart',
  workingHoursEnd: 'workingHoursEnd',
  lunchBreakStart: 'lunchBreakStart',
  lunchBreakEnd: 'lunchBreakEnd',
  logoPath: 'logoPath',
  primaryColor: 'primaryColor',
  secondaryColor: 'secondaryColor',
  emailHeaderTemplate: 'emailHeaderTemplate',
  emailFooterTemplate: 'emailFooterTemplate',
  emailNotificationsEnabled: 'emailNotificationsEnabled',
  smsNotificationsEnabled: 'smsNotificationsEnabled',
  slackWebhookUrl: 'slackWebhookUrl',
  teamsWebhookUrl: 'teamsWebhookUrl',
  backupEnabled: 'backupEnabled',
  backupFrequency: 'backupFrequency',
  backupRetentionDays: 'backupRetentionDays',
  twoFactorAuthEnabled: 'twoFactorAuthEnabled',
  dataRetentionMonths: 'dataRetentionMonths',
  autoArchiveClients: 'autoArchiveClients',
  enforceStrongPasswords: 'enforceStrongPasswords',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastUpdatedBy: 'lastUpdatedBy'
};

exports.Prisma.PracticeBranchScalarFieldEnum = {
  id: 'id',
  practiceId: 'practiceId',
  name: 'name',
  isMain: 'isMain',
  addressId: 'addressId',
  phone: 'phone',
  email: 'email',
  manager: 'manager',
  openingHours: 'openingHours',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PracticeSettingScalarFieldEnum = {
  id: 'id',
  practiceId: 'practiceId',
  category: 'category',
  key: 'key',
  value: 'value',
  description: 'description',
  isEditable: 'isEditable',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PortfolioScalarFieldEnum = {
  code: 'code',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefBucketScalarFieldEnum = {
  id: 'id',
  portfolioCode: 'portfolioCode',
  alpha: 'alpha',
  nextIndex: 'nextIndex',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  role: 'role',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  status: 'status',
  mainEmail: 'mainEmail',
  mainPhone: 'mainPhone',
  registeredNumber: 'registeredNumber',
  utrNumber: 'utrNumber',
  vatNumber: 'vatNumber',
  payeReference: 'payeReference',
  accountsOfficeReference: 'accountsOfficeReference',
  cisUtr: 'cisUtr',
  eoriNumber: 'eoriNumber',
  mtdVatEnabled: 'mtdVatEnabled',
  mtdItsaEnabled: 'mtdItsaEnabled',
  hmrcCtStatus: 'hmrcCtStatus',
  hmrcSaStatus: 'hmrcSaStatus',
  hmrcVatStatus: 'hmrcVatStatus',
  hmrcPayeStatus: 'hmrcPayeStatus',
  hmrcCisStatus: 'hmrcCisStatus',
  hmrcMtdVatStatus: 'hmrcMtdVatStatus',
  hmrcMtdItsaStatus: 'hmrcMtdItsaStatus',
  hmrcEoriStatus: 'hmrcEoriStatus',
  incorporationDate: 'incorporationDate',
  yearEnd: 'yearEnd',
  accountsNextDue: 'accountsNextDue',
  accountsLastMadeUpTo: 'accountsLastMadeUpTo',
  confirmationNextDue: 'confirmationNextDue',
  confirmationLastMadeUpTo: 'confirmationLastMadeUpTo',
  accountsAccountingReferenceDay: 'accountsAccountingReferenceDay',
  accountsAccountingReferenceMonth: 'accountsAccountingReferenceMonth',
  portfolioCode: 'portfolioCode',
  annualFees: 'annualFees',
  tasksDueCount: 'tasksDueCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  addressId: 'addressId',
  lastSyncedAt: 'lastSyncedAt',
  source: 'source'
};

exports.Prisma.ClientProfileScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  mainContactName: 'mainContactName',
  partnerResponsible: 'partnerResponsible',
  clientManager: 'clientManager',
  lifecycleStatus: 'lifecycleStatus',
  engagementType: 'engagementType',
  engagementLetterSigned: 'engagementLetterSigned',
  onboardingDate: 'onboardingDate',
  disengagementDate: 'disengagementDate',
  onboardingStartedAt: 'onboardingStartedAt',
  wentLiveAt: 'wentLiveAt',
  ceasedAt: 'ceasedAt',
  dormantSince: 'dormantSince',
  accountingPeriodEnd: 'accountingPeriodEnd',
  nextAccountsDueDate: 'nextAccountsDueDate',
  nextCorporationTaxDueDate: 'nextCorporationTaxDueDate',
  statutoryYearEnd: 'statutoryYearEnd',
  vatRegistrationDate: 'vatRegistrationDate',
  vatPeriodStart: 'vatPeriodStart',
  vatPeriodEnd: 'vatPeriodEnd',
  vatStagger: 'vatStagger',
  payrollPayDay: 'payrollPayDay',
  payrollPeriodEndDay: 'payrollPeriodEndDay',
  corporationTaxUtr: 'corporationTaxUtr',
  vatNumber: 'vatNumber',
  vatScheme: 'vatScheme',
  vatReturnFrequency: 'vatReturnFrequency',
  vatQuarter: 'vatQuarter',
  payeReference: 'payeReference',
  payeAccountsOfficeReference: 'payeAccountsOfficeReference',
  cisRegistered: 'cisRegistered',
  cisUtr: 'cisUtr',
  personalUtr: 'personalUtr',
  payrollRtiRequired: 'payrollRtiRequired',
  amlCompleted: 'amlCompleted',
  clientRiskRating: 'clientRiskRating',
  annualFee: 'annualFee',
  monthlyFee: 'monthlyFee',
  selfAssessmentRequired: 'selfAssessmentRequired',
  selfAssessmentFiled: 'selfAssessmentFiled',
  tradingName: 'tradingName',
  companyType: 'companyType',
  registeredAddress: 'registeredAddress',
  authenticationCode: 'authenticationCode',
  employeeCount: 'employeeCount',
  payrollFrequency: 'payrollFrequency',
  contactPosition: 'contactPosition',
  telephone: 'telephone',
  mobile: 'mobile',
  email: 'email',
  preferredContactMethod: 'preferredContactMethod',
  correspondenceAddress: 'correspondenceAddress',
  feeArrangement: 'feeArrangement',
  businessBankName: 'businessBankName',
  accountLastFour: 'accountLastFour',
  directDebitInPlace: 'directDebitInPlace',
  paymentIssues: 'paymentIssues',
  nationalInsuranceNumber: 'nationalInsuranceNumber',
  dateOfBirth: 'dateOfBirth',
  personalAddress: 'personalAddress',
  personalTaxYear: 'personalTaxYear',
  selfAssessmentTaxYear: 'selfAssessmentTaxYear',
  linkedCompanyNumber: 'linkedCompanyNumber',
  directorRole: 'directorRole',
  companyStatusDetail: 'companyStatusDetail',
  jurisdiction: 'jurisdiction',
  sicCodes: 'sicCodes',
  sicDescriptions: 'sicDescriptions',
  registeredOfficeFull: 'registeredOfficeFull',
  directorCount: 'directorCount',
  pscCount: 'pscCount',
  currentDirectors: 'currentDirectors',
  currentPscs: 'currentPscs',
  lastChRefresh: 'lastChRefresh',
  accountsOverdue: 'accountsOverdue',
  confirmationStatementOverdue: 'confirmationStatementOverdue',
  nextAccountsMadeUpTo: 'nextAccountsMadeUpTo',
  nextAccountsDueBy: 'nextAccountsDueBy',
  lastAccountsMadeUpTo: 'lastAccountsMadeUpTo',
  nextConfirmationStatementDate: 'nextConfirmationStatementDate',
  confirmationStatementDueBy: 'confirmationStatementDueBy',
  lastConfirmationStatementDate: 'lastConfirmationStatementDate',
  notes: 'notes',
  specialCircumstances: 'specialCircumstances',
  seasonalBusiness: 'seasonalBusiness',
  dormant: 'dormant',
  doNotContact: 'doNotContact',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  line1: 'line1',
  line2: 'line2',
  city: 'city',
  county: 'county',
  postcode: 'postcode',
  country: 'country'
};

exports.Prisma.ServiceScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  kind: 'kind',
  frequency: 'frequency',
  fee: 'fee',
  annualized: 'annualized',
  status: 'status',
  nextDue: 'nextDue',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplianceItemScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  serviceId: 'serviceId',
  type: 'type',
  description: 'description',
  dueDate: 'dueDate',
  status: 'status',
  source: 'source',
  reference: 'reference',
  period: 'period',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  title: 'title',
  clientId: 'clientId',
  serviceId: 'serviceId',
  description: 'description',
  dueDate: 'dueDate',
  assigneeId: 'assigneeId',
  creatorId: 'creatorId',
  status: 'status',
  priority: 'priority',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  filename: 'filename',
  originalName: 'originalName',
  mimeType: 'mimeType',
  size: 'size',
  category: 'category',
  isArchived: 'isArchived',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  category: 'category',
  type: 'type',
  content: 'content',
  placeholders: 'placeholders',
  metadata: 'metadata',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PersonScalarFieldEnum = {
  id: 'id',
  fullName: 'fullName',
  email: 'email',
  phone: 'phone',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClientPartyScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  personId: 'personId',
  primaryContact: 'primaryContact',
  suffixLetter: 'suffixLetter',
  ownershipPercent: 'ownershipPercent',
  appointedAt: 'appointedAt',
  resignedAt: 'resignedAt',
  role: 'role',
  partyRef: 'partyRef',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountsSetScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  companyNumber: 'companyNumber',
  framework: 'framework',
  status: 'status',
  periodStartDate: 'periodStartDate',
  periodEndDate: 'periodEndDate',
  isFirstYear: 'isFirstYear',
  companyData: 'companyData',
  frameworkData: 'frameworkData',
  policiesData: 'policiesData',
  profitLossData: 'profitLossData',
  balanceSheetData: 'balanceSheetData',
  notesData: 'notesData',
  approvalData: 'approvalData',
  validationErrors: 'validationErrors',
  validationWarnings: 'validationWarnings',
  isBalanced: 'isBalanced',
  htmlUrl: 'htmlUrl',
  pdfUrl: 'pdfUrl',
  createdById: 'createdById',
  lastEditedById: 'lastEditedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompaniesHouseDataScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  companyNumber: 'companyNumber',
  companyDetails: 'companyDetails',
  officers: 'officers',
  filingHistory: 'filingHistory',
  charges: 'charges',
  pscs: 'pscs',
  lastFetched: 'lastFetched',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FilingScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  type: 'type',
  period: 'period',
  dueDate: 'dueDate',
  status: 'status',
  source: 'source',
  transactionId: 'transactionId',
  category: 'category',
  description: 'description',
  actionDate: 'actionDate',
  filedDate: 'filedDate',
  barcode: 'barcode',
  pages: 'pages',
  paperFiled: 'paperFiled',
  reference: 'reference',
  madeUpTo: 'madeUpTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaxCalculationScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  companyId: 'companyId',
  calculationType: 'calculationType',
  taxYear: 'taxYear',
  parameters: 'parameters',
  optimizedSalary: 'optimizedSalary',
  optimizedDividend: 'optimizedDividend',
  totalTakeHome: 'totalTakeHome',
  totalTaxLiability: 'totalTaxLiability',
  estimatedSavings: 'estimatedSavings',
  recommendations: 'recommendations',
  calculatedAt: 'calculatedAt',
  calculatedBy: 'calculatedBy',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaxScenarioScalarFieldEnum = {
  id: 'id',
  calculationId: 'calculationId',
  scenarioName: 'scenarioName',
  salary: 'salary',
  dividend: 'dividend',
  incomeTax: 'incomeTax',
  employeeNi: 'employeeNi',
  employerNi: 'employerNi',
  dividendTax: 'dividendTax',
  corporationTax: 'corporationTax',
  totalTax: 'totalTax',
  takeHome: 'takeHome',
  effectiveRate: 'effectiveRate'
};

exports.Prisma.GeneratedReportScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  calculationId: 'calculationId',
  templateId: 'templateId',
  title: 'title',
  content: 'content',
  format: 'format',
  filePath: 'filePath',
  generatedAt: 'generatedAt',
  generatedBy: 'generatedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CalendarEventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  startDate: 'startDate',
  endDate: 'endDate',
  allDay: 'allDay',
  clientId: 'clientId',
  taskId: 'taskId',
  type: 'type',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  ts: 'ts',
  actor: 'actor',
  entity: 'entity',
  entityId: 'entityId',
  entityRef: 'entityRef',
  action: 'action',
  payload: 'payload'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  ADMIN: 'ADMIN',
  PARTNER: 'PARTNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  READONLY: 'READONLY'
};

exports.ClientType = exports.$Enums.ClientType = {
  COMPANY: 'COMPANY',
  INDIVIDUAL: 'INDIVIDUAL',
  SOLE_TRADER: 'SOLE_TRADER',
  PARTNERSHIP: 'PARTNERSHIP',
  LLP: 'LLP'
};

exports.ClientStatus = exports.$Enums.ClientStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.LifecycleStatus = exports.$Enums.LifecycleStatus = {
  PROSPECT: 'PROSPECT',
  ONBOARDING: 'ONBOARDING',
  ACTIVE: 'ACTIVE',
  DORMANT: 'DORMANT',
  CEASED: 'CEASED'
};

exports.VatStagger = exports.$Enums.VatStagger = {
  A: 'A',
  B: 'B',
  C: 'C',
  NONE: 'NONE'
};

exports.ComplianceStatus = exports.$Enums.ComplianceStatus = {
  PENDING: 'PENDING',
  FILED: 'FILED',
  OVERDUE: 'OVERDUE',
  EXEMPT: 'EXEMPT'
};

exports.ComplianceSource = exports.$Enums.ComplianceSource = {
  COMPANIES_HOUSE: 'COMPANIES_HOUSE',
  HMRC: 'HMRC',
  MANUAL: 'MANUAL'
};

exports.TaskStatus = exports.$Enums.TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.Priority = exports.$Enums.Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.DocumentCategory = exports.$Enums.DocumentCategory = {
  TAX: 'TAX',
  ACCOUNTS: 'ACCOUNTS',
  COMPLIANCE: 'COMPLIANCE',
  REPORTS: 'REPORTS',
  INVOICES: 'INVOICES',
  RECEIPTS: 'RECEIPTS',
  BANK_STATEMENTS: 'BANK_STATEMENTS',
  OTHER: 'OTHER'
};

exports.TemplateCategory = exports.$Enums.TemplateCategory = {
  TAX: 'TAX',
  HMRC: 'HMRC',
  VAT: 'VAT',
  COMPLIANCE: 'COMPLIANCE',
  GENERAL: 'GENERAL',
  ENGAGEMENT: 'ENGAGEMENT',
  CLIENT: 'CLIENT',
  REPORTS: 'REPORTS',
  COMMERCIAL: 'COMMERCIAL'
};

exports.TemplateType = exports.$Enums.TemplateType = {
  DOCUMENT: 'DOCUMENT',
  TASK: 'TASK',
  SERVICE: 'SERVICE',
  EMAIL: 'EMAIL'
};

exports.AccountingFramework = exports.$Enums.AccountingFramework = {
  MICRO_FRS105: 'MICRO_FRS105',
  SMALL_FRS102_1A: 'SMALL_FRS102_1A',
  DORMANT: 'DORMANT',
  SOLE_TRADER: 'SOLE_TRADER',
  INDIVIDUAL: 'INDIVIDUAL'
};

exports.AccountsSetStatus = exports.$Enums.AccountsSetStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  READY: 'READY',
  LOCKED: 'LOCKED'
};

exports.TaxCalculationType = exports.$Enums.TaxCalculationType = {
  SALARY_OPTIMIZATION: 'SALARY_OPTIMIZATION',
  SCENARIO_COMPARISON: 'SCENARIO_COMPARISON',
  CORPORATION_TAX: 'CORPORATION_TAX',
  DIVIDEND_TAX: 'DIVIDEND_TAX',
  INCOME_TAX: 'INCOME_TAX',
  SOLE_TRADER: 'SOLE_TRADER'
};

exports.ReportFormat = exports.$Enums.ReportFormat = {
  PDF: 'PDF',
  HTML: 'HTML'
};

exports.Prisma.ModelName = {
  Practice: 'Practice',
  PracticeBranch: 'PracticeBranch',
  PracticeSetting: 'PracticeSetting',
  Portfolio: 'Portfolio',
  RefBucket: 'RefBucket',
  User: 'User',
  Client: 'Client',
  ClientProfile: 'ClientProfile',
  Address: 'Address',
  Service: 'Service',
  ComplianceItem: 'ComplianceItem',
  Task: 'Task',
  Document: 'Document',
  Template: 'Template',
  Person: 'Person',
  ClientParty: 'ClientParty',
  AccountsSet: 'AccountsSet',
  CompaniesHouseData: 'CompaniesHouseData',
  Filing: 'Filing',
  TaxCalculation: 'TaxCalculation',
  TaxScenario: 'TaxScenario',
  GeneratedReport: 'GeneratedReport',
  CalendarEvent: 'CalendarEvent',
  Event: 'Event'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
