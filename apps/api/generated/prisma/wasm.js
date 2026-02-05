
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

exports.Prisma.PortfolioScalarFieldEnum = {
  code: 'code',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefBucketScalarFieldEnum = {
  id: 'id',
  portfolio: 'portfolio',
  alpha: 'alpha',
  nextIndex: 'nextIndex',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  ref: 'ref',
  name: 'name',
  type: 'type',
  portfolioCode: 'portfolioCode',
  status: 'status',
  mainEmail: 'mainEmail',
  mainPhone: 'mainPhone',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  accountsAccountingReferenceDay: 'accountsAccountingReferenceDay',
  accountsAccountingReferenceMonth: 'accountsAccountingReferenceMonth',
  accountsLastMadeUpTo: 'accountsLastMadeUpTo',
  accountsNextDue: 'accountsNextDue',
  accountsOverdue: 'accountsOverdue',
  companyName: 'companyName',
  companyNumber: 'companyNumber',
  companyStatus: 'companyStatus',
  companyType: 'companyType',
  confirmationStatementLastMadeUpTo: 'confirmationStatementLastMadeUpTo',
  confirmationStatementNextDue: 'confirmationStatementNextDue',
  confirmationStatementOverdue: 'confirmationStatementOverdue',
  dateOfCessation: 'dateOfCessation',
  dateOfCreation: 'dateOfCreation',
  etag: 'etag',
  jurisdiction: 'jurisdiction',
  lastSyncedAt: 'lastSyncedAt',
  registeredOfficeAddressLine1: 'registeredOfficeAddressLine1',
  registeredOfficeAddressLine2: 'registeredOfficeAddressLine2',
  registeredOfficeCountry: 'registeredOfficeCountry',
  registeredOfficeLocality: 'registeredOfficeLocality',
  registeredOfficePostalCode: 'registeredOfficePostalCode',
  registeredOfficeRegion: 'registeredOfficeRegion',
  sicCodes: 'sicCodes',
  accountLastFour: 'accountLastFour',
  accountingPeriodEnd: 'accountingPeriodEnd',
  accountsOfficeReference: 'accountsOfficeReference',
  amlCompleted: 'amlCompleted',
  annualFee: 'annualFee',
  authenticationCode: 'authenticationCode',
  businessBankName: 'businessBankName',
  ceasedAt: 'ceasedAt',
  cisRegistered: 'cisRegistered',
  cisUtr: 'cisUtr',
  clientManager: 'clientManager',
  clientRiskRating: 'clientRiskRating',
  clientType: 'clientType',
  contactPosition: 'contactPosition',
  corporationTaxUtr: 'corporationTaxUtr',
  correspondenceAddress: 'correspondenceAddress',
  dateOfBirth: 'dateOfBirth',
  directDebitInPlace: 'directDebitInPlace',
  directorRole: 'directorRole',
  disengagementDate: 'disengagementDate',
  doNotContact: 'doNotContact',
  dormant: 'dormant',
  dormantSince: 'dormantSince',
  email: 'email',
  employeeCount: 'employeeCount',
  engagementLetterSigned: 'engagementLetterSigned',
  engagementType: 'engagementType',
  feeArrangement: 'feeArrangement',
  lifecycleStatus: 'lifecycleStatus',
  linkedCompanyNumber: 'linkedCompanyNumber',
  mainContactName: 'mainContactName',
  mobile: 'mobile',
  monthlyFee: 'monthlyFee',
  nationalInsuranceNumber: 'nationalInsuranceNumber',
  nextAccountsDueDate: 'nextAccountsDueDate',
  nextCorporationTaxDueDate: 'nextCorporationTaxDueDate',
  notes: 'notes',
  onboardingDate: 'onboardingDate',
  onboardingStartedAt: 'onboardingStartedAt',
  partnerResponsible: 'partnerResponsible',
  payeAccountsOfficeReference: 'payeAccountsOfficeReference',
  payeReference: 'payeReference',
  paymentIssues: 'paymentIssues',
  payrollFrequency: 'payrollFrequency',
  payrollPayDay: 'payrollPayDay',
  payrollPeriodEndDay: 'payrollPeriodEndDay',
  payrollRtiRequired: 'payrollRtiRequired',
  personalAddress: 'personalAddress',
  personalTaxYear: 'personalTaxYear',
  personalUtr: 'personalUtr',
  preferredContactMethod: 'preferredContactMethod',
  registeredAddress: 'registeredAddress',
  seasonalBusiness: 'seasonalBusiness',
  selfAssessmentFiled: 'selfAssessmentFiled',
  selfAssessmentRequired: 'selfAssessmentRequired',
  selfAssessmentTaxYear: 'selfAssessmentTaxYear',
  specialCircumstances: 'specialCircumstances',
  statutoryYearEnd: 'statutoryYearEnd',
  telephone: 'telephone',
  tradingName: 'tradingName',
  utrNumber: 'utrNumber',
  vatNumber: 'vatNumber',
  vatPeriodEnd: 'vatPeriodEnd',
  vatPeriodStart: 'vatPeriodStart',
  vatQuarter: 'vatQuarter',
  vatRegistrationDate: 'vatRegistrationDate',
  vatReturnFrequency: 'vatReturnFrequency',
  vatScheme: 'vatScheme',
  vatStagger: 'vatStagger',
  wentLiveAt: 'wentLiveAt'
};

exports.Prisma.ServiceScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  kind: 'kind',
  frequency: 'frequency',
  fee: 'fee',
  status: 'status',
  nextDue: 'nextDue',
  annualized: 'annualized',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  clientRef: 'clientRef'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  serviceId: 'serviceId',
  title: 'title',
  description: 'description',
  dueDate: 'dueDate',
  assignee: 'assignee',
  status: 'status',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  clientRef: 'clientRef'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  title: 'title',
  kind: 'kind',
  path: 'path',
  size: 'size',
  mimeType: 'mimeType',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  clientRef: 'clientRef'
};

