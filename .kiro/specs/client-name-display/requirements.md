# Requirements Document

## Introduction

This document outlines the requirements for displaying client names in calendar events and task lists in the MDJ Practice Manager application. Currently, calendar events show client references (IDs) but not the human-readable client names, and the task list already shows client names but could benefit from improved consistency.

## Glossary

- **Client Name**: The human-readable name of a client (e.g., "Acme Corporation Ltd")
- **Client Reference (Client Ref)**: The unique identifier code for a client (e.g., "1A001")
- **Client ID**: The internal system identifier for a client (UUID format)
- **Calendar Event**: A scheduled item displayed on the calendar with details such as title, date, time, type, and client information
- **Task**: A work item assigned to a user with a due date, client association, and service details
- **Event Modal**: The popup dialog that displays event details when a user clicks on a calendar event
- **Calendar Component**: The frontend React component that displays the calendar and handles user interactions
- **Task List**: The table view showing all tasks with their details including client information

## Requirements

### Requirement 1: Display Client Names in Calendar Events

**User Story:** As a user, I want to see client names in calendar events so that I can quickly identify which client an event is for without needing to look up the client reference

#### Acceptance Criteria

1. WHEN a calendar event has an associated client, THE Calendar Component SHALL display the client name alongside the event title on the calendar grid
2. WHEN a user views an event in the details modal, THE Calendar Component SHALL display both the client reference and client name in the client information section
3. WHEN a user creates a new event with a client reference, THE Calendar Component SHALL fetch and display the corresponding client name
4. WHEN a user edits an event and changes the client reference, THE Calendar Component SHALL update the displayed client name to match the new client
5. WHEN a calendar event does not have an associated client, THE Calendar Component SHALL not display any client information

### Requirement 2: Fetch Client Data for Calendar Events

**User Story:** As a user, I want the system to automatically retrieve client names for calendar events so that I don't have to manually enter them

#### Acceptance Criteria

1. WHEN the calendar loads events from the API, THE Calendar Component SHALL fetch client details for all events with client references
2. WHEN a user enters a client reference in the event form, THE Calendar Component SHALL validate the reference and fetch the client name
3. IF a client reference is invalid or not found, THEN THE Calendar Component SHALL display an error message
4. WHEN client data is being fetched, THE Calendar Component SHALL display a loading indicator
5. THE Calendar Component SHALL cache client data to minimize API calls for the same client

### Requirement 3: Consistent Client Display Format

**User Story:** As a user, I want client information displayed consistently across the application so that I can easily recognize and understand client associations

#### Acceptance Criteria

1. WHEN displaying client information, THE System SHALL show the client name as the primary identifier
2. WHEN both client name and reference are available, THE System SHALL display them in the format "Client Name (Reference)"
3. WHEN only a client reference is available, THE System SHALL display the reference with a label indicating it's a reference
4. THE System SHALL use consistent styling for client information across calendar and task views
5. THE System SHALL make client names clickable links to the client detail page where applicable

### Requirement 4: Calendar Grid Display Enhancement

**User Story:** As a user, I want to see client names directly on the calendar grid so that I can identify client-related events at a glance

#### Acceptance Criteria

1. WHEN an event has an associated client, THE Calendar Component SHALL append the client name to the event title on the calendar grid
2. THE Calendar Component SHALL use a visual separator (e.g., "•" or "-") between the event title and client name
3. WHEN the combined title and client name are too long, THE Calendar Component SHALL truncate the text with an ellipsis
4. THE Calendar Component SHALL ensure client names are visible in all calendar views (month, week, day)
5. THE Calendar Component SHALL maintain readability by using appropriate font sizes and colors

### Requirement 5: Task List Client Display Verification

**User Story:** As a user, I want to verify that task list client names are displayed correctly and consistently

#### Acceptance Criteria

1. WHEN viewing the task list, THE Task Component SHALL display client names in the client column
2. WHEN a task has an associated client, THE Task Component SHALL make the client name a clickable link to the client detail page
3. WHEN a task does not have an associated client, THE Task Component SHALL display a placeholder or leave the cell empty
4. THE Task Component SHALL display client names with consistent formatting
5. THE Task Component SHALL ensure client names are searchable in the task list filter

### Requirement 6: Edit Form Client Selection

**User Story:** As a user, I want to select clients by name when creating or editing events so that I don't need to remember client reference codes

#### Acceptance Criteria

1. WHEN creating or editing an event, THE Calendar Component SHALL provide a client selection dropdown or autocomplete field
2. THE client selection field SHALL display client names with their references for easy identification
3. WHEN a user selects a client, THE Calendar Component SHALL populate both the client reference and client name fields
4. THE client selection field SHALL support searching by client name or reference
5. THE client selection field SHALL display a "No client" or "None" option for events without client associations

### Requirement 7: Data Persistence

**User Story:** As a user, I want client names to persist with calendar events so that they remain visible after page refreshes

#### Acceptance Criteria

1. WHEN an event is created with a client association, THE Event Service SHALL store both the client ID and client name
2. WHEN an event is updated with a new client, THE Event Service SHALL update both the client ID and client name
3. WHEN events are retrieved from storage, THE Event Service SHALL include client name data in the response
4. THE Event Service SHALL ensure client names remain synchronized with the client database
5. IF a client name changes in the client database, THE System SHALL reflect the updated name in associated events

### Requirement 8: Error Handling for Client Data

**User Story:** As a user, I want clear feedback when client data cannot be loaded so that I understand what information might be missing

#### Acceptance Criteria

1. WHEN a client reference exists but the client cannot be found, THE System SHALL display the reference with an indicator that the client is not found
2. WHEN client data fails to load due to network issues, THE System SHALL display a retry option
3. WHEN creating an event with an invalid client reference, THE System SHALL prevent form submission and show an error message
4. THE System SHALL log client data loading errors for debugging purposes
5. THE System SHALL gracefully handle missing client data without breaking the calendar or task list display
