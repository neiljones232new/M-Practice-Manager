# Implementation Plan

- [x] 1. Set up templates module structure and core interfaces
  - Create templates module directory structure
  - Define TypeScript interfaces for Template, GeneratedLetter, and related types
  - Set up module dependencies and imports
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 2. Implement template storage and management service
  - [x] 2.1 Create TemplatesService with CRUD operations
    - Implement getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate methods
    - Add template filtering and search functionality
    - Integrate with FileStorageService for template file management
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2_

  - [x] 2.2 Initialize template storage directory
    - Create mdj-data/templates directory structure
    - Copy existing templates from MDJ_Template_Pack_Branded
    - Set up template metadata storage
    - _Requirements: 6.1_

  - [x] 2.3 Implement template versioning
    - Add version tracking to template metadata
    - Maintain template change history
    - Support rollback to previous versions
    - _Requirements: 6.5_

- [x] 3. Implement template parsing and placeholder extraction
  - [x] 3.1 Create TemplateParserService
    - Implement parseTemplate method for DOCX and MD formats
    - Extract placeholders using regex patterns
    - Validate template syntax and structure
    - _Requirements: 2.1, 6.3_

  - [x] 3.2 Implement placeholder detection logic
    - Support simple placeholders: {{key}}
    - Support formatted placeholders: {{type:key:format}}
    - Support conditional placeholders: {{if:condition}}...{{endif}}
    - Support list placeholders: {{list:key}}...{{endlist}}
    - _Requirements: 2.1, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 3.3 Create placeholder metadata extraction
    - Determine placeholder type from syntax
    - Identify required vs optional placeholders
    - Map placeholders to data sources
    - _Requirements: 2.1, 2.4_

- [x] 4. Implement placeholder resolution and data mapping
  - [x] 4.1 Create PlaceholderService
    - Implement resolvePlaceholders method
    - Create getClientData method to fetch client information
    - Create getServiceData method to fetch service information
    - _Requirements: 2.2, 11.2_

  - [x] 4.2 Implement data source integration
    - Integrate with ClientsService for client data
    - Integrate with ServicesService for service data
    - Support system data (current date, user info, etc.)
    - _Requirements: 2.2, 11.2_

  - [x] 4.3 Implement value formatting
    - Format dates according to UK standards (DD/MM/YYYY)
    - Format currency with £ symbol and 2 decimal places
    - Format addresses as multi-line text
    - Format phone numbers and emails
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 4.4 Implement placeholder validation
    - Validate required fields are present
    - Validate data types match placeholder types
    - Validate format constraints
    - _Requirements: 3.3, 2.4_

- [x] 5. Implement document generation service
  - [x] 5.1 Create DocumentGeneratorService
    - Implement populateTemplate method to replace placeholders
    - Handle conditional content rendering
    - Handle list rendering
    - _Requirements: 2.3, 2.6, 9.4, 9.5_

  - [x] 5.2 Implement PDF generation
    - Set up PDF generation library (puppeteer or pdfkit)
    - Convert populated template to PDF format
    - Apply MDJ branding and styling
    - _Requirements: 2.6, 8.1_

  - [x] 5.3 Implement DOCX generation
    - Set up DOCX generation library (docxtemplater)
    - Convert populated template to DOCX format
    - Preserve formatting and styling
    - _Requirements: 2.6, 8.1_

- [x] 6. Implement letter generation orchestration service
  - [x] 6.1 Create LetterGenerationService
    - Implement generateLetter method
    - Orchestrate template retrieval, placeholder resolution, and document generation
    - Handle error cases and validation failures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 6.2 Implement preview functionality
    - Create previewLetter method
    - Generate HTML preview of populated template
    - Support real-time preview updates
    - _Requirements: 2.5, 3.4_

  - [x] 6.3 Implement document saving
    - Save generated documents to Documents module
    - Associate documents with client and service
    - Set appropriate tags and metadata
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.4 Create GeneratedLetter records
    - Store letter generation metadata
    - Link to template and document
    - Track placeholder values used
    - _Requirements: 4.5, 5.1, 5.2_

