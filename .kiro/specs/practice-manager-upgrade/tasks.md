# Implementation Plan

- [x] 1. Set up database infrastructure and migration system
  - Create SQLite database schema with proper tables for clients, tax calculations, scenarios, and reports
  - Implement TypeScript DatabaseManager class based on Client List architecture
  - Set up database connection pooling and transaction management
  - Create migration scripts to move from JSON storage to SQLite
  - _Requirements: 2.1, 2.2, 6.3_

- [x] 1.1 Write property test for database operation consistency
  - **Property 4: Database Operation Consistency**
  - **Validates: Requirements 2.3, 2.4**

- [x] 1.2 Write property test for data migration integrity
  - **Property 5: Data Migration Integrity**
  - **Validates: Requirements 2.2, 6.2, 6.4**

- [x] 2. Integrate M Powered Tax Engine from v2
  - Port the comprehensive TaxCalculationsService from M Practice Manager v2
  - Implement salary optimization algorithms with marginal relief calculations
  - Create tax rates service with current HMRC rates and thresholds
  - Set up tax scenario generation and comparison logic
  - _Requirements: 1.1, 1.2, 5.1, 5.2_

- [x] 2.1 Write property test for tax calculation mathematical accuracy
  - **Property 1: Tax Calculation Mathematical Accuracy**
  - **Validates: Requirements 1.1, 5.1, 5.2**

- [ ]* 2.2 Write property test for tax scenario comparison consistency
  - **Property 2: Tax Scenario Comparison Consistency**
  - **Validates: Requirements 1.2, 5.3**

- [ ]* 2.3 Write property test for tax calculation display completeness
  - **Property 3: Tax Calculation Display Completeness**
  - **Validates: Requirements 1.5**

- [x] 3. Implement enhanced tax calculation persistence
  - Create tax calculation storage using SQLite instead of JSON files
  - Implement calculation history retrieval with proper indexing
  - Set up tax scenario storage in relational format
  - Create calculation result formatting and display logic
  - _Requirements: 1.3, 1.5, 5.5_

- [ ]* 3.1 Write property test for tax calculation persistence and retrieval
  - **Property 10: Tax Calculation Persistence and Retrieval**
  - **Validates: Requirements 1.3, 5.5**

- [x] 4. Build professional report generation system
  - Integrate Puppeteer-based PDF generation from M Client Reports Builder
  - Create report templates with dynamic content substitution
  - Implement report metadata storage and relationship management
  - Set up multiple export format support (PDF, HTML)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 4.1 Write property test for report generation consistency
  - **Property 7: Report Generation Consistency**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ]* 4.2 Write property test for report metadata and relationship integrity
  - **Property 8: Report Metadata and Relationship Integrity**
  - **Validates: Requirements 3.4, 3.5**

- [ ] 5. Checkpoint - Ensure all core services are working
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Create enhanced dashboard with unified insights
  - Implement dashboard service that aggregates data from all sources
  - Create dashboard statistics calculation from consolidated database
  - Build recent activity timeline combining calculations, clients, and reports
  - Set up real-time data refresh capabilities with error handling
  - _Requirements: 4.1, 4.2, 4.5_

- [ ]* 6.1 Write property test for dashboard data aggregation accuracy
  - **Property 9: Dashboard Data Aggregation Accuracy**
  - **Validates: Requirements 4.1, 4.2, 4.5**

- [x] 7. Implement tax recommendation system
  - Create recommendation generation logic based on calculation results
  - Implement potential savings calculation and comparison
  - Set up actionable advice generation with implementation steps
  - Create recommendation storage and retrieval system
  - _Requirements: 5.4_

- [ ]* 7.1 Write property test for tax recommendation generation
  - **Property 11: Tax Recommendation Generation**
  - **Validates: Requirements 5.4**

- [x] 8. Build file system audit and cleanup tools
  - Create audit system to identify connected vs disconnected JSON files
  - Implement file classification logic for migration decisions
  - Set up backup system for files being removed
  - Create cleanup process with verification steps
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 8.1 Write property test for file system audit accuracy
  - **Property 12: File System Audit Accuracy**
  - **Validates: Requirements 6.1**
  - **PBT Status: passed**

- [ ] 9. Ensure cross-module data consistency
  - Implement unified client selection across all modules
  - Create data synchronization logic for client updates
  - Set up transaction management for bulk operations
  - Ensure consistent data flow between client management, calculations, and reports
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 9.1 Write property test for cross-module data consistency
  - **Property 13: Cross-Module Data Consistency**
  - **Validates: Requirements 7.2, 7.3, 7.4**

- [ ] 10. Update frontend components to use enhanced services
  - Modify existing client management pages to use consolidated database
  - Update tax calculation pages to use M Powered Tax Engine
  - Enhance dashboard with new unified insights and statistics
  - Create report generation interface with professional templates
  - _Requirements: 4.3, 4.4_

- [ ]* 10.1 Write unit tests for frontend component integration
  - Test client selection components with consolidated database
  - Test tax calculation UI with enhanced engine
  - Test dashboard component data loading and error handling
  - Test report generation interface functionality
  - _Requirements: 4.3, 4.4_

- [ ] 11. Implement database consolidation compliance
  - Ensure all data access operations use centralized DatabaseManager
  - Verify consolidated SQLite database usage across all modules
  - Implement proper schema validation and compliance checking
  - Set up monitoring for database operation consistency
  - _Requirements: 2.1, 6.3_

- [ ]* 11.1 Write property test for database consolidation compliance
  - **Property 6: Database Consolidation Compliance**
  - **Validates: Requirements 2.1, 6.3**

- [ ] 12. Final integration and cleanup
  - Remove all disconnected JSON files after successful migration
  - Clean up unused code and dependencies from old storage systems
  - Update configuration files to point to consolidated database
  - Verify all modules are using enhanced services
  - _Requirements: 6.5_

- [ ]* 12.1 Write integration tests for complete system functionality
  - Test end-to-end client management workflow
  - Test complete tax calculation and report generation process
  - Test data migration and cleanup procedures
  - Test cross-module data consistency under load
  - _Requirements: 6.5, 7.5_

- [ ] 13. Final Checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are met and system is ready for production use.