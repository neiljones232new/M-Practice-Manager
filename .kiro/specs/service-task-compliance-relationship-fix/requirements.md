# Requirements Document

## Introduction

This feature addresses the confusion between Services, Tasks, and Compliance Items in the MDJ Practice Manager system. Currently, there is ambiguity about the relationship and purpose of each entity. This spec clarifies the hierarchy and ensures the system correctly implements:

- **Services**: The actual accounting services offered to clients (Annual Accounts, VAT Returns, Payroll, etc.)
- **Tasks**: Workflow action items needed to complete those services (call client, chase records, prepare documents, etc.)
- **Compliance Items**: Regulatory filings tracked only if the related service is offered (Companies House filings, HMRC submissions, etc.)

The key issue is that tasks should not duplicate services - they are subordinate action items within a service delivery workflow.

## Glossary

- **Service**: An accounting service offered to a client (e.g., Annual Accounts, VAT Returns, Payroll). Services have a frequency, fee, and next due date.
- **Task**: A workflow action item required to complete a service (e.g., "Call client for records", "Chase missing invoices", "Prepare draft accounts"). Tasks are linked to a specific service.
- **Compliance Item**: A regulatory filing or deadline tracked by the system (e.g., Companies House Annual Accounts filing, Confirmation Statement). Compliance items exist only when a related service is offered.
- **Service Template**: A predefined template that defines the standard tasks required to complete a specific type of service.
- **Task Template**: A template for a task within a service template, including title, description, priority, and timing relative to the service due date.
- **MDJ Practice Manager**: The practice management system for accountants.
- **Filing**: The database model representing compliance items (stored in the `Filing` table).

## Requirements

### Requirement 1: Service as Primary Entity

**User Story:** As a practice manager, I want services to be the primary entity for client work, so that I can track what services we provide to each client.

#### Acceptance Criteria

1. WHEN creating a service, THE MDJ Practice Manager SHALL store the service type, frequency, fee, and next due date
2. WHEN viewing a client, THE MDJ Practice Manager SHALL display all services offered to that client
3. WHEN a service is active, THE MDJ Practice Manager SHALL track its status and next due date
4. WHEN a service has a next due date, THE MDJ Practice Manager SHALL allow task generation based on that date
5. WHEN a service is deleted, THE MDJ Practice Manager SHALL cascade delete all associated tasks

### Requirement 2: Tasks as Service Workflow Steps

**User Story:** As a practice manager, I want tasks to represent the workflow steps needed to complete a service, so that team members know what actions to take.

#### Acceptance Criteria

1. WHEN creating a task, THE MDJ Practice Manager SHALL require a link to a parent service via serviceId
2. WHEN displaying tasks, THE MDJ Practice Manager SHALL show the related service name and type
3. WHEN a service is completed, THE MDJ Practice Manager SHALL allow marking all related tasks as complete
4. WHEN viewing a service, THE MDJ Practice Manager SHALL display all tasks associated with that service
5. WHEN a task is created without a serviceId, THE MDJ Practice Manager SHALL treat it as a standalone task not linked to service delivery

### Requirement 3: Service Templates Define Task Workflows

**User Story:** As a practice manager, I want to define standard task workflows for each service type, so that tasks are automatically generated with appropriate timing and assignments.

#### Acceptance Criteria

1. WHEN creating a service template, THE MDJ Practice Manager SHALL allow defining multiple task templates for that service type
2. WHEN a task template is defined, THE MDJ Practice Manager SHALL specify the number of days before the service due date the task should be due
3. WHEN generating tasks from a service, THE MDJ Practice Manager SHALL create tasks based on the service template for that service type and frequency
4. WHEN no service template exists, THE MDJ Practice Manager SHALL allow manual task creation for the service
5. WHEN a service template is updated, THE MDJ Practice Manager SHALL not affect already-generated tasks

### Requirement 4: Compliance Items Track Regulatory Filings

**User Story:** As a practice manager, I want compliance items to track regulatory filing deadlines, so that I can ensure statutory obligations are met.

#### Acceptance Criteria

1. WHEN a client has a service that requires regulatory filing, THE MDJ Practice Manager SHALL create or track a corresponding compliance item
2. WHEN displaying compliance items, THE MDJ Practice Manager SHALL show the filing type, due date, status, and related service
3. WHEN a compliance item is marked as filed, THE MDJ Practice Manager SHALL update the status and record the filed date
4. WHEN a service is removed, THE MDJ Practice Manager SHALL mark related compliance items as exempt or delete them
5. WHEN syncing with Companies House, THE MDJ Practice Manager SHALL create compliance items for statutory filings only if a related service exists

### Requirement 5: Clear Separation of Concerns

