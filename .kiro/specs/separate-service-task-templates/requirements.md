# Requirements Document

## Introduction

This feature addresses the template duplication issue in the MDJ Practice Manager system. Currently, both the Services page and Tasks page show the same templates (service templates with workflow tasks). While service templates with their workflow tasks are useful, the Tasks page needs its own set of standalone task templates for common actions.

The solution is to:

- **Keep** service templates on the Services page (Annual Accounts, VAT Returns, etc.) with their associated workflow task definitions
- **Add** standalone task templates on the Tasks page (Send email, Make a call, Schedule meeting, etc.) for quick task creation
- **Allow** both types of templates to coexist, with the appropriate templates shown based on context

## Glossary

- **Service Template**: A predefined template for a recurring service offering (e.g., Annual Accounts, VAT Returns) that includes frequency, typical fees, and associated workflow task templates
- **Task Template**: A predefined template for a standalone actionable item (e.g., "Send client email", "Make follow-up call", "Schedule meeting") that can be quickly created without being tied to a specific service
- **Service**: An ongoing contractual service offered to a client with a frequency and fee
- **Task**: An actionable to-do item that may or may not be related to a service
- **MDJ Template Drawer**: The UI component that displays templates for quick creation
- **MDJ Practice Manager**: The practice management system for accountants

## Requirements

### Requirement 1: Add Standalone Task Templates

**User Story:** As a practice manager, I want standalone task templates for common actions, so that I can quickly create tasks without needing to link them to a service.

#### Acceptance Criteria

1. WHEN viewing the Services page template drawer, THE MDJ Practice Manager SHALL display service templates (Annual Accounts, VAT Returns, etc.) with their workflow tasks
2. WHEN viewing the Tasks page template drawer, THE MDJ Practice Manager SHALL display standalone task templates (Send email, Make call, etc.) for quick task creation
3. WHEN a service template is displayed, THE MDJ Practice Manager SHALL show the service type, frequency, and associated workflow tasks
4. WHEN a task template is displayed, THE MDJ Practice Manager SHALL show the task title, description, and typical priority
5. WHEN templates are loaded, THE MDJ Practice Manager SHALL load the appropriate template type based on the page context

### Requirement 2: Service Templates for Service Creation

**User Story:** As a practice manager, I want to use service templates to quickly create services with predefined workflows, so that I don't have to manually configure each service.

#### Acceptance Criteria

1. WHEN clicking a service template, THE MDJ Practice Manager SHALL navigate to the service creation form with the service type pre-populated
2. WHEN a service is created from a template, THE MDJ Practice Manager SHALL offer to generate workflow tasks based on the template's task definitions
3. WHEN viewing a service template, THE MDJ Practice Manager SHALL display the typical frequency options (Annual, Quarterly, Monthly)
4. WHEN viewing a service template, THE MDJ Practice Manager SHALL display suggested fee ranges if available
5. WHEN a service template includes task templates, THE MDJ Practice Manager SHALL show a preview of the workflow steps

### Requirement 3: Task Templates for Quick Task Creation

**User Story:** As a practice manager, I want to use task templates to quickly create common standalone tasks, so that I can efficiently manage day-to-day actions.

#### Acceptance Criteria

1. WHEN clicking a task template, THE MDJ Practice Manager SHALL navigate to the task creation form with the title and description pre-populated
2. WHEN a task is created from a template, THE MDJ Practice Manager SHALL pre-fill the priority and tags based on the template
3. WHEN viewing task templates, THE MDJ Practice Manager SHALL display common actionable items like "Send client email", "Make follow-up call", "Schedule meeting", "Chase information"
4. WHEN task templates are displayed on the Tasks page, THE MDJ Practice Manager SHALL show standalone action templates separate from service workflow templates
5. WHEN a task template is used, THE MDJ Practice Manager SHALL allow the user to link it to a service if needed, but not require it

### Requirement 4: Template Data Model for Standalone Tasks

**User Story:** As a system administrator, I want standalone task templates to be stored and managed separately from service templates, so that they can be displayed appropriately on the Tasks page.

#### Acceptance Criteria

1. WHEN storing templates, THE MDJ Practice Manager SHALL store standalone task templates separately from service templates
2. WHEN loading templates for the Tasks page, THE MDJ Practice Manager SHALL query standalone task templates
3. WHEN loading templates for the Services page, THE MDJ Practice Manager SHALL query service templates with their workflow task definitions
4. WHEN a standalone task template is created, THE MDJ Practice Manager SHALL store it without service association
5. WHEN templates are initialized, THE MDJ Practice Manager SHALL create default standalone task templates in addition to existing service templates

### Requirement 5: Template Drawer UI Clarity

**User Story:** As a practice manager, I want the template drawer to clearly indicate what type of templates I'm viewing, so that I understand the context.

#### Acceptance Criteria

1. WHEN opening the template drawer from Services page, THE MDJ Practice Manager SHALL display "Service Templates" as the drawer title and show service templates
2. WHEN opening the template drawer from Tasks page, THE MDJ Practice Manager SHALL display "Task Templates" as the drawer title and show standalone task templates
3. WHEN displaying service templates, THE MDJ Practice Manager SHALL show the service type, frequency options, and workflow preview
4. WHEN displaying task templates, THE MDJ Practice Manager SHALL show the task title, description, and suggested priority
5. WHEN no templates are available, THE MDJ Practice Manager SHALL display an appropriate message based on the template type

