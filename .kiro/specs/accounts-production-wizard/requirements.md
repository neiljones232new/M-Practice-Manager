# Requirements Document

## Introduction

The Accounts Production Wizard is a comprehensive tool within M Practice Manager that enables accounting professionals to create statutory accounts for UK companies. The system supports micro-entity accounts (FRS 105) with the ability to handle both first-year accounts (single period) and subsequent-year accounts (current + prior period comparatives). The wizard produces MDJ-branded HTML and PDF statutory accounts suitable for professional practice use.

## Glossary

- **AccountsSet**: A complete set of statutory accounts data for a specific company and accounting period
- **Framework**: The accounting standard used (MICRO_FRS105, SMALL_FRS102_1A, DORMANT)
- **isFirstYear**: A system-derived flag indicating whether this is the company's first set of accounts
- **Comparatives**: Prior period financial data required for subsequent-year accounts
- **Wizard Step**: Individual sections of the accounts creation process
- **Balance Sheet**: Statement of financial position showing assets, liabilities, and equity
- **Profit and Loss**: Statement showing income and expenses for the period
- **Directors Approval**: Formal approval and signing of the accounts by company directors
- **MDJ Practice Manager**: The host application containing the accounts production wizard

## Requirements

### Requirement 1

**User Story:** As an accounting professional, I want to create statutory accounts for UK companies, so that I can fulfill my clients' legal filing requirements and provide professional accounting services.

#### Acceptance Criteria

1. WHEN I start a new accounts set, THE AccountsSet SHALL be created with the correct framework and period information
2. WHEN I select a company, THE system SHALL automatically determine if this is the first year of accounts based on historical data
3. WHEN I complete all required sections, THE system SHALL validate the accounts for completeness and accuracy
4. WHEN validation passes and directors approve, THE system SHALL generate HTML and PDF statutory accounts
5. WHEN accounts are generated, THE system SHALL apply MDJ branding and professional formatting

### Requirement 2

**User Story:** As an accounting professional, I want the system to handle first-year and subsequent-year accounts differently, so that the accounts comply with UK accounting standards and presentation requirements.

#### Acceptance Criteria

1. WHEN creating first-year accounts, THE system SHALL hide comparative columns and fields throughout the wizard
2. WHEN creating subsequent-year accounts, THE system SHALL require and display prior period comparatives
3. WHEN generating first-year accounts, THE system SHALL use single-column presentation with "period ended" wording
4. WHEN generating subsequent-year accounts, THE system SHALL use two-column presentation with "year ended" wording
5. WHEN determining account type, THE system SHALL derive isFirstYear automatically without user input

### Requirement 3

**User Story:** As an accounting professional, I want to work through a structured wizard process, so that I can systematically complete all required sections of the statutory accounts.

#### Acceptance Criteria

1. WHEN I access the wizard, THE system SHALL present eight sequential steps in locked order
2. WHEN I complete a step, THE system SHALL mark it as complete and enable the next step
3. WHEN a step has validation errors, THE system SHALL display error counts and prevent progression
4. WHEN I navigate between steps, THE system SHALL preserve my progress and validate current step data
5. WHEN I save data, THE system SHALL autosave with debounced input after 750ms

### Requirement 4

**User Story:** As an accounting professional, I want the system to automatically calculate financial totals, so that I can focus on data entry without manual arithmetic and ensure accuracy.

#### Acceptance Criteria

1. WHEN I enter profit and loss figures, THE system SHALL calculate gross profit, operating profit, and profit after tax automatically
2. WHEN I enter balance sheet figures, THE system SHALL calculate asset totals, liability totals, and equity totals automatically
3. WHEN calculated totals are displayed, THE system SHALL prevent manual editing of these derived values
4. WHEN balance sheet is complete, THE system SHALL validate that assets minus liabilities equals equity
5. WHEN calculations update, THE system SHALL reflect changes immediately in the user interface

### Requirement 5

**User Story:** As an accounting professional, I want comprehensive validation throughout the wizard, so that I can identify and correct errors before generating final accounts.

#### Acceptance Criteria

1. WHEN I enter invalid data, THE system SHALL display field-level validation errors immediately
2. WHEN I attempt to progress with incomplete data, THE system SHALL prevent navigation and highlight missing fields
3. WHEN balance sheet figures don't balance, THE system SHALL display a clear error message with the imbalance amount
4. WHEN first-year accounts include comparative data, THE system SHALL reject the data as invalid
5. WHEN subsequent-year accounts lack comparative data, THE system SHALL require completion before allowing progression

### Requirement 6

**User Story:** As an accounting professional, I want to generate professional statutory accounts outputs, so that I can provide clients with compliant filing documents.

#### Acceptance Criteria

1. WHEN accounts are complete and validated, THE system SHALL generate HTML statutory accounts with MDJ branding
2. WHEN HTML generation completes, THE system SHALL generate PDF statutory accounts from the HTML template
3. WHEN outputs are generated, THE system SHALL store secure URLs for both HTML and PDF versions
4. WHEN displaying outputs, THE system SHALL provide preview functionality and download links
5. WHEN accounts are locked, THE system SHALL prevent further editing while preserving output access

### Requirement 7

**User Story:** As an accounting professional, I want proper data persistence and recovery, so that my work is protected and I can resume editing sessions reliably.

#### Acceptance Criteria

1. WHEN I enter data in any field, THE system SHALL autosave changes after a 750ms debounce period
2. WHEN autosave occurs, THE system SHALL use PATCH requests to update specific sections without affecting other data
3. WHEN I return to a saved accounts set, THE system SHALL restore all previously entered data accurately
4. WHEN save operations fail, THE system SHALL display clear error messages and provide retry functionality
5. WHEN I navigate away during editing, THE system SHALL preserve unsaved changes through autosave

### Requirement 8

**User Story:** As an accounting professional, I want secure access control and audit trails, so that client data remains protected and changes are traceable.

#### Acceptance Criteria

1. WHEN I access accounts data, THE system SHALL verify my authentication and authorization
2. WHEN I make changes to accounts, THE system SHALL log the modification with timestamp and user identification
3. WHEN accounts are locked, THE system SHALL prevent all editing while maintaining read access
4. WHEN generating outputs, THE system SHALL use server-side processing to protect sensitive operations
5. WHEN storing outputs, THE system SHALL provide secure URLs that require authentication to access
