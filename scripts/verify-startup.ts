#!/usr/bin/env ts-node

/**
 * Startup Verification Script
 * 
 * This script checks if the API server is responding correctly.
 * It polls the health endpoint with timeout handling and provides
 * clear status messages.
 */

import * as http from 'http';

interface HealthCheckResponse {
  status: string;
  message?: string;
  timestamp: string;
}

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || '3001';
const API_PREFIX = process.env.API_PREFIX || 'api/v1';
const HEALTH_ENDPOINT = `/${API_PREFIX}/health`;
const MAX_RETRIES = 30; // 30 attempts
const RETRY_INTERVAL = 1000; // 1 second between attempts
const TIMEOUT = 5000; // 5 second timeout per request

/**
 * Check if the API server is responding
 */
async function checkHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: HEALTH_ENDPOINT,
      method: 'GET',
      timeout: TIMEOUT,
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response: HealthCheckResponse = JSON.parse(data);
            if (response.status === 'ok') {
              console.log('✅ API server is healthy');
              console.log(`   Response: ${response.message || 'OK'}`);
              console.log(`   Timestamp: ${response.timestamp}`);
              resolve(true);
            } else {
              console.log('⚠️  API server responded but status is not OK');
              resolve(false);
            }
          } else {
            console.log(`⚠️  API server responded with status code: ${res.statusCode}`);
            resolve(false);
          }
        } catch (error) {
          console.log('⚠️  Failed to parse health check response');
          resolve(false);
        }
      });
    });

    req.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ECONNREFUSED') {
        // Connection refused - server not running yet
        resolve(false);
      } else if (error.code === 'ETIMEDOUT') {
        console.log('⚠️  Health check request timed out');
        resolve(false);
      } else {
        console.log(`⚠️  Health check error: ${error.message}`);
        resolve(false);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('⚠️  Health check request timed out');
      resolve(false);
    });

    req.end();
  });
}

/**
 * Wait for the API server to become available
 */
async function waitForServer(): Promise<boolean> {
  console.log(`🔍 Checking API server at http://${API_HOST}:${API_PORT}${HEALTH_ENDPOINT}`);
  console.log(`   Max wait time: ${(MAX_RETRIES * RETRY_INTERVAL) / 1000} seconds\n`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    process.stdout.write(`   Attempt ${attempt}/${MAX_RETRIES}... `);

    const isHealthy = await checkHealth();

    if (isHealthy) {
      console.log('\n✅ API server is ready!\n');
      return true;
    }

    if (attempt < MAX_RETRIES) {
      process.stdout.write('retrying...\n');
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
    } else {
      process.stdout.write('failed\n');
    }
  }

  console.log('\n❌ API server failed to start within the timeout period\n');
  console.log('Troubleshooting steps:');
  console.log('1. Check if the API server is running: npm run dev:api');
  console.log('2. Verify the API port is not in use: lsof -i :3001');
  console.log('3. Check API server logs for errors');
  console.log(`4. Ensure the health endpoint is accessible: curl http://${API_HOST}:${API_PORT}${HEALTH_ENDPOINT}\n`);

  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 MDJ Practice Manager - Startup Verification\n');

  const isReady = await waitForServer();

  if (isReady) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
