# Test 11: Calendar Grid Client Name Display

**Task**: Test calendar grid client name display  
**Requirements**: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5  
**Date**: 2025-11-25  
**Status**: In Progress

## Test Objectives

Verify that client names are correctly displayed on the calendar grid with proper formatting, styling, and behavior across different calendar views.

## Prerequisites

1. Application is running (API and Web)
2. At least one client exists in the system
3. Calendar page is accessible at `/calendar`

## Test Cases

### Test Case 1: Create Events with Client Associations

**Objective**: Create test events with different client associations

**Steps**:
1. Navigate to `/calendar`
2. Click "Add Event" button
3. Create Event 1:
   - Title: "Client Meeting - Acme Corp"
   - Start: Tomorrow at 10:00 AM
   - Type: Meeting
   - Client: Search and select a client (e.g., "Acme")
   - Click "Create Event"
4. Create Event 2:
   - Title: "Tax Filing Deadline"
   - Start: Next week at 5:00 PM
   - Type: Deadline
   - Client: Search and select a different client
   - Click "Create Event"
5. Create Event 3:
   - Title: "Team Standup"
   - Start: Today at 2:00 PM
   - Type: Meeting
   - Client: Leave empty (no client)
   - Click "Create Event"

**Expected Results**:
- ✅ All three events are created successfully
- ✅ Events appear on the calendar grid
- ✅ No errors in console

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 2: Verify Client Names Appear on Calendar Grid

**Objective**: Confirm client names are displayed alongside event titles

**Steps**:
1. View the calendar in Month view
2. Locate Event 1 (Client Meeting - Acme Corp)
3. Locate Event 2 (Tax Filing Deadline)
4. Locate Event 3 (Team Standup)

**Expected Results**:
- ✅ Event 1 displays as: "Client Meeting - Acme Corp • [Client Name]"
- ✅ Event 2 displays as: "Tax Filing Deadline • [Client Name]"
- ✅ Event 3 displays as: "Team Standup" (no client name appended)
- ✅ Client names are visible and readable

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 3: Verify Format "Event Title • Client Name"

**Objective**: Confirm the separator format is correct (Requirement 4.2)

**Steps**:
1. Examine Event 1 on the calendar grid
2. Check the separator between title and client name
3. Verify spacing around the separator

**Expected Results**:
- ✅ Separator is a bullet point (•)
- ✅ There is space before and after the bullet
- ✅ Format matches: "Title • Client Name"
- ✅ Separator is visually distinct

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 4: Test in Month View

**Objective**: Verify client names display correctly in month view (Requirement 4.4)

**Steps**:
1. Ensure calendar is in Month view (click "Month" button)
2. Verify all events with clients show client names
3. Check readability of text
4. Verify color coding is maintained

**Expected Results**:
- ✅ All events with clients show "Title • Client Name"
- ✅ Text is readable (not too small)
- ✅ Event colors are preserved
- ✅ Client names don't break layout

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 5: Test in Week View

**Objective**: Verify client names display correctly in week view (Requirement 4.4)

**Steps**:
1. Click "Week" button to switch to week view
2. Verify all events with clients show client names
3. Check if more detail is visible in week view
4. Verify layout is not broken

**Expected Results**:
- ✅ All events with clients show "Title • Client Name"
- ✅ Text is readable in week view
- ✅ Event colors are preserved
- ✅ Time slots are correctly displayed

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 6: Test in Day View

**Objective**: Verify client names display correctly in day view (Requirement 4.4)

**Steps**:
1. Click "Day" button to switch to day view
2. Navigate to a day with events
3. Verify all events with clients show client names
4. Check if full details are visible

**Expected Results**:
- ✅ All events with clients show "Title • Client Name"
- ✅ Text is fully readable in day view
- ✅ Event colors are preserved
- ✅ Time slots show correct duration

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 7: Test with Long Event Titles and Client Names (Truncation)

**Objective**: Verify text truncation works correctly (Requirement 4.3)

**Steps**:
1. Click "Add Event" button
2. Create Event 4:
   - Title: "Very Long Event Title That Should Be Truncated When Combined With Client Name"
   - Start: Tomorrow at 3:00 PM
   - Type: Meeting
   - Client: Select a client with a long name
   - Click "Create Event"
3. View the event in Month view
4. View the event in Week view
5. View the event in Day view

**Expected Results**:
- ✅ Text is truncated with ellipsis (...) when too long
- ✅ Truncation doesn't break the layout
- ✅ Full text is visible when hovering (browser tooltip)
- ✅ Truncation behavior is consistent across views

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 8: Test Events Without Clients (No Client Name Shown)

**Objective**: Verify events without clients don't show client names (Requirement 1.1)

**Steps**:
1. Locate Event 3 (Team Standup) which has no client
2. Verify it displays only the title
3. Check that no separator or extra text is shown

**Expected Results**:
- ✅ Event displays as: "Team Standup" (title only)
- ✅ No bullet separator (•) is shown
- ✅ No extra spacing or formatting
- ✅ Event looks clean and normal

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 9: Test Font Sizes and Colors (Readability)

**Objective**: Verify styling maintains readability (Requirement 4.5)

**Steps**:
1. View calendar in Month view
2. Check font size of event titles
3. Check font size of client names
4. Verify color contrast
5. Check separator color

**Expected Results**:
- ✅ Font sizes are appropriate for reading
- ✅ Client names are same size as title (or slightly smaller)
- ✅ Text has good contrast against background
- ✅ Separator (•) is visible but not distracting
- ✅ Styling is consistent with MDJ UI design

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 10: Test Multiple Events on Same Day

**Objective**: Verify client names display correctly when multiple events exist on same day

**Steps**:
1. Create 3-4 events on the same day with different clients
2. View in Month view
3. View in Day view
4. Check if all client names are visible

**Expected Results**:
- ✅ All events show their respective client names
- ✅ No overlap or collision of text
- ✅ Each event is distinguishable
- ✅ Layout remains organized

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 11: Test Client Name with Special Characters

**Objective**: Verify special characters in client names display correctly

**Steps**:
1. If possible, create or use a client with special characters (e.g., "O'Brien & Associates Ltd.")
2. Create an event with this client
3. View on calendar grid

**Expected Results**:
- ✅ Special characters display correctly
- ✅ No encoding issues (e.g., &amp; instead of &)
- ✅ Text is properly escaped
- ✅ No layout issues

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

### Test Case 12: Test Refresh and Persistence

**Objective**: Verify client names persist after page refresh

**Steps**:
1. Note the events with client names on the calendar
2. Click browser refresh (F5 or Cmd+R)
3. Wait for calendar to reload
4. Verify all events still show client names

**Expected Results**:
- ✅ All events reload with client names
- ✅ Format is preserved: "Title • Client Name"
- ✅ No data loss
- ✅ No errors in console

**Actual Results**:
- [ ] Pass
- [ ] Fail
- Notes: _______________________________________________

---

## Summary

**Total Test Cases**: 12  
**Passed**: ___  
**Failed**: ___  
**Blocked**: ___  

**Overall Status**: [ ] Pass [ ] Fail [ ] Partial

## Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

## Screenshots

(Attach screenshots showing:)
- Month view with client names
- Week view with client names
- Day view with client names
- Long title truncation
- Event without client

## Notes

_______________________________________________
_______________________________________________
_______________________________________________

## Sign-off

**Tester**: _______________________________________________  
**Date**: _______________________________________________  
**Approved**: [ ] Yes [ ] No
