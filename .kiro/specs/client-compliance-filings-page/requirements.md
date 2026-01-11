# Requirements Document

## Introduction

This feature adds a dedicated Compliance & Filings page accessible from the client detail view. Currently, the client detail page has a "compliance" tab that shows only basic accounts and confirmation statement dates from the client record. This new page will provide a comprehensive view of all compliance items, filings, and deadlines for a specific client, with the ability to manage compliance status, create tasks, and view filing history from Companies House.

## Glossary

- **Client Detail Page**: The page at `/clients/[id]/page.tsx` that displays comprehensive information about a single client
- **Compliance Tab**: The existing tab on the client detail page showing basic compliance dates
- **Compliance & Filings Page**: The new dedicated page at `/clients/[id]/compliance` for managing all compliance items
- **Compliance Item**: A record tracking a regulatory filing or compliance deadline (accounts, confirmation statement, tax returns, etc.)
- **Filing History**: Historical records of filings submitted to Companies House
- **MDJ Practice Manager**: The practice management system for accountants
- **Companies House (CH)**: UK government registry for company information
- **API Client**: The shared API client utility at `apps/web/src/lib/api.ts`

## Requirements

### Requirement 1: Navigation from Client Detail Page

**User Story:** As a practice manager, I want to access a dedicated compliance & filings page from the client detail view, so that I can manage all compliance items for a specific client in one place.

#### Acceptance Criteria

1. WHEN viewing a client detail page, THE MDJ Practice Manager SHALL display a "View Compliance & Filings" button or link in the compliance tab
2. WHEN the user clicks the "View Compliance & Filings" link, THE MDJ Practice Manager SHALL navigate to `/clients/[id]/compliance`
3. WHEN viewing the compliance tab, THE MDJ Practice Manager SHALL display a summary count of pending, overdue, and upcoming compliance items for that client
4. WHEN the user navigates to the compliance & filings page, THE MDJ Practice Manager SHALL display a back button to return to the client detail page

### Requirement 2: Compliance Items Display

**User Story:** As a practice manager, I want to view all compliance items for a specific client, so that I can track all regulatory deadlines and filing requirements.

#### Acceptance Criteria

1. WHEN the compliance & filings page loads, THE MDJ Practice Manager SHALL fetch all compliance items for the specified client from `/compliance?clientId=[id]`
2. WHEN compliance items are loaded, THE MDJ Practice Manager SHALL display them in a table with columns for type, description, due date, status, and actions
3. WHEN displaying compliance items, THE MDJ Practice Manager SHALL sort them by due date with earliest deadlines first
4. WHEN a compliance item is overdue, THE MDJ Practice Manager SHALL highlight it with a danger badge
5. WHEN a compliance item is due within 30 days, THE MDJ Practice Manager SHALL highlight it with a warning badge

### Requirement 3: Compliance Status Management

**User Story:** As a practice manager, I want to update the status of compliance items, so that I can track which filings have been completed.

#### Acceptance Criteria

1. WHEN viewing a compliance item, THE MDJ Practice Manager SHALL display action buttons to mark it as filed, pending, or exempt
2. WHEN the user clicks "Mark as Filed", THE MDJ Practice Manager SHALL call `PUT /compliance/[id]/filed` with the current date
3. WHEN a compliance item status is updated, THE MDJ Practice Manager SHALL refresh the compliance items list
4. WHEN a compliance item is marked as filed, THE MDJ Practice Manager SHALL update the badge to show "FILED" status with success styling
5. WHEN the status update fails, THE MDJ Practice Manager SHALL display an error message to the user

### Requirement 4: Task Creation from Compliance Items

**User Story:** As a practice manager, I want to create tasks directly from compliance items, so that I can assign work to team members for upcoming deadlines.

#### Acceptance Criteria

1. WHEN viewing a compliance item, THE MDJ Practice Manager SHALL display a "Create Task" button
2. WHEN the user clicks "Create Task", THE MDJ Practice Manager SHALL call `POST /compliance/[id]/create-task`
3. WHEN a task is created successfully, THE MDJ Practice Manager SHALL display a success message with a link to the new task
4. WHEN a task already exists for a compliance item, THE MDJ Practice Manager SHALL display "View Task" instead of "Create Task"
5. WHEN task creation fails, THE MDJ Practice Manager SHALL display an error message to the user

### Requirement 5: Companies House Filing History Integration

**User Story:** As a practice manager, I want to view the Companies House filing history for a client, so that I can see what has been filed historically.

#### Acceptance Criteria

1. WHEN the client has a registered company number, THE MDJ Practice Manager SHALL display a "Filing History" section
2. WHEN the filing history section is visible, THE MDJ Practice Manager SHALL fetch filing history from `/companies-house/company/[number]/filing-history`
3. WHEN filing history is loaded, THE MDJ Practice Manager SHALL display the most recent 20 filings in a table
4. WHEN displaying filing history, THE MDJ Practice Manager SHALL show the date, type, and description for each filing
5. WHEN the client does not have a registered company number, THE MDJ Practice Manager SHALL hide the filing history section

### Requirement 6: Compliance Summary Statistics

**User Story:** As a practice manager, I want to see summary statistics for a client's compliance status, so that I can quickly assess their compliance health.

#### Acceptance Criteria

1. WHEN the compliance & filings page loads, THE MDJ Practice Manager SHALL display summary cards showing total, pending, overdue, and upcoming compliance items
2. WHEN calculating statistics, THE MDJ Practice Manager SHALL count items with due dates within 30 days as "upcoming"
3. WHEN calculating statistics, THE MDJ Practice Manager SHALL count items with due dates in the past as "overdue"
4. WHEN displaying summary cards, THE MDJ Practice Manager SHALL use color coding (danger for overdue, warning for upcoming, success for on track)
5. WHEN summary statistics are calculated, THE MDJ Practice Manager SHALL update them whenever compliance items are modified

### Requirement 7: Responsive Design and Accessibility

**User Story:** As a practice manager using various devices, I want the compliance & filings page to work well on desktop and tablet, so that I can access compliance information anywhere.

#### Acceptance Criteria

1. WHEN viewing the page on desktop, THE MDJ Practice Manager SHALL display the full table layout with all columns visible
2. WHEN viewing the page on tablet, THE MDJ Practice Manager SHALL adjust the layout to maintain readability
3. WHEN viewing the page on mobile, THE MDJ Practice Manager SHALL stack table rows or use a card layout
4. WHEN using keyboard navigation, THE MDJ Practice Manager SHALL allow users to navigate between all interactive elements
5. WHEN using a screen reader, THE MDJ Practice Manager SHALL provide appropriate labels and descriptions for all elements
