/**
 * Verification Script for Task 12: Event Modal Client Display
 * 
 * This script verifies that the event modal implementation includes
 * all required client display functionality.
 * 
 * Run with: node .kiro/specs/client-name-display/verify-modal-implementation.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function checkImplementation() {
  log('\n=== Task 12: Event Modal Client Display Verification ===\n', 'cyan');
  
  const calendarPagePath = path.join(__dirname, '../../../apps/web/src/app/calendar/page.tsx');
  const cssPath = path.join(__dirname, '../../../apps/web/src/styles/client-display.css');
  
  let allPassed = true;
  const results = [];

  // Check 1: Calendar page file exists
  log('Check 1: Calendar page file exists', 'blue');
  if (checkFileExists(calendarPagePath)) {
    log('  ✓ File exists: apps/web/src/app/calendar/page.tsx', 'green');
    results.push({ check: 'File exists', passed: true });
  } else {
    log('  ✗ File not found: apps/web/src/app/calendar/page.tsx', 'red');
    results.push({ check: 'File exists', passed: false });
    allPassed = false;
    return { allPassed, results };
  }

  const calendarContent = readFile(calendarPagePath);

  // Check 2: Client section conditional rendering (Requirement 1.5)
  log('\nCheck 2: Client section conditional rendering (Req 1.5)', 'blue');
  const hasConditionalRendering = calendarContent.includes('(selectedEvent.clientRef || selectedEvent.clientName)');
  if (hasConditionalRendering) {
    log('  ✓ Client section only renders when client data exists', 'green');
    results.push({ check: 'Conditional rendering', passed: true });
  } else {
    log('  ✗ Client section conditional rendering not found', 'red');
    results.push({ check: 'Conditional rendering', passed: false });
    allPassed = false;
  }

  // Check 3: Client name as primary identifier (Requirement 3.1)
  log('\nCheck 3: Client name displayed as primary identifier (Req 3.1)', 'blue');
  const hasClientNamePrimary = calendarContent.includes('client-info-primary') || 
                                 calendarContent.includes('client-name-link');
  if (hasClientNamePrimary) {
    log('  ✓ Client name displayed with primary styling', 'green');
    results.push({ check: 'Client name primary', passed: true });
  } else {
    log('  ✗ Client name primary styling not found', 'red');
    results.push({ check: 'Client name primary', passed: false });
    allPassed = false;
  }

  // Check 4: Client reference in parentheses (Requirement 3.2)
  log('\nCheck 4: Client reference in parentheses (Req 3.2)', 'blue');
  const hasRefInParentheses = calendarContent.includes('client-ref-display') &&
                               calendarContent.includes('({selectedEvent.clientRef})');
  if (hasRefInParentheses) {
    log('  ✓ Client reference displayed in parentheses', 'green');
    results.push({ check: 'Reference in parentheses', passed: true });
  } else {
    log('  ✗ Client reference in parentheses not found', 'red');
    results.push({ check: 'Reference in parentheses', passed: false });
    allPassed = false;
  }

  // Check 5: Reference-only display (Requirement 3.3)
  log('\nCheck 5: Reference-only display with label (Req 3.3)', 'blue');
  const hasRefOnly = calendarContent.includes('client-ref-only') &&
                     calendarContent.includes('client-ref-label') &&
                     calendarContent.includes('Reference:');
  if (hasRefOnly) {
    log('  ✓ Reference-only display with label implemented', 'green');
    results.push({ check: 'Reference-only display', passed: true });
  } else {
    log('  ✗ Reference-only display not found', 'red');
    results.push({ check: 'Reference-only display', passed: false });
    allPassed = false;
  }

  // Check 6: Clickable link (Requirement 3.5)
  log('\nCheck 6: Client name as clickable link (Req 3.5)', 'blue');
  const hasClickableLink = calendarContent.includes('<Link') &&
                           calendarContent.includes('href={`/clients/') &&
                           calendarContent.includes('client-name-link');
  if (hasClickableLink) {
    log('  ✓ Client name is a clickable link to client page', 'green');
    results.push({ check: 'Clickable link', passed: true });
  } else {
    log('  ✗ Clickable link implementation not found', 'red');
    results.push({ check: 'Clickable link', passed: false });
    allPassed = false;
  }

  // Check 7: Not Found handling (Requirement 8.1)
  log('\nCheck 7: Client Not Found handling (Req 8.1)', 'blue');
  const hasNotFoundHandling = calendarContent.includes('(Not Found)') &&
                               calendarContent.includes('client-not-found');
  if (hasNotFoundHandling) {
    log('  ✓ Client Not Found scenario handled with warning', 'green');
    results.push({ check: 'Not Found handling', passed: true });
  } else {
    log('  ✗ Client Not Found handling not found', 'red');
    results.push({ check: 'Not Found handling', passed: false });
    allPassed = false;
  }

  // Check 8: Error handling (Requirement 8.1)
  log('\nCheck 8: Client Error handling (Req 8.1)', 'blue');
  const hasErrorHandling = calendarContent.includes('(Error)');
  if (hasErrorHandling) {
    log('  ✓ Client Error scenario handled', 'green');
    results.push({ check: 'Error handling', passed: true });
  } else {
    log('  ✗ Client Error handling not found', 'red');
    results.push({ check: 'Error handling', passed: false });
    allPassed = false;
  }

  // Check 9: CSS styling file exists (Requirement 3.4)
  log('\nCheck 9: CSS styling file exists (Req 3.4)', 'blue');
  if (checkFileExists(cssPath)) {
    log('  ✓ CSS file exists: apps/web/src/styles/client-display.css', 'green');
    results.push({ check: 'CSS file exists', passed: true });
    
    const cssContent = readFile(cssPath);
    
    // Check for required CSS classes
    const requiredClasses = [
      'client-info-section',
      'client-info-label',
      'client-info-content',
      'client-name-link',
      'client-ref-display',
      'client-ref-only',
      'client-not-found'
    ];
    
    let allClassesFound = true;
    requiredClasses.forEach(className => {
      if (!cssContent.includes(`.${className}`)) {
        log(`  ✗ CSS class not found: .${className}`, 'red');
        allClassesFound = false;
      }
    });
    
    if (allClassesFound) {
      log('  ✓ All required CSS classes found', 'green');
      results.push({ check: 'CSS classes', passed: true });
    } else {
      results.push({ check: 'CSS classes', passed: false });
      allPassed = false;
    }
  } else {
    log('  ✗ CSS file not found', 'red');
    results.push({ check: 'CSS file exists', passed: false });
    allPassed = false;
  }

  // Check 10: CSS imported in calendar page
  log('\nCheck 10: CSS imported in calendar page', 'blue');
  const hasCSSImport = calendarContent.includes("import '@/styles/client-display.css'");
  if (hasCSSImport) {
    log('  ✓ CSS file imported in calendar page', 'green');
    results.push({ check: 'CSS import', passed: true });
  } else {
    log('  ✗ CSS import not found in calendar page', 'red');
    results.push({ check: 'CSS import', passed: false });
    allPassed = false;
  }

  // Check 11: Client section structure
  log('\nCheck 11: Client section HTML structure', 'blue');
  const hasClientSection = calendarContent.includes('client-info-section') &&
                           calendarContent.includes('client-info-label') &&
                           calendarContent.includes('client-info-content');
  if (hasClientSection) {
    log('  ✓ Client section has proper HTML structure', 'green');
    results.push({ check: 'HTML structure', passed: true });
  } else {
    log('  ✗ Client section HTML structure incomplete', 'red');
    results.push({ check: 'HTML structure', passed: false });
    allPassed = false;
  }

  // Check 12: Helper text for Not Found
  log('\nCheck 12: Helper text for Not Found clients', 'blue');
  const hasHelperText = calendarContent.includes('Client may have been deleted') ||
                        calendarContent.includes('client-not-found-helper');
  if (hasHelperText) {
    log('  ✓ Helper text for Not Found clients implemented', 'green');
    results.push({ check: 'Helper text', passed: true });
  } else {
    log('  ⚠ Helper text for Not Found clients not found (optional)', 'yellow');
    results.push({ check: 'Helper text', passed: true, warning: true });
  }

  // Summary
  log('\n=== Verification Summary ===\n', 'cyan');
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  log(`Passed: ${passedCount}/${totalCount}`, passedCount === totalCount ? 'green' : 'yellow');
  
  if (allPassed) {
    log('\n✓ All checks passed! Event modal client display is properly implemented.', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Run the development server: npm run dev', 'blue');
    log('2. Navigate to /calendar', 'blue');
    log('3. Follow the manual test guide: .kiro/specs/client-name-display/test-12-event-modal-display.md', 'blue');
  } else {
    log('\n✗ Some checks failed. Please review the implementation.', 'red');
  }

  return { allPassed, results };
}

// Run verification
try {
  const { allPassed, results } = checkImplementation();
  process.exit(allPassed ? 0 : 1);
} catch (error) {
  log(`\n✗ Error during verification: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}
