import { Client as ClientNode, ClientProfile as ClientProfileNode } from '../interfaces/client.interface';

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

export interface ClientContext {
  node: ClientNode;
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
    eligibility: {
      status: 'active' | 'blocked' | 'warning';
      reasons: string[];
      eligible: boolean;
    };
  };
}

export interface ServiceEligibilityResult {
  status: 'active' | 'blocked' | 'warning';
  reasons: string[];
  eligible: boolean;
}

export function evaluateServiceEligibility(
  serviceKind: string,
  context: ClientContext
): ServiceEligibilityResult {
  const reasons: string[] = [];
  const normalized = serviceKind.toLowerCase();

  if (context.profile.lifecycleStatus && context.profile.lifecycleStatus !== 'ACTIVE') {
    reasons.push(`Lifecycle ${context.profile.lifecycleStatus.toLowerCase()}`);
  }

  if (context.profile.amlCompleted === false) {
    reasons.push('AML incomplete');
  }

  if (normalized.includes('vat') && !context.computed.taxFlags.vat) {
    reasons.push('VAT not registered');
  }

  if ((normalized.includes('paye') || normalized.includes('payroll') || normalized.includes('rti')) && !context.computed.taxFlags.paye) {
    reasons.push('PAYE not registered');
  }

  if (normalized.includes('cis') && !context.computed.taxFlags.cis) {
    reasons.push('CIS not registered');
  }

  if ((normalized.includes('corporation tax') || normalized.includes('ct')) && !context.computed.taxFlags.ct) {
    reasons.push('Corporation tax not registered');
  }

  const blockedByLifecycle = reasons.some((reason) => reason.startsWith('Lifecycle') || reason.startsWith('AML'));
  const status: ServiceEligibilityResult['status'] = reasons.length === 0
    ? 'active'
    : blockedByLifecycle
    ? 'blocked'
    : 'warning';

  return {
    status,
    reasons,
    eligible: reasons.length === 0,
  };
}

