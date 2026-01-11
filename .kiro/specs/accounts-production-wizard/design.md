# Design Document

## Overview

The Accounts Production Wizard is a comprehensive multi-step wizard within M Practice Manager that enables accounting professionals to create statutory accounts for UK companies. The system follows a structured approach with eight sequential steps, automatic financial calculations, comprehensive validation, and professional output generation. The wizard intelligently handles both first-year accounts (single period) and subsequent-year accounts (current + prior period comparatives) using a unified data model and template system.

## Architecture

The Accounts Production Wizard follows M Practice Manager's established modular architecture:

### Backend Architecture
- **NestJS Module**: `AccountsProductionModule` containing controllers, services, and DTOs
- **RESTful API**: Standard CRUD operations with specialized endpoints for validation and output generation
- **File-based Storage**: JSON storage following existing patterns with automatic backups
- **Template Engine**: Handlebars-based system for HTML/PDF generation using existing template infrastructure
- **Validation Layer**: Comprehensive validation using class-validator with custom business rules

### Frontend Architecture
- **Next.js Page**: `/accounts-production/[id]` following existing client detail patterns
- **React Components**: Reusable wizard components with MDJ UI styling
- **State Management**: Local React state with automatic persistence via API
- **Real-time Updates**: Debounced autosave with optimistic UI updates

### Integration Points
- **Clients Module**: Integration for company data and historical accounts lookup
- **Templates Module**: Reuse of existing Handlebars infrastructure for output generation
- **Reports Module**: Leverage existing PDF generation capabilities via Puppeteer
- **File Storage Module**: Utilize existing secure file storage and URL generation
- **Audit Module**: Integration for change tracking and compliance logging

## Components and Interfaces

### Core Domain Objects

#### AccountsSet
```typescript
interface AccountsSet {
  id: string;
  clientId: string;
  companyNumber: string;
  framework: 'MICRO_FRS105' | 'SMALL_FRS102_1A' | 'DORMANT';
  status: 'DRAFT' | 'IN_REVIEW' | 'READY' | 'LOCKED';
  period: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    isFirstYear: boolean; // Server-derived
  };
  sections: {
    companyPeriod: CompanyPeriodSection;
    frameworkDisclosures: FrameworkDisclosuresSection;
    accountingPolicies: AccountingPoliciesSection;
    profitAndLoss: ProfitAndLossSection;
    balanceSheet: BalanceSheetSection;
    notes: NotesSection;
    directorsApproval: DirectorsApprovalSection;
  };
  validation: {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    isBalanced: boolean;
  };
  outputs: {
    htmlUrl: string | null;
    pdfUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastEditedBy: string;
}
```

#### Section Interfaces
```typescript
interface CompanyPeriodSection {
  framework: string;
  company: {
    name: string;
    companyNumber: string;
    registeredOffice: Address;
    directors: Director[];
  };
  period: {
    startDate: string;
    endDate: string;
    isFirstYear: boolean;
  };
}

interface ProfitAndLossSection {
  lines: {
    turnover: number;
    costOfSales: number;
    otherIncome: number;
    adminExpenses: number;
    wages: number;
    rent: number;
    motor: number;
    professionalFees: number;
    otherExpenses: number;
    interestPayable: number;
    taxCharge: number;
  };
  comparatives?: {
    priorYearLines: ProfitAndLossLines;
  };
}

interface BalanceSheetSection {
  assets: {
    fixedAssets: FixedAssets;
    currentAssets: CurrentAssets;
  };
  liabilities: {
    creditorsWithinOneYear: Creditors;
    creditorsAfterOneYear: Creditors;
  };
  equity: {
    shareCapital: number;
    retainedEarnings: number;
    otherReserves: number;
  };
  comparatives?: {
    prior: BalanceSheetData;
  };
}
```

### API Endpoints

