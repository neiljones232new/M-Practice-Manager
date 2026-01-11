# Calendar Tests

This directory contains test files for the calendar functionality.

## ⚠️ Important Notice

**These tests cannot be executed** because the web application does not have testing infrastructure configured.

## Test Files

### 1. `calendar-client-display.test.tsx`
Tests for calendar grid client name display functionality.

### 2. `event-modal-client-display.test.tsx`
Tests for event modal client information display.

### 3. `create-form-client-selection.test.tsx`
Tests for client selection in the create event form.

### 4. `edit-form-client-selection.test.tsx`
Tests for client selection in the edit event form.

## Purpose of These Files

These test files serve as:
- **Documentation** of expected behavior
- **Reference implementation** for future testing
- **Specification** of component functionality
- **Template** for when testing infrastructure is added

## Why Tests Can't Run

The web app (`apps/web`) is missing:
- Testing dependencies (`@testing-library/react`, `jest`, etc.)
- Jest configuration
- Test scripts in `package.json`

## How to Test Instead

Use the **manual test guides** located in:
```
.kiro/specs/client-name-display/
```

Each test file has a corresponding manual test guide:
- `test-11-calendar-grid-display.md` - Calendar grid tests
- `test-12-event-modal-display.md` - Event modal tests
- `test-13-create-form-client-selection.md` - Create form tests
- `test-14-edit-form-client-selection.md` - Edit form tests

## Setting Up Testing (Optional)

If you want to enable automated testing:

### 1. Install Dependencies
```bash
cd apps/web
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest \
  ts-jest \
  @types/jest \
  jest-environment-jsdom
```

### 2. Add Jest Configuration
Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts?(x)',
  ],
};
```

### 3. Create Jest Setup
Create `jest.setup.js`:
```javascript
import '@testing-library/jest-dom';
```

### 4. Add Test Scripts
Update `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 5. Run Tests
```bash
npm test
```

## Test Coverage

These test files cover:
- ✅ Calendar grid client name display
- ✅ Event modal client information display
- ✅ Client selection in create form
- ✅ Client selection in edit form
- ✅ Search functionality with debouncing
- ✅ Client data caching
- ✅ Error handling
- ✅ Edge cases

## Requirements Validated

All tests validate specific requirements from:
```
.kiro/specs/client-name-display/requirements.md
```

Each test includes comments referencing the specific requirements being tested.

## Questions?

For more information, see:
- Manual test guides in `.kiro/specs/client-name-display/`
- Design document: `.kiro/specs/client-name-display/design.md`
- Requirements: `.kiro/specs/client-name-display/requirements.md`
