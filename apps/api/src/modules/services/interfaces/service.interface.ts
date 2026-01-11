export interface Service {
  id: string;
  clientId: string;
  kind: string; // 'Accounts', 'VAT', 'Payroll', etc.
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  fee: number;
  annualized: number; // Calculated annual fee
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  nextDue?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceFilters {
  clientId?: string;
  kind?: string;
  frequency?: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  portfolioCode?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateServiceDto {
  clientId: string;
  kind: string;
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  fee: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  nextDue?: Date;
  description?: string;
}

export interface UpdateServiceDto {
  kind?: string;
  frequency?: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  fee?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
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