# Task 13: Manual Verification Guide - Client Selection in Create Form

## Test Objective
Verify that the client selection functionality works correctly in the create event form.

## Prerequisites
1. API server running on http://localhost:3001
2. Web server running on http://localhost:3000
3. At least 2-3 test clients in the system

## Test Steps

### 1. Open Create Event Form
- [ ] Navigate to http://localhost:3000/calendar
- [ ] Click "Add Event" button
- [ ] Verify create event modal opens
- [ ] Verify "Client" field with search input is visible

### 2. Test Search Debouncing
- [ ] Type "A" in the client search field
- [ ] Wait 200ms - verify no dropdown appears
- [ ] Type "c" (making it "Ac")
- [ ] Wait 300ms - verify dropdown appears with search results

### 3. Verify Search Results Display
- [ ] Verify dropdown shows client names (e.g., "Acme Corporation Ltd")
- [ ] Verify dropdown shows client references (e.g., "1A001")
- [ ] Verify "No client" option appears at top of dropdown
- [ ] Verify "Clear selection" text appears next to "No client"

### 4. Test Minimum Character Requirement
- [ ] Clear the search field
- [ ] Type only "A" (1 character)
- [ ] Wait 300ms
- [ ] Verify no search is triggered (no dropdown)
- [ ] Type "c" (making it "Ac" - 2 characters)
- [ ] Wait 300ms
- [ ] Verify search is triggered and dropdown appears

### 5. Select a Client
- [ ] Click on a client from the dropdown (e.g., "Acme Corporation Ltd")
- [ ] Verify input field updates to show "Acme Corporation Ltd (1A001)"
- [ ] Verify dropdown closes
- [ ] Verify "Selected: Acme Corporation Ltd (1A001)" text appears below input

### 6. Test "No Client" Option
- [ ] With a client selected, open the dropdown again by typing
- [ ] Click "No client" option
- [ ] Verify input field is cleared
- [ ] Verify "Selected:" text disappears
- [ ] Verify clear button (×) is no longer visible

### 7. Test Clear Button (×)
- [ ] Select a client again
- [ ] Verify clear button (×) appears on the right side of input
- [ ] Click the clear button (×)
- [ ] Verify input field is cleared
- [ ] Verify "Selected:" text disappears

### 8. Submit Form with Client
- [ ] Fill in required fields:
  - Title: "Test Meeting"
  - Start: (select a future date/time)
- [ ] Select a client (e.g., "Beta Industries Inc")
- [ ] Verify "Selected: Beta Industries Inc (2B001)" appears
- [ ] Click "Create Event" button
- [ ] Verify modal closes
- [ ] Verify event appears on calendar
- [ ] Click on the newly created event
- [ ] Verify event modal shows client name "Beta Industries Inc"
- [ ] Verify client reference "(2B001)" appears in parentheses

### 9. Test Search by Reference
- [ ] Open create event form again
- [ ] Type a client reference in search field (e.g., "1A001")
- [ ] Wait 300ms
- [ ] Verify matching client appears in dropdown
- [ ] Verify both name and reference are displayed

### 10. Test "No Clients Found"
- [ ] Clear search field
- [ ] Type "XYZ999NonExistent"
- [ ] Wait 300ms
- [ ] Verify "No clients found" message appears in dropdown
- [ ] Verify "No client" option still appears

### 11. Test Loading Indicator
- [ ] Clear search field
- [ ] Type "Ac" quickly
- [ ] Observe the right side of the input field
- [ ] Verify spinning loading indicator appears briefly
- [ ] Verify loading indicator disappears when results load

### 12. Verify Event Created with Client Data
- [ ] Open browser developer tools (F12)
- [ ] Go to Network tab
- [ ] Create a new event with a client selected
- [ ] Find the POST request to `/calendar` or `/calendar/events`
- [ ] Verify request payload includes:
  - `clientRef`: "1A001" (or similar)
  - `clientName`: "Acme Corporation Ltd" (or similar)
  - `clientId`: "uuid-string"

## Expected Results

All checkboxes should be checked, indicating:
- ✅ Search debouncing works (300ms delay)
- ✅ Search requires 2+ characters
- ✅ Results show client name and reference
- ✅ Client selection populates all fields (ref, name, id)
- ✅ "No client" option clears selection
- ✅ Clear button (×) works
- ✅ Form submission includes client data
- ✅ Created event displays client name on calendar
- ✅ Event modal shows client information correctly

## Requirements Validated

- ✅ Requirement 1.3: Create new event with client reference and fetch client name
- ✅ Requirement 6.1: Client selection dropdown/autocomplete
- ✅ Requirement 6.2: Display client names with references
- ✅ Requirement 6.3: Populate client reference and name fields on selection
- ✅ Requirement 6.4: Support searching by client name or reference
- ✅ Requirement 6.5: "No client" option for clearing selection

## Notes

- If any test fails, document the failure and the expected vs actual behavior
- Check browser console for any errors
- Verify API responses in Network tab if issues occur