export function buildClientContext(
  node: ClientNode,
  profileInput?: Partial<ClientProfileNode> | ClientProfileSubset | null
): ClientContext {
  const profileSource = (profileInput || {}) as Record<string, any>;
  const getValue = <T,>(key: keyof ClientProfileSubset & string): T | undefined => {
    const profileVal = profileSource?.[key];
    if (profileVal !== null && profileVal !== undefined) return profileVal as T;
    const nodeVal = (node as any)?.[key];
    return nodeVal !== undefined ? (nodeVal as T) : undefined;
  };
  const profile: ClientProfileSubset = {
    mainContactName: getValue('mainContactName'),
    partnerResponsible: getValue('partnerResponsible'),
    clientManager: getValue('clientManager'),
    lifecycleStatus: getValue('lifecycleStatus'),
    engagementType: getValue('engagementType'),
    engagementLetterSigned: getValue('engagementLetterSigned'),
    onboardingDate: getValue('onboardingDate'),
    disengagementDate: getValue('disengagementDate'),
    onboardingStartedAt: getValue('onboardingStartedAt'),
    wentLiveAt: getValue('wentLiveAt'),
    ceasedAt: getValue('ceasedAt'),
    dormantSince: getValue('dormantSince'),
    accountingPeriodEnd: getValue('accountingPeriodEnd'),
    nextAccountsDueDate: getValue('nextAccountsDueDate'),
    nextCorporationTaxDueDate: getValue('nextCorporationTaxDueDate'),
    statutoryYearEnd: getValue('statutoryYearEnd'),
    vatRegistrationDate: getValue('vatRegistrationDate'),
    vatPeriodStart: getValue('vatPeriodStart'),
    vatPeriodEnd: getValue('vatPeriodEnd'),
    vatStagger: getValue('vatStagger'),
    payrollPayDay: getValue('payrollPayDay'),
    payrollPeriodEndDay: getValue('payrollPeriodEndDay'),
    corporationTaxUtr: getValue('corporationTaxUtr'),
    vatNumber: getValue('vatNumber'),
    vatScheme: getValue('vatScheme'),
    vatReturnFrequency: getValue('vatReturnFrequency'),
    vatQuarter: getValue('vatQuarter'),
    payeReference: getValue('payeReference'),
    payeAccountsOfficeReference: getValue('payeAccountsOfficeReference'),
    accountsOfficeReference: getValue('accountsOfficeReference'),
    cisRegistered: getValue('cisRegistered'),
    cisUtr: getValue('cisUtr'),
    payrollRtiRequired: getValue('payrollRtiRequired'),
    amlCompleted: getValue('amlCompleted'),
    clientRiskRating: getValue('clientRiskRating'),
    annualFee: getValue('annualFee'),
    monthlyFee: getValue('monthlyFee'),
    personalUtr: getValue('personalUtr'),
    selfAssessmentRequired: getValue('selfAssessmentRequired'),
    selfAssessmentFiled: getValue('selfAssessmentFiled'),
    tradingName: getValue('tradingName'),
    companyType: getValue('companyType'),
    registeredAddress: getValue('registeredAddress'),
    authenticationCode: getValue('authenticationCode'),
    employeeCount: getValue('employeeCount'),
    payrollFrequency: getValue('payrollFrequency'),
    contactPosition: getValue('contactPosition'),
    telephone: getValue('telephone'),
    mobile: getValue('mobile'),
    email: getValue('email'),
    preferredContactMethod: getValue('preferredContactMethod'),
    correspondenceAddress: getValue('correspondenceAddress'),
    feeArrangement: getValue('feeArrangement'),
    businessBankName: getValue('businessBankName'),
    accountLastFour: getValue('accountLastFour'),
    directDebitInPlace: getValue('directDebitInPlace'),
    paymentIssues: getValue('paymentIssues'),
    notes: getValue('notes'),
    specialCircumstances: getValue('specialCircumstances'),
    seasonalBusiness: getValue('seasonalBusiness'),
    dormant: getValue('dormant'),
    doNotContact: getValue('doNotContact'),
    nationalInsuranceNumber: getValue('nationalInsuranceNumber'),
    dateOfBirth: getValue('dateOfBirth'),
    personalAddress: getValue('personalAddress'),
    personalTaxYear: getValue('personalTaxYear'),
    selfAssessmentTaxYear: getValue('selfAssessmentTaxYear'),
    linkedCompanyNumber: getValue('linkedCompanyNumber'),
    directorRole: getValue('directorRole'),
    clientType: getValue('clientType'),
    companyStatusDetail: getValue('companyStatusDetail'),
    jurisdiction: getValue('jurisdiction'),
    registeredOfficeFull: getValue('registeredOfficeFull'),
    sicCodes: getValue('sicCodes'),
    sicDescriptions: getValue('sicDescriptions'),
    accountsOverdue: getValue('accountsOverdue'),
    confirmationStatementOverdue: getValue('confirmationStatementOverdue'),
    nextAccountsMadeUpTo: getValue('nextAccountsMadeUpTo'),
    nextAccountsDueBy: getValue('nextAccountsDueBy'),
    lastAccountsMadeUpTo: getValue('lastAccountsMadeUpTo'),
    nextConfirmationStatementDate: getValue('nextConfirmationStatementDate'),
    confirmationStatementDueBy: getValue('confirmationStatementDueBy'),
    lastConfirmationStatementDate: getValue('lastConfirmationStatementDate'),
    directorCount: getValue('directorCount'),
    pscCount: getValue('pscCount'),
    currentDirectors: getValue('currentDirectors'),
    currentPscs: getValue('currentPscs'),
    lastChRefresh: getValue('lastChRefresh'),
  };

  const taxFlags = {
    vat: Boolean(profile.vatNumber),
    paye: Boolean(profile.payeReference || profile.payrollRtiRequired || profile.payeAccountsOfficeReference),
    cis: Boolean(profile.cisRegistered),
    ct: Boolean(profile.corporationTaxUtr),
  };

  const eligibility: ServiceEligibilityResult = {
    status: 'active',
    reasons: [],
    eligible: true,
  };

  if (profile.lifecycleStatus && profile.lifecycleStatus !== 'ACTIVE') {
    eligibility.status = 'blocked';
    eligibility.reasons.push(`Lifecycle ${profile.lifecycleStatus.toLowerCase()}`);
    eligibility.eligible = false;
  }

  if (profile.amlCompleted === false) {
    eligibility.status = 'blocked';
    eligibility.reasons.push('AML incomplete');
    eligibility.eligible = false;
  }

  return {
    node,
    profile,
    computed: {
      isVatRegistered: Boolean(profile.vatNumber),
      isEmployer: Boolean(profile.payeReference || profile.payrollRtiRequired),
      isCisRegistered: Boolean(profile.cisRegistered),
      isCorporationTaxRegistered: Boolean(profile.corporationTaxUtr),
      isCompany: node.type === 'COMPANY',
      isActive: node.status === 'ACTIVE',
      isAmlComplete: Boolean(profile.amlCompleted),
      amlReviewDue: profile.amlCompleted === false,
      taxFlags,
      eligibility,
    },
  };
}
