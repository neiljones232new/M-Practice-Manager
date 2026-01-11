# Requirements Document

## Introduction

This feature adds user interface access to service and task templates from the main Services and Tasks pages. Currently, the system has a robust template system with default templates for various service types (Annual Accounts, VAT Returns, Payroll, etc.), but users cannot view, manage, or apply these templates from the UI. This feature will expose template functionality through intuitive UI controls.

## Glossary

- **Service Template**: A predefined configuration for a service type that includes task templates to be generated when a service is created
- **Task Template**: A template defining a task's title, description, priority, tags, and timing relative to a due date
- **Template System**: The backend API endpoints at `/tasks/templates/service-templates` that manage service and task templates
- **Services Page**: The main page at `/services` that lists all client services
- **Tasks Page**: The main page at `/tasks` that lists all tasks
- **MDJ UI Components**: The standardized UI component library used throughout the application

## Requirements

### Requirement 1: Template Access from Services Page

**User Story:** As a practice manager, I want to view and manage service templates from the Services page, so that I can understand what task templates are available for different service types.

#### Acceptance Criteria

1. WHEN THE User navigates to the Services page, THE System SHALL display a "Templates" button in the page actions area
2. WHEN THE User clicks the "Templates" button, THE System SHALL display a modal or drawer showing all available service templates
3. WHEN THE System displays service templates, THE System SHALL show the service kind, frequency, and number of task templates for each template
4. WHEN THE User selects a service template, THE System SHALL display the detailed task templates including title, description, priority, days before due, and tags
5. WHEN THE System displays task templates, THE System SHALL format the information using MDJ UI components for consistency

### Requirement 2: Template Access from Tasks Page

**User Story:** As a practice manager, I want to view task templates from the Tasks page, so that I can see what automated tasks will be created for different services.

#### Acceptance Criteria

1. WHEN THE User navigates to the Tasks page, THE System SHALL display a "Templates" button in the page actions area
2. WHEN THE User clicks the "Templates" button, THE System SHALL display a modal or drawer showing all available service templates with their task templates
3. WHEN THE System displays templates on the Tasks page, THE System SHALL use the same template viewing interface as the Services page
4. WHEN THE User views templates from the Tasks page, THE System SHALL highlight task-specific information such as priority and timing

### Requirement 3: Template List Display

**User Story:** As a practice manager, I want to see a clear list of all service templates, so that I can quickly find templates for specific service types.

#### Acceptance Criteria

1. WHEN THE System displays the template list, THE System SHALL group templates by service kind
2. WHEN THE System displays each template entry, THE System SHALL show the service kind, frequency badge, and task count
3. WHEN THE System displays multiple templates for the same service kind, THE System SHALL differentiate them by frequency (ANNUAL, QUARTERLY, MONTHLY)
4. WHEN THE User views the template list, THE System SHALL provide search or filter functionality to find specific templates
5. WHEN THE System displays the template list, THE System SHALL use MDJCard components for consistent styling

### Requirement 4: Template Detail View

**User Story:** As a practice manager, I want to see detailed information about task templates within a service template, so that I can understand what tasks will be automatically created.

#### Acceptance Criteria

1. WHEN THE User selects a service template, THE System SHALL expand or navigate to show all task templates within that service template
2. WHEN THE System displays task template details, THE System SHALL show the task title, description, priority badge, days before due, and tags
3. WHEN THE System displays task templates, THE System SHALL order them by days before due in descending order
4. WHEN THE System displays priority levels, THE System SHALL use color-coded MDJBadge components (LOW: muted, MEDIUM: warning, HIGH: danger, URGENT: danger)
5. WHEN THE System displays tags, THE System SHALL render them as individual badge components

### Requirement 5: Responsive Template Interface

**User Story:** As a practice manager using different devices, I want the template interface to work well on mobile, tablet, and desktop, so that I can access templates from any device.

#### Acceptance Criteria

1. WHEN THE User accesses templates on mobile devices (width less than 768 pixels), THE System SHALL display templates in a full-screen modal or drawer
2. WHEN THE User accesses templates on tablet devices (width between 768 and 1024 pixels), THE System SHALL display templates in a side drawer or modal with appropriate width
3. WHEN THE User accesses templates on desktop devices (width greater than 1024 pixels), THE System SHALL display templates in a side drawer or modal with optimal width
4. WHEN THE System displays template details, THE System SHALL ensure all content is readable and interactive elements are touch-friendly on mobile devices
5. WHEN THE User closes the template interface, THE System SHALL return focus to the main page without losing the current view state

### Requirement 6: Template Information Accuracy

**User Story:** As a practice manager, I want to see accurate and up-to-date template information, so that I can rely on the displayed data when planning services.

#### Acceptance Criteria

1. WHEN THE System loads templates, THE System SHALL fetch data from the `/tasks/templates/service-templates` API endpoint
2. WHEN THE API returns template data, THE System SHALL display all templates without filtering or modification
3. WHEN THE System displays task template timing, THE System SHALL show "X days before due" where X is the daysBeforeDue value
4. WHEN THE System encounters an API error, THE System SHALL display an error message using MDJ UI error styling
5. WHEN THE System loads templates, THE System SHALL show a loading state using MDJ UI loading components

### Requirement 7: Template Interface Accessibility

**User Story:** As a practice manager using assistive technology, I want the template interface to be accessible, so that I can navigate and understand templates using keyboard and screen readers.

#### Acceptance Criteria

1. WHEN THE User opens the template interface, THE System SHALL set focus to the first interactive element
2. WHEN THE User navigates using keyboard, THE System SHALL provide visible focus indicators on all interactive elements
3. WHEN THE User uses a screen reader, THE System SHALL provide appropriate ARIA labels for all template sections
4. WHEN THE User presses the Escape key, THE System SHALL close the template interface
5. WHEN THE System displays the template interface, THE System SHALL trap focus within the modal or drawer until closed

### Requirement 8: Template Interface Performance

**User Story:** As a practice manager, I want the template interface to load quickly, so that I can access template information without delays.

#### Acceptance Criteria

1. WHEN THE User clicks the Templates button, THE System SHALL display the interface within 300 milliseconds
2. WHEN THE System fetches template data, THE System SHALL cache the results for the current session
3. WHEN THE User opens the template interface multiple times, THE System SHALL use cached data to avoid redundant API calls
4. WHEN THE System renders the template list, THE System SHALL render all templates without pagination for lists under 50 templates
5. WHEN THE System has more than 50 templates, THE System SHALL implement virtual scrolling or pagination

### Requirement 9: Consistent UI Integration

**User Story:** As a practice manager familiar with the MDJ UI, I want the template interface to match the existing design system, so that the experience feels cohesive.

#### Acceptance Criteria

1. WHEN THE System displays the Templates button, THE System SHALL use MDJButton component with appropriate variant
2. WHEN THE System displays the template interface, THE System SHALL use MDJ UI modal or drawer components
3. WHEN THE System displays template cards, THE System SHALL use MDJCard components with consistent padding and styling
4. WHEN THE System displays badges, THE System SHALL use MDJBadge components with appropriate variants
5. WHEN THE System displays the template interface, THE System SHALL use the same color palette, typography, and spacing as other MDJ pages
