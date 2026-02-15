export type ServiceFrequency = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
export type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Service {
  id: string;
  clientId: string;
  kind: string; // 'Accounts', 'VAT', 'Payroll', etc.
  frequency?: ServiceFrequency;
  fee: number;
  annualized: number; // Calculated annual fee
  status: ServiceStatus;
  nextDue?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceFilters {
  clientId?: string;
  kind?: string;
  frequency?: ServiceFrequency;
  status?: ServiceStatus;
  portfolioCode?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateServiceDto {
  clientId: string;
  kind: string;
  frequency: ServiceFrequency;
  fee: number;
  status?: ServiceStatus;
  nextDue?: Date;
  description?: string;
}

export interface UpdateServiceDto {
  kind?: string;
  frequency?: ServiceFrequency;
  fee?: number;
  status?: ServiceStatus;
  nextDue?: Date;
  description?: string;
}

export interface ServiceSummary {
  totalServices: number;
  activeServices: number;
  totalAnnualFees: number;
  servicesByKind: Record<string, number>;
  servicesByFrequency: Record<string, number>;
}
