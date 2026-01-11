export interface CompanySearchResult {
  company_number: string;
  title: string;
  company_status: string;
  company_type: string;
  date_of_creation?: string;
  address_snippet?: string;
  description?: string;
  description_identifier?: string[];
  matches?: {
    title?: number[];
    snippet?: number[];
  };
}

export interface CompanyDetails {
  company_number: string;
  company_name: string;
  company_status: string;
  company_type?: string;
  type: string;
  date_of_creation: string;
  date_of_cessation?: string;
  registered_office_address: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  sic_codes?: string[];
  accounts?: {
    next_due?: string;
    last_accounts?: {
      made_up_to?: string;
      type?: string;
    };
    next_made_up_to?: string;
    overdue?: boolean;
  };
  confirmation_statement?: {
    next_due?: string;
    last_made_up_to?: string;
    overdue?: boolean;
  };
  links?: {
    self?: string;
    filing_history?: string;
    officers?: string;
    charges?: string;
  };
}

export interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  country_of_residence?: string;
  occupation?: string;
  date_of_birth?: {
    month: number;
    year: number;
  };
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  links?: {
    officer?: {
      appointments?: string;
    };
  };
}

export interface PersonWithSignificantControl {
  name?: string;
  kind?: string;
  notified_on?: string;
  ceased_on?: string;
  ceased?: boolean;
  nationality?: string;
  country_of_residence?: string;
  date_of_birth?: {
    month: number;
    year: number;
  };
  name_elements?: {
    title?: string;
    forename?: string;
    middle_name?: string;
    surname?: string;
  };
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    premises?: string;
  };
  natures_of_control?: string[];
  identity_verification_details?: {
    appointment_verification_statement_date?: string;
    appointment_verification_statement_due_on?: string;
  };
  links?: {
    self?: string;
  };
}

export interface Filing {
  transaction_id: string;
  category: string;
  description: string;
  type: string;
  date: string;
  action_date?: string;
  barcode?: string;
  links?: {
    self?: string;
    document_metadata?: string;
  };
  pages?: number;
  paper_filed?: boolean;
}

export interface FilingHistory {
  total_count: number;
  items: Filing[];
  filing_history_status?: string;
}



export interface PSCList {
  active_count: number;
  ceased_count: number;
  items: PersonWithSignificantControl[];
  items_per_page: number;
  kind: string;
  links: {
    self: string;
  };
  start_index: number;
  total_results: number;
}

export interface Charge {
  charge_code?: string;
  charge_number?: number;
  classification?: {
    description?: string;
    type?: string;
  };
  created_on?: string;
  delivered_on?: string;
  description?: string;
  etag?: string;
  id?: string;
  particulars?: {
    description?: string;
    contains_floating_charge?: boolean;
    contains_fixed_charge?: boolean;
    floating_charge_covers_all?: boolean;
    chargor_acting_as_bare_trustee?: boolean;
  };
  persons_entitled?: Array<{
    name?: string;
  }>;
  satisfied_on?: string;
  status?: string;
  transactions?: Array<{
    delivered_on?: string;
    filing_type?: string;
    links?: {
      filing?: string;
    };
  }>;
  links?: {
    self?: string;
  };
}

export interface ChargesList {
  etag: string;
  items: Charge[];
  part_satisfaction_count: number;
  satisfied_count: number;
  total_count: number;
  unfiltered_count: number;
}

export interface CompaniesHouseSearchParams {
  q: string;
  items_per_page?: number;
  start_index?: number;
}

export interface CompaniesHouseImportData {
  companyNumber: string;
  portfolioCode: number;
  importOfficers?: boolean;
  createComplianceItems?: boolean;
  createOfficerClients?: boolean; // also create each officer as an INDIVIDUAL client
  selfAssessmentFee?: number; // fee for Self Assessment service added to director clients
}

export interface ComplianceItem {
  id: string;
  clientId: string;
  serviceId?: string;
  type: string;
  description: string;
  dueDate?: Date;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplianceItemDto {
  clientId: string;
  serviceId?: string;
  type: string;
  description: string;
  dueDate?: Date;
  status?: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
}
