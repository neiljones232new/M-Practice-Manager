# Implementation Plan

- [x] 1. Set up backend module structure and core interfaces
  - Create AccountsProductionModule with controller, service, and DTOs
  - Define TypeScript interfaces for AccountsSet and all section types
  - Set up file-based storage structure following existing patterns
  - Configure module imports and exports in app.module.ts
  - Import and integrate with existing CompaniesHouseModule for data population
  - _Requirements: 1.1, 1.2_

- [ ]* 1.1 Write property test for accounts set initialization
  - **Property 1: Accounts Set Initialization**
  - **Validates: Requirements 1.1, 1.2**

- [x] 2. Implement core AccountsSet CRUD operations with Companies House integration
  - Create POST /accounts-sets endpoint with client lookup and isFirstYear derivation
  - Integrate Companies House API calls to automatically populate company information
  - Use existing CompaniesHouseService to fetch director details and company data
  - Implement GET /accounts-sets/:id with full data retrieval
  - Build PATCH /accounts-sets/:id/sections/:sectionKey for section updates
  - Add DELETE /accounts-sets/:id with proper cleanup
  - _Requirements: 1.1, 7.2, 7.3_

- [ ]* 2.1 Write property test for first year vs subsequent year handling
  - **Property 2: First Year vs Subsequent Year Handling**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 3. Build comprehensive validation system
  - Implement JSON schema validation for each section type
  - Create custom validators for business rules (balance sheet balancing, etc.)
  - Build cross-section validation for first-year vs subsequent-year rules
  - Add POST /accounts-sets/:id/validate endpoint with detailed error reporting
  - _Requirements: 1.3, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 3.1 Write property test for comprehensive validation
  - **Property 6: Comprehensive Validation**
  - **Validates: Requirements 1.3, 5.1, 5.2, 5.4, 5.5**

- [ ]* 3.2 Write property test for balance sheet validation
  - **Property 5: Balance Sheet Validation**
  - **Validates: Requirements 4.4, 5.3**

- [x] 4. Implement financial calculation engine
  - Build profit and loss calculation functions (gross profit, operating profit, etc.)
  - Create balance sheet calculation functions (asset totals, liability totals, etc.)
  - Implement real-time calculation updates in API responses
  - Add validation to prevent manual editing of calculated fields
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ]* 4.1 Write property test for financial calculations
  - **Property 4: Financial Calculations**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**

- [x] 5. Create output generation system
  - Build Handlebars templates for statutory accounts (HTML)
  - Implement template branching logic for first-year vs subsequent-year accounts
  - Create PDF generation using existing Puppeteer infrastructure
  - Add POST /accounts-sets/:id/outputs endpoint with secure URL generation
  - _Requirements: 1.4, 1.5, 6.1, 6.2, 6.3_

- [ ]* 5.1 Write property test for output generation and security
  - **Property 7: Output Generation and Security**
  - **Validates: Requirements 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5**

- [x] 6. Implement locking and security features
  - Add POST /accounts-sets/:id/lock endpoint with status management
  - Implement authentication and authorization checks on all endpoints
  - Create audit logging for all modifications using existing audit module
  - Add secure URL generation and access control for outputs
  - _Requirements: 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 6.1 Write property test for security and audit trail
  - **Property 9: Security and Audit Trail**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 7. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create frontend wizard shell and routing
  - Create /accounts-production/[id] page following existing client detail patterns
  - Build WizardShell component with step navigation and progress tracking
  - Implement step validation and navigation controls
  - Add autosave functionality with 750ms debounce
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.5_

- [ ]* 8.1 Write property test for wizard navigation and state management
  - **Property 3: Wizard Navigation and State Management**
  - **Validates: Requirements 3.2, 3.3, 3.4**

- [ ]* 8.2 Write property test for autosave and data persistence
  - **Property 8: Autosave and Data Persistence**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 9. Build individual wizard step components
  - Create CompanyPeriodStep with company information and period selection
  - Build FrameworkDisclosuresStep with framework options and disclosures
  - Implement AccountingPoliciesStep with policy text areas and options
  - Add ProfitAndLossStep with financial input fields and real-time calculations
  - _Requirements: 3.1, 4.1, 4.3, 4.5_

- [ ] 10. Complete remaining wizard steps
  - Create BalanceSheetStep with asset, liability, and equity inputs
  - Build NotesStep with additional disclosures and notes
  - Implement DirectorsApprovalStep with approval workflow
  - Add ReviewAndOutputsStep with validation summary and output generation
  - _Requirements: 3.1, 4.2, 4.3, 4.4, 6.4_

- [ ] 11. Implement conditional UI logic for first-year vs subsequent-year
  - Add conditional rendering to hide/show comparative fields based on isFirstYear
  - Implement different validation rules and error messages for each account type
  - Create responsive layouts that adapt to single-column vs two-column presentation
  - Add appropriate wording changes ("period ended" vs "year ended")
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 12. Build output preview and download functionality
  - Create output preview components for HTML display
  - Implement secure download links for PDF files
  - Add output status tracking and regeneration capabilities
  - Build output management interface with preview and download options
  - _Requirements: 6.3, 6.4, 6.5_

- [ ] 13. Add comprehensive error handling and user feedback
  - Implement field-level validation with immediate feedback
  - Create section-level error summaries and navigation blocking
  - Add global validation status and error count displays
  - Build retry mechanisms for failed API calls and network issues
  - _Requirements: 5.1, 5.2, 7.4_

- [ ] 14. Integrate with existing M Practice Manager features and Companies House API
  - Connect with clients module for company data lookup and automatic population
  - Integrate with Companies House API to fetch and populate company details automatically
  - Use existing Companies House module to sync director information and company data
  - Integrate with file storage module for secure output storage
  - Add navigation links from client detail pages to accounts production
  - Implement breadcrumb navigation and consistent UI styling
  - _Requirements: 1.1, 1.2, 6.3, 8.4_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.