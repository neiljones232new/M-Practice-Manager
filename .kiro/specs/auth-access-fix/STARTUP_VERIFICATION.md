# Startup Verification

This document describes the startup verification functionality added to the MDJ Practice Manager application.

## Overview

The startup verification system ensures that the API server is running and responding correctly before attempting to use the application. It includes:

1. A dedicated health check endpoint at `/api/v1/health`
2. A verification script that polls the health endpoint with timeout handling
3. Clear status messages and troubleshooting guidance

## Health Check Endpoint

### Endpoint Details

- **URL**: `GET /api/v1/health`
- **Response**: JSON object with status, message, and timestamp

### Example Response

```json
{
  "status": "ok",
  "message": "MDJ Practice Manager API is running",
  "timestamp": "2025-11-11T16:46:51.848Z"
}
```

### Testing the Endpoint

```bash
curl http://localhost:3001/api/v1/health
```

## Verification Script

### Usage

Run the verification script to check if the API server is ready:

```bash
npm run verify:startup
```

Or run the script directly:

```bash
./scripts/verify-startup.sh
```

Or using ts-node:

```bash
TS_NODE_TRANSPILE_ONLY=1 \
TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
ts-node scripts/verify-startup.ts
```

### Configuration

The script can be configured using environment variables:

- `API_HOST`: API server hostname (default: `localhost`)
- `API_PORT`: API server port (default: `3001`)
- `API_PREFIX`: API route prefix (default: `api/v1`)

Example with custom configuration:

```bash
API_HOST=127.0.0.1 API_PORT=3002 npm run verify:startup
```

### Behavior

The script will:

1. Poll the health endpoint every 1 second
2. Retry up to 30 times (30 seconds total)
3. Display progress for each attempt
4. Exit with code 0 if the server is ready
5. Exit with code 1 if the server fails to start within the timeout

### Output Examples

#### Successful Verification

```
🚀 MDJ Practice Manager - Startup Verification

🔍 Checking API server at http://localhost:3001/api/v1/health
   Max wait time: 30 seconds

   Attempt 1/30... ✅ API server is healthy
   Response: MDJ Practice Manager API is running
   Timestamp: 2025-11-11T16:46:51.848Z

✅ API server is ready!
```

#### Failed Verification

```
🚀 MDJ Practice Manager - Startup Verification

🔍 Checking API server at http://localhost:3001/api/v1/health
   Max wait time: 30 seconds

   Attempt 1/30... retrying...
   Attempt 2/30... retrying...
   ...
   Attempt 30/30... failed

❌ API server failed to start within the timeout period

Troubleshooting steps:
1. Check if the API server is running: npm run dev:api
2. Verify the API port is not in use: lsof -i :3001
3. Check API server logs for errors
4. Ensure the health endpoint is accessible: curl http://localhost:3001/api/v1/health
```

## Integration with Development Workflow

### Starting the Application

1. Start both servers:
   ```bash
   npm run dev
   ```

2. In a separate terminal, verify the API is ready:
   ```bash
   npm run verify:startup
   ```

3. Once verification succeeds, the application is ready to use

### CI/CD Integration

The verification script can be integrated into CI/CD pipelines to ensure the API server is ready before running tests:

```bash
# Start the API server in the background
npm run dev:api &

# Wait for the server to be ready
npm run verify:startup

# Run tests
npm run test
```

## Troubleshooting

### Server Not Responding

If the verification script reports that the server is not responding:

1. **Check if the API server is running**:
   ```bash
   lsof -i :3001
   ```

2. **Start the API server**:
   ```bash
   npm run dev:api
   ```

3. **Check for port conflicts**:
   ```bash
   lsof -i :3001
   kill -9 <PID>  # If needed
   ```

4. **Check API server logs** for startup errors

### Health Endpoint Returns 404

If you get a 404 error when accessing the health endpoint:

1. Verify you're using the correct URL with the API prefix: `/api/v1/health`
2. Check the `API_PREFIX` environment variable in `.env`
3. Ensure the AppController is properly registered in AppModule

### Timeout Issues

If the verification script times out:

1. Increase the timeout by modifying `MAX_RETRIES` in `scripts/verify-startup.ts`
2. Check if the server is taking longer to start due to:
   - Database initialization
   - File system operations
   - Module loading

## Implementation Details

### Files Modified

1. **apps/api/src/app.controller.ts**: Added `/health` endpoint
2. **scripts/verify-startup.ts**: Created verification script
3. **scripts/verify-startup.sh**: Created shell wrapper
4. **package.json**: Added `verify:startup` npm script

### Requirements Satisfied

- ✅ Requirement 1.3: Health check endpoint for API availability
- ✅ Requirement 1.5: Clear server status logging and verification
