import { PlaceholderType, PlaceholderSource } from './template.interface';

export interface PlaceholderContext {
  clientId: string;
  serviceId?: string;
  userId: string;
  manualValues?: Record<string, any>;
}

export interface ClientPlaceholderData {
  // Client basic info
  clientName: string;
  clientReference: string;
  clientType: 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP';
  
  // Company specific
  companyName?: string;
  companyNumber?: string;
  incorporationDate?: Date;
  registeredOffice?: string;
  
  // Individual specific
  firstName?: string;
  lastName?: string;
  title?: string;
  
  // Contact information
  email?: string;
  phone?: string;
  mobile?: string;
  
  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  
  // Tax information
  utrNumber?: string;
  vatNumber?: string;
  payeReference?: string;
  
  // Additional
  accountingPeriodEnd?: Date;
  yearEnd?: string;
  portfolio?: string;
  
  [key: string]: any;
}

export interface ServicePlaceholderData {
  serviceName: string;
  serviceType: string;
  serviceKind: string;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  status: string;
  frequency?: string;
  fee?: number;
  currency?: string;
  description?: string;
  
  [key: string]: any;
}

export interface SystemPlaceholderData {
  currentDate: Date;
  currentYear: number;
  currentMonth: string;
  userName: string;
  userEmail?: string;
  practiceName?: string;
  practiceAddress?: string;
  practicePhone?: string;
  practiceEmail?: string;
  
  [key: string]: any;
}

export interface ResolvedPlaceholder {
  key: string;
  value: any;
  formattedValue: string;
  source: PlaceholderSource;
  type: PlaceholderType;
}

export interface PlaceholderResolutionResult {
  placeholders: Record<string, ResolvedPlaceholder>;
  missingRequired: string[];
  errors: PlaceholderError[];
}

export interface PlaceholderError {
  key: string;
  message: string;
  code: string;
}
