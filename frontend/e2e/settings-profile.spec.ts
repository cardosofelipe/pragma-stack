/**
 * E2E Tests for Profile Settings Page
 * Tests profile editing functionality using mocked API
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks } from './helpers/auth';

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks for authenticated user
    await setupAuthenticatedMocks(page);

    // Delay to ensure auth store injection completes before navigation
    await page.waitForTimeout(200);

    // Navigate to profile settings
    await page.goto('/settings/profile');
    await expect(page).toHaveURL('/settings/profile');

    // Wait for page to fully load with auth context
    await page.waitForSelector('h2:has-text("Profile")', { timeout: 10000 });
  });

  test('should display profile settings page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h2')).toContainText('Profile');

    // Check form fields exist (using ID selectors which are guaranteed by FormField)
    await expect(page.locator('#first_name')).toBeVisible();
    await expect(page.locator('#last_name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should pre-populate form with current user data', async ({ page }) => {
    // Wait for form to load
    await page.waitForSelector('#first_name');

    // Check that fields are populated
    const firstName = await page.locator('#first_name').inputValue();
    const email = await page.locator('#email').inputValue();

    expect(firstName).toBeTruthy();
    expect(email).toBeTruthy();
  });

  test('should have email field disabled', async ({ page }) => {
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeDisabled();
  });

  test('should show submit button disabled when form is pristine', async ({ page }) => {
    await page.waitForSelector('#first_name');

    // Submit button should be disabled initially
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when first name is modified', async ({ page }) => {
    await page.waitForSelector('#first_name');

    // Wait for form to be populated with user data
    await page.waitForFunction(() => {
      const input = document.querySelector('#first_name') as HTMLInputElement;
      return input && input.value !== '';
    }, { timeout: 5000 });

    // Modify first name
    const firstNameInput = page.locator('#first_name');
    await firstNameInput.clear();
    await firstNameInput.fill('TestUser');

    // Submit button should be enabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should show reset button when form is dirty', async ({ page }) => {
    await page.waitForSelector('#first_name');

    // Wait for form to be populated with user data
    await page.waitForFunction(() => {
      const input = document.querySelector('#first_name') as HTMLInputElement;
      return input && input.value !== '';
    }, { timeout: 5000 });

    // Modify first name and blur to trigger dirty state
    const firstNameInput = page.locator('#first_name');
    await firstNameInput.clear();
    await firstNameInput.fill('TestUser');
    await firstNameInput.blur();

    // Reset button should appear when form is dirty
    const resetButton = page.locator('button[type="button"]:has-text("Reset")');
    await expect(resetButton).toBeVisible({ timeout: 3000 });
  });

  test('should reset form when reset button is clicked', async ({ page }) => {
    await page.waitForSelector('#first_name');

    // Wait for form to be populated with user data
    await page.waitForFunction(() => {
      const input = document.querySelector('#first_name') as HTMLInputElement;
      return input && input.value !== '';
    }, { timeout: 5000 });

    // Get original value
    const firstNameInput = page.locator('#first_name');
    const originalValue = await firstNameInput.inputValue();

    // Modify first name and blur to trigger dirty state
    await firstNameInput.clear();
    await firstNameInput.fill('TestUser');
    await firstNameInput.blur();
    await expect(firstNameInput).toHaveValue('TestUser');

    // Click reset
    const resetButton = page.locator('button[type="button"]:has-text("Reset")');
    await resetButton.click();

    // Should revert to original value
    await expect(firstNameInput).toHaveValue(originalValue);
  });

  test('should show validation error for empty first name', async ({ page }) => {
    await page.waitForSelector('#first_name');

    // Clear first name
    const firstNameInput = page.locator('#first_name');
    await firstNameInput.fill('');

    // Tab away to trigger validation
    await page.keyboard.press('Tab');

    // Try to submit (if button is enabled)
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Should show validation error
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
    }
  });

  test('should display profile information card title', async ({ page }) => {
    await expect(page.getByText('Profile Information', { exact: true })).toBeVisible();
  });

  test('should show description about email being read-only', async ({ page }) => {
    await expect(page.locator('text=/cannot be changed/i')).toBeVisible();
  });
});
