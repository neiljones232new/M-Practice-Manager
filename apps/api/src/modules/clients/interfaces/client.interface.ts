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