#### Core CRUD Operations
- `POST /accounts-sets` - Create new accounts set
- `GET /accounts-sets/:id` - Retrieve accounts set
- `PATCH /accounts-sets/:id/sections/:sectionKey` - Update specific section
- `DELETE /accounts-sets/:id` - Delete accounts set

#### Specialized Operations
- `POST /accounts-sets/:id/validate` - Run comprehensive validation
- `POST /accounts-sets/:id/outputs` - Generate HTML and PDF outputs
- `POST /accounts-sets/:id/lock` - Lock accounts for editing
- `POST /accounts-sets/:id/unlock` - Unlock accounts (admin only)
- `GET /accounts-sets/client/:clientId` - List accounts sets for client

### Frontend Components

#### Wizard Shell
```typescript
interface WizardShellProps {
  accountsSet: AccountsSet;
  currentStep: WizardStep;
  onStepChange: (step: WizardStep) => void;
  onSave: (sectionKey: string, data: any) => Promise<void>;
}
```

#### Step Components
- `CompanyPeriodStep` - Company information and period selection
- `FrameworkDisclosuresStep` - Framework selection and disclosure options
- `AccountingPoliciesStep` - Accounting policy statements
- `ProfitAndLossStep` - P&L data entry with calculations
- `BalanceSheetStep` - Balance sheet data entry with calculations
- `NotesStep` - Additional notes and disclosures
- `DirectorsApprovalStep` - Director approval and signing
- `ReviewAndOutputsStep` - Final review and output generation

## Data Models

### Storage Structure
Following M Practice Manager's file-based storage pattern:

```
storage/
├── accounts-sets/
│   ├── accounts_set_[id].json
│   └── ...
├── indexes/
│   └── accounts-sets.json
└── outputs/
    ├── html/
    │   └── accounts_[id]_[timestamp].html
    └── pdf/
        └── accounts_[id]_[timestamp].pdf
```

### Validation Schema
Each section has a corresponding JSON schema for validation:
- Structural validation using JSON Schema
- Business rule validation using custom validators
- Cross-section validation for consistency
- Balance sheet balancing validation

### Calculation Engine
Automated calculations for financial totals:

#### Profit & Loss Calculations
```typescript
const calculations = {
  grossProfit: (turnover + otherIncome) - costOfSales,
  operatingProfit: grossProfit - (adminExpenses + wages + rent + motor + professionalFees + otherExpenses),
  profitBeforeTax: operatingProfit - interestPayable,
  profitAfterTax: profitBeforeTax - taxCharge
};
```