- [x] 7. Implement bulk letter generation
  - [x] 7.1 Create bulk generation method
    - Implement bulkGenerateLetter in LetterGenerationService
    - Process multiple clients sequentially
    - Track progress and errors
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.2 Implement error handling for bulk operations
    - Skip clients with missing required data
    - Log errors with client details
    - Generate summary report
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 7.3 Implement ZIP file generation
    - Bundle multiple documents into ZIP
    - Generate descriptive filenames
    - Support download of bulk results
    - _Requirements: 8.4_

- [x] 8. Implement templates API controller
  - [x] 8.1 Create TemplatesController
    - Implement GET /templates endpoint
    - Implement GET /templates/:id endpoint
    - Implement POST /templates endpoint (admin only)
    - Implement PUT /templates/:id endpoint (admin only)
    - Implement DELETE /templates/:id endpoint (admin only)
    - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.4, 6.6_

  - [x] 8.2 Implement template search and filtering
    - Add GET /templates/search endpoint
    - Support filtering by category
    - Support text search
    - _Requirements: 1.3, 1.4_

  - [x] 8.3 Implement template preview endpoint
    - Add GET /templates/:id/preview endpoint
    - Return template content with placeholder info
    - _Requirements: 1.5_

- [x] 9. Implement letter generation API controller
  - [x] 9.1 Create letter generation endpoints
    - Implement POST /letters/generate endpoint
    - Implement POST /letters/generate/bulk endpoint
    - Implement POST /letters/preview endpoint
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 7.1_

  - [x] 9.2 Implement letter history endpoints
    - Add GET /letters endpoint with filtering
    - Add GET /letters/:id endpoint
    - Add GET /letters/client/:clientId endpoint
    - Add GET /letters/service/:serviceId endpoint
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 11.4_

  - [x] 9.3 Implement download endpoints
    - Add GET /letters/:id/download endpoint
    - Support format parameter (PDF or DOCX)
    - Track download count and timestamp
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 9.4 Implement search endpoint
    - Add GET /letters/search endpoint
    - Support search by client, template, date range, content
    - Return ranked results
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 10. Create templates library UI page
  - [x] 10.1 Create templates list page
    - Display templates grouped by category
    - Show template metadata (name, description, last modified)
    - Implement search and filter functionality
    - Add "Generate Letter" button for each template
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 10.2 Create template detail page
    - Display full template information
    - Show placeholder list with descriptions
    - Show template preview
    - Add "Use Template" button
    - _Requirements: 1.5_

  - [ ]* 10.3 Create template management UI (admin)
    - Add template upload form
    - Add template edit form
    - Add template activation toggle
    - Show template version history
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 11. Create letter generation wizard UI
  - [x] 11.1 Create template selection step
    - Display available templates
    - Allow template search and filtering
    - Show template preview on selection
    - _Requirements: 1.1, 1.3_

  - [x] 11.2 Create client selection step
    - Display client selector dropdown
    - Support client search
    - Show selected client information
    - Add optional service selector
    - _Requirements: 2.1, 11.1_

  - [x] 11.3 Create placeholder form step
    - Display form with all placeholders
    - Auto-populate fields from client/service data
    - Allow manual editing of all fields
    - Show validation errors
    - Implement real-time preview
    - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 11.4 Create preview and generate step
    - Display formatted preview of letter
    - Show format selection (PDF, DOCX, or both)
    - Add "Generate" button
    - Show generation progress
    - _Requirements: 2.5, 2.6, 8.1_

  - [x] 11.5 Create download and completion step
    - Display success message
    - Show download buttons for each format
    - Add "Generate Another" button
    - Show link to letter history
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 12. Create bulk generation UI
  - [x] 12.1 Create bulk generation page
    - Add template selector
    - Add multi-client selector with checkboxes
    - Show selected client count
    - Add optional service selector
    - _Requirements: 7.1_

  - [x] 12.2 Implement bulk generation progress
    - Show progress bar during generation
    - Display current client being processed
    - Show success/error count
    - _Requirements: 7.3, 7.4_

  - [x] 12.3 Create bulk results page
    - Display summary report
    - Show successful generations
    - Show failed generations with reasons
    - Add download ZIP button
    - _Requirements: 7.5, 7.6, 8.4_

