# Task 14 Quick Start Guide

## Overview
This guide helps you quickly test the client selection functionality in the edit event form.

## Prerequisites
✅ MDJ Practice Manager running (API + Web)
✅ Test clients in the system
✅ Test events created (with and without clients)

## Quick Test (5 minutes)

### Test 1: Edit Event with Client (2 min)
1. Go to Calendar page
2. Click on event with client
3. Click "Edit"
4. **Verify:** Client shown as "Name (Ref)"
5. **Verify:** Clear button (×) visible
6. Search for different client
7. Select new client
8. Click "Save"
9. **Verify:** Client updated on calendar

### Test 2: Add Client to Event (2 min)
1. Click on event without client
2. Click "Edit"
3. **Verify:** Field is empty
4. Search for client (type 2+ chars)
5. Select client from results
6. Click "Save"
7. **Verify:** Client appears on calendar

### Test 3: Clear Client (1 min)
1. Edit event with client
2. Click clear button (×)
3. **Verify:** Field clears
4. Click "Save"
5. **Verify:** Client removed from calendar

## Expected Behavior

### Edit Form with Client
```
┌─────────────────────────────────────────┐
│ Client                                  │
│ ┌─────────────────────────────────┐ × │
│ │ Acme Corporation Ltd (1A001)    │   │
│ └─────────────────────────────────┘   │
│ Selected: Acme Corporation Ltd (1A001) │
└─────────────────────────────────────────┘
```

### Edit Form without Client
```
┌─────────────────────────────────────────┐
│ Client                                  │
│ ┌─────────────────────────────────┐   │
│ │ Search for a client...          │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Search Results Dropdown
```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────┐   │
│ │ Acme                            │   │
│ └─────────────────────────────────┘   │
│ ┌─────────────────────────────────────┐
│ │ No client          Clear selection │
│ ├─────────────────────────────────────┤
│ │ Acme Corporation Ltd        1A001 │
│ │ Acme Services Ltd           1A002 │
│ │ Acme Industries Inc         1A003 │
│ └─────────────────────────────────────┘
└─────────────────────────────────────────┘
```

## Common Issues

### Issue: Search doesn't work
**Solution:** Type at least 2 characters and wait 300ms

### Issue: Clear button not visible
**Solution:** Clear button only appears when client is selected

### Issue: Client not saving
**Solution:** Make sure to click "Save" button after selection

### Issue: Dropdown doesn't close
**Solution:** Click on a result or click outside the dropdown

## Detailed Testing

For comprehensive testing, see:
📄 `.kiro/specs/client-name-display/test-14-edit-form-client-selection.md`

This includes:
- 12 detailed test scenarios
- 3 edge case tests
- Pass/fail checkboxes
- Issue tracking table

## Automated Tests

Automated test suite created at:
📄 `apps/web/src/app/calendar/__tests__/edit-form-client-selection.test.tsx`

Contains 35+ test cases covering all scenarios.

## Verification Script

Run in browser console on calendar page:
```javascript
// Copy and paste from:
.kiro/specs/client-name-display/verify-edit-form.js
```

## Requirements Tested

✅ **1.4** - Edit event and change client reference
✅ **6.1** - Client selection dropdown/autocomplete
✅ **6.2** - Display client names with references
✅ **6.3** - Populate client reference and name fields
✅ **6.4** - Support searching by name or reference
✅ **6.5** - "No client" option for clearing selection

## Success Criteria

All of these should work:
- ✅ Current client displays when editing
- ✅ Can search for different client
- ✅ Can select new client
- ✅ Changes persist after save
- ✅ Can add client to event without one
- ✅ Can clear client using × button
- ✅ Can clear client using "No client" option
- ✅ Client removed after clearing and saving

## Next Steps

After completing these tests:
1. ✅ Mark scenarios as pass/fail
2. ✅ Document any issues found
3. ✅ Report results to team
4. ✅ Move to next task (Task 15 - optional)

## Questions?

See the full documentation:
- 📄 Test Guide: `test-14-edit-form-client-selection.md`
- 📄 Completion Summary: `TASK-14-COMPLETION-SUMMARY.md`
- 📄 Automated Tests: `apps/web/src/app/calendar/__tests__/edit-form-client-selection.test.tsx`
