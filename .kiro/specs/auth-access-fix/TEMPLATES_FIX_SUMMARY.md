# Templates Not Showing in Letters - Fix Summary

**Date:** November 25, 2025  
**Issue:** Templates weren't showing in the letters page when using demo mode  
**Status:** ✅ RESOLVED

## Root Causes Identified

### 1. Demo Mode Tokens Were Fake ❌
**Problem:** The `/auth/demo` endpoint was returning placeholder strings instead of real JWT tokens:
```typescript
// BEFORE (BROKEN)
const demoTokens = {
  accessToken: 'demo-access-token',  // ❌ Not a real JWT
  refreshToken: 'demo-refresh-token', // ❌ Not a real JWT
  expiresIn: 3600,
};
```

**Impact:** Demo mode tokens couldn't authenticate with protected endpoints like `/templates`

**Fix:** Modified `AuthService.getDemoUser()` to generate real JWT tokens:
```typescript
// AFTER (FIXED)
const payload: JwtPayload = {
  sub: demoUser.id,
  email: demoUser.email,
  role: demoUser.role,
  portfolios: demoUser.portfolios,
};

const accessToken = this.jwtService.sign(payload, {
  secret: this.configService.get<string>('JWT_SECRET'),
  expiresIn: '1h',
});
```

### 2. Demo User Validation Failed ❌
**Problem:** The JWT strategy's `validateUser()` method tried to load the demo user from file storage, which doesn't exist:
```typescript
// BEFORE (BROKEN)
async validateUser(payload: JwtPayload) {
  const user = await this.fileStorageService.readJson<User>('users', payload.sub);
  // ❌ Fails for demo-user because it doesn't exist in storage
  if (!user || !user.isActive) {
    return null;
  }
  return userWithoutPassword;
}
```

**Impact:** All authenticated requests with demo tokens were rejected with 401 Unauthorized

**Fix:** Added special handling for demo user in `validateUser()`:
```typescript
// AFTER (FIXED)
async validateUser(payload: JwtPayload) {
  // ✅ Handle demo user specially (not stored in file system)
  if (payload.sub === 'demo-user') {
    return {
      id: 'demo-user',
      email: 'demo@mdjpractice.com',
      firstName: 'Demo',
      lastName: 'User',
      role: 'MANAGER',
      portfolios: [1, 2],
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  // Regular user validation continues...
  const user = await this.fileStorageService.readJson<User>('users', payload.sub);
  // ...
}
```

### 3. Templates in Wrong Storage Location ❌
**Problem:** Templates were stored in `storage/templates/` but the API was looking in `apps/api/storage/templates/`

**Why:** The API runs from the `apps/api` directory, so relative path `./storage` resolves to `apps/api/storage/`, not the root `storage/` directory.

**Impact:** Templates service returned empty array even with valid authentication

**Fix:** Copied templates from root storage to API storage:
```bash
cp -r storage/templates/* apps/api/storage/templates/
```

**Result:** 42 templates now accessible via API

## Files Modified

### 1. `apps/api/src/modules/auth/auth.controller.ts`
**Change:** Simplified demo endpoint to delegate to service
```typescript
@Get('demo')
@HttpCode(HttpStatus.OK)
async getDemoUser(): Promise<AuthResponse> {
  return this.authService.getDemoUser();
}
```

### 2. `apps/api/src/modules/auth/auth.service.ts`
**Changes:**
- Added `getDemoUser()` method to generate real JWT tokens for demo user
- Modified `validateUser()` to handle demo user specially

### 3. `apps/api/src/prisma/prisma.service.ts`
**Change:** Made database connection optional (allows file-based storage)
```typescript
async onModuleInit() {
  try {
    await this.$connect();
    this.logger.log('Connected to database');
  } catch (error) {
    this.logger.warn('Database connection failed - using file-based storage only');
    // ✅ Don't throw error - allow app to run with file-based storage
  }
}
```

### 4. Storage Directory
**Change:** Copied templates to correct location
```bash
cp -r storage/templates/* apps/api/storage/templates/
```

## Test Results

### Before Fix ❌
```bash
# Demo token
curl http://localhost:3001/api/v1/auth/demo
# Returns: { accessToken: "demo-access-token", ... }

# Templates with demo token
curl -H "Authorization: Bearer demo-access-token" \
  http://localhost:3001/api/v1/templates
# Returns: { "message": "Unauthorized", "statusCode": 401 }
```

### After Fix ✅
```bash
# Demo token (real JWT)
curl http://localhost:3001/api/v1/auth/demo
# Returns: { accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", ... }

# Templates with demo token
curl -H "Authorization: Bearer $DEMO_TOKEN" \
  http://localhost:3001/api/v1/templates
# Returns: [{ "id": "...", "name": "CT600 Cover Letter", ... }, ...]
# Count: 42 templates
```

## Verification Steps

1. **Start API server:**
   ```bash
   npm run dev:api
   ```

2. **Get demo token:**
   ```bash
   DEMO_TOKEN=$(curl -s http://localhost:3001/api/v1/auth/demo | jq -r '.accessToken')
   ```

3. **Verify token is real JWT:**
   ```bash
   echo $DEMO_TOKEN | cut -d'.' -f2 | base64 -d | jq '.'
   # Should show: { "sub": "demo-user", "email": "demo@mdjpractice.com", ... }
   ```

4. **Test templates endpoint:**
   ```bash
   curl -s http://localhost:3001/api/v1/templates \
     -H "Authorization: Bearer $DEMO_TOKEN" \
     | jq 'length'
   # Should return: 42
   ```

5. **Test in browser:**
   - Navigate to http://localhost:3000/login
   - Click "Explore Demo"
   - Navigate to http://localhost:3000/templates
   - Should see 42 templates organized by category

## Impact

### What Now Works ✅
1. **Demo mode authentication** - Demo users can now access all protected endpoints
2. **Templates visible** - All 42 templates are accessible via API
3. **Letters page functional** - Users can browse templates and generate letters
4. **Template categories** - Templates properly organized by TAX, HMRC, VAT, COMPLIANCE, GENERAL, ENGAGEMENT

### User Experience Improvements
- Demo mode now provides full feature access
- Templates page shows all available templates
- Users can generate letters from templates
- No more "Unauthorized" errors in demo mode

## Future Considerations

### Storage Path Configuration
**Current Issue:** Templates need to be in two locations:
- `storage/templates/` (root)
- `apps/api/storage/templates/` (API)

**Recommended Solution:** Update `.env` to use absolute path or path relative to project root:
```env
# Option 1: Absolute path
STORAGE_PATH="/Users/neiljones/MDJ_Practice_Manager_FINAL/storage"

# Option 2: Relative to project root (requires code change)
STORAGE_PATH="../../storage"
```

### Demo User Persistence
**Current:** Demo user is created on-the-fly for each request  
**Consideration:** This is actually good for security - demo sessions are truly stateless

### Template Synchronization
**Current:** Templates must be manually copied between storage locations  
**Recommendation:** Use symlinks or configure single storage location

## Conclusion

✅ **All issues resolved**

Templates are now fully accessible in demo mode and the letters page is functional. Users can:
- Enter demo mode with real authentication
- Browse 42 available templates
- Generate letters from templates
- Access all protected endpoints

The fixes ensure demo mode provides a complete user experience while maintaining security through short-lived JWT tokens (1 hour expiration).

---

**Fixed by:** Kiro AI Assistant  
**Date:** November 25, 2025  
**Test Status:** ✅ PASSED
