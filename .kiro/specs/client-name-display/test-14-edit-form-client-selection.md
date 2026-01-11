# Test 14: Client Selection in Edit Form

## Test Overview
This test verifies that client selection works correctly in the edit event form, including:
- Editing events with existing clients
- Changing clients
- Adding clients to events without them
- Clearing client selections

**Requirements tested:** 1.4, 6.1, 6.2, 6.3, 6.4, 6.5

## Prerequisites
- MDJ Practice Manager application running (API and Web)
- At least 3-4 test clients in the system
- At least 2 calendar events created (one with a client, one without)

## Test Scenarios

### Scenario 1: Edit Event with Existing Client

**Objective:** Verify that when editing an event that already has a client, the current client is displayed correctly.

**Steps:**
1. Navigate to the Calendar page
2. Click on an event that has a client associated with it
3. Click the "Edit" button in the event modal
4. Observe the client selection field

**Expected Results:**
- ✅ The client selection field shows the current client name and reference
- ✅ Format should be: "Client Name (Reference)" e.g., "Acme Corporation Ltd (1A001)"
- ✅ Below the dropdown, there should be text showing: "Selected: Client Name (Reference)"
- ✅ A clear button (×) should be visible next to the input field

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 2: Verify Current Client Shown

**Objective:** Confirm that the existing client data is preserved when opening the edit form.

**Steps:**
1. From the previous scenario, note the client name and reference shown
2. Close the edit modal without making changes
3. Reopen the same event for editing
4. Verify the client information is still displayed

**Expected Results:**
- ✅ Client information persists across modal open/close
- ✅ No API calls are made unnecessarily (check browser Network tab)
- ✅ Client data matches what was shown in the view mode

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 3: Search for Different Client

**Objective:** Verify that users can search for a different client to replace the current one.

**Steps:**
1. Open an event with a client for editing
2. Click in the client selection field
3. Clear the current value
4. Type at least 2 characters of a different client's name (e.g., "Beta")
5. Wait for search results to appear (should take ~300ms)

**Expected Results:**
- ✅ Search results appear after typing 2+ characters
- ✅ Results show client names and references
- ✅ Results are displayed in a dropdown below the input
- ✅ Loading indicator appears briefly during search
- ✅ Multiple matching clients are shown if available

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 4: Select New Client

**Objective:** Verify that selecting a new client updates the event's client association.

**Steps:**
1. From the previous scenario, with search results visible
2. Click on a different client from the search results
3. Observe the client selection field
4. Verify the "Selected:" text below the field updates

**Expected Results:**
- ✅ The input field updates to show the new client name and reference
- ✅ The dropdown closes after selection
- ✅ The "Selected:" text shows the new client information
- ✅ The clear button (×) remains visible

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 5: Save and Verify Client Updated

**Objective:** Confirm that saving the event with a new client persists the change.

**Steps:**
1. From the previous scenario, with a new client selected
2. Click the "Save" button
3. Wait for the save operation to complete
4. Close the modal
5. Click on the same event again to view details
6. Verify the client information in view mode

**Expected Results:**
- ✅ Save operation completes successfully
- ✅ No error messages appear
- ✅ Event modal closes after save
- ✅ When reopening the event, the new client name is displayed
- ✅ Calendar grid shows the event with the new client name appended

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 6: Edit Event Without Client

**Objective:** Verify that events without clients can have clients added.

**Steps:**
1. Navigate to the Calendar page
2. Click on an event that does NOT have a client associated
3. Click the "Edit" button
4. Observe the client selection field

**Expected Results:**
- ✅ The client selection field is empty
- ✅ Placeholder text is visible: "Search for a client..."
- ✅ No "Selected:" text is shown below the field
- ✅ No clear button (×) is visible

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 7: Add Client to Event

**Objective:** Verify that a client can be added to an event that previously had none.

**Steps:**
1. From the previous scenario, with an event without a client
2. Click in the client selection field
3. Type at least 2 characters to search for a client
4. Wait for search results
5. Click on a client from the results
6. Verify the client is selected
7. Click "Save"

**Expected Results:**
- ✅ Search works correctly
- ✅ Client can be selected
- ✅ Input field shows selected client
- ✅ "Selected:" text appears with client info
- ✅ Save operation succeeds
- ✅ Event now shows client information in view mode

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 8: Verify Client Appears After Adding

**Objective:** Confirm that the newly added client persists and displays correctly.

