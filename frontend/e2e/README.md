# E2E Testing with Playwright

## Overview

This directory contains end-to-end (E2E) tests for the authentication system using Playwright. These tests verify the complete user flows in a real browser environment.

## Test Coverage

- **Login Flow** (`auth-login.spec.ts`)
  - Form validation
  - Invalid credentials handling
  - Successful login
  - Navigation between auth pages
  - Password visibility toggle
  - Loading states

- **Registration Flow** (`auth-register.spec.ts`)
  - Form validation (email, first_name, password, confirmPassword)
  - Field-specific validation errors
  - Duplicate email handling
  - Successful registration
  - Navigation and UI interactions

- **Password Reset Flow** (`auth-password-reset.spec.ts`)
  - Request reset email validation
  - Success message display
  - Confirm with token validation
  - Missing/invalid token handling
  - Password strength validation
  - Password mismatch validation

- **AuthGuard Protection** (`auth-guard.spec.ts`)
  - Route protection
  - Public route access
  - Token persistence
  - Logout behavior
  - Expired token handling
  - Intended destination preservation

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Run tests in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- auth-login.spec.ts

# Debug mode
npm run test:e2e -- --debug
```

## Current Status

Comprehensive E2E test coverage across all authentication flows. Tests are designed to be non-flaky with proper waits and selectors.

Run `npm run test:e2e` to verify current status.

## Prerequisites

- **Dev Server**: Must be running on `localhost:3000`
- **Backend API**: Should be running on `localhost:8000` (optional for some tests)
- **Playwright Browsers**: Auto-installed via `npx playwright install`

## Configuration

See `playwright.config.ts` for:

- Browser targets (Chromium, Firefox, WebKit)
- Base URL configuration
- Screenshot and video settings
- Parallel execution settings

## Test Structure

Each test file follows this pattern:

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/route');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

## Best Practices

1. **Wait for elements** - Use `await expect().toBeVisible()` instead of `page.waitForSelector()`
2. **Unique selectors** - Prefer `data-testid`, `role`, or specific text over generic CSS
3. **Avoid hardcoded delays** - Use Playwright's auto-waiting instead of `waitForTimeout()`
4. **Test independence** - Each test should be able to run in isolation
5. **Clean state** - Clear cookies and storage before each test

## Debugging

```bash
# Run with UI mode
npx playwright test --ui

# Generate trace
npm run test:e2e -- --trace on

# View test report
npx playwright show-report
```

## Future Enhancements

- [ ] Add API mocking for consistent test data
- [ ] Add visual regression testing
- [ ] Add accessibility testing (axe-core)
- [ ] Add performance testing
- [ ] Integrate with CI/CD pipeline
- [ ] Add test data fixtures
- [ ] Add page object models for better maintainability
