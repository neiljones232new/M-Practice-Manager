
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
  workingDays: 'workingDays',
  primaryColor: 'primaryColor',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PracticeBranchScalarFieldEnum = {
  id: 'id',
  practiceId: 'practiceId',
  name: 'name',
  isMain: 'isMain',
  addressId: 'addressId',
  phone: 'phone',
  email: 'email'
};

exports.Prisma.PracticeSettingScalarFieldEnum = {
  id: 'id',
  practiceId: 'practiceId',
  category: 'category',
  key: 'key',
  value: 'value',
  isEditable: 'isEditable'
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

exports.Prisma.UserAccessProfileScalarFieldEnum = {
  userId: 'userId',
  roleOverride: 'roleOverride',
  portfolioCodes: 'portfolioCodes',
  allPortfolios: 'allPortfolios'
};

exports.Prisma.AuthCredentialScalarFieldEnum = {
  userId: 'userId',
  passwordHash: 'passwordHash',
  emailVerified: 'emailVerified'
};

exports.Prisma.AuthSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  refreshToken: 'refreshToken',
  expiresAt: 'expiresAt',
  ipAddress: 'ipAddress'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  clientRef: 'clientRef',
  baseClientRef: 'baseClientRef',
  name: 'name',
  tradingName: 'tradingName',
  type: 'type',
  status: 'status',
  practiceId: 'practiceId',
  portfolioCode: 'portfolioCode',
  isConnectedParty: 'isConnectedParty',
  connectedOrder: 'connectedOrder',
  connectedPrincipalId: 'connectedPrincipalId',
  registeredNumber: 'registeredNumber',
  utrNumber: 'utrNumber',
  vatNumber: 'vatNumber',
  payeReference: 'payeReference',
  accountsOfficeReference: 'accountsOfficeReference',
  cisUtr: 'cisUtr',
  eoriNumber: 'eoriNumber',
  nationalInsuranceNumber: 'nationalInsuranceNumber',
  dateOfBirth: 'dateOfBirth',
  mainEmail: 'mainEmail',
  mainPhone: 'mainPhone',
  addressId: 'addressId',
  hmrcCtStatus: 'hmrcCtStatus',
  hmrcSaStatus: 'hmrcSaStatus',
  hmrcVatStatus: 'hmrcVatStatus',
  hmrcPayeStatus: 'hmrcPayeStatus',
  incorporationDate: 'incorporationDate',
  yearEnd: 'yearEnd',
  accountsNextDue: 'accountsNextDue',
  confirmationNextDue: 'confirmationNextDue',
  lastSyncedAt: 'lastSyncedAt',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  corporationTaxUtr: 'corporationTaxUtr',
  vatNumber: 'vatNumber',
  vatStagger: 'vatStagger',
  vatScheme: 'vatScheme',
  vatReturnFrequency: 'vatReturnFrequency',
  vatQuarter: 'vatQuarter',
  vatRegistrationDate: 'vatRegistrationDate',
  payeReference: 'payeReference',
  payeAccountsOfficeReference: 'payeAccountsOfficeReference',
  cisRegistered: 'cisRegistered',
  cisUtr: 'cisUtr',
  payrollRtiRequired: 'payrollRtiRequired',
  selfAssessmentRequired: 'selfAssessmentRequired',
  selfAssessmentFiled: 'selfAssessmentFiled',
  amlCompleted: 'amlCompleted',
  clientRiskRating: 'clientRiskRating',
  annualFee: 'annualFee',
  monthlyFee: 'monthlyFee',
  feeArrangement: 'feeArrangement',
  businessBankName: 'businessBankName',
  accountLastFour: 'accountLastFour',
  directDebitInPlace: 'directDebitInPlace',
  paymentIssues: 'paymentIssues',
  contactPosition: 'contactPosition',
  telephone: 'telephone',
  mobile: 'mobile',
  email: 'email',
  preferredContactMethod: 'preferredContactMethod',
  correspondenceAddress: 'correspondenceAddress',
  nationalInsuranceNumber: 'nationalInsuranceNumber',
  dateOfBirth: 'dateOfBirth',
  personalAddress: 'personalAddress',
  personalTaxYear: 'personalTaxYear',
  selfAssessmentTaxYear: 'selfAssessmentTaxYear',
  seasonalBusiness: 'seasonalBusiness',
  dormant: 'dormant',
  doNotContact: 'doNotContact',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  line1: 'line1',
  line2: 'line2',
  city: 'city',
  postcode: 'postcode',
  country: 'country'
};

