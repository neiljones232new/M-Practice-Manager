export type ServiceFrequency = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY' | 'ONE_OFF';
export type ServiceStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Service {
  id: string;
  clientId: string;
  templateId?: string;
  periodStart: Date;
  periodEnd: Date;
  cycleNumber?: number;
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
  templateId?: string;
  kind: string;
  frequency: ServiceFrequency;
  fee: number;
  periodStart?: Date;
  periodEnd?: Date;
  cycleNumber?: number;
  status?: ServiceStatus;
  nextDue?: Date;
  description?: string;
}

export interface UpdateServiceDto {
  templateId?: string;
  kind?: string;
  frequency?: ServiceFrequency;
  fee?: number;
  periodStart?: Date;
  periodEnd?: Date;
  cycleNumber?: number;
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
