export type ClientType = 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type LifecycleStatus = 'PROSPECT' | 'ONBOARDING' | 'ACTIVE' | 'DORMANT' | 'CEASED';
export type VatStagger = 'A' | 'B' | 'C' | 'NONE';

export interface Address {
  id: string;
  line1: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface CreateAddressDto {
  line1: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface UpdateAddressDto {
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  portfolioCode: number;
  mainEmail?: string;
  mainPhone?: string;
  addressId?: string;
  address?: Address | null;

  registeredNumber?: string;
  utrNumber?: string;
  vatNumber?: string;
  payeReference?: string;
  accountsOfficeReference?: string;
  cisUtr?: string;
  eoriNumber?: string;

  mtdVatEnabled: boolean;
  mtdItsaEnabled: boolean;
  hmrcCtStatus?: string;
  hmrcSaStatus?: string;
  hmrcVatStatus?: string;
  hmrcPayeStatus?: string;
  hmrcCisStatus?: string;
  hmrcMtdVatStatus?: string;
  hmrcMtdItsaStatus?: string;
  hmrcEoriStatus?: string;

  incorporationDate?: Date;
  yearEnd?: Date;
  accountsNextDue?: Date;
  accountsLastMadeUpTo?: Date;
  confirmationNextDue?: Date;
  confirmationLastMadeUpTo?: Date;

  accountsAccountingReferenceDay?: number;
  accountsAccountingReferenceMonth?: number;

  annualFees?: number;
  tasksDueCount: number;
  source?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientDto {
  id?: string;
  name: string;
  type: ClientType;
  status?: ClientStatus;
  portfolioCode: number;
  mainEmail?: string;
  mainPhone?: string;
  addressId?: string;

  registeredNumber?: string;
  utrNumber?: string;
  vatNumber?: string;
  payeReference?: string;
  accountsOfficeReference?: string;
  cisUtr?: string;
  eoriNumber?: string;

  mtdVatEnabled?: boolean;
  mtdItsaEnabled?: boolean;
  hmrcCtStatus?: string;
  hmrcSaStatus?: string;
  hmrcVatStatus?: string;
  hmrcPayeStatus?: string;
  hmrcCisStatus?: string;
  hmrcMtdVatStatus?: string;
  hmrcMtdItsaStatus?: string;
  hmrcEoriStatus?: string;

  incorporationDate?: Date;
  yearEnd?: Date;
  accountsNextDue?: Date;
  accountsLastMadeUpTo?: Date;
  confirmationNextDue?: Date;
  confirmationLastMadeUpTo?: Date;

  accountsAccountingReferenceDay?: number;
  accountsAccountingReferenceMonth?: number;

  annualFees?: number;
  tasksDueCount?: number;
  source?: string;
  lastSyncedAt?: Date;
}

export interface CreateClientResponse {
  assignedReference: string;
  portfolioNumber: number;
  client: Client;
}

export interface UpdateClientDto {
  name?: string;
  type?: ClientType;
  status?: ClientStatus;
  portfolioCode?: number;
  mainEmail?: string;
  mainPhone?: string;
  addressId?: string;

  registeredNumber?: string;
  utrNumber?: string;
  vatNumber?: string;
  payeReference?: string;
  accountsOfficeReference?: string;
  cisUtr?: string;
  eoriNumber?: string;

  mtdVatEnabled?: boolean;
  mtdItsaEnabled?: boolean;
  hmrcCtStatus?: string;
  hmrcSaStatus?: string;
  hmrcVatStatus?: string;
  hmrcPayeStatus?: string;
  hmrcCisStatus?: string;
  hmrcMtdVatStatus?: string;
  hmrcMtdItsaStatus?: string;
  hmrcEoriStatus?: string;

  incorporationDate?: Date;
  yearEnd?: Date;
  accountsNextDue?: Date;
  accountsLastMadeUpTo?: Date;
  confirmationNextDue?: Date;
  confirmationLastMadeUpTo?: Date;

  accountsAccountingReferenceDay?: number;
  accountsAccountingReferenceMonth?: number;

  annualFees?: number;
  tasksDueCount?: number;
  source?: string;
  lastSyncedAt?: Date;
}

export interface ClientProfile {
  id: string;
  clientId: string;

  mainContactName?: string;
  partnerResponsible?: string;
  clientManager?: string;

  lifecycleStatus: LifecycleStatus;
  engagementType?: string;
  engagementLetterSigned: boolean;
  onboardingDate?: Date;
  disengagementDate?: Date;
  onboardingStartedAt?: Date;
  wentLiveAt?: Date;
  ceasedAt?: Date;
  dormantSince?: Date;

  accountingPeriodEnd?: Date;
  nextAccountsDueDate?: Date;
  nextCorporationTaxDueDate?: Date;
  statutoryYearEnd?: Date;
  vatRegistrationDate?: Date;
  vatPeriodStart?: Date;
  vatPeriodEnd?: Date;
  vatStagger: VatStagger;
  payrollPayDay?: number;
  payrollPeriodEndDay?: number;

  corporationTaxUtr?: string;
  vatNumber?: string;
  vatScheme?: string;
  vatReturnFrequency?: string;
  vatQuarter?: string;
  payeReference?: string;
  payeAccountsOfficeReference?: string;
  cisRegistered: boolean;
  cisUtr?: string;
  personalUtr?: string;

  payrollRtiRequired: boolean;
  amlCompleted: boolean;
  clientRiskRating?: string;
  annualFee?: number;
  monthlyFee?: number;
  selfAssessmentRequired: boolean;
  selfAssessmentFiled: boolean;
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
  directDebitInPlace: boolean;
  paymentIssues?: string;

  nationalInsuranceNumber?: string;
  dateOfBirth?: Date;
  personalAddress?: string;
  personalTaxYear?: string;
  selfAssessmentTaxYear?: string;
  linkedCompanyNumber?: string;
  directorRole?: string;

  companyStatusDetail?: string;
  jurisdiction?: string;
  sicCodes?: string;
  sicDescriptions?: string;
  registeredOfficeFull?: string;
  directorCount?: number;
  pscCount?: number;
  currentDirectors?: string;
  currentPscs?: string;
  lastChRefresh?: Date;

  accountsOverdue: boolean;
  confirmationStatementOverdue: boolean;
  nextAccountsMadeUpTo?: Date;
  nextAccountsDueBy?: Date;
  lastAccountsMadeUpTo?: Date;
  nextConfirmationStatementDate?: Date;
  confirmationStatementDueBy?: Date;
  lastConfirmationStatementDate?: Date;

  notes?: string;
  specialCircumstances?: string;
  seasonalBusiness: boolean;
  dormant: boolean;
  doNotContact: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientProfileDto {
  clientId: string;

  mainContactName?: string;
  partnerResponsible?: string;
  clientManager?: string;

  lifecycleStatus?: LifecycleStatus;
  engagementType?: string;
  engagementLetterSigned?: boolean;
  onboardingDate?: Date;
  disengagementDate?: Date;
  onboardingStartedAt?: Date;
  wentLiveAt?: Date;
  ceasedAt?: Date;
  dormantSince?: Date;

  accountingPeriodEnd?: Date;
  nextAccountsDueDate?: Date;
  nextCorporationTaxDueDate?: Date;
  statutoryYearEnd?: Date;
  vatRegistrationDate?: Date;
  vatPeriodStart?: Date;
  vatPeriodEnd?: Date;
  vatStagger?: VatStagger;
  payrollPayDay?: number;
  payrollPeriodEndDay?: number;

  corporationTaxUtr?: string;
  vatNumber?: string;
  vatScheme?: string;
  vatReturnFrequency?: string;
  vatQuarter?: string;
  payeReference?: string;
  payeAccountsOfficeReference?: string;
  cisRegistered?: boolean;
  cisUtr?: string;
  personalUtr?: string;

  payrollRtiRequired?: boolean;
  amlCompleted?: boolean;
  clientRiskRating?: string;
  annualFee?: number;
  monthlyFee?: number;
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

  nationalInsuranceNumber?: string;
  dateOfBirth?: Date;
  personalAddress?: string;
  personalTaxYear?: string;
  selfAssessmentTaxYear?: string;
  linkedCompanyNumber?: string;
  directorRole?: string;

  companyStatusDetail?: string;
  jurisdiction?: string;
  sicCodes?: string;
  sicDescriptions?: string;
  registeredOfficeFull?: string;
  directorCount?: number;
  pscCount?: number;
  currentDirectors?: string;
  currentPscs?: string;
  lastChRefresh?: Date;

  accountsOverdue?: boolean;
  confirmationStatementOverdue?: boolean;
  nextAccountsMadeUpTo?: Date;
  nextAccountsDueBy?: Date;
  lastAccountsMadeUpTo?: Date;
  nextConfirmationStatementDate?: Date;
  confirmationStatementDueBy?: Date;
  lastConfirmationStatementDate?: Date;

  notes?: string;
  specialCircumstances?: string;
  seasonalBusiness?: boolean;
  dormant?: boolean;
  doNotContact?: boolean;
}

export interface UpdateClientProfileDto extends CreateClientProfileDto {}

export interface Person {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePersonDto {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface UpdatePersonDto {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface ClientParty {
  id: string;
  clientId: string;
  personId?: string;
  primaryContact: boolean;
  suffixLetter?: string;
  ownershipPercent?: number;
  appointedAt?: Date;
  resignedAt?: Date;
  role?: string;
  partyRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientPartyDto {
  clientId: string;
  personId?: string;
  primaryContact?: boolean;
  suffixLetter?: string;
  ownershipPercent?: number;
  appointedAt?: Date;
  resignedAt?: Date;
  role?: string;
  partyRef?: string;
}

export interface UpdateClientPartyDto {
  primaryContact?: boolean;
  suffixLetter?: string;
  ownershipPercent?: number;
  appointedAt?: Date;
  resignedAt?: Date;
  role?: string;
  partyRef?: string;
}

export interface ClientFilters {
  portfolioCode?: number;
  status?: ClientStatus;
  type?: ClientType;
  search?: string;
  limit?: number;
  offset?: number;
}