#### Balance Sheet Calculations
```typescript
const calculations = {
  totalFixedAssets: tangibleFixedAssets + intangibleAssets + investments,
  totalCurrentAssets: stock + debtors + cash + prepayments,
  totalAssets: totalFixedAssets + totalCurrentAssets,
  totalCurrentLiabilities: tradeCreditors + taxes + accruals + directorsLoan + otherCreditors,
  totalLiabilities: totalCurrentLiabilities + creditorsAfterOneYear,
  totalEquity: shareCapital + retainedEarnings + otherReserves,
  balanceCheck: totalAssets - totalLiabilities === totalEquity
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all identified properties, several can be consolidated to eliminate redundancy:

- Properties 1.4 and 6.1 both test output generation and can be combined into a comprehensive output generation property
- Properties 3.5 and 7.1 both test autosave timing and can be combined
- Properties 7.2 and 7.5 both test autosave behavior and can be combined with the timing property
- Properties 4.1 and 4.2 test similar calculation behavior and can be combined into a comprehensive calculation property
- Properties 5.1 and 5.2 both test validation feedback and can be combined

### Core Properties

**Property 1: Accounts Set Initialization**
*For any* valid client and period information, creating an accounts set should result in a properly structured AccountsSet with correct framework, period data, and isFirstYear flag derived from historical data
**Validates: Requirements 1.1, 1.2**

**Property 2: First Year vs Subsequent Year Handling**
*For any* accounts set, the isFirstYear flag should determine UI behavior (hiding/showing comparatives), validation rules (requiring/rejecting comparatives), and output formatting (single/two column)
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

**Property 3: Wizard Navigation and State Management**
*For any* wizard step, completing required fields should mark the step complete and enable navigation, while validation errors should prevent progression and display error counts
**Validates: Requirements 3.2, 3.3, 3.4**

**Property 4: Financial Calculations**
*For any* profit and loss or balance sheet figures entered, the system should automatically calculate derived totals correctly and prevent manual editing of calculated fields, with changes reflected immediately in the UI
**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

**Property 5: Balance Sheet Validation**
*For any* complete balance sheet, the fundamental accounting equation (assets - liabilities = equity) must hold within rounding tolerance, with clear error messages showing imbalance amounts when violated
**Validates: Requirements 4.4, 5.3**

**Property 6: Comprehensive Validation**
*For any* accounts data, validation should provide immediate field-level feedback for invalid data, prevent navigation with incomplete required fields, enforce first-year vs subsequent-year rules, and require completion before allowing progression
**Validates: Requirements 1.3, 5.1, 5.2, 5.4, 5.5**

**Property 7: Output Generation and Security**
*For any* complete and validated accounts set, the system should generate both HTML and PDF outputs with MDJ branding, store them with secure URLs, provide preview and download functionality, and maintain access after locking
**Validates: Requirements 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5**

**Property 8: Autosave and Data Persistence**
*For any* data entry in the wizard, changes should be automatically saved after 750ms debounce using PATCH requests to specific sections, with all data accurately restored when returning to saved accounts sets, including proper error handling and retry functionality
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

**Property 9: Security and Audit Trail**
*For any* accounts operation, the system should verify authentication and authorization, log all modifications with timestamps and user identification, enforce locked state restrictions while maintaining read access, and protect sensitive operations through server-side processing
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

## Error Handling

### Validation Error Types
- **Field Validation**: Invalid data types, formats, or ranges
- **Business Rule Validation**: Accounting-specific rules and constraints
- **Cross-Section Validation**: Consistency between different sections
- **Balance Validation**: Fundamental accounting equation compliance

### Error Display Strategy
- **Field-level**: Immediate feedback on individual fields
- **Section-level**: Summary of errors preventing step completion
- **Global-level**: Overall validation status and blocking issues
- **Progressive**: Errors shown as user progresses through wizard

### Recovery Mechanisms
- **Autosave Recovery**: Automatic restoration of unsaved changes
- **Validation Recovery**: Clear guidance on fixing validation errors
- **Network Recovery**: Retry mechanisms for failed API calls
- **State Recovery**: Preservation of wizard state across sessions

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit testing and property-based testing to ensure comprehensive coverage:

#### Unit Testing
Unit tests verify specific examples, edge cases, and integration points:
- Specific calculation examples with known inputs and outputs
- Edge cases like empty data, boundary values, and error conditions
- Integration between wizard steps and API endpoints
- Template rendering with sample data
- Authentication and authorization scenarios

#### Property-Based Testing
Property-based tests verify universal properties across all inputs using **fast-check** library:
- Each property-based test runs a minimum of 100 iterations
- Tests generate random valid inputs to verify properties hold universally
- Each test is tagged with the format: `**Feature: accounts-production-wizard, Property {number}: {property_text}**`
- Properties test general correctness that should hold regardless of specific input values

#### Test Configuration
- Property-based testing library: **fast-check** for TypeScript/JavaScript
- Minimum iterations per property test: **100**
- Test tagging format: `**Feature: accounts-production-wizard, Property {number}: {property_text}**`
- Each correctness property maps to exactly one property-based test

### Test Coverage Requirements
- Unit tests cover specific examples and integration scenarios
- Property tests verify universal correctness properties
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness
- All correctness properties must be implemented as property-based tests
- Critical business logic must have both unit and property test coverage