- [x] 13. Create letter history UI
  - [x] 13.1 Add letters tab to client detail page
    - Display list of letters for client
    - Show template name, date, generated by
    - Add filter by template type
    - Add filter by date range
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 13.2 Implement letter actions
    - Add download button for each letter
    - Add preview button
    - Show download count
    - _Requirements: 5.3, 8.1_

  - [x] 13.3 Add letters tab to service detail page
    - Display letters associated with service
    - Show same information as client letters tab
    - _Requirements: 11.4, 11.5_

- [x] 14. Create global letter search UI
  - [x] 14.1 Create letters search page
    - Add search input with filters
    - Support search by client name, template, date range
    - Display search results with relevance ranking
    - Show client name, template, date, snippet
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 14.2 Implement search result actions
    - Add download button for each result
    - Add preview button
    - Add "View Client" link
    - _Requirements: 10.5_

- [x] 15. Implement template initialization script
  - [x] 15.1 Create migration script
    - Parse existing templates from MDJ_Template_Pack_Branded
    - Extract placeholders from each template
    - Create template metadata records
    - Store templates in new structure
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 15.2 Create default template categories
    - Set up category structure
    - Assign templates to appropriate categories
    - Mark all templates as active
    - _Requirements: 1.1, 1.4_

- [x] 16. Add integration with existing modules
  - [x] 16.1 Extend Documents module
    - Add CORRESPONDENCE category if not exists
    - Support template-generated document metadata
    - Link generated letters to documents
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 16.2 Extend Clients module
    - Add method to get client placeholder data
    - Include all relevant client fields
    - Include primary contact information
    - _Requirements: 2.2_

  - [x] 16.3 Extend Services module
    - Add method to get service placeholder data
    - Include service details and dates
    - Include fee information
    - _Requirements: 11.2, 11.3_

- [x] 17. Implement security and access control
  - [x] 17.1 Add authentication guards
    - Require JWT authentication for all endpoints
    - Implement portfolio-based access control
    - Restrict template management to admin role
    - _Requirements: All_

  - [x] 17.2 Implement data validation
    - Validate all user inputs
    - Sanitize placeholder values
    - Prevent template injection
    - _Requirements: 3.3, 2.4_

  - [x] 17.3 Add audit logging
    - Log all letter generations
    - Log template modifications
    - Track user actions
    - _Requirements: 4.5, 5.1_

- [x] 18. Add error handling and validation
  - [x] 18.1 Implement comprehensive error handling
    - Handle template not found errors
    - Handle client/service not found errors
    - Handle generation failures gracefully
    - Return user-friendly error messages
    - _Requirements: All_

  - [x] 18.2 Add input validation
    - Validate template uploads
    - Validate placeholder values
    - Validate file formats
    - _Requirements: 6.4, 3.3_

- [ ]* 19. Write unit tests
  - [ ]* 19.1 Test TemplateParserService
    - Test placeholder extraction
    - Test template validation
    - Test error handling
    - _Requirements: 2.1, 6.3, 6.4_

  - [ ]* 19.2 Test PlaceholderService
    - Test data resolution
    - Test value formatting
    - Test validation logic
    - _Requirements: 2.2, 9.1, 9.2, 9.3_

  - [x] 19.3 Test LetterGenerationService
    - Test single letter generation
    - Test bulk generation
    - Test error scenarios
    - _Requirements: 2.6, 7.1, 7.2_

  - [x] 19.4 Test DocumentGeneratorService
    - Test PDF generation
    - Test DOCX generation
    - Test template population
    - _Requirements: 2.6, 8.1_

- [ ]* 20. Write integration tests
  - [ ]* 20.1 Test end-to-end letter generation
    - Test complete generation flow
    - Test with real client data
    - Test with missing optional fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 20.2 Test bulk generation
    - Test multiple client generation
    - Test error handling
    - Test ZIP creation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 20.3 Test template management
    - Test template upload
    - Test template update
    - Test template deletion
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
