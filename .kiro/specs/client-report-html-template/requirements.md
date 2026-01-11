# Requirements Document

## Introduction

This feature updates the client report generation system from the current PDF-based approach to use a modern HTML template with improved visual design. The new template includes the MDJ practice logo, enhanced typography with larger company names, fixed header/footer sections, and a professional card-based layout. The system will support both HTML preview in browsers and PDF export functionality.

## Glossary

- **Report System**: The backend service responsible for generating client reports
- **HTML Template**: A reusable HTML document structure with placeholders for dynamic data
- **Client Report**: A comprehensive document containing client information, services, parties, Companies House data, and compliance information
- **Template Engine**: The system used to populate HTML templates with dynamic data (Handlebars)
- **MDJ Practice**: MDJ Consultants Ltd, the accounting practice using this system

## Requirements

### Requirement 1

**User Story:** As a practice manager, I want client reports to display with a modern, professional HTML template, so that reports are visually appealing and consistent with our brand identity.

#### Acceptance Criteria

1. WHEN THE Report System generates a client report, THE Report System SHALL render the report using an HTML template with fixed header and footer sections
2. THE Report System SHALL include the MDJ Consultants Ltd logo in the header section
3. THE Report System SHALL display the company name in a larger, prominent font size in the header
4. THE Report System SHALL apply the brand color (#d7a54b gold) to header borders and section accents
5. THE Report System SHALL use a light gray background (#f4f4f6) for the page and darker gray (#e9eaec) for section cards

### Requirement 2

**User Story:** As a practice manager, I want the report header to contain practice contact information and report metadata, so that recipients can easily identify the report source and context.

#### Acceptance Criteria

1. THE Report System SHALL display "MDJ Consultants Ltd — 8b Slate Lane, Audenshaw, Manchester, M34 5GW" in the fixed header
2. THE Report System SHALL display contact information "Tel: 07713 697615 | mdjteam.co.uk" in the fixed header
3. THE Report System SHALL display the report title with client name, client reference, and generation date in the format "COMPANY REPORT — {{companyName}} ({{clientRef}}) | Generated {{generatedDate}}"
4. THE Report System SHALL fix the header to the top of the viewport WHILE the user scrolls the report
5. THE Report System SHALL apply a 3px gold border (#d7a54b) to the bottom of the header

### Requirement 3

**User Story:** As a practice manager, I want the report to display comprehensive client information in organized sections, so that all relevant data is easy to locate and review.

#### Acceptance Criteria

1. THE Report System SHALL display a "Company Overview" section containing client reference, company number, type, portfolio, status, UTR, incorporation date, accounts dates, confirmation statement dates, email, phone, and address
2. THE Report System SHALL display a "Key Contacts & Parties" section containing primary contact, responsible manager, and other parties
3. THE Report System SHALL display an "Active Services" section with a table showing service name, frequency, fee, next due date, and status
4. THE Report System SHALL display an "Upcoming Tasks" section with a table showing task title, status, and due date
5. THE Report System SHALL display a "Companies House Data" section containing directors, PSC information, and filing history table

### Requirement 4

**User Story:** As a practice manager, I want the report to use a responsive grid layout for information display, so that data is organized efficiently and adapts to different screen sizes.

#### Acceptance Criteria

1. THE Report System SHALL use a CSS grid layout with auto-fit columns (minimum 220px) for displaying key-value pairs in information sections
2. THE Report System SHALL apply consistent spacing (0.4rem vertical gap, 1rem horizontal gap) between grid items
3. THE Report System SHALL display labels in bold font weight (600) to distinguish them from values
4. THE Report System SHALL apply rounded corners (8px border-radius) to section cards
5. THE Report System SHALL apply subtle shadows (0 1px 3px rgba(0,0,0,0.08)) to section cards

### Requirement 5

**User Story:** As a practice manager, I want tables in the report to have clear styling and readability, so that tabular data is easy to scan and understand.

#### Acceptance Criteria

1. THE Report System SHALL style table headers with a light gray background (#f0f0f0) and bold font weight
2. THE Report System SHALL apply alternating row colors (white and #fafafa) to table rows for improved readability
3. THE Report System SHALL apply compact padding (6px 8px) to table cells
4. THE Report System SHALL apply rounded corners (6px) to tables with overflow hidden
5. THE Report System SHALL apply a subtle shadow (0 1px 2px rgba(0,0,0,0.05)) to tables

### Requirement 6

**User Story:** As a practice manager, I want the report footer to display practice branding and signature, so that reports appear official and professionally signed.

#### Acceptance Criteria

1. THE Report System SHALL display a fixed footer at the bottom of the viewport
2. THE Report System SHALL display "Prepared by MDJ Consultants Ltd — Confidential Report" in the footer
3. THE Report System SHALL display "Signed electronically by Neil Jones" in the footer
4. THE Report System SHALL apply a 2px gold border (#d7a54b) to the top of the footer
5. THE Report System SHALL fix the footer to the bottom of the viewport WHILE the user scrolls the report

### Requirement 7

**User Story:** As a practice manager, I want the report to support dynamic data population using template variables, so that reports can be generated for any client with their specific data.

#### Acceptance Criteria

1. THE Report System SHALL use Handlebars template syntax for variable substitution ({{variableName}})
2. THE Report System SHALL support iteration over collections using {{#each}} syntax for services, tasks, and filing history
3. THE Report System SHALL populate all client data fields from the database into the template
4. THE Report System SHALL format dates in DD/MM/YYYY format for display
5. THE Report System SHALL handle missing or null data by displaying "N/A" or empty strings

### Requirement 8

**User Story:** As a practice manager, I want to view the HTML report in a browser and optionally export it to PDF, so that I have flexibility in how I share and archive reports.

#### Acceptance Criteria

1. THE Report System SHALL provide an API endpoint that returns the rendered HTML report
2. THE Report System SHALL provide an API endpoint that converts the HTML report to PDF format
3. WHEN a user requests a PDF export, THE Report System SHALL maintain the visual styling and layout from the HTML version
4. THE Report System SHALL set appropriate HTTP headers for inline viewing (Content-Disposition: inline) for HTML preview
5. THE Report System SHALL set appropriate HTTP headers for download (Content-Disposition: attachment) for PDF export

### Requirement 9

**User Story:** As a developer, I want the HTML template to be stored as a separate file, so that it can be easily maintained and updated without modifying service code.

#### Acceptance Criteria

1. THE Report System SHALL store the HTML template in a dedicated templates directory
2. THE Report System SHALL load the template file at runtime when generating reports
3. THE Report System SHALL support template caching to improve performance
4. THE Report System SHALL log errors IF the template file cannot be loaded
5. THE Report System SHALL provide a fallback mechanism IF the template is missing or invalid
