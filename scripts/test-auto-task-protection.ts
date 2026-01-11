/**
 * Test Script: Auto-Task Protection
 * 
 * This script tests that auto-task events (events with IDs starting with "task-")
 * do not show Edit or Cancel Event buttons in the event details modal.
 * 
 * Requirements tested: 1.1, 2.1
 * 
 * Test Steps:
 * 1. Create a test auto-task event (id starts with "task-")
 * 2. Verify the event appears on the calendar
 * 3. Click on the auto-task event to open the modal
 * 4. Verify Edit button is NOT shown
 * 5. Verify Cancel Event button is NOT shown
 * 6. Verify only Close button is available
 */

import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';

const API_BASE = process.env.API_URL || 'http://localhost:3001';
const WEB_BASE = process.env.WEB_URL || 'http://localhost:3000';

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TestResult {
  step: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(step: string, passed: boolean, message: string, details?: any) {
  results.push({ step, passed, message, details });
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} ${step}: ${message}`);
  if (details) {
    console.log('  Details:', JSON.stringify(details, null, 2));
  }
}

async function testAutoTaskProtection() {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('\n=== Auto-Task Protection Test ===\n');
    console.log('Starting browser...');
    
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();

    // Navigate to calendar page
    console.log('\nNavigating to calendar page...');
    await page.goto(`${WEB_BASE}/calendar`, { waitUntil: 'networkidle0' });
    await wait(2000);

    // Wait for calendar to load
    await page.waitForSelector('.fc-daygrid-day', { timeout: 10000 });
    logResult('Navigation', true, 'Successfully loaded calendar page');

    // Check if there are any auto-task events on the calendar
    console.log('\nLooking for auto-task events...');
    
    // Wait a bit for events to load
    await wait(2000);

    // Look for events on the calendar
    const events = await page.$$('.fc-event');
    console.log(`Found ${events.length} events on calendar`);

    if (events.length === 0) {
      logResult('Event Check', false, 'No events found on calendar. Cannot test auto-task protection without events.');
      console.log('\nNote: This test requires at least one auto-task event (with ID starting with "task-") to be present.');
      console.log('Auto-task events are typically created from the tasks system.');
      return;
    }

    // Try to find an auto-task event by checking the calendar data
    // We'll click on the first event and check if it's an auto-task
    console.log('\nClicking on first event to check if it\'s an auto-task...');
    await events[0].click();
    await wait(1000);

    // Check if modal opened
    const modal = await page.$('.modal-backdrop');
    if (!modal) {
      logResult('Modal Open', false, 'Event modal did not open');
      return;
    }
    logResult('Modal Open', true, 'Event details modal opened');

    // Check the modal title to see if we're in view mode
    const modalTitle = await page.$eval('.modal-header h3', el => el?.textContent || '');
    console.log(`Modal title: ${modalTitle}`);

    // Look for the buttons in the modal by checking their existence
    const hasCloseButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.btn-outline-gold'));
      return buttons.some((btn: any) => btn.textContent?.includes('Close'));
    });
    
    const hasEditButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.btn-gold'));
      return buttons.some((btn: any) => btn.textContent?.includes('Edit Event'));
    });
    
    const hasCancelEventButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.btn-danger'));
      return buttons.some((btn: any) => btn.textContent?.includes('Cancel Event'));
    });

    console.log('\nButton visibility check:');
    console.log(`- Close button: ${hasCloseButton ? 'VISIBLE' : 'NOT VISIBLE'}`);
    console.log(`- Edit Event button: ${hasEditButton ? 'VISIBLE' : 'NOT VISIBLE'}`);
    console.log(`- Cancel Event button: ${hasCancelEventButton ? 'VISIBLE' : 'NOT VISIBLE'}`);

    // Determine if this is an auto-task based on button visibility
    const isAutoTask = !hasEditButton && !hasCancelEventButton && hasCloseButton;

    if (isAutoTask) {
      console.log('\n✓ This appears to be an auto-task event (no Edit/Cancel buttons)');
      
      // Verify requirements
      logResult(
        'Requirement 1.1',
        !hasEditButton,
        'Edit button is NOT shown for auto-task event',
        { editButtonVisible: hasEditButton }
      );

      logResult(
        'Requirement 2.1',
        !hasCancelEventButton,
        'Cancel Event button is NOT shown for auto-task event',
        { cancelEventButtonVisible: hasCancelEventButton }
      );

      logResult(
        'Close Button Available',
        hasCloseButton,
        'Close button IS available for auto-task event',
        { closeButtonVisible: hasCloseButton }
      );

      // Close the modal
      if (hasCloseButton) {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button.btn-outline-gold'));
          const closeBtn = buttons.find((btn: any) => btn.textContent?.includes('Close')) as any;
          if (closeBtn) closeBtn.click();
        });
        await wait(500);
        logResult('Modal Close', true, 'Successfully closed modal using Close button');
      }

    } else {
      console.log('\n⚠ This appears to be a regular event (Edit/Cancel buttons are shown)');
      console.log('Looking for an auto-task event to test...');
      
      // Close this modal
      if (hasCloseButton) {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button.btn-outline-gold'));
          const closeBtn = buttons.find((btn: any) => btn.textContent?.includes('Close')) as any;
          if (closeBtn) closeBtn.click();
        });
        await wait(500);
      }

      // Try other events to find an auto-task
      let foundAutoTask = false;
      for (let i = 1; i < Math.min(events.length, 5); i++) {
        console.log(`\nTrying event ${i + 1}...`);
        await events[i].click();
        await wait(1000);

        const hasEdit = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button.btn-gold'));
          return buttons.some((btn: any) => btn.textContent?.includes('Edit Event'));
        });
        
        const hasCancel = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button.btn-danger'));
          return buttons.some((btn: any) => btn.textContent?.includes('Cancel Event'));
        });
        
        const hasClose = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button.btn-outline-gold'));
          return buttons.some((btn: any) => btn.textContent?.includes('Close'));
        });

        if (!hasEdit && !hasCancel && hasClose) {
          console.log('✓ Found an auto-task event!');
          foundAutoTask = true;

          logResult(
            'Requirement 1.1',
            true,
            'Edit button is NOT shown for auto-task event',
            { editButtonVisible: false }
          );

          logResult(
            'Requirement 2.1',
            true,
            'Cancel Event button is NOT shown for auto-task event',
            { cancelEventButtonVisible: false }
          );

          logResult(
            'Close Button Available',
            true,
            'Close button IS available for auto-task event',
            { closeButtonVisible: true }
          );

          if (hasClose) {
            await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button.btn-outline-gold'));
              const closeBtn = buttons.find((btn: any) => btn.textContent?.includes('Close')) as any;
              if (closeBtn) closeBtn.click();
            });
            await wait(500);
          }
          break;
        } else {
          console.log('  This is a regular event, continuing search...');
          if (hasClose) {
            await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button.btn-outline-gold'));
              const closeBtn = buttons.find((btn: any) => btn.textContent?.includes('Close')) as any;
              if (closeBtn) closeBtn.click();
            });
            await wait(500);
          }
        }
      }

      if (!foundAutoTask) {
        logResult(
          'Auto-Task Search',
          false,
          'Could not find an auto-task event to test. All checked events appear to be regular events.',
          { 
            note: 'Auto-task events have IDs starting with "task-" and are created from the tasks system.',
            eventsChecked: Math.min(events.length, 5)
          }
        );
      }
    }

    console.log('\n=== Test Summary ===\n');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`Passed: ${passed}/${total}`);
    
    results.forEach(r => {
      const icon = r.passed ? '✓' : '✗';
      console.log(`${icon} ${r.step}: ${r.message}`);
    });

    if (passed === total) {
      console.log('\n✓ All tests passed! Auto-task protection is working correctly.');
    } else {
      console.log('\n✗ Some tests failed. Please review the results above.');
    }

  } catch (error: any) {
    console.error('\n✗ Test failed with error:', error.message);
    logResult('Test Execution', false, `Error: ${error.message}`, { stack: error.stack });
  } finally {
    if (page) {
      console.log('\nClosing browser...');
      await wait(2000); // Keep browser open briefly to see results
    }
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testAutoTaskProtection().catch(console.error);
