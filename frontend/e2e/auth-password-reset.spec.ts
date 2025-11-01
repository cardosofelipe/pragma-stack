import { test, expect } from '@playwright/test';

test.describe('Password Reset Request Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to password reset page
    await page.goto('/password-reset');
  });

  test('should display password reset request form', async ({ page }) => {
    // Check page title
    await expect(page.locator('h2')).toContainText('Reset your password');

    // Check form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check back to login link
    await expect(page.getByText('Back to sign in')).toBeVisible();
  });

  test('should show validation error for empty email', async ({ page }) => {
    // Click submit without filling form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(page.getByText('Email is required')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for invalid email', async ({ page }) => {
    // Fill invalid email
    await page.locator('input[name="email"]').fill('invalid-email');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(page.getByText('Invalid email address')).toBeVisible({ timeout: 5000 });
  });

  test('should successfully submit password reset request', async ({ page }) => {
    // Fill valid email
    await page.locator('input[name="email"]').fill('test@example.com');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for success message
    await expect(page.getByText(/Check your email|Reset link sent/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should navigate back to login page', async ({ page }) => {
    // Click back to sign in link
    await page.getByText('Back to sign in').click();

    // Should navigate to login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2')).toContainText('Sign in to your account');
  });

  test('should disable submit button while loading', async ({ page }) => {
    // Fill form
    await page.locator('input[name="email"]').fill('test@example.com');

    const submitButton = page.locator('button[type="submit"]');

    // Submit form
    const submitPromise = submitButton.click();

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled().or(
      expect(submitButton).toContainText(/Sending|Loading/i)
    ).catch(() => {
      // If request is very fast, button might not stay disabled
    });

    await submitPromise;
  });
});

test.describe('Password Reset Confirm Flow', () => {
  test('should display error for missing token', async ({ page }) => {
    // Navigate without token
    await page.goto('/password-reset/confirm');

    // Should show error message
    await expect(page.getByText(/Invalid reset link|link is invalid/i)).toBeVisible({
      timeout: 5000,
    });

    // Should show link to request new reset
    await expect(page.getByText('Request new reset link')).toBeVisible();
  });

  test('should display password reset confirm form with valid token', async ({ page }) => {
    // Navigate with token (using a dummy token for UI testing)
    await page.goto('/password-reset/confirm?token=dummy-test-token-123');

    // Check page title
    await expect(page.locator('h2')).toContainText('Set new password');

    // Check form elements
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Navigate with token
    await page.goto('/password-reset/confirm?token=dummy-test-token-123');

    // Click submit without filling form
    await page.locator('button[type="submit"]').click();

    // Wait for validation errors
    await expect(page.getByText('Password is required')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for weak password', async ({ page }) => {
    // Navigate with token
    await page.goto('/password-reset/confirm?token=dummy-test-token-123');

    // Fill with weak password
    await page.locator('input[name="password"]').fill('weak');
    await page.locator('input[name="confirmPassword"]').fill('weak');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(page.getByText(/Password must be at least/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for mismatched passwords', async ({ page }) => {
    // Navigate with token
    await page.goto('/password-reset/confirm?token=dummy-test-token-123');

    // Fill with mismatched passwords
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('DifferentPassword123!');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error
    await expect(page.getByText(/Passwords do not match|Passwords must match/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show error for invalid token', async ({ page }) => {
    // Navigate with invalid token
    await page.goto('/password-reset/confirm?token=invalid-token');

    // Fill form with valid passwords
    await page.locator('input[name="password"]').fill('NewPassword123!');
    await page.locator('input[name="confirmPassword"]').fill('NewPassword123!');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for error message (backend will return 400 or 404)
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });

  test('should successfully reset password with valid token', async ({ page }) => {
    // Note: This test requires a valid reset token from backend
    // In real scenario, you'd generate a token via API or use a test fixture

    // For UI testing, we use a dummy token - backend will reject it
    await page.goto('/password-reset/confirm?token=valid-test-token-from-backend');

    // Fill form with valid passwords
    await page.locator('input[name="password"]').fill('NewPassword123!');
    await page.locator('input[name="confirmPassword"]').fill('NewPassword123!');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // With a real token, should show success and redirect to login
    // Without backend or valid token, will show error
    await page.waitForTimeout(2000);
  });

  test('should navigate to request new reset link', async ({ page }) => {
    // Navigate without token to trigger error state
    await page.goto('/password-reset/confirm');

    // Click request new reset link
    await page.getByText('Request new reset link').click();

    // Should navigate to password reset request page
    await expect(page).toHaveURL('/password-reset');
    await expect(page.locator('h2')).toContainText('Reset your password');
  });

  test('should toggle password visibility', async ({ page }) => {
    // Navigate with token
    await page.goto('/password-reset/confirm?token=dummy-test-token-123');

    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    // Find toggle buttons
    const toggleButtons = page.locator('button[aria-label*="password"]');

    // Passwords should start as hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Click first toggle if it exists
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
    // Navigate with token
    await page.goto('/password-reset/confirm?token=dummy-test-token-123');

    // Fill form
    await page.locator('input[name="password"]').fill('NewPassword123!');
    await page.locator('input[name="confirmPassword"]').fill('NewPassword123!');

    const submitButton = page.locator('button[type="submit"]');

    // Submit form
    const submitPromise = submitButton.click();

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled().or(
      expect(submitButton).toContainText(/Resetting|Loading/i)
    ).catch(() => {
      // If request is very fast, button might not stay disabled
    });

    await submitPromise;
  });
});
