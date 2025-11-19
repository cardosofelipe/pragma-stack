/**
 * E2E Tests for Password Change Page
 * Tests password change functionality
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks } from './helpers/auth';

test.describe('Password Change', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks
    await setupAuthenticatedMocks(page);

    // Login via UI to establish authenticated session
    // Auth already cached in storage state (loginViaUI removed for performance)

    // Navigate to password page
    await page.goto('/en/settings/password');

    // Wait for form to be visible
    await page.getByLabel(/current password/i).waitFor({ state: 'visible' });
  });

  test.skip('should display password change form', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: 'Password' })).toBeVisible();

    // Verify all password fields are present
    await expect(page.getByLabel(/current password/i)).toBeVisible();
    await expect(page.getByLabel(/^new password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm.*password/i)).toBeVisible();

    // Verify submit button is present
    await expect(page.getByRole('button', { name: /change password/i })).toBeVisible();
  });

  test('should have all password fields as password type', async ({ page }) => {
    // Wait for form to load
    const currentPasswordInput = page.getByLabel(/current password/i);
    await currentPasswordInput.waitFor({ state: 'visible' });

    // Verify all password fields have type="password"
    await expect(currentPasswordInput).toHaveAttribute('type', 'password');
    await expect(page.getByLabel(/^new password/i)).toHaveAttribute('type', 'password');
    await expect(page.getByLabel(/confirm.*password/i)).toHaveAttribute('type', 'password');
  });

  test('should have submit button disabled initially', async ({ page }) => {
    // Wait for form to load
    const submitButton = page.getByRole('button', { name: /change password/i });
    await submitButton.waitFor({ state: 'visible' });

    // Verify button is disabled when form is empty/untouched
    await expect(submitButton).toBeDisabled();
  });
});
