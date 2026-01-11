# Implementation Plan

- [x] 1. Create client data management hook
  - Create `apps/web/src/hooks/useClientData.ts` file
  - Implement client data caching with Map
  - Implement `fetchClientByRef` function to get client by reference
  - Implement `fetchClientById` function to get client by UUID
  - Implement `searchClients` function for client search
  - Add loading and error state management
  - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [x] 2. Create ClientSelect component
  - Create `apps/web/src/components/ClientSelect.tsx` file
  - Implement search input with debouncing (300ms)
  - Implement dropdown display for search results
  - Display client name and reference in results
  - Handle client selection and call onChange callback
  - Show loading indicator during search
  - Show "No clients found" message when no results
  - Add "No client" / "None" option for clearing selection
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Enhance calendar event loading with client names
  - Import and use `useClientData` hook in calendar page
  - Update `loadEvents` function to fetch client names for events with clientRef
  - Handle events that already have clientName (skip fetch)
  - Handle events without client data (no fetch needed)
  - Update task events mapping to preserve existing clientName
  - _Requirements: 1.3, 2.1, 7.3_

- [x] 4. Update calendar grid display to show client names
  - Modify `mapToFullCalendarEvent` function
  - Append client name to event title with separator (•)
  - Format: "Event Title • Client Name"
  - Handle events without client names (show title only)
  - Ensure display works in all calendar views (month, week, day)
  - _Requirements: 1.1, 4.1, 4.2, 4.4_

- [x] 5. Enhance event modal to display client information
  - Update view mode client information section
  - Display client name prominently as primary identifier
  - Show client reference in parentheses after name
  - Make client name a clickable link to client detail page
  - Handle events with only clientRef (show reference with label)
  - Handle events without any client data (hide section)
  - _Requirements: 1.2, 3.1, 3.2, 3.3, 3.5_

- [x] 6. Replace client reference input with ClientSelect in edit form
  - Import ClientSelect component
  - Replace existing client reference text input
  - Wire up onChange to update clientRef, clientName, and clientId
  - Show selected client information below dropdown
  - Handle clearing client selection
  - Preserve existing client data when opening edit form
  - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Update create event form with ClientSelect
  - Import ClientSelect component
  - Replace client reference input with ClientSelect
  - Wire up onChange to populate newEvent state
  - Show selected client information
  - Handle form submission with client data
  - _Requirements: 1.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Add error handling for client data loading
  - Handle client not found scenario (show "Not Found" indicator)
  - Handle network errors (show error message and retry option)
  - Handle invalid client references in forms (validation)
  - Add error logging for debugging
  - Ensure graceful degradation (calendar loads even if client fetch fails)
  - _Requirements: 2.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Update event data transformation functions
  - Update `transformToBackend` to include clientId if available
  - Update `transformFromBackend` to preserve clientName
  - Ensure clientRef, clientName, and clientId are all handled
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 10. Add CSS styling for client display
  - Style client name separator (•) with appropriate color
  - Style client reference in parentheses (smaller, gray)
  - Style "Not Found" indicator (red text)
  - Style ClientSelect dropdown (z-index, shadows, hover states)
  - Ensure consistent styling with existing MDJ UI
  - _Requirements: 3.4, 4.5_

- [x] 11. Test calendar grid client name display
  - Create events with client associations
  - Verify client names appear on calendar grid
  - Verify format: "Event Title • Client Name"
  - Test in month, week, and day views
  - Test with long event titles and client names (truncation)
  - Test events without clients (no client name shown)
  - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Test event modal client display
  - Click on event with client
  - Verify client name displayed prominently
  - Verify client reference in parentheses
  - Verify client name is clickable link
  - Click link and verify navigation to client page
  - Test event without client (section hidden)
  - Test event with only clientRef (shows reference)
  - _Requirements: 1.2, 1.5, 3.1, 3.2, 3.3, 3.5_

- [x] 13. Test client selection in create form
  - Open create event form
  - Type in client search field (test debouncing)
  - Verify search results appear after 2+ characters
  - Verify results show name and reference
  - Select a client
  - Verify client data populated (ref, name, id)
  - Submit form and verify event created with client
  - Test "No client" option
  - _Requirements: 1.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Test client selection in edit form
  - Edit event with existing client
  - Verify current client shown
  - Search for different client
  - Select new client
  - Save and verify client updated
  - Edit event without client
  - Add client and verify it appears
  - Clear client and verify it's removed
  - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 15. Test client data caching
  - Open calendar with multiple events from same client
  - Check browser network tab
  - Verify client data fetched only once per client
  - Click on different events with same client
  - Verify no additional API calls made
  - Refresh page and verify cache cleared
  - _Requirements: 2.5_

- [ ] 16. Test error handling
  - Create event with invalid client reference
  - Verify error message displayed
  - Test with client that doesn't exist
  - Verify "Not Found" indicator
  - Stop API server
  - Try to load calendar
  - Verify error message and retry option
  - Verify calendar still displays (graceful degradation)
  - Restart API and verify retry works
  - _Requirements: 2.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 17. Test consistency across calendar and tasks
  - Compare client display in calendar vs tasks
  - Verify same format used
  - Verify same styling
  - Verify both have clickable links
  - Search for client name in task list
  - Verify search works
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 18. Test data persistence
  - Create event with client
  - Refresh page
  - Verify client name still displayed
  - Edit event and change client
  - Refresh page
  - Verify new client name displayed
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 19. Verify task list client display (existing functionality)
  - Open task list
  - Verify client names displayed in client column
  - Verify client names are clickable links
  - Click link and verify navigation
  - Verify tasks without clients show empty cell
  - Search for client name in task filter
  - Verify search works
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 20. Final integration test
  - Create multiple events with different clients
  - Verify all client names displayed on calendar
  - Click on each event and verify client info in modal
  - Edit one event to change client
  - Verify calendar updates
  - Create new event with client selection
  - Verify it appears correctly
  - Delete an event
  - Verify calendar updates
  - Test with events without clients
  - Verify no errors or display issues
  - _Requirements: All_