exports.Prisma.PortfolioScalarFieldEnum = {
  code: 'code',
  practiceId: 'practiceId',
  name: 'name',
  description: 'description'
};

exports.Prisma.RefBucketScalarFieldEnum = {
  id: 'id',
  practiceId: 'practiceId',
  portfolioCode: 'portfolioCode',
  alpha: 'alpha',
  nextIndex: 'nextIndex'
};

exports.Prisma.ServiceScalarFieldEnum = {
  id: 'id',
  serviceRef: 'serviceRef',
  clientId: 'clientId',
  templateId: 'templateId',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  status: 'status',
  nextDue: 'nextDue',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceTemplateScalarFieldEnum = {
  id: 'id',
  code: 'code',
  serviceKind: 'serviceKind',
  frequency: 'frequency',
  complianceTemplateId: 'complianceTemplateId',
  recurrenceType: 'recurrenceType',
  recurrenceUnit: 'recurrenceUnit',
  frequencyValue: 'frequencyValue',
  triggerMode: 'triggerMode',
  autoGenerateNext: 'autoGenerateNext'
};

exports.Prisma.ComplianceTemplateScalarFieldEnum = {
  id: 'id',
  code: 'code',
  complianceType: 'complianceType',
  source: 'source',
  dueDaysAfterPeriodEnd: 'dueDaysAfterPeriodEnd',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplianceItemScalarFieldEnum = {
  id: 'id',
  serviceId: 'serviceId',
  type: 'type',
  dueDate: 'dueDate',
  status: 'status',
  source: 'source'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  taskRef: 'taskRef',
  serviceId: 'serviceId',
  title: 'title',
  dueDate: 'dueDate',
  assigneeId: 'assigneeId',
  creatorId: 'creatorId',
  status: 'status',
  priority: 'priority'
};

exports.Prisma.TaskTemplateScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  title: 'title',
  daysBeforeDue: 'daysBeforeDue',
  priority: 'priority'
};

exports.Prisma.StandaloneTaskTemplateScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  category: 'category',
  priority: 'priority',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  filename: 'filename',
  mimeType: 'mimeType',
  category: 'category',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt'
};

exports.Prisma.TemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  type: 'type',
  content: 'content',
  createdById: 'createdById'
};

exports.Prisma.AccountsSetScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  framework: 'framework',
  status: 'status',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.FilingScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  type: 'type',
  periodEnd: 'periodEnd',
  status: 'status'
};

exports.Prisma.CompaniesHouseDataScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  companyNumber: 'companyNumber',
  companyDetails: 'companyDetails',
  lastFetched: 'lastFetched'
};

exports.Prisma.CompaniesHouseCompanyScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  companyNumber: 'companyNumber',
  companyStatus: 'companyStatus',
  companyType: 'companyType',
  jurisdiction: 'jurisdiction',
  incorporationDate: 'incorporationDate',
  registeredOfficeAddress: 'registeredOfficeAddress',
  accountsLastMadeUpTo: 'accountsLastMadeUpTo',
  accountsNextDue: 'accountsNextDue',
  confirmationLastMadeUpTo: 'confirmationLastMadeUpTo',
  confirmationNextDue: 'confirmationNextDue',
  lastFetched: 'lastFetched',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompaniesHouseOfficerScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  name: 'name',
  officerRole: 'officerRole',
  appointedOn: 'appointedOn',
  resignedOn: 'resignedOn',
  nationality: 'nationality',
  occupation: 'occupation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompaniesHousePSCScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  name: 'name',
  natureOfControl: 'natureOfControl',
  notifiedOn: 'notifiedOn',
  ceasedOn: 'ceasedOn',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompaniesHouseFilingScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  transactionId: 'transactionId',
  type: 'type',
  description: 'description',
  category: 'category',
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

exports.Prisma.CompaniesHouseChargeScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  chargeCode: 'chargeCode',
  createdOn: 'createdOn',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaxCalculationScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  calculationType: 'calculationType',
  taxYear: 'taxYear',
  calculatedAt: 'calculatedAt'
};

exports.Prisma.GeneratedReportScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  calculationId: 'calculationId',
  title: 'title'
};

