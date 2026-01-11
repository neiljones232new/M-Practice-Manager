# Implementation Plan

- [x] 1. Install dependencies and setup template infrastructure
  - Install `handlebars` and `puppeteer` packages
  - Create templates directory structure at `apps/api/src/modules/documents/templates/`
  - Configure TypeScript to include template files in build output
  - _Requirements: 9.1, 9.2_

- [x] 2. Create HTML template file
- [x] 2.1 Create base HTML structure with embedded CSS
  - Create `apps/api/src/modules/documents/templates/client-report.hbs` file
  - Implement fixed header with MDJ branding and contact information
  - Implement fixed footer with signature
  - Add embedded CSS with all styling from requirements (colors, fonts, layout)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2.2 Implement template sections with Handlebars variables
  - Add Company Overview section with grid layout for client data fields
  - Add Key Contacts & Parties section
  - Add Active Services section with table
  - Add Upcoming Tasks section with table
  - Add Companies House Data section with directors, PSC, and filing history
  - Add Compliance Summary section
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.3 Add Handlebars iteration blocks for collections
  - Implement `{{#each services}}` block for services table
  - Implement `{{#each tasks}}` block for tasks table
  - Implement `{{#each filings}}` block for filing history table
  - _Requirements: 7.2_

- [x] 3. Update Reports Service with template rendering
- [x] 3.1 Add template data interfaces
  - Create `TemplateData` interface with all template variables
  - Create `ServiceData`, `TaskData`, `FilingData` interfaces for collections
  - Add interfaces to reports.service.ts
  - _Requirements: 7.1_

- [x] 3.2 Implement template loading and caching
  - Create `loadTemplate()` method to read and compile Handlebars templates
  - Implement template caching with Map to improve performance
  - Add error handling for missing templates
  - Register custom Handlebars helpers (formatCurrency, formatDate, defaultValue)
  - _Requirements: 9.2, 9.3, 9.4_

- [x] 3.3 Implement data transformation method
  - Create `transformDataForTemplate()` method to convert ClientReportData to TemplateData
  - Implement date formatting to DD/MM/YYYY format
  - Handle null/undefined values with "N/A" defaults
  - Format currency values with £ symbol
  - Join array values into comma-separated strings for directors, PSC, parties
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 3.4 Implement HTML generation method
  - Create `generateClientReportHTML()` method
  - Reuse existing `gatherReportData()` for data collection
  - Transform data using `transformDataForTemplate()`
  - Load and render template with Handlebars
  - Return HTML string
  - Add error handling and logging
  - _Requirements: 8.1, 9.5_

- [x] 3.5 Implement PDF generation from HTML
  - Create `generateClientReportPDF()` method
  - Generate HTML using `generateClientReportHTML()`
  - Launch Puppeteer browser instance
  - Load HTML content with `page.setContent()`
  - Configure PDF options (A4 format, margins, print background graphics)
  - Generate and return PDF buffer
  - Close browser instance
  - Add error handling for PDF generation failures
  - _Requirements: 8.2, 8.3_

- [x] 4. Update Documents Controller with new endpoints
- [x] 4.1 Add HTML report endpoint
  - Create `GET /documents/reports/client/:clientId/html` endpoint
  - Call `generateClientReportHTML()` from reports service
  - Set Content-Type header to 'text/html'
  - Return HTML response
  - _Requirements: 8.1_

- [x] 4.2 Update preview endpoint to return HTML
  - Modify existing `GET /documents/reports/client/:clientId/preview` endpoint
  - Change to return HTML instead of PDF
  - Set Content-Disposition to 'inline' for browser viewing
  - Parse query parameters for report options
  - _Requirements: 8.4_

- [x] 4.3 Update PDF download endpoint
  - Modify existing `POST /documents/reports/client/:clientId` endpoint
  - Update to use new `generateClientReportPDF()` method
  - Maintain existing Content-Type and Content-Disposition headers
  - Ensure backward compatibility with existing API consumers
  - _Requirements: 8.5_

- [x] 5. Add logo asset to template directory
  - Add MDJ Consultants logo image file to templates directory
  - Embed logo as base64 data URI in HTML template OR reference from public assets
  - Position logo in header section with appropriate sizing
  - _Requirements: 1.2_

- [x] 6. Update module configuration
  - Ensure DocumentsModule imports all required dependencies
  - Verify ReportsService is properly exported
  - Update any dependency injection configurations
  - _Requirements: 9.1_

- [x] 7. Write unit tests for Reports Service
  - Test template loading and compilation
  - Test data transformation with valid data
  - Test data transformation with null/missing values
  - Test date formatting helper
  - Test HTML generation
  - Test PDF generation
  - Test error handling for missing templates
  - Test error handling for PDF generation failures
  - _Requirements: All_

- [ ] 8. Write integration tests for Documents Controller
  - Test GET /documents/reports/client/:id/html endpoint
  - Test GET /documents/reports/client/:id/preview endpoint returns HTML
  - Test POST /documents/reports/client/:id endpoint returns PDF
  - Test report generation with various option combinations
  - Test error responses for invalid client IDs
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Update existing tests
  - Update reports.service.spec.ts to work with new HTML-based approach
  - Update documents.controller.spec.ts for new endpoint behaviors
  - Ensure all existing tests pass with new implementation
  - _Requirements: All_

- [x] 10. Documentation and cleanup
  - Update API documentation with new endpoints
  - Add JSDoc comments to new methods
  - Remove or deprecate old pdfmake-based code if no longer needed
  - Update README with new report generation approach
  - _Requirements: All_
