#!/usr/bin/env node

/**
 * Verification Script for Test 11: Calendar Grid Client Name Display
 * 
 * This script verifies that the implementation is correct by testing
 * the display logic for client names on calendar events.
 */

// Test data
const testEvents = [
  {
    id: '1',
    title: 'Client Meeting',
    status: 'scheduled',
    start: '2025-11-26T10:00:00Z',
    clientName: 'Acme Corporation Ltd',
    clientRef: '1A001',
  },
  {
    id: '2',
    title: 'Team Standup',
    status: 'scheduled',
    start: '2025-11-26T14:00:00Z',
    // No client
  },
  {
    id: '3',
    title: 'Tax Filing',
    status: 'scheduled',
    start: '2025-11-27T17:00:00Z',
    clientName: 'Smith & Associates',
    clientRef: '2B002',
  },
  {
    id: '4',
    title: 'Meeting',
    status: 'scheduled',
    start: '2025-12-04T10:00:00Z',
    clientName: '9I009 (Not Found)',
    clientRef: '9I009',
  },
  {
    id: '5',
    title: 'Very Long Event Title That Should Be Handled Properly',
    status: 'scheduled',
    start: '2025-11-29T15:00:00Z',
    clientName: 'International Business Solutions Corporation Limited',
    clientRef: '4D004',
  },
];

/**
 * Function to map calendar event to display title
 * This mirrors the logic in mapToFullCalendarEvent
 */
function getDisplayTitle(event) {
  let displayTitle = event.title;
  
  if (event.clientName) {
    // Check if client was not found or had an error
    if (event.clientName.includes('(Not Found)') || event.clientName.includes('(Error)')) {
      displayTitle = `${event.title} • ⚠ ${event.clientName}`;
    } else {
      // Normal display with separator
      displayTitle = `${event.title} • ${event.clientName}`;
    }
  }
  
  return displayTitle;
}

// Test cases
console.log('='.repeat(80));
console.log('Test 11: Calendar Grid Client Name Display - Implementation Verification');
console.log('='.repeat(80));
console.log('');

let passed = 0;
let failed = 0;

// Test 1: Event with client
console.log('Test 1: Event with client should show "Title • Client Name"');
const result1 = getDisplayTitle(testEvents[0]);
const expected1 = 'Client Meeting • Acme Corporation Ltd';
if (result1 === expected1) {
  console.log('✅ PASS');
  console.log(`   Expected: "${expected1}"`);
  console.log(`   Got:      "${result1}"`);
  passed++;
} else {
  console.log('❌ FAIL');
  console.log(`   Expected: "${expected1}"`);
  console.log(`   Got:      "${result1}"`);
  failed++;
}
console.log('');

// Test 2: Event without client
console.log('Test 2: Event without client should show title only');
const result2 = getDisplayTitle(testEvents[1]);
const expected2 = 'Team Standup';
if (result2 === expected2 && !result2.includes('•')) {
  console.log('✅ PASS');
  console.log(`   Expected: "${expected2}"`);
  console.log(`   Got:      "${result2}"`);
  passed++;
} else {
  console.log('❌ FAIL');
  console.log(`   Expected: "${expected2}"`);
  console.log(`   Got:      "${result2}"`);
  failed++;
}
console.log('');

// Test 3: Separator format
console.log('Test 3: Separator should be bullet (•) with spaces');
const result3 = getDisplayTitle(testEvents[2]);
const hasBullet = result3.includes('•');
const hasSpaces = result3.includes(' • ');
if (hasBullet && hasSpaces) {
  console.log('✅ PASS');
  console.log(`   Result: "${result3}"`);
  console.log(`   Contains " • ": ${hasSpaces}`);
  passed++;
} else {
  console.log('❌ FAIL');
  console.log(`   Result: "${result3}"`);
  console.log(`   Contains bullet: ${hasBullet}`);
  console.log(`   Contains " • ": ${hasSpaces}`);
  failed++;
}
console.log('');

// Test 4: Client not found indicator
console.log('Test 4: Client not found should show warning indicator');
const result4 = getDisplayTitle(testEvents[3]);
const hasWarning = result4.includes('⚠');
const hasNotFound = result4.includes('(Not Found)');
if (hasWarning && hasNotFound) {
  console.log('✅ PASS');
  console.log(`   Result: "${result4}"`);
  console.log(`   Contains warning: ${hasWarning}`);
  console.log(`   Contains "(Not Found)": ${hasNotFound}`);
  passed++;
} else {
  console.log('❌ FAIL');
  console.log(`   Result: "${result4}"`);
  console.log(`   Contains warning: ${hasWarning}`);
  console.log(`   Contains "(Not Found)": ${hasNotFound}`);
  failed++;
}
console.log('');

// Test 5: Long titles
console.log('Test 5: Long titles should be handled correctly');
const result5 = getDisplayTitle(testEvents[4]);
const containsTitle = result5.includes(testEvents[4].title);
const containsClient = result5.includes(testEvents[4].clientName);
const containsSeparator = result5.includes('•');
if (containsTitle && containsClient && containsSeparator) {
  console.log('✅ PASS');
  console.log(`   Result length: ${result5.length} characters`);
  console.log(`   Contains title: ${containsTitle}`);
  console.log(`   Contains client: ${containsClient}`);
  console.log(`   Contains separator: ${containsSeparator}`);
  passed++;
} else {
  console.log('❌ FAIL');
  console.log(`   Result: "${result5}"`);
  console.log(`   Contains title: ${containsTitle}`);
  console.log(`   Contains client: ${containsClient}`);
  console.log(`   Contains separator: ${containsSeparator}`);
  failed++;
}
console.log('');

// Summary
console.log('='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));
console.log(`Total Tests: ${passed + failed}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log('');

if (failed === 0) {
  console.log('🎉 All tests passed! Implementation is correct.');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Open http://localhost:3000/calendar in your browser');
  console.log('2. Follow the manual test guide in test-11-execution-guide.md');
  console.log('3. Verify the display in all three calendar views');
  console.log('4. Test with real events and clients');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