exports.Prisma.ClientPartyScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  fullName: 'fullName',
  email: 'email',
  role: 'role',
  primaryContact: 'primaryContact'
};

exports.Prisma.CalendarEventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  startDate: 'startDate',
  endDate: 'endDate',
  clientId: 'clientId',
  taskId: 'taskId'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  ts: 'ts',
  actor: 'actor',
  entity: 'entity',
  entityId: 'entityId',
  entityRef: 'entityRef',
  action: 'action',
  payload: 'payload',
  clientId: 'clientId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
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

exports.HMRCRegistrationStatus = exports.$Enums.HMRCRegistrationStatus = {
  NOT_REGISTERED: 'NOT_REGISTERED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  APPLIED_FOR: 'APPLIED_FOR',
  REGISTERED: 'REGISTERED',
  DEREGISTERED: 'DEREGISTERED',
  MISSING_DATA: 'MISSING_DATA'
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

exports.ServiceStatus = exports.$Enums.ServiceStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  AWAITING_FILING: 'AWAITING_FILING',
  READY_TO_CLOSE: 'READY_TO_CLOSE',
  COMPLETE: 'COMPLETE',
  ARCHIVED: 'ARCHIVED'
};

exports.RecurrenceType = exports.$Enums.RecurrenceType = {
  NONE: 'NONE',
  STANDARD: 'STANDARD'
};

exports.RecurrenceUnit = exports.$Enums.RecurrenceUnit = {
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  YEAR: 'YEAR'
};

exports.TriggerMode = exports.$Enums.TriggerMode = {
  COMPLETION: 'COMPLETION',
  DATE_BASED: 'DATE_BASED'
};

exports.ComplianceType = exports.$Enums.ComplianceType = {
  STATUTORY_ACCOUNTS: 'STATUTORY_ACCOUNTS',
  VAT_RETURN: 'VAT_RETURN',
  PAYROLL_RTI: 'PAYROLL_RTI',
  CIS_RETURN: 'CIS_RETURN',
  SELF_ASSESSMENT: 'SELF_ASSESSMENT',
  CORPORATION_TAX: 'CORPORATION_TAX',
  CONFIRMATION_STATEMENT: 'CONFIRMATION_STATEMENT',
  ENGAGEMENT: 'ENGAGEMENT'
};

exports.ComplianceSource = exports.$Enums.ComplianceSource = {
  COMPANIES_HOUSE: 'COMPANIES_HOUSE',
  HMRC: 'HMRC',
  MANUAL: 'MANUAL'
};

exports.ComplianceStatus = exports.$Enums.ComplianceStatus = {
  PENDING: 'PENDING',
  FILED: 'FILED',
  OVERDUE: 'OVERDUE',
  EXEMPT: 'EXEMPT'
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
  CLIENT_REPORTS: 'CLIENT_REPORTS'
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
  DIVIDEND_TAX: 'DIVIDEND_TAX'
};

exports.Prisma.ModelName = {
  Practice: 'Practice',
  PracticeBranch: 'PracticeBranch',
  PracticeSetting: 'PracticeSetting',
  User: 'User',
  UserAccessProfile: 'UserAccessProfile',
  AuthCredential: 'AuthCredential',
  AuthSession: 'AuthSession',
  Client: 'Client',
  ClientProfile: 'ClientProfile',
  Address: 'Address',
  Portfolio: 'Portfolio',
  RefBucket: 'RefBucket',
  Service: 'Service',
  ServiceTemplate: 'ServiceTemplate',
  ComplianceTemplate: 'ComplianceTemplate',
  ComplianceItem: 'ComplianceItem',
  Task: 'Task',
  TaskTemplate: 'TaskTemplate',
  StandaloneTaskTemplate: 'StandaloneTaskTemplate',
  Document: 'Document',
  Template: 'Template',
  AccountsSet: 'AccountsSet',
  Filing: 'Filing',
  CompaniesHouseData: 'CompaniesHouseData',
  CompaniesHouseCompany: 'CompaniesHouseCompany',
  CompaniesHouseOfficer: 'CompaniesHouseOfficer',
  CompaniesHousePSC: 'CompaniesHousePSC',
  CompaniesHouseFiling: 'CompaniesHouseFiling',
  CompaniesHouseCharge: 'CompaniesHouseCharge',
  TaxCalculation: 'TaxCalculation',
  GeneratedReport: 'GeneratedReport',
  ClientParty: 'ClientParty',
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
