# Implementation Plan: Client Compliance & Filings Page

## Overview
This implementation plan breaks down the development of the Client Compliance & Filings page into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring the feature can be developed and tested step by step.

## Task List

- [x] 1. Create the new compliance page route and basic structure
  - Create `apps/web/src/app/clients/[id]/compliance/page.tsx` with Next.js page component
  - Set up TypeScript interfaces for ComplianceItem, ComplianceSummary, and FilingHistoryItem
  - Implement basic MDJShell layout with page title, subtitle, breadcrumbs, and back button
  - Add client ID extraction from URL params using `useParams` hook
  - _Requirements: 1.1, 1.4_

- [x] 2. Implement client data loading and error handling
  - Add state management for client data, loading, and error states
  - Implement `useEffect` hook to fetch client data from `/clients/[id]` on mount
  - Add loading state display with spinner and message
  - Add error state display with error message and back button
  - Handle case where client is not found (404)
  - _Requirements: 1.2, 1.4_

- [x] 3. Implement compliance items data loading and display
  - Add state for compliance items array
  - Fetch compliance items from `/compliance?clientId=[id]` endpoint
  - Sort compliance items by due date (earliest first)
  - Create compliance items table with columns: Type, Description, Last Filed, Due Date, Status, Actions
  - Format dates using `toLocaleDateString('en-GB')` for DD/MM/YYYY format
  - Display "No compliance items" message when array is empty
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Add status badges and visual indicators
  - Implement status badge rendering with appropriate CSS classes
  - Use `mdj-badge-danger` for OVERDUE status
  - Use `mdj-badge-warn` for PENDING status with due date within 30 days
  - Use `mdj-badge-success` for FILED status
  - Use `mdj-badge-muted` for EXEMPT status
  - Add visual highlighting for overdue items (red text or background)
  - _Requirements: 2.4, 2.5_

- [x] 5. Implement "Mark as Filed" functionality
  - Add state to track which item is being updated
  - Create `handleMarkFiled` function that calls `PUT /compliance/[id]/filed`
  - Pass current date as filedDate in request body
  - Disable button and show loading state during update
  - Refresh compliance items list after successful update
  - Display success message to user
  - Handle and display error messages on failure
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Implement task creation from compliance items
  - Add state to track which item is creating a task
  - Create `handleCreateTask` function that calls `POST /compliance/[id]/create-task`
  - Disable "Create Task" button during task creation
  - Display success message with link to new task after creation
  - Refresh compliance items to update button state
  - Check if task already exists and show "View Task" button instead of "Create Task"
  - Handle and display error messages on task creation failure
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Add summary statistics cards
  - Create state for summary statistics (total, pending, overdue, upcoming, filed)
  - Implement `calculateSummary` function to compute statistics from compliance items
  - Calculate overdue count (due date < now and status = PENDING)
  - Calculate upcoming count (due date within 30 days and status = PENDING)
  - Create grid layout for summary cards using CSS Grid
  - Display summary cards with color-coded numbers (danger for overdue, warning for upcoming, success for on track)
  - Update summary statistics when compliance items change
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Integrate Companies House filing history
  - Add state for filing history items and loading state
  - Check if client has registeredNumber before fetching filing history
  - Fetch filing history from `/companies-house/company/[number]/filing-history` when company number exists
  - Create filing history table with columns: Date, Type, Description
  - Display most recent 20 filings only
  - Hide filing history section when client has no company number
  - Format filing dates using `toLocaleDateString('en-GB')`
  - Handle loading and error states for filing history
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Add navigation link from client detail page
  - Modify `apps/web/src/app/clients/[id]/page.tsx` compliance tab section
  - Calculate summary counts (pending, overdue) from client compliance dates
  - Add summary text showing pending and overdue counts
  - Add "View Compliance & Filings" button that navigates to `/clients/[id]/compliance`
  - Style button with `btn-gold` class for primary action
  - Position button and summary in flex layout for proper alignment
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 10. Implement responsive design
  - Use CSS Grid with `repeat(auto-fit, minmax(220px, 1fr))` for summary cards
  - Add `overflowX: auto` to table containers for horizontal scroll on small screens
  - Test layout on desktop (1920x1080) to ensure full table visibility
  - Test layout on tablet (768x1024) to ensure proper adjustment
  - Test layout on mobile to ensure horizontal scroll works
  - Ensure summary cards stack properly on narrow screens
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 11. Add keyboard navigation and accessibility features
  - Ensure all buttons and links are keyboard accessible with proper tab order
  - Add aria-label attributes to action buttons with descriptive text
  - Add aria-busy attribute to buttons during loading states
  - Ensure table headers use proper `<th>` elements
  - Test keyboard navigation through all interactive elements
  - Verify focus indicators are visible on all interactive elements
  - Add aria-live region for success/error messages
  - _Requirements: 7.4, 7.5_

- [x] 12. Add comprehensive error handling and user feedback
  - Implement error state for client not found scenario
  - Add error handling for API connection failures
  - Display inline error messages for failed status updates
  - Show error messages for failed task creation
  - Add retry functionality for failed operations
  - Implement success messages for completed actions
  - Ensure error messages are user-friendly and actionable
  - _Requirements: 3.5, 4.5_

- [ ]* 13. Write integration tests for the compliance page
  - Test page loads correctly with valid client ID
  - Test compliance items display with correct data
  - Test summary statistics calculate correctly
  - Test "Mark as Filed" updates status and refreshes data
  - Test "Create Task" creates task and shows success message
  - Test filing history displays when company number exists
  - Test filing history hidden when no company number
  - Test error handling for various failure scenarios
  - Test navigation from client detail page works correctly
  - _Requirements: All_

