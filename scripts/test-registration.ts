#!/usr/bin/env ts-node

/**
 * Test script for user registration flow
 * Tests requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.3
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

const API_BASE_URL = 'http://localhost:3001/api/v1';
const TEST_USER_EMAIL = `test-${Date.now()}@example.com`;
const TEST_USER_DATA = {
  firstName: 'Test',
  lastName: 'User',
  email: TEST_USER_EMAIL,
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!',
  agreeToTerms: true,
};

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testRegistrationSuccess() {
  console.log('\n🧪 Test 4.1: Registration with new user');
  console.log('=' .repeat(60));

  try {
    // Test: Register new user
    console.log('\n1. Registering new user...');
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER_DATA),
    });

    if (!response.ok) {
      const error: any = await response.json();
      results.push({
        name: 'User Registration',
        passed: false,
        message: `Registration failed: ${error.message}`,
        details: error,
      });
      return;
    }

    const authResponse: any = await response.json();
    console.log('✅ User registered successfully');

    // Verify response structure
    if (!authResponse.user || !authResponse.accessToken || !authResponse.refreshToken) {
      results.push({
        name: 'Registration Response Structure',
        passed: false,
        message: 'Response missing required fields',
        details: authResponse,
      });
      return;
    }

    results.push({
      name: 'User Registration',
      passed: true,
      message: 'User registered successfully',
      details: { userId: authResponse.user.id, email: authResponse.user.email },
    });

    // Test: Verify user file created
    console.log('\n2. Checking user file creation...');
    const userId = authResponse.user.id;
    const userFilePath = path.join(
      PROJECT_ROOT,
      'storage/users',
      `${userId}.json`
    );

    if (!fs.existsSync(userFilePath)) {
      results.push({
        name: 'User File Creation',
        passed: false,
        message: `User file not found at ${userFilePath}`,
      });
      return;
    }

    const userFileContent = JSON.parse(fs.readFileSync(userFilePath, 'utf-8'));
    console.log('✅ User file created');

    // Verify user data
    const userDataChecks = [
      { field: 'id', expected: userId, actual: userFileContent.id },
      { field: 'email', expected: TEST_USER_EMAIL.toLowerCase(), actual: userFileContent.email },
      { field: 'firstName', expected: TEST_USER_DATA.firstName, actual: userFileContent.firstName },
      { field: 'lastName', expected: TEST_USER_DATA.lastName, actual: userFileContent.lastName },
      { field: 'role', expected: 'STAFF', actual: userFileContent.role },
      { field: 'isActive', expected: true, actual: userFileContent.isActive },
    ];

    const failedChecks = userDataChecks.filter(check => check.expected !== check.actual);
    if (failedChecks.length > 0) {
      results.push({
        name: 'User Data Verification',
        passed: false,
        message: 'User data mismatch',
        details: failedChecks,
      });
    } else {
      results.push({
        name: 'User Data Verification',
        passed: true,
        message: 'User data matches expected values',
      });
      console.log('✅ User data verified');
    }

    // Test: Verify password is hashed
    console.log('\n3. Checking password hashing...');
    if (!userFileContent.passwordHash) {
      results.push({
        name: 'Password Hashing',
        passed: false,
        message: 'Password hash not found',
      });
    } else if (userFileContent.passwordHash === TEST_USER_DATA.password) {
      results.push({
        name: 'Password Hashing',
        passed: false,
        message: 'Password is not hashed (stored in plain text)',
      });
    } else if (!userFileContent.passwordHash.startsWith('$2a$') && !userFileContent.passwordHash.startsWith('$2b$')) {
      results.push({
        name: 'Password Hashing',
        passed: false,
        message: 'Password hash does not appear to be bcrypt format',
        details: { hash: userFileContent.passwordHash.substring(0, 10) + '...' },
      });
    } else {
      results.push({
        name: 'Password Hashing',
        passed: true,
        message: 'Password properly hashed with bcrypt',
      });
      console.log('✅ Password hashed correctly');
    }

    // Test: Verify tokens returned
    console.log('\n4. Verifying authentication tokens...');
    if (authResponse.accessToken && authResponse.refreshToken && authResponse.expiresIn) {
      results.push({
        name: 'Authentication Tokens',
        passed: true,
        message: 'Access and refresh tokens returned',
        details: { expiresIn: authResponse.expiresIn },
      });
      console.log('✅ Tokens verified');
    } else {
      results.push({
        name: 'Authentication Tokens',
        passed: false,
        message: 'Missing authentication tokens',
        details: authResponse,
      });
    }

    // Test: Verify user session created
    console.log('\n5. Checking user session creation...');
    const sessionsDir = path.join(PROJECT_ROOT, 'storage/user-sessions');
    if (!fs.existsSync(sessionsDir)) {
      results.push({
        name: 'User Session Creation',
        passed: false,
        message: 'User sessions directory not found',
      });
    } else {
      const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
      const userSessions = sessionFiles
        .map(f => JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf-8')))
        .filter(s => s.userId === userId);

      if (userSessions.length === 0) {
        results.push({
          name: 'User Session Creation',
          passed: false,
          message: 'No session found for user',
        });
      } else {
        results.push({
          name: 'User Session Creation',
          passed: true,
          message: 'User session created',
          details: { sessionId: userSessions[0].id },
        });
        console.log('✅ User session created');
      }
    }

    // Test: Verify default role and portfolio
    console.log('\n6. Verifying default values...');
    if (userFileContent.role === 'STAFF' && Array.isArray(userFileContent.portfolios) && userFileContent.portfolios.includes(1)) {
      results.push({
        name: 'Default Values',
        passed: true,
        message: 'Default role (STAFF) and portfolio (1) assigned',
      });
      console.log('✅ Default values assigned');
    } else {
      results.push({
        name: 'Default Values',
        passed: false,
        message: 'Default values not properly assigned',
        details: { role: userFileContent.role, portfolios: userFileContent.portfolios },
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Registration Test',
      passed: false,
      message: `Test failed with error: ${error.message}`,
      details: error,
    });
    console.error('❌ Test failed:', error);
  }
}

async function testRegistrationErrors() {
  console.log('\n🧪 Test 4.2: Registration error cases');
  console.log('=' .repeat(60));

  try {
    // Test: Duplicate email
    console.log('\n1. Testing duplicate email registration...');
    const duplicateResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER_DATA),
    });

    if (duplicateResponse.status === 409) {
      const error: any = await duplicateResponse.json();
      if (error.message.toLowerCase().includes('already exists')) {
        results.push({
          name: 'Duplicate Email Error',
          passed: true,
          message: 'Correctly rejected duplicate email',
          details: error,
        });
        console.log('✅ Duplicate email rejected');
      } else {
        results.push({
          name: 'Duplicate Email Error',
          passed: false,
          message: 'Wrong error message for duplicate email',
          details: error,
        });
      }
    } else {
      results.push({
        name: 'Duplicate Email Error',
        passed: false,
        message: `Expected 409 status, got ${duplicateResponse.status}`,
      });
    }

    // Test: Password mismatch
    console.log('\n2. Testing password mismatch...');
    const mismatchData = {
      ...TEST_USER_DATA,
      email: `mismatch-${Date.now()}@example.com`,
      confirmPassword: 'DifferentPassword123!',
    };

    const mismatchResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mismatchData),
    });

    if (mismatchResponse.status === 400) {
      const error: any = await mismatchResponse.json();
      if (error.message.toLowerCase().includes('password')) {
        results.push({
          name: 'Password Mismatch Error',
          passed: true,
          message: 'Correctly rejected mismatched passwords',
          details: error,
        });
        console.log('✅ Password mismatch rejected');
      } else {
        results.push({
          name: 'Password Mismatch Error',
          passed: false,
          message: 'Wrong error message for password mismatch',
          details: error,
        });
      }
    } else {
      results.push({
        name: 'Password Mismatch Error',
        passed: false,
        message: `Expected 400 status, got ${mismatchResponse.status}`,
      });
    }

    // Test: Missing terms agreement
    console.log('\n3. Testing missing terms agreement...');
    const noTermsData = {
      ...TEST_USER_DATA,
      email: `noterms-${Date.now()}@example.com`,
      agreeToTerms: false,
    };

    const noTermsResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noTermsData),
    });

    if (noTermsResponse.status === 400) {
      const error: any = await noTermsResponse.json();
      if (error.message.toLowerCase().includes('terms')) {
        results.push({
          name: 'Terms Agreement Error',
          passed: true,
          message: 'Correctly rejected missing terms agreement',
          details: error,
        });
        console.log('✅ Missing terms agreement rejected');
      } else {
        results.push({
          name: 'Terms Agreement Error',
          passed: false,
          message: 'Wrong error message for missing terms',
          details: error,
        });
      }
    } else {
      results.push({
        name: 'Terms Agreement Error',
        passed: false,
        message: `Expected 400 status, got ${noTermsResponse.status}`,
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Error Cases Test',
      passed: false,
      message: `Test failed with error: ${error.message}`,
      details: error,
    });
    console.error('❌ Test failed:', error);
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.details && !result.passed) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting Registration Flow Tests');
  console.log('Testing against API at:', API_BASE_URL);
  console.log('Test user email:', TEST_USER_EMAIL);

  // Check if API is running
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/auth/demo`);
    if (!healthCheck.ok) {
      console.error('❌ API server is not responding. Please start the server with: npm run dev');
      process.exit(1);
    }
    console.log('✅ API server is running\n');
  } catch (error: any) {
    console.error('❌ Cannot connect to API server. Please start the server with: npm run dev');
    process.exit(1);
  }

  await testRegistrationSuccess();
  await testRegistrationErrors();
  printSummary();
}

main();