### Requirement 6: Default Standalone Task Templates

**User Story:** As a practice manager, I want a comprehensive set of default standalone task templates organized by category, so that I can quickly create frequently-used tasks for all aspects of practice management.

#### Acceptance Criteria

1. WHEN the system initializes, THE MDJ Practice Manager SHALL create default standalone task templates organized into categories: Client Communication, Billing & Credit Control, Practice Administration, Email & Correspondence, Client Job Workflow, Internal Operations, and Marketing & Growth
2. WHEN Client Communication templates are created, THE MDJ Practice Manager SHALL include tasks like "Respond to client email", "Make follow-up call", "Chase missing records", "Send deadline reminders", "Arrange client meeting", "Send engagement letter", and "Update client contact information"
3. WHEN Billing & Credit Control templates are created, THE MDJ Practice Manager SHALL include tasks like "Issue invoice", "Send invoice reminder", "Chase overdue payment", "Update debtor tracking", "Record payment received", and "Prepare debtor ageing report"
4. WHEN Practice Administration templates are created, THE MDJ Practice Manager SHALL include tasks like "File signed documents", "Update client job status", "Allocate tasks to team", "Record timesheets", "Order office supplies", and "Perform data backup"
5. WHEN Email & Correspondence templates are created, THE MDJ Practice Manager SHALL include tasks like "Check shared inbox", "Forward emails to staff", "Send bulk reminders", "Prepare follow-up templates", and "Confirm receipt of documents"
6. WHEN Client Job Workflow templates are created, THE MDJ Practice Manager SHALL include tasks like "Create new client job", "Update job progress", "Review jobs nearing deadlines", "Close completed job", and "Schedule periodic review"
7. WHEN Internal Operations templates are created, THE MDJ Practice Manager SHALL include tasks like "Review WIP report", "Conduct team check-in", "Review client satisfaction", "Monitor software updates", and "Maintain CPD logs"
8. WHEN Marketing & Growth templates are created, THE MDJ Practice Manager SHALL include tasks like "Send client newsletter", "Post social media update", "Follow up on enquiries", and "Update firm website"
9. WHEN task templates are created, THE MDJ Practice Manager SHALL assign appropriate default priorities (HIGH for urgent items like chasing payments, MEDIUM for routine tasks, LOW for non-urgent items)
10. WHEN task templates are created, THE MDJ Practice Manager SHALL include relevant tags for filtering and organization

### Requirement 7: Template Selection Behavior

**User Story:** As a practice manager, I want to easily select and use templates, so that I can quickly create services or tasks.

#### Acceptance Criteria

1. WHEN clicking a service template, THE MDJ Practice Manager SHALL navigate to /services/new with template data in query parameters
2. WHEN clicking a task template, THE MDJ Practice Manager SHALL navigate to /tasks/new with template data in query parameters
3. WHEN a template is selected, THE MDJ Practice Manager SHALL close the template drawer
4. WHEN template data is passed via query parameters, THE MDJ Practice Manager SHALL pre-populate the creation form
5. WHEN a user modifies pre-populated template data, THE MDJ Practice Manager SHALL allow full editing before submission

### Requirement 8: Template Management

**User Story:** As a practice manager, I want to manage my templates, so that I can customize them to match my practice's needs.

#### Acceptance Criteria

1. WHEN viewing templates, THE MDJ Practice Manager SHALL allow filtering by template type (service or task)
2. WHEN managing templates, THE MDJ Practice Manager SHALL allow creating custom service templates
3. WHEN managing templates, THE MDJ Practice Manager SHALL allow creating custom task templates
4. WHEN editing a service template, THE MDJ Practice Manager SHALL allow modifying the associated task workflow
5. WHEN editing a task template, THE MDJ Practice Manager SHALL allow modifying the title, description, priority, and tags

### Requirement 9: Backward Compatibility

**User Story:** As a system administrator, I want existing service templates to continue working unchanged, so that current workflows are not disrupted.

#### Acceptance Criteria

1. WHEN the system is updated, THE MDJ Practice Manager SHALL preserve all existing service templates without modification
2. WHEN existing service templates are loaded, THE MDJ Practice Manager SHALL continue to display them on the Services page exactly as before
3. WHEN new standalone task templates are added, THE MDJ Practice Manager SHALL not affect or modify existing service templates
4. WHEN the template drawer is opened from Services page, THE MDJ Practice Manager SHALL load service templates as it currently does
5. WHEN the template drawer is opened from Tasks page, THE MDJ Practice Manager SHALL load the new standalone task templates

### Requirement 10: Template Search and Discovery

**User Story:** As a practice manager, I want to search and filter templates, so that I can quickly find the template I need.

#### Acceptance Criteria

1. WHEN the template drawer is open, THE MDJ Practice Manager SHALL provide a search input to filter templates
2. WHEN searching templates, THE MDJ Practice Manager SHALL filter by template name and description
3. WHEN templates are displayed, THE MDJ Practice Manager SHALL group them by category if applicable
4. WHEN many templates exist, THE MDJ Practice Manager SHALL provide scrolling or pagination
5. WHEN a search returns no results, THE MDJ Practice Manager SHALL display a helpful message