**Steps:**
1. From the previous scenario, after saving
2. Close the event modal
3. Observe the calendar grid
4. Click on the event again to view details

**Expected Results:**
- ✅ Calendar grid shows event title with client name appended: "Event Title • Client Name"
- ✅ Event modal view mode shows client information
- ✅ Client name is displayed prominently
- ✅ Client reference is shown in parentheses
- ✅ Client name is a clickable link

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 9: Clear Client Selection (Clear Button)

**Objective:** Verify that the clear button (×) removes the client association.

**Steps:**
1. Open an event with a client for editing
2. Locate the clear button (×) next to the client selection field
3. Click the clear button
4. Observe the client selection field

**Expected Results:**
- ✅ The input field is cleared
- ✅ The "Selected:" text disappears
- ✅ The clear button (×) disappears
- ✅ Placeholder text reappears: "Search for a client..."

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 10: Clear Client Selection ("No client" Option)

**Objective:** Verify that the "No client" option in the dropdown removes the client association.

**Steps:**
1. Open an event with a client for editing
2. Click in the client selection field
3. Type at least 2 characters to open the dropdown
4. Look for the "No client" option at the top of the dropdown
5. Click on "No client"
6. Observe the client selection field

**Expected Results:**
- ✅ "No client" option is visible in the dropdown
- ✅ "Clear selection" text is shown next to "No client"
- ✅ Clicking "No client" clears the input field
- ✅ The "Selected:" text disappears
- ✅ The clear button (×) disappears

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 11: Save After Clearing Client

**Objective:** Confirm that saving after clearing a client removes the client association.

**Steps:**
1. From the previous scenario, with the client cleared
2. Click "Save"
3. Wait for save to complete
4. Close the modal
5. Click on the event again to view details

**Expected Results:**
- ✅ Save operation succeeds
- ✅ No error messages appear
- ✅ Event modal view mode does NOT show client section
- ✅ Calendar grid shows event title without client name appended

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

### Scenario 12: Verify Client is Removed

**Objective:** Final verification that the client has been completely removed from the event.

**Steps:**
1. From the previous scenario, view the event details
2. Verify no client information is displayed
3. Click "Edit" to open edit form
4. Verify the client selection field is empty

**Expected Results:**
- ✅ No client section in view mode
- ✅ Client selection field is empty in edit mode
- ✅ No "Selected:" text is shown
- ✅ Placeholder text is visible

**Actual Results:**
- [ ] Pass
- [ ] Fail

**Notes:**
_Record any observations or issues here_

---

## Additional Test Cases

### Edge Case 1: Rapid Client Changes

**Objective:** Verify that rapidly changing clients works correctly.

**Steps:**
1. Open an event for editing
2. Search for and select Client A
3. Immediately search for and select Client B
4. Immediately search for and select Client C
5. Save the event

**Expected Results:**
- ✅ All selections work smoothly
- ✅ Final selection (Client C) is saved
- ✅ No errors occur

**Actual Results:**
- [ ] Pass
- [ ] Fail

---

### Edge Case 2: Cancel After Changing Client

**Objective:** Verify that canceling the edit doesn't save client changes.

**Steps:**
1. Open an event with Client A for editing
2. Change the client to Client B
3. Click "Cancel" instead of "Save"
4. Reopen the event to view details

**Expected Results:**
- ✅ Original client (Client A) is still associated
- ✅ Changes were not saved
- ✅ No errors occur

**Actual Results:**
- [ ] Pass
- [ ] Fail

---

### Edge Case 3: Client with Special Characters

**Objective:** Verify that clients with special characters in names work correctly.

**Steps:**
1. Search for a client with special characters (e.g., "O'Brien & Associates Ltd.")
2. Select the client
3. Save the event
4. Verify the client name displays correctly

**Expected Results:**
- ✅ Special characters display correctly in search results
- ✅ Special characters display correctly in input field
- ✅ Special characters display correctly after save
- ✅ No encoding issues

**Actual Results:**
- [ ] Pass
- [ ] Fail

---

## Test Summary

**Total Scenarios:** 15
**Passed:** ___
**Failed:** ___
**Pass Rate:** ___%

## Issues Found

| Issue # | Scenario | Description | Severity | Status |
|---------|----------|-------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Recommendations

_List any recommendations for improvements or fixes_

## Sign-off

**Tester Name:** _______________
**Date:** _______________
**Overall Result:** [ ] Pass [ ] Fail

## Notes

_Any additional observations or comments_
