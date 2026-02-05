export interface CompaniesHouseAddress {
  address_line_1?: string;
  address_line_2?: string;
  care_of?: string;
  country?: string;
  locality?: string;
  po_box?: string;
  postal_code?: string;
  premises?: string;
  region?: string;
}

export interface CompaniesHouseLinks {
  self: string;
  persons_with_significant_control?: string;
  persons_with_significant_control_statements?: string;
  registers?: string;
  uk_establishments?: string;
  overseas?: string;
  officers?: string;
  insolvency?: string;
  filing_history?: string;
  charges?: string;
  exemptions?: string;
}

export interface CompanySearchResult {
  kind: string;
  title: string;
  company_number: string;
  date_of_creation: string;
  company_type: string;
  company_status: string;
  address: CompaniesHouseAddress;
  address_snippet?: string;
  description?: string;
  description_identifier?: string[];
  matches?: {
    title?: number[];
    snippet?: number[];
    address_snippet?: number[];
  };
  links?: {
    self?: string;
  };
}

export interface CompanyDetails {
  company_number: string;
  company_name: string;
  type: string;
  can_file: boolean;
  links: CompaniesHouseLinks;
  company_status?: string;
  company_type?: string;
  jurisdiction?: string;
  date_of_creation?: string;
  date_of_cessation?: string;
  etag?: string;
  has_been_liquidated?: boolean;
  has_charges?: boolean;
  is_community_interest_company?: boolean;
  subtype?: string;
  partial_data_available?: string;
  external_registration_number?: string;
  last_full_members_list_date?: string;
  registered_office_address?: CompaniesHouseAddress;
  service_address?: CompaniesHouseAddress;
  sic_codes?: string[];
  accounts?: {
    accounting_reference_date?: {
      day?: number;
      month?: number;
    };
    last_accounts?: {
      made_up_to?: string;
      period_end_on?: string;
      period_start_on?: string;
      type?: string;
    };
    next_accounts?: {
      due_on?: string;
      overdue?: boolean;
      period_end_on?: string;
      period_start_on?: string;
    };
    next_due?: string;
    next_made_up_to?: string;
    overdue?: boolean;
  };
  confirmation_statement?: {
    last_made_up_to?: string;
    next_due?: string;
    next_made_up_to?: string;
    overdue?: boolean;
  };
  annual_return?: {
    last_made_up_to?: string;
    next_due?: string;
    next_made_up_to?: string;
    overdue?: boolean;
  };
  previous_company_names?: Array<{
    name?: string;
    effective_from?: string;
    ceased_on?: string;
  }>;
}

export interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  appointed_before?: string;
  nationality?: string;
  country_of_residence?: string;
  occupation?: string;
  responsibilities?: string;
  person_number?: string;
  principal_office_address?: CompaniesHouseAddress;
  date_of_birth?: {
    month: number;
    year: number;
  };
  address?: CompaniesHouseAddress;
  contact_details?: {
    contact_name?: string;
  };
  former_names?: Array<{
    forenames?: string;
    surname?: string;
  }>;
  identification?: {
    identification_type?: string;
    legal_authority?: string;
    legal_form?: string;
    place_registered?: string;
    registration_number?: string;
  };
  identity_verification_details?: Record<string, unknown>;
  links: {
    self?: string;
    officer?: {
      appointments: string;
    };
  };
  etag?: string;
  is_pre_1992_appointment?: boolean;
}

export interface PersonWithSignificantControl {
  etag: string;
  name: string;
  notified_on: string;
  natures_of_control: string[];
  address: CompaniesHouseAddress;
  links: {
    self?: string;
  };
  kind?: string;
  ceased?: boolean;
  ceased_on?: string;
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
  identification?: {
    legal_authority?: string;
    legal_form?: string;
    place_registered?: string;
    registration_number?: string;
    country_registered?: string;
  };
  identity_verification_details?: {
    anti_money_laundering_supervisory_bodies?: string[];
    appointment_verification_end_on?: string;
    appointment_verification_statement_date?: string;
    appointment_verification_statement_due_on?: string;
    appointment_verification_start_on?: string;
    authorised_corporate_service_provider_name?: string;
    identity_verified_on?: string;
    preferred_name?: string;
  };
  description?: string;
  principal_office_address?: CompaniesHouseAddress;
  is_sanctioned?: boolean;
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
  annotations?: Array<{
    annotation?: string;
    date: string;
    description: string;
  }>;
  associated_filings?: Array<{
    date: string;
    description: string;
    type: string;
  }>;
  pages?: number;
  paper_filed?: boolean;
  resolutions?: Array<{
    category: string;
    description: string;
    document_id?: string;
    receive_date: string;
    subcategory: string;
    type: string;
  }>;
  subcategory?: string;
}

export interface FilingHistory {
  etag: string;
  items_per_page: number;
  kind: string;
  start_index: number;
  total_count: number;
  items: Filing[];
  filing_history_status?: string;
}



export interface PSCList {
  active_count: number;
  ceased_count: number;
  items: PersonWithSignificantControl[];
  items_per_page: number;
  links: {
    self?: string;
  };
  start_index: number;
  total_results: number;
}

export interface Charge {
  etag: string;
  id: string;
  status: string;
  charge_number: number;
  classification: {
    type: string;
    description: string;
  };
  charge_code?: string;
  assests_ceased_released?: string;
  acquired_on?: string;
  delivered_on?: string;
  resolved_on?: string;
  covering_instrument_date?: string;
  created_on?: string;
  satisfied_on?: string;
  particulars?: {
    type?: string;
    description?: string;
    contains_floating_charge?: boolean;
    contains_fixed_charge?: boolean;
    floating_charge_covers_all?: boolean;
    contains_negative_pledge?: boolean;
    chargor_acting_as_bare_trustee?: boolean;
  };
  secured_details?: {
    type?: string;
    description?: string;
  };
  scottish_alterations?: {
    type?: string;
    description?: string;
    has_alterations_to_order?: boolean;
    has_alterations_to_prohibitions?: boolean;
    has_alterations_to_provisions?: boolean;
  };
  more_than_four_persons_entitled?: boolean;
  persons_entitled?: Array<{
    name: string;
  }>;
  transactions?: Array<{
    filing_type?: string;
    delivered_on?: string;
    insolvency_case_number?: string;
    links?: {
      filing?: string;
      insolvency_case?: string;
    };
  }>;
  insolvency_cases?: Array<{
    case_number?: string;
    links?: {
      insolvency_case?: string;
    };
  }>;
  links?: {
    self: string;
  };
}

export interface ChargesList {
  etag: string;
  items: Charge[];
  total_count?: number;
  unfiletered_count?: number;
  satisfied_count?: number;
  part_satisfied_count?: number;
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

export interface CompaniesHouseUserProfile {
  surname: string;
  forename: string;
  email: string;
  id: string;
  locale: string;
}
