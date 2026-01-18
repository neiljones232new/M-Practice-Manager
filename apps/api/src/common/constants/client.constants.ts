/**
 * Client-related constants
 */

export const CLIENT_DEFAULTS = {
  STATUS: 'ACTIVE' as const,
  TYPE: 'COMPANY' as const,
  ACCOUNTING_REFERENCE_DAY: 31,
  ACCOUNTING_REFERENCE_MONTH: 3,
} as const;

export const CLIENT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export const CLIENT_TYPE = {
  COMPANY: 'COMPANY',
  INDIVIDUAL: 'INDIVIDUAL',
  SOLE_TRADER: 'SOLE_TRADER',
  PARTNERSHIP: 'PARTNERSHIP',
  LLP: 'LLP',
} as const;

export const DEFAULT_SERVICES = [
  { kind: 'Annual Accounts', frequency: 'ANNUAL' as const, fee: 600, status: 'ACTIVE' as const },
  { kind: 'Corporation Tax Return', frequency: 'ANNUAL' as const, fee: 250, status: 'ACTIVE' as const },
  { kind: 'Company Secretarial', frequency: 'ANNUAL' as const, fee: 60, status: 'ACTIVE' as const },
  { kind: 'Payroll Services', frequency: 'MONTHLY' as const, fee: 100, status: 'ACTIVE' as const },
  { kind: 'VAT Returns', frequency: 'QUARTERLY' as const, fee: 120, status: 'ACTIVE' as const },
  { kind: 'Self Assessment', frequency: 'ANNUAL' as const, fee: 350, status: 'ACTIVE' as const },
] as const;
