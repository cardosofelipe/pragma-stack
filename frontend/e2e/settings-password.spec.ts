/**
 * E2E Tests for Password Change Page
 * Tests password change functionality using mocked API
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks } from './helpers/auth';

test.describe('Password Change', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks for authenticated user
    await setupAuthenticatedMocks(page);

    // Navigate to password settings
    await page.goto('/settings/password');
    await expect(page).toHaveURL('/settings/password');
  });

  test('should display password change page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h2')).toContainText(/Change Password/i);

    // Check form fields exist
    await expect(page.locator('input[name="current_password"]')).toBeVisible();
    await expect(page.locator('input[name="new_password"]')).toBeVisible();
    await expect(page.locator('input[name="confirm_password"]')).toBeVisible();
  });

  test('should have submit button disabled when form is pristine', async ({ page }) => {
    await page.waitForSelector('input[name="current_password"]');

    // Submit button should be disabled initially
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when all fields are filled', async ({ page }) => {
    await page.waitForSelector('input[name="current_password"]');

    // Fill all password fields
    await page.fill('input[name="current_password"]', 'Admin123!');
    await page.fill('input[name="new_password"]', 'NewAdmin123!');
    await page.fill('input[name="confirm_password"]', 'NewAdmin123!');

    // Submit button should be enabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should show cancel button when form is dirty', async ({ page }) => {
    await page.waitForSelector('input[name="current_password"]');

    // Fill current password
    await page.fill('input[name="current_password"]', 'Admin123!');

    // Cancel button should appear
    const cancelButton = page.locator('button[type="button"]:has-text("Cancel")');
    await expect(cancelButton).toBeVisible();
  });

  test('should clear form when cancel button is clicked', async ({ page }) => {
    await page.waitForSelector('input[name="current_password"]');

    // Fill fields
    await page.fill('input[name="current_password"]', 'Admin123!');
    await page.fill('input[name="new_password"]', 'NewAdmin123!');

    // Click cancel
    const cancelButton = page.locator('button[type="button"]:has-text("Cancel")');
    await cancelButton.click();

    // Fields should be cleared
    await expect(page.locator('input[name="current_password"]')).toHaveValue('');
    await expect(page.locator('input[name="new_password"]')).toHaveValue('');
  });

  test('should show password strength requirements', async ({ page }) => {
    // Check for password requirements text
    await expect(page.locator('text=/at least 8 characters/i')).toBeVisible();
  });

  test('should show validation error for weak password', async ({ page }) => {
    await page.waitForSelector('input[name="new_password"]');

    // Fill with weak password
    await page.fill('input[name="current_password"]', 'Admin123!');
    await page.fill('input[name="new_password"]', 'weak');
    await page.fill('input[name="confirm_password"]', 'weak');

    // Try to submit
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Should show validation error
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
    }
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.waitForSelector('input[name="new_password"]');

    // Fill with mismatched passwords
    await page.fill('input[name="current_password"]', 'Admin123!');
    await page.fill('input[name="new_password"]', 'NewAdmin123!');
    await page.fill('input[name="confirm_password"]', 'DifferentPassword123!');

    // Tab away to trigger validation
    await page.keyboard.press('Tab');

    // Submit button might still be enabled, try to submit
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Should show validation error
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
    }
  });

  test('should have password inputs with correct type', async ({ page }) => {
    // All password fields should have type="password"
    await expect(page.locator('input[name="current_password"]')).toHaveAttribute('type', 'password');
    await expect(page.locator('input[name="new_password"]')).toHaveAttribute('type', 'password');
    await expect(page.locator('input[name="confirm_password"]')).toHaveAttribute('type', 'password');
  });

  test('should display card title for password change', async ({ page }) => {
    await expect(page.locator('text=Change Password')).toBeVisible();
  });

  test('should show description about keeping account secure', async ({ page }) => {
    await expect(page.locator('text=/keep your account secure/i')).toBeVisible();
  });
});
