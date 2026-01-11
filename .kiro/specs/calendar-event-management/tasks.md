# Implementation Plan

- [x] 1. Add state management for edit and delete functionality
  - Add state variables for edit mode, edited event, deleting status, and delete confirmation
  - Add state variable for validation errors
  - Initialize all state variables with appropriate default values
  - _Requirements: 1.2, 2.2, 3.4, 4.1, 4.2, 5.2_

- [x] 2. Implement edit mode functionality
  - [x] 2.1 Create handleEditClick function
    - Switch modal to edit mode
    - Copy selected event to editedEvent state
    - Clear any existing validation errors
    - _Requirements: 1.2_
  
  - [x] 2.2 Create handleCancelEdit function
    - Exit edit mode without saving
    - Clear editedEvent state
    - Clear validation errors
    - Return to view mode
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 2.3 Create validateEventForm function
    - Validate title is not empty
    - Validate start date is present
    - Validate end date is after start date (if provided)
    - Return object with field-specific error messages
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 2.4 Create handleSaveEdit function
    - Validate form data before submission
    - Show validation errors if validation fails
    - Call API to update event with correct endpoint
    - Update local events state with new data
    - Update selectedEvent with new data
    - Exit edit mode on success
    - Show success message
    - Handle errors and display error messages
    - _Requirements: 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Implement delete/cancel event functionality
  - [x] 3.1 Create handleDeleteClick function
    - Show delete confirmation dialog
    - _Requirements: 2.2_
  
  - [x] 3.2 Create handleCancelDelete function
    - Hide delete confirmation dialog
    - Return to view mode
    - _Requirements: 2.2_
  
  - [x] 3.3 Create handleConfirmDelete function
    - Call API to delete event with correct endpoint
    - Remove event from local events state
    - Close modal
    - Show success message
    - Handle errors and display error messages
    - _Requirements: 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 4. Update event modal view mode
  - Add "Edit Event" button to modal actions
  - Add "Cancel Event" button to modal actions
  - Hide edit/delete buttons for auto-task events (id starts with "task-")
  - Wire up buttons to handleEditClick and handleDeleteClick
  - _Requirements: 1.1, 2.1_

- [x] 5. Create edit mode form UI
  - [x] 5.1 Create editable form layout
    - Add form wrapper with onSubmit handler
    - Create input field for title with value binding
    - Create textarea for description with value binding
    - Create datetime-local inputs for start and end dates
    - Create select dropdown for event type
    - Create select dropdown for status
    - Create input field for location
    - Create input field for clientRef
    - _Requirements: 1.3_
  
  - [x] 5.2 Add validation error display
    - Show error message below title field when validation fails
    - Show error message below start date when validation fails
    - Show error message below end date when validation fails
    - Style error messages in red
    - _Requirements: 3.4, 3.5_
  
  - [x] 5.3 Add form action buttons
    - Add "Cancel" button that calls handleCancelEdit
    - Add "Save Changes" button that submits form
    - Disable buttons during save operation
    - Show loading text on save button during save
    - _Requirements: 4.1, 4.2, 4.5, 5.1_

- [x] 6. Create delete confirmation dialog
  - Create modal backdrop for confirmation dialog
  - Create modal card with warning message
  - Add "No, Keep Event" button that calls handleCancelDelete
  - Add "Yes, Cancel Event" button that calls handleConfirmDelete
  - Disable buttons during delete operation
  - Show loading text on confirm button during delete
  - Style confirm button as danger/red
  - _Requirements: 2.2, 4.1, 4.2_

- [ ] 7. Fix API endpoint alignment
  - Update PUT call to use `/calendar/events/:id` instead of `/calendar/:id`
  - Update DELETE call to use `/calendar/events/:id` instead of `/calendar/:id`
  - Test that API calls work with correct endpoints
  - _Requirements: 1.4, 2.3_

- [x] 8. Add data transformation for API calls
  - Transform frontend event data to backend format before PUT request
  - Map `start` to `startDate`, `end` to `endDate`
  - Convert status to uppercase for backend
  - Convert type to uppercase for backend
  - Handle optional fields correctly
  - _Requirements: 1.4, 2.3_

- [x] 9. Implement conditional rendering for modal modes
  - Show edit form when isEditing is true
  - Show view mode when isEditing is false
  - Show delete confirmation when showDeleteConfirm is true
  - Ensure proper z-index layering for nested modals
  - _Requirements: 1.2, 2.2_

- [x] 10. Add success and error feedback
  - Show success message after successful edit
  - Show success message after successful delete
  - Show error message when edit fails
  - Show error message when delete fails
  - Clear error messages when user retries
  - _Requirements: 4.3, 4.4_

- [x] 11. Test edit functionality
  - Manually test editing event title
  - Manually test editing event dates
  - Manually test editing event type and status
  - Manually test editing optional fields
  - Verify calendar updates after save
  - Verify changes persist after page refresh
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 12. Test validation
  - Test empty title shows error
  - Test invalid date shows error
  - Test end before start shows error
  - Test form cannot submit with errors
  - Test errors clear when fields corrected
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 13. Test cancel edit functionality
  - Test cancel button exits edit mode
  - Test changes are discarded on cancel
  - Test original data still displayed after cancel
  - Test no API call made on cancel
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 14. Test delete functionality
  - Test delete button shows confirmation
  - Test "No" button cancels delete
  - Test "Yes" button deletes event
  - Verify event removed from calendar
  - Verify modal closes after delete
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 15. Test error handling
  - Test edit with API server stopped
  - Test delete with API server stopped
  - Verify error messages displayed
  - Verify modal stays open on error
  - Verify user can retry after error
  - _Requirements: 1.6, 2.5, 4.4_

- [x] 16. Test auto-task protection
  - Click on auto-task event (id starts with "task-")
  - Verify edit button not shown
  - Verify delete button not shown
  - Verify only close button available
  - _Requirements: 1.1, 2.1_

- [x] 17. Final integration test
  - Test complete edit workflow end-to-end
  - Test complete delete workflow end-to-end
  - Test switching between multiple events
  - Test editing then deleting same event
  - Verify all features work together correctly
  - _Requirements: All_