**User Story:** As a practice manager, I want the system to clearly distinguish between services, tasks, and compliance items, so that I don't create duplicate or confusing records.

#### Acceptance Criteria

1. WHEN creating a new record, THE MDJ Practice Manager SHALL provide clear guidance on whether to create a service, task, or compliance item
2. WHEN viewing the services list, THE MDJ Practice Manager SHALL not display tasks or compliance items as if they were services
3. WHEN viewing the tasks list, THE MDJ Practice Manager SHALL display the parent service name for service-related tasks
4. WHEN viewing compliance items, THE MDJ Practice Manager SHALL display the related service if one exists
5. WHEN a user attempts to create a task that duplicates a service, THE MDJ Practice Manager SHALL suggest creating the service first and then generating tasks

### Requirement 6: Task Generation from Services

**User Story:** As a practice manager, I want to automatically generate tasks from services based on templates, so that I don't have to manually create workflow steps for each service.

#### Acceptance Criteria

1. WHEN a service is created with a next due date, THE MDJ Practice Manager SHALL offer to generate tasks from the service template
2. WHEN generating tasks, THE MDJ Practice Manager SHALL calculate task due dates based on the service due date and task template timing
3. WHEN tasks are generated, THE MDJ Practice Manager SHALL link each task to the parent service via serviceId
4. WHEN a service due date is updated, THE MDJ Practice Manager SHALL offer to regenerate or adjust task due dates
5. WHEN tasks are generated, THE MDJ Practice Manager SHALL apply default assignees from the task template if specified

### Requirement 7: Compliance Item Creation from Services

**User Story:** As a practice manager, I want compliance items to be automatically created when I add services that have regulatory filing requirements, so that I don't miss statutory deadlines.

#### Acceptance Criteria

1. WHEN a service is created for Annual Accounts, THE MDJ Practice Manager SHALL create a corresponding compliance item for the Companies House filing
2. WHEN a service is created for Confirmation Statement, THE MDJ Practice Manager SHALL create a corresponding compliance item for the Companies House filing
3. WHEN a compliance item is created from a service, THE MDJ Practice Manager SHALL link it to the service for reference
4. WHEN a service due date is updated, THE MDJ Practice Manager SHALL update the related compliance item due date
5. WHEN a service is marked as complete, THE MDJ Practice Manager SHALL offer to mark the related compliance item as filed

### Requirement 8: Service Detail View Shows Related Entities

**User Story:** As a practice manager, I want to view all tasks and compliance items related to a service, so that I can see the complete picture of service delivery.

#### Acceptance Criteria

1. WHEN viewing a service detail page, THE MDJ Practice Manager SHALL display all tasks linked to that service
2. WHEN viewing a service detail page, THE MDJ Practice Manager SHALL display any compliance items related to that service
3. WHEN viewing tasks on a service detail page, THE MDJ Practice Manager SHALL show task status, due date, and assignee
4. WHEN viewing compliance items on a service detail page, THE MDJ Practice Manager SHALL show filing status and due date
5. WHEN all tasks for a service are complete, THE MDJ Practice Manager SHALL indicate that the service is ready for completion

### Requirement 9: Data Model Consistency

**User Story:** As a system administrator, I want the data model to correctly represent the Services → Tasks → Compliance hierarchy, so that the system maintains data integrity.

#### Acceptance Criteria

1. WHEN a task is created, THE MDJ Practice Manager SHALL validate that the serviceId references an existing service if provided
2. WHEN a service is deleted, THE MDJ Practice Manager SHALL cascade delete all related tasks
3. WHEN a compliance item references a service, THE MDJ Practice Manager SHALL validate that the service exists
4. WHEN querying tasks, THE MDJ Practice Manager SHALL efficiently join with services to display service information
5. WHEN a service is updated, THE MDJ Practice Manager SHALL maintain referential integrity with related tasks and compliance items

### Requirement 10: User Interface Clarity

**User Story:** As a practice manager, I want the user interface to clearly label and separate services, tasks, and compliance items, so that I understand what each entity represents.

#### Acceptance Criteria

1. WHEN viewing the services page, THE MDJ Practice Manager SHALL display a clear heading "Services" and show only service records
2. WHEN viewing the tasks page, THE MDJ Practice Manager SHALL display a clear heading "Tasks" and show the related service name for each task
3. WHEN viewing the compliance page, THE MDJ Practice Manager SHALL display a clear heading "Compliance & Filings" and show only regulatory filing records
4. WHEN creating a new record, THE MDJ Practice Manager SHALL provide separate forms for services, tasks, and compliance items with clear descriptions
5. WHEN displaying breadcrumbs or navigation, THE MDJ Practice Manager SHALL use consistent terminology (Services, Tasks, Compliance)
