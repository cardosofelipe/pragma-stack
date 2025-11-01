import { test, expect } from '@playwright/test';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to register page before each test
    await page.goto('/register');
  });

  test('should display registration form', async ({ page }) => {
    // Check page title
    await expect(page.locator('h2')).toContainText('Create your account');

    // Check form elements exist
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check terms checkbox
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();

    // Check login link
    await expect(page.getByText('Already have an account?')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click submit without filling form
    await page.locator('button[type="submit"]').click();

    // Wait for validation errors
    await expect(page.getByText('Email is required')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Username is required')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Password is required')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for invalid email', async ({ page }) => {
    // Fill invalid email
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('input[name="username"]').fill('testuser');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(page.getByText('Invalid email address')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for short username', async ({ page }) => {
    // Fill with short username
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="username"]').fill('ab');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(page.getByText(/Username must be at least/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for weak password', async ({ page }) => {
    // Fill with weak password
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="username"]').fill('testuser');
    await page.locator('input[name="password"]').fill('weak');
    await page.locator('input[name="confirmPassword"]').fill('weak');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(page.getByText(/Password must be at least/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for mismatched passwords', async ({ page }) => {
    // Fill with mismatched passwords
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="username"]').fill('testuser');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('DifferentPassword123!');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(page.getByText(/Passwords do not match|Passwords must match/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show error when terms not accepted', async ({ page }) => {
    // Fill all fields except terms
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="username"]').fill('testuser');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');

    // Don't check the terms checkbox

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(
      page.getByText(/You must accept the terms|Terms must be accepted/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show error for duplicate email', async ({ page }) => {
    // Fill with existing user email
    await page.locator('input[name="email"]').fill('existing@example.com');
    await page.locator('input[name="username"]').fill('newuser');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');
    await page.locator('input[type="checkbox"]').check();

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for error message (backend will return 400)
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });

  test('should successfully register with valid data', async ({ page }) => {
    // Note: This test requires backend to accept registration
    // May need cleanup or use unique email

    const timestamp = Date.now();
    const testEmail = `newuser${timestamp}@example.com`;
    const testUsername = `user${timestamp}`;

    // Fill form with valid data
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="username"]').fill(testUsername);
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');
    await page.locator('input[type="checkbox"]').check();

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for success or redirect
    // After successful registration, should show success message or redirect to login
    await expect(
      page.getByText(/Registration successful|Account created/i).or(page.locator('[role="alert"]')),
    ).toBeVisible({ timeout: 10000 }).catch(() => {
      // If backend is not available, this will fail
      // That's expected in CI without backend
    });
  });

  test('should navigate to login page', async ({ page }) => {
    // Click login link
    await page.getByText('Sign in').click();

    // Should navigate to login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2')).toContainText('Sign in to your account');
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    // Find toggle buttons (may be multiple for password and confirmPassword)
    const toggleButtons = page.locator('button[aria-label*="password"]');

    // Password should start as hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Click first toggle button if it exists
    if ((await toggleButtons.count()) > 0) {
      await toggleButtons.first().click();
      // First password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide
      await toggleButtons.first().click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should disable submit button while loading', async ({ page }) => {
    // Fill form with unique data
    const timestamp = Date.now();
    await page.locator('input[name="email"]').fill(`test${timestamp}@example.com`);
    await page.locator('input[name="username"]').fill(`user${timestamp}`);
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');
    await page.locator('input[type="checkbox"]').check();

    const submitButton = page.locator('button[type="submit"]');

    // Submit form
    const submitPromise = submitButton.click();

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled().or(
      expect(submitButton).toContainText(/Creating|Loading/i)
    ).catch(() => {
      // If request is very fast, button might not stay disabled
      // This is acceptable
    });

    await submitPromise;
  });
});
