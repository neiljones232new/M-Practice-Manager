# Test 12: Event Modal Client Display - Manual Testing Guide

**Task**: Test event modal client display  
**Requirements**: 1.2, 1.5, 3.1, 3.2, 3.3, 3.5

## Overview

This test verifies that client information is correctly displayed in the event modal when viewing event details. The modal should show client names prominently, display references in parentheses, make client names clickable links, and handle various edge cases gracefully.

## Prerequisites

1. Development server running (`npm run dev`)
2. API server running with client data available
3. Calendar page accessible at `/calendar`
4. At least one client in the system (e.g., "Acme Corporation Ltd" with ref "1A001")

## Test Setup

### Create Test Events

Before testing, create the following test events via the calendar UI or API:

1. **Event with full client data**
   - Title: "Client Meeting"
   - Client: Select "Acme Corporation Ltd (1A001)"
   - Start: Any future date/time

2. **Event without client**
   - Title: "Team Meeting"
   - Client: Leave empty
   - Start: Any future date/time

3. **Event with invalid client reference** (if possible via API)
   - Title: "Orphaned Event"
   - clientRef: "INVALID999"
   - clientName: "INVALID999 (Not Found)"
   - Start: Any future date/time

## Test Cases

### Test Case 1: Event with Client - Full Display

**Requirement**: 1.2, 3.1, 3.2, 3.5

**Steps**:
1. Navigate to `/calendar`
2. Click on "Client Meeting" event on the calendar grid
3. Event modal should open

**Expected Results**:
- ✅ Modal displays with title "Event Details"
- ✅ Client section is visible
- ✅ Client name "Acme Corporation Ltd" is displayed prominently
- ✅ Client name appears larger/bolder than other text (primary identifier)
- ✅ Client reference "(1A001)" appears after the name in parentheses
- ✅ Client reference is in a smaller, gray font
- ✅ Client name is a clickable link (blue/underlined on hover)
- ✅ Link has proper styling (cursor pointer, hover effect)

**Screenshot Location**: Take screenshot and save as `test-12-screenshot-1.png`

---

### Test Case 2: Click Client Name Link

**Requirement**: 3.5

**Steps**:
1. With event modal open from Test Case 1
2. Click on the client name "Acme Corporation Ltd"

**Expected Results**:
- ✅ Browser navigates to `/clients/1A001` (or similar client detail page)
- ✅ Client detail page loads successfully
- ✅ Correct client information is displayed

**Screenshot Location**: Take screenshot of client page and save as `test-12-screenshot-2.png`

---

### Test Case 3: Event without Client - Hidden Section

**Requirement**: 1.5

**Steps**:
1. Navigate back to `/calendar`
2. Click on "Team Meeting" event (the one without a client)
3. Event modal should open

**Expected Results**:
- ✅ Modal displays with title "Event Details"
- ✅ Client section is NOT visible
- ✅ No empty client field or placeholder shown
- ✅ Other event details (title, date, description) display normally
- ✅ No errors in browser console

**Screenshot Location**: Take screenshot and save as `test-12-screenshot-3.png`

---

### Test Case 4: Event with Only Client Reference

**Requirement**: 3.3

**Steps**:
1. Create a new event via API with only `clientRef` field (no `clientName`)
   ```json
   {
     "title": "Reference Only Event",
     "startDate": "2025-12-01T10:00:00Z",
     "clientRef": "2B002"
   }
   ```
2. Navigate to `/calendar`
3. Click on the newly created event

**Expected Results**:
- ✅ Modal displays with title "Event Details"
- ✅ Client section is visible
- ✅ Label "Reference:" is displayed
- ✅ Client reference "2B002" is shown after the label
- ✅ Reference is displayed in monospace font
- ✅ No client name link is shown (since name is not available)

**Screenshot Location**: Take screenshot and save as `test-12-screenshot-4.png`

---

### Test Case 5: Event with Client Not Found

**Requirement**: 8.1

**Steps**:
1. If you have an event with invalid client reference from setup
2. Navigate to `/calendar`
3. Click on "Orphaned Event"

**Expected Results**:
- ✅ Modal displays with title "Event Details"
- ✅ Client section is visible
- ✅ Warning icon (⚠) is displayed
- ✅ Text shows "INVALID999 (Not Found)" in red/warning color
- ✅ Helper text "Client may have been deleted" is shown
- ✅ Client name is NOT a clickable link
- ✅ No navigation occurs if text is clicked

**Screenshot Location**: Take screenshot and save as `test-12-screenshot-5.png`

---

### Test Case 6: Client Display Styling Consistency

**Requirement**: 3.4

**Steps**:
1. Open event modal with client (Test Case 1)
2. Inspect the client section styling
3. Compare with task list client display (navigate to `/tasks`)

**Expected Results**:
- ✅ Client section has consistent border and padding
- ✅ Background color matches other info sections
- ✅ Font sizes are consistent with design system
- ✅ Colors match MDJ UI theme (gold accents, proper grays)
- ✅ Spacing between elements is uniform
- ✅ Styling matches task list client display

**Screenshot Location**: Take screenshots of both and save as `test-12-screenshot-6a.png` and `test-12-screenshot-6b.png`

---

### Test Case 7: Long Client Names

**Requirement**: 4.3 (related)

**Steps**:
1. Create an event with a very long client name
   - Client: "The Very Long International Business Solutions Corporation Limited Partnership"
2. Click on the event to open modal

**Expected Results**:
- ✅ Modal displays without layout breaking
- ✅ Long client name wraps to multiple lines if needed
- ✅ Client reference still appears on same line or wraps gracefully
- ✅ All text remains readable
- ✅ Modal width adjusts appropriately

**Screenshot Location**: Take screenshot and save as `test-12-screenshot-7.png`

---

### Test Case 8: Special Characters in Client Name

**Steps**:
1. Create an event with client name containing special characters
   - Client: "O'Brien & Associates Ltd."
2. Click on the event to open modal

**Expected Results**:
- ✅ Special characters display correctly (apostrophe, ampersand, period)
- ✅ No encoding issues (no &amp; or &#39;)
- ✅ Client name is still clickable
- ✅ Link works correctly

**Screenshot Location**: Take screenshot and save as `test-12-screenshot-8.png`

---

### Test Case 9: Unicode Characters in Client Name

**Steps**:
1. Create an event with client name containing unicode characters
   - Client: "Société Française Ltd"
2. Click on the event to open modal

**Expected Results**:
- ✅ Unicode characters display correctly (é)
- ✅ No encoding issues
- ✅ Client name is still clickable
- ✅ Link works correctly

**Screenshot Location**: Take screenshot and save as `test-12-screenshot-9.png`

---

### Test Case 10: Modal Close and Reopen

**Steps**:
1. Open event modal with client
2. Click "Close" button
3. Click on the same event again

**Expected Results**:
- ✅ Modal closes completely
- ✅ Modal reopens with same client information
- ✅ Client data is still displayed correctly
- ✅ Link is still functional

---

### Test Case 11: Multiple Events with Same Client

**Steps**:
1. Create two events with the same client
2. Click on first event, verify client display
3. Close modal
4. Click on second event, verify client display

**Expected Results**:
- ✅ Both events show the same client name
- ✅ Both events show the same client reference
- ✅ Both links navigate to the same client page
- ✅ Client data is cached (check network tab - should only fetch once)

---

### Test Case 12: Browser Console Check

**Steps**:
1. Open browser developer tools (F12)
2. Go to Console tab
3. Perform Test Cases 1-5

**Expected Results**:
- ✅ No JavaScript errors
- ✅ No React warnings
- ✅ No 404 errors for client data
- ✅ API calls complete successfully

---

## Responsive Design Tests

### Test Case 13: Mobile View

**Steps**:
1. Open browser developer tools
2. Toggle device toolbar (mobile view)
3. Set to iPhone 12 Pro (390x844)
4. Open event modal with client

**Expected Results**:
- ✅ Modal fits within mobile viewport
- ✅ Client section is readable
- ✅ Client name and reference don't overflow
- ✅ Link is tappable (adequate touch target size)

---

### Test Case 14: Tablet View

**Steps**:
1. Set device to iPad (768x1024)
2. Open event modal with client

**Expected Results**:
- ✅ Modal displays appropriately for tablet size
- ✅ Client section layout is optimal
- ✅ All text is readable

---

## Accessibility Tests

### Test Case 15: Keyboard Navigation

**Steps**:
1. Open calendar page
2. Use Tab key to navigate to an event
3. Press Enter to open modal
4. Tab to client name link
5. Press Enter on link

**Expected Results**:
- ✅ Can navigate to event with keyboard
- ✅ Can open modal with Enter key
- ✅ Can focus on client name link
- ✅ Link has visible focus indicator
- ✅ Can activate link with Enter key

---

### Test Case 16: Screen Reader

**Steps**:
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to event modal
3. Navigate to client section

**Expected Results**:
- ✅ Client section is announced
- ✅ Client name is announced as a link
- ✅ Client reference is announced
- ✅ Semantic HTML is used (proper labels, links)

---

## Performance Tests

### Test Case 17: Client Data Caching

**Steps**:
1. Open browser developer tools
2. Go to Network tab
3. Open event with client "Acme Corporation Ltd"
4. Close modal
5. Open another event with same client
6. Check network requests

**Expected Results**:
- ✅ First event triggers client data fetch
- ✅ Second event does NOT trigger another fetch
- ✅ Client data is cached in memory
- ✅ Page remains responsive

---

## Error Handling Tests

### Test Case 18: API Server Down

**Steps**:
1. Stop the API server
2. Refresh calendar page
3. Try to open an event modal

**Expected Results**:
- ✅ Calendar loads (may show cached data or empty)
- ✅ Event modal opens
- ✅ Client section shows error state or reference only
- ✅ No application crash
- ✅ User-friendly error message if applicable

---

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Event with Client - Full Display | ⬜ | |
| 2. Click Client Name Link | ⬜ | |
| 3. Event without Client - Hidden Section | ⬜ | |
| 4. Event with Only Client Reference | ⬜ | |
| 5. Event with Client Not Found | ⬜ | |
| 6. Client Display Styling Consistency | ⬜ | |
| 7. Long Client Names | ⬜ | |
| 8. Special Characters in Client Name | ⬜ | |
| 9. Unicode Characters in Client Name | ⬜ | |
| 10. Modal Close and Reopen | ⬜ | |
| 11. Multiple Events with Same Client | ⬜ | |
| 12. Browser Console Check | ⬜ | |
| 13. Mobile View | ⬜ | |
| 14. Tablet View | ⬜ | |
| 15. Keyboard Navigation | ⬜ | |
| 16. Screen Reader | ⬜ | |
| 17. Client Data Caching | ⬜ | |
| 18. API Server Down | ⬜ | |

## Issues Found

Document any issues found during testing:

1. **Issue**: [Description]
   - **Severity**: Critical / High / Medium / Low
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [What should happen]
   - **Actual**: [What actually happens]
   - **Screenshot**: [Filename]

## Sign-off

- **Tester**: ___________________
- **Date**: ___________________
- **Result**: ⬜ Pass ⬜ Fail ⬜ Pass with Issues
- **Notes**: ___________________

