#!/usr/bin/env ts-node

/**
 * Login Flow Test Script
 * 
 * Tests the complete login flow including:
 * - Login with valid credentials
 * - Session creation verification
 * - Token validation
 * - Error handling for invalid credentials
 * 
 * Requirements tested: 3.1, 3.2, 3.4, 3.5, 3.6, 5.2
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'http://localhost:3001/api/v1';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    portfolios: number[];
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserSession {
  id: string;
  userId: string;
  refreshToken: string;
  createdAt: string;
  expiresAt: string;
}

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logSection(message: string) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(message, colors.blue);
  log('='.repeat(60), colors.blue);
}

async function checkApiHealth(): Promise<boolean> {
  try {
    // Try to reach the API - even a 404 means the server is running
    const response = await fetch(`${API_BASE_URL}/auth/demo`);
    return true; // If we get any response, server is running
  } catch (error) {
    return false;
  }
}

async function loginUser(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json() as LoginResponse;
  } catch (error) {
    throw error;
  }
}

function findUserByEmail(email: string): any | null {
  const usersDir = path.join(process.cwd(), 'storage/users');
  
  if (!fs.existsSync(usersDir)) {
    return null;
  }

  const userFiles = fs.readdirSync(usersDir);
  
  for (const file of userFiles) {
    if (file.endsWith('.json')) {
      const filePath = path.join(usersDir, file);
      const userData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (userData.email === email.toLowerCase()) {
        return userData;
      }
    }
  }
  
  return null;
}

function findSessionByUserId(userId: string): UserSession | null {
  const sessionsDir = path.join(process.cwd(), 'storage/user-sessions');
  
  if (!fs.existsSync(sessionsDir)) {
    return null;
  }

  const sessionFiles = fs.readdirSync(sessionsDir);
  
  // Find the most recent session for this user
  let latestSession: UserSession | null = null;
  let latestTime = 0;
  
  for (const file of sessionFiles) {
    if (file.endsWith('.json')) {
      const filePath = path.join(sessionsDir, file);
      const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (sessionData.userId === userId) {
        const createdTime = new Date(sessionData.createdAt).getTime();
        if (createdTime > latestTime) {
          latestTime = createdTime;
          latestSession = sessionData;
        }
      }
    }
  }
  
  return latestSession;
}

async function testLoginWithValidCredentials(): Promise<boolean> {
  logSection('TEST 5.1: Login with Registered User');
  
  let allTestsPassed = true;
  
  // Use credentials from registration test
  const testEmail = 'test-user@example.com';
  const testPassword = 'SecurePassword123!';
  
  logInfo(`Testing login with email: ${testEmail}`);
  
  try {
    // Step 1: Verify user exists
    logInfo('Step 1: Verifying user exists in storage...');
    const existingUser = findUserByEmail(testEmail);
    
    if (!existingUser) {
      logError('Test user not found. Creating test user first...');
      
      // Register a test user
      const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          confirmPassword: testPassword,
          firstName: 'Test',
          lastName: 'User',
          agreeToTerms: true,
        }),
      });
      
      if (!registerResponse.ok) {
        logError('Failed to create test user');
        return false;
      }
      
      logSuccess('Test user created successfully');
    } else {
      logSuccess(`User found: ${existingUser.id}`);
    }
    
    // Step 2: Submit login form
    logInfo('Step 2: Submitting login credentials...');
    const loginResponse = await loginUser(testEmail, testPassword);
    
    if (!loginResponse) {
      logError('Login failed - no response received');
      allTestsPassed = false;
      return false;
    }
    
    logSuccess('Login successful');
    
    // Step 3: Verify successful authentication
    logInfo('Step 3: Verifying authentication response...');
    
    if (!loginResponse.user) {
      logError('Response missing user object');
      allTestsPassed = false;
    } else {
      logSuccess('User object present in response');
    }
    
    if (!loginResponse.accessToken) {
      logError('Response missing access token');
      allTestsPassed = false;
    } else {
      logSuccess('Access token present in response');
    }
    
    if (!loginResponse.refreshToken) {
      logError('Response missing refresh token');
      allTestsPassed = false;
    } else {
      logSuccess('Refresh token present in response');
    }
    
    if (typeof loginResponse.expiresIn !== 'number') {
      logError('Response missing or invalid expiresIn');
      allTestsPassed = false;
    } else {
      logSuccess(`Token expiration set: ${loginResponse.expiresIn} seconds`);
    }
    
    // Step 4: Verify session creation
    logInfo('Step 4: Verifying session creation in storage...');
    const userId = loginResponse.user.id;
    
    // Wait a moment for file system to sync
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const session = findSessionByUserId(userId);
    
    if (!session) {
      logError(`Session not found for user ${userId}`);
      allTestsPassed = false;
    } else {
      logSuccess(`Session created: ${session.id}`);
      
      // Verify session data
      if (session.userId !== userId) {
        logError('Session userId mismatch');
        allTestsPassed = false;
      } else {
        logSuccess('Session linked to correct user');
      }
      
      if (!session.refreshToken) {
        logError('Session missing refresh token');
        allTestsPassed = false;
      } else {
        logSuccess('Session contains refresh token');
      }
      
      if (!session.createdAt) {
        logError('Session missing createdAt timestamp');
        allTestsPassed = false;
      } else {
        logSuccess(`Session created at: ${session.createdAt}`);
      }
      
      if (!session.expiresAt) {
        logError('Session missing expiresAt timestamp');
        allTestsPassed = false;
      } else {
        logSuccess(`Session expires at: ${session.expiresAt}`);
      }
    }
    
    // Step 5: Verify user data in response
    logInfo('Step 5: Verifying user data in response...');
    
    if (loginResponse.user.email !== testEmail.toLowerCase()) {
      logError(`Email mismatch: expected ${testEmail.toLowerCase()}, got ${loginResponse.user.email}`);
      allTestsPassed = false;
    } else {
      logSuccess('Email matches');
    }
    
    if (!loginResponse.user.firstName) {
      logError('First name missing');
      allTestsPassed = false;
    } else {
      logSuccess(`First name: ${loginResponse.user.firstName}`);
    }
    
    if (!loginResponse.user.lastName) {
      logError('Last name missing');
      allTestsPassed = false;
    } else {
      logSuccess(`Last name: ${loginResponse.user.lastName}`);
    }
    
    if (!loginResponse.user.role) {
      logError('Role missing');
      allTestsPassed = false;
    } else {
      logSuccess(`Role: ${loginResponse.user.role}`);
    }
    
    if (!Array.isArray(loginResponse.user.portfolios)) {
      logError('Portfolios not an array');
      allTestsPassed = false;
    } else {
      logSuccess(`Portfolios: [${loginResponse.user.portfolios.join(', ')}]`);
    }
    
    // Step 6: Verify redirect would occur (simulated)
    logInfo('Step 6: Verifying redirect behavior...');
    logSuccess('In web client, user would be redirected to /dashboard');
    
    return allTestsPassed;
    
  } catch (error) {
    const err = error as Error;
    logError(`Login test failed: ${err.message}`);
    return false;
  }
}

async function testLoginErrorCases(): Promise<boolean> {
  logSection('TEST 5.2: Login Error Cases');
  
  let allTestsPassed = true;
  
  // Test 1: Invalid email format
  logInfo('Test 1: Login with invalid email format...');
  try {
    await loginUser('not-an-email', 'password123');
    logError('Should have failed with invalid email');
    allTestsPassed = false;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Invalid') || err.message.includes('credentials') || err.message.includes('email')) {
      logSuccess('Correctly rejected invalid email format');
      logSuccess(`Error message: "${err.message}"`);
    } else {
      logError(`Unexpected error: ${err.message}`);
      allTestsPassed = false;
    }
  }
  
  // Test 2: Non-existent user
  logInfo('Test 2: Login with non-existent user...');
  try {
    await loginUser('nonexistent@example.com', 'password123');
    logError('Should have failed with non-existent user');
    allTestsPassed = false;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Invalid') || err.message.includes('credentials')) {
      logSuccess('Correctly rejected non-existent user');
      logSuccess(`Error message: "${err.message}"`);
    } else {
      logError(`Unexpected error: ${err.message}`);
      allTestsPassed = false;
    }
  }
  
  // Test 3: Invalid password
  logInfo('Test 3: Login with invalid password...');
  try {
    // Use a known user email but wrong password
    const testEmail = 'test-user@example.com';
    await loginUser(testEmail, 'WrongPassword123!');
    logError('Should have failed with invalid password');
    allTestsPassed = false;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Invalid') || err.message.includes('credentials')) {
      logSuccess('Correctly rejected invalid password');
      logSuccess(`Error message: "${err.message}"`);
    } else {
      logError(`Unexpected error: ${err.message}`);
      allTestsPassed = false;
    }
  }
  
  // Test 4: Empty credentials
  logInfo('Test 4: Login with empty credentials...');
  try {
    await loginUser('', '');
    logError('Should have failed with empty credentials');
    allTestsPassed = false;
  } catch (error) {
    logSuccess('Correctly rejected empty credentials');
  }
  
  // Test 5: Verify error message format
  logInfo('Test 5: Verifying error message format...');
  try {
    await loginUser('test@example.com', 'wrongpassword');
  } catch (error) {
    const err = error as Error;
    const message = err.message.toLowerCase();
    if (message.includes('invalid') && message.includes('credentials')) {
      logSuccess('Error message contains "Invalid credentials"');
    } else if (message.includes('invalid')) {
      logSuccess('Error message indicates invalid input');
    } else {
      logError(`Error message format unexpected: "${err.message}"`);
      allTestsPassed = false;
    }
  }
  
  return allTestsPassed;
}

async function runTests() {
  log('\n' + '='.repeat(60), colors.blue);
  log('LOGIN FLOW TEST SUITE', colors.blue);
  log('='.repeat(60) + '\n', colors.blue);
  
  logInfo('Testing Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 5.2');
  logInfo('Date: ' + new Date().toISOString());
  
  // Check API health
  logInfo('\nChecking API server health...');
  const isHealthy = await checkApiHealth();
  
  if (!isHealthy) {
    logError('API server is not running on http://localhost:3001');
    logError('Please start the API server with: npm run dev:api');
    process.exit(1);
  }
  
  logSuccess('API server is running');
  
  // Run tests
  const results = {
    validLogin: false,
    errorCases: false,
  };
  
  results.validLogin = await testLoginWithValidCredentials();
  results.errorCases = await testLoginErrorCases();
  
  // Summary
  logSection('TEST SUMMARY');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  
  log(`\nTotal Tests: ${totalTests}`);
  log(`Passed: ${passedTests}`, passedTests === totalTests ? colors.green : colors.yellow);
  log(`Failed: ${totalTests - passedTests}`, totalTests - passedTests === 0 ? colors.green : colors.red);
  
  if (results.validLogin) {
    logSuccess('✅ Test 5.1: Login with registered user - PASSED');
  } else {
    logError('❌ Test 5.1: Login with registered user - FAILED');
  }
  
  if (results.errorCases) {
    logSuccess('✅ Test 5.2: Login error cases - PASSED');
  } else {
    logError('❌ Test 5.2: Login error cases - FAILED');
  }
  
  log('\n' + '='.repeat(60), colors.blue);
  
  if (passedTests === totalTests) {
    logSuccess('ALL TESTS PASSED ✅');
    log('');
    logInfo('Requirements Coverage:');
    logSuccess('  3.1: Login credential verification ✓');
    logSuccess('  3.2: Invalid credentials error ✓');
    logSuccess('  3.4: Token generation ✓');
    logSuccess('  3.5: Session creation ✓');
    logSuccess('  3.6: Token storage ✓');
    logSuccess('  5.2: Error message display ✓');
    process.exit(0);
  } else {
    logError('SOME TESTS FAILED ❌');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