exports.Prisma.PersonScalarFieldEnum = {
  id: 'id',
  ref: 'ref',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  country: 'country',
  countryOfResidence: 'countryOfResidence',
  dateOfBirthMonth: 'dateOfBirthMonth',
  dateOfBirthYear: 'dateOfBirthYear',
  etag: 'etag',
  locality: 'locality',
  nationality: 'nationality',
  occupation: 'occupation',
  personNumber: 'personNumber',
  postalCode: 'postalCode',
  premises: 'premises',
  region: 'region'
};

exports.Prisma.ClientPartyScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  personId: 'personId',
  role: 'role',
  ownershipPercent: 'ownershipPercent',
  appointedAt: 'appointedAt',
  resignedAt: 'resignedAt',
  primaryContact: 'primaryContact',
  suffixLetter: 'suffixLetter',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  appointedOn: 'appointedOn',
  isPre1992Appointment: 'isPre1992Appointment',
  officerRole: 'officerRole',
  resignedOn: 'resignedOn',
  clientRef: 'clientRef',
  personRef: 'personRef'
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
  updatedAt: 'updatedAt',
  clientRef: 'clientRef'
};

exports.Prisma.FilingScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  type: 'type',
  period: 'period',
  dueDate: 'dueDate',
  status: 'status',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  actionDate: 'actionDate',
  barcode: 'barcode',
  category: 'category',
  description: 'description',
  filedDate: 'filedDate',
  madeUpTo: 'madeUpTo',
  pages: 'pages',
  paperFiled: 'paperFiled',
  reference: 'reference',
  transactionId: 'transactionId',
  clientRef: 'clientRef'
};

exports.Prisma.TaxCalculationScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  clientRef: 'clientRef',
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
  clientRef: 'clientRef',
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
  updatedAt: 'updatedAt',
  clientRef: 'clientRef'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  ts: 'ts',
  actor: 'actor',
  entity: 'entity',
  entityId: 'entityId',
  action: 'action',
  payload: 'payload',
  entityRef: 'entityRef'
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
exports.ClientType = exports.$Enums.ClientType = {
  COMPANY: 'COMPANY',
  INDIVIDUAL: 'INDIVIDUAL',
  SOLE_TRADER: 'SOLE_TRADER',
  PARTNERSHIP: 'PARTNERSHIP',
  LLP: 'LLP'
};

exports.Frequency = exports.$Enums.Frequency = {
  ANNUAL: 'ANNUAL',
  QUARTERLY: 'QUARTERLY',
  MONTHLY: 'MONTHLY',
  WEEKLY: 'WEEKLY'
};

exports.PartyRole = exports.$Enums.PartyRole = {
  DIRECTOR: 'DIRECTOR',
  SHAREHOLDER: 'SHAREHOLDER',
  PARTNER: 'PARTNER',
  MEMBER: 'MEMBER',
  OWNER: 'OWNER',
  UBO: 'UBO',
  SECRETARY: 'SECRETARY',
  CONTACT: 'CONTACT'
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
  Portfolio: 'Portfolio',
  RefBucket: 'RefBucket',
  Client: 'Client',
  Service: 'Service',
  Task: 'Task',
  Document: 'Document',
  Person: 'Person',
  ClientParty: 'ClientParty',
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
