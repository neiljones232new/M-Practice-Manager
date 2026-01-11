# Requirements Document

## Introduction

This specification outlines the consolidation and upgrade of M Practice Manager by integrating the best features from the other software builds in the workspace, while removing duplicate and disconnected components. The focus is on enhancing the existing Next.js/NestJS system with improved tax calculations, better database management, and professional report generation capabilities.

## Glossary

- **M Practice Manager**: The main practice management system with Next.js frontend (/apps/web) and NestJS backend (/apps/api)
- **M Powered Tax Engine**: Advanced tax calculation engine from v2 build with comprehensive salary optimization
- **Client Master Database**: Centralized SQLite-based client data management from Client List build
- **Report Builder**: Professional PDF/HTML document generation system from M Client Reports Builder
- **Tax Calculation Engine**: Enhanced system for salary/dividend optimization with marginal relief calculations
- **JSON Storage**: File-based storage system that needs consolidation and cleanup
- **Database Manager**: Centralized database access layer with proper error handling

## Requirements

### Requirement 1

**User Story:** As a practice manager, I want to replace the current file-based tax calculation system with the advanced M Powered Tax Engine from v2, so that I can provide comprehensive salary/dividend optimization with proper database persistence.

#### Acceptance Criteria

1. WHEN a user requests salary optimization THEN the system SHALL calculate optimal salary/dividend splits using the enhanced tax engine with marginal relief calculations
2. WHEN calculating multiple scenarios THEN the system SHALL generate comprehensive comparisons with take-home pay analysis and effective tax rates
3. WHEN storing tax calculations THEN the system SHALL persist results in SQLite database instead of JSON files with proper relational structure
4. WHEN retrieving calculation history THEN the system SHALL provide fast access to client calculations with proper indexing
5. WHEN displaying tax results THEN the system SHALL show detailed breakdowns including corporation tax, National Insurance, and dividend tax components

### Requirement 2

**User Story:** As a system administrator, I want to consolidate the database architecture using the robust DatabaseManager from Client List, so that I can eliminate disconnected JSON files and improve data consistency.

#### Acceptance Criteria

1. WHEN accessing any data THEN the system SHALL use the centralized DatabaseManager with consistent error handling and connection management
2. WHEN migrating from JSON storage THEN the system SHALL preserve all existing data while moving to SQLite-based storage
3. WHEN performing database operations THEN the system SHALL return structured QueryResult objects with proper success/error status
4. WHEN handling database errors THEN the system SHALL provide user-friendly error messages and proper logging
5. WHEN managing concurrent access THEN the system SHALL use proper transaction handling and connection pooling

### Requirement 3

**User Story:** As a client advisor, I want to integrate the professional Report Builder capabilities, so that I can generate comprehensive client packs with tax calculations and company information.

#### Acceptance Criteria

1. WHEN generating client reports THEN the system SHALL create professional PDF documents using the enhanced report builder with consistent M branding
2. WHEN including tax calculations THEN the system SHALL format calculation results with proper tables, charts, and explanatory text
3. WHEN creating report templates THEN the system SHALL support dynamic content based on client data, company information, and calculation results
4. WHEN exporting reports THEN the system SHALL provide multiple format options and store generated reports with proper metadata
5. WHEN accessing report history THEN the system SHALL maintain links between reports, clients, and the calculations they contain

### Requirement 4

**User Story:** As a practice user, I want an enhanced dashboard that consolidates insights from all builds, so that I can have a unified view of practice performance without navigating multiple systems.

#### Acceptance Criteria

1. WHEN viewing the dashboard THEN the system SHALL display unified metrics combining client data, calculation statistics, and report generation activity
2. WHEN showing recent activity THEN the system SHALL present calculation summaries, new clients, and generated reports in a single timeline
3. WHEN displaying client statistics THEN the system SHALL show real-time data from the consolidated database with refresh capabilities
4. WHEN navigating from dashboard THEN the system SHALL provide quick access to enhanced calculation tools and report generation
5. WHEN loading dashboard data THEN the system SHALL handle loading states gracefully with proper error handling

### Requirement 5

**User Story:** As a tax advisor, I want the enhanced tax calculation features including comprehensive scenario analysis, so that I can provide optimal tax planning advice using the most advanced calculation engine.

#### Acceptance Criteria

1. WHEN calculating corporation tax THEN the system SHALL apply proper marginal relief calculations with current HMRC rates and thresholds
2. WHEN optimizing salary levels THEN the system SHALL consider all tax implications including National Insurance, personal allowances, and dividend tax rates
3. WHEN comparing scenarios THEN the system SHALL generate multiple salary/dividend combinations and rank by total efficiency
4. WHEN calculating recommendations THEN the system SHALL provide actionable advice with potential savings and implementation steps
5. WHEN storing calculation results THEN the system SHALL maintain detailed scenario data for future reference and comparison

### Requirement 6

**User Story:** As a system maintainer, I want to remove all disconnected JSON files and consolidate storage systems, so that I can eliminate data inconsistencies and improve system maintainability.

#### Acceptance Criteria

1. WHEN auditing storage systems THEN the system SHALL identify all JSON files that are not actively connected to the application
2. WHEN migrating data THEN the system SHALL preserve all valuable data while removing redundant or orphaned files
3. WHEN consolidating storage THEN the system SHALL use a single SQLite database for all persistent data with proper schema design
4. WHEN cleaning up files THEN the system SHALL maintain backup copies of removed files until migration is verified successful
5. WHEN accessing data post-migration THEN the system SHALL provide faster access times and better data integrity than the previous JSON-based system

### Requirement 7

**User Story:** As a practice owner, I want seamless integration between the enhanced components, so that data flows efficiently between client management, advanced tax calculations, and professional report generation.

#### Acceptance Criteria

1. WHEN selecting clients for calculations THEN the system SHALL provide unified client selection using the consolidated database
2. WHEN generating reports THEN the system SHALL access both client data and enhanced calculation results seamlessly
3. WHEN updating client information THEN the system SHALL reflect changes across all modules using the centralized database
4. WHEN performing bulk operations THEN the system SHALL maintain data consistency using proper transaction management
5. WHEN synchronizing data THEN the system SHALL handle concurrent access and prevent data conflicts through proper locking mechanisms