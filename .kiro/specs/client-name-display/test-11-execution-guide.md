# Test 11 Execution Guide: Calendar Grid Client Name Display

## Overview

This guide provides step-by-step instructions for executing Test 11, which verifies that client names are correctly displayed on the calendar grid with proper formatting.

## Prerequisites

### 1. Start the Application

```bash
# Terminal 1: Start API server
cd apps/api
npm run start:dev

# Terminal 2: Start Web server
cd apps/web
npm run dev
```

### 2. Verify Application is Running

- API: http://localhost:3001
- Web: http://localhost:3000

### 3. Create Test Clients (if needed)

If no clients exist, create test clients via the API or UI:

```bash
# Example: Create a test client via API
curl -X POST http://localhost:3001/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation Ltd",
    "ref": "1A001",
    "type": "COMPANY",
    "portfolioCode": 1
  }'
```

## Test Execution Steps

### Step 1: Navigate to Calendar

1. Open browser to http://localhost:3000
2. Navigate to `/calendar` page
3. Verify calendar loads without errors

**Expected**: Calendar displays with month view by default

### Step 2: Create Test Events

Create the following test events:

#### Event 1: With Client (Short Title)
- Title: "Client Meeting"
- Start: Tomorrow at 10:00 AM
- Type: Meeting
- Client: Search and select "Acme" (or any available client)
- Click "Create Event"

#### Event 2: With Client (Medium Title)
- Title: "Tax Filing Deadline Review"
- Start: Next week at 5:00 PM
- Type: Deadline
- Client: Search and select a different client
- Click "Create Event"

#### Event 3: Without Client
- Title: "Team Standup"
- Start: Today at 2:00 PM
- Type: Meeting
- Client: Leave empty
- Click "Create Event"

#### Event 4: With Client (Long Title)
- Title: "Comprehensive Annual Financial Review and Planning Session"
- Start: Tomorrow at 3:00 PM
- Type: Meeting
- Client: Select a client with a long name
- Click "Create Event"

**Expected**: All events created successfully

### Step 3: Verify Display in Month View

1. Ensure calendar is in Month view (click "Month" button if needed)
2. Locate each event on the calendar grid
3. Verify the following:

**Event 1 (Client Meeting)**:
- ✅ Displays as: "Client Meeting • [Client Name]"
- ✅ Bullet separator (•) is visible
- ✅ Client name is readable

**Event 2 (Tax Filing)**:
- ✅ Displays as: "Tax Filing Deadline Review • [Client Name]"
- ✅ Format is consistent with Event 1

**Event 3 (Team Standup)**:
- ✅ Displays as: "Team Standup" (no client name)
- ✅ No bullet separator shown

**Event 4 (Long Title)**:
- ✅ Text is truncated with ellipsis if too long
- ✅ Hover shows full text (browser tooltip)
- ✅ Layout is not broken

### Step 4: Verify Display in Week View

1. Click "Week" button
2. Navigate to the week containing your test events
3. Verify all events with clients show "Title • Client Name"
4. Verify events without clients show title only
5. Check that text is readable and layout is correct

**Expected**: Same format as month view, with more space for text

### Step 5: Verify Display in Day View

1. Click "Day" button
2. Navigate to a day with test events
3. Verify all events with clients show "Title • Client Name"
4. Verify events without clients show title only
5. Check that full details are visible

**Expected**: Same format, with maximum space for text

### Step 6: Test Separator Format

1. Return to Month view
2. Examine an event with a client
3. Verify the separator:
   - Is a bullet point (•)
   - Has space before it: " •"
   - Has space after it: "• "
   - Is visually distinct but not distracting

**Expected**: Format is "Title • Client Name" with proper spacing

### Step 7: Test Truncation

1. Locate Event 4 (long title) in Month view
2. Verify text is truncated with ellipsis (...)
3. Hover over the event
4. Verify browser tooltip shows full text
5. Switch to Week view and verify truncation behavior
6. Switch to Day view and verify more text is visible

**Expected**: Truncation works correctly without breaking layout

### Step 8: Test Refresh and Persistence

1. Note the current events and their client names
2. Press F5 (or Cmd+R) to refresh the page
3. Wait for calendar to reload
4. Verify all events still show client names correctly

**Expected**: All client names persist after refresh

### Step 9: Test Multiple Events on Same Day

1. Create 3-4 more events on the same day with different clients
2. View in Month view
3. Verify all events are visible (may be stacked)
4. Switch to Day view
5. Verify all events show their respective client names
6. Verify no overlap or collision

**Expected**: All events distinguishable with correct client names

### Step 10: Test Console for Errors

1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform all the above tests
4. Check for any errors or warnings

**Expected**: No errors related to client name display

## Verification Checklist

Use this checklist to track test completion:

- [ ] Events with clients display "Title • Client Name"
- [ ] Events without clients display title only
- [ ] Bullet separator (•) is used
- [ ] Spacing around separator is correct
- [ ] Display works in Month view
- [ ] Display works in Week view
- [ ] Display works in Day view
- [ ] Long titles are truncated properly
- [ ] Hover shows full text
- [ ] Layout is not broken by long text
- [ ] Client names persist after refresh
- [ ] Multiple events on same day work correctly
- [ ] No console errors
- [ ] Styling is consistent with MDJ UI
- [ ] Text is readable (good contrast)

## Success Criteria

All of the following must be true:

1. ✅ Client names appear on calendar grid for events with clients
2. ✅ Format is "Event Title • Client Name"
3. ✅ Events without clients show title only
4. ✅ Display works in all three views (month, week, day)
5. ✅ Long text is truncated without breaking layout
6. ✅ Styling is consistent and readable
7. ✅ No errors in console
8. ✅ Data persists after refresh

## Troubleshooting

### Issue: Client names not showing

**Check**:
1. Verify events have `clientRef` or `clientName` in the data
2. Check browser console for errors
3. Verify `useClientData` hook is working
4. Check network tab for API calls to `/clients`

### Issue: Format is wrong

**Check**:
1. Verify `mapToFullCalendarEvent` function in `page.tsx`
2. Check that separator is bullet (•) not dash (-)
3. Verify spacing around separator

### Issue: Truncation not working

**Check**:
1. Verify CSS is loaded (`client-display.css`)
2. Check FullCalendar CSS for text overflow
3. Try different browser

### Issue: Events not persisting

**Check**:
1. Verify API is saving events correctly
2. Check network tab for POST/PUT requests
3. Verify `clientName` is included in API payload

## Test Results

**Date**: _______________  
**Tester**: _______________  
**Status**: [ ] Pass [ ] Fail [ ] Partial

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

## Screenshots

Attach screenshots showing:
1. Month view with client names
2. Week view with client names
3. Day view with client names
4. Long title truncation
5. Event without client
6. Multiple events on same day

## Sign-off

**Approved by**: _______________  
**Date**: _______________
