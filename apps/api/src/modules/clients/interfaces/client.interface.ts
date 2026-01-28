export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface Client {
  id: string;
  ref: string; // Generated reference (e.g., "1A001")
  name: string;
  type: 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
  portfolioCode: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  mainEmail?: string;
  mainPhone?: string;
  registeredNumber?: string; // Companies House number
  utrNumber?: string; // UK tax UTR
  incorporationDate?: Date; // Date of creation (Companies House)
  accountsAccountingReferenceDay?: number;
  accountsAccountingReferenceMonth?: number;
  accountsLastMadeUpTo?: Date;
  accountsNextDue?: Date;
  confirmationLastMadeUpTo?: Date;
  confirmationNextDue?: Date;
  address?: Address;
  parties: string[]; // Party IDs
  services: string[]; // Service IDs
  tasks: string[]; // Task IDs
  documents: string[]; // Document IDs
  // Practice profile fields (stored locally for JSON-first workflows)
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientParty {
  id: string;
  clientId: string;
  personId: string;
  role: 'DIRECTOR' | 'SHAREHOLDER' | 'PARTNER' | 'MEMBER' | 'OWNER' | 'UBO' | 'SECRETARY' | 'CONTACT';
  ownershipPercent?: number;
  appointedAt?: Date;
  resignedAt?: Date;
  primaryContact: boolean;
  suffixLetter: string; // A, B, C... for reference generation
}

export interface Person {
  id: string;
  ref: string; // Generated reference (e.g., "P001")
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  address?: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientFilters {
  portfolioCode?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  type?: 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateClientDto {
  ref?: string; // Optional: if provided, use this ref instead of auto-generating
  name: string;
  type: 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
  portfolioCode: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  mainEmail?: string;
  mainPhone?: string;
  registeredNumber?: string;
  utrNumber?: string;
  incorporationDate?: Date;
  accountsAccountingReferenceDay?: number;
  accountsAccountingReferenceMonth?: number;
  accountsLastMadeUpTo?: Date;
  accountsNextDue?: Date;
  confirmationLastMadeUpTo?: Date;
  confirmationNextDue?: Date;
  address?: Address;
}

export interface UpdateClientDto {
  name?: string;
  type?: 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  mainEmail?: string;
  mainPhone?: string;
  registeredNumber?: string;
  utrNumber?: string;
  incorporationDate?: Date;
  accountsAccountingReferenceDay?: number;
  accountsAccountingReferenceMonth?: number;
  accountsLastMadeUpTo?: Date;
  accountsNextDue?: Date;
  confirmationLastMadeUpTo?: Date;
  confirmationNextDue?: Date;
  address?: Address;
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
}

export interface CreatePersonDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  address?: Address;
}

export interface UpdatePersonDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  address?: Address;
}

export interface CreateClientPartyDto {
  clientId: string;
  personId: string;
  role: 'DIRECTOR' | 'SHAREHOLDER' | 'PARTNER' | 'MEMBER' | 'OWNER' | 'UBO' | 'SECRETARY' | 'CONTACT';
  ownershipPercent?: number;
  appointedAt?: Date;
  primaryContact?: boolean;
}

export interface UpdateClientPartyDto {
  role?: 'DIRECTOR' | 'SHAREHOLDER' | 'PARTNER' | 'MEMBER' | 'OWNER' | 'UBO' | 'SECRETARY' | 'CONTACT';
  ownershipPercent?: number;
  appointedAt?: Date;
  resignedAt?: Date;
  primaryContact?: boolean;
}

// ========= Composite creation (Unified Add Client Wizard) =========

export interface CreateFullClientDirectorDto extends CreatePersonDto {
  role?: 'DIRECTOR' | 'SHAREHOLDER' | 'PARTNER' | 'MEMBER' | 'OWNER' | 'UBO' | 'SECRETARY' | 'CONTACT';
  primaryContact?: boolean;
  ownershipPercent?: number;
  appointedAt?: Date;
}

export interface CreateFullClientServiceDto {
  kind: string;
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  fee: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  nextDue?: Date;
  description?: string;
}

export interface CreateFullClientDto {
  client: CreateClientDto;
  services?: CreateFullClientServiceDto[];
  defaultServices?: boolean; // Use default service templates & pricing table
  directors?: CreateFullClientDirectorDto[];
  generateTasks?: boolean; // Generate tasks after creating services (uses task window rule)
}
