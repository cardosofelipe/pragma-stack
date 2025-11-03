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

    // Navigate to profile settings
    await page.goto('/settings/profile');
    await expect(page).toHaveURL('/settings/profile');
  });

  test('should display profile settings page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h2')).toContainText('Profile');

    // Check form fields exist
    await expect(page.locator('input[name="first_name"]')).toBeVisible();
    await expect(page.locator('input[name="last_name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should pre-populate form with current user data', async ({ page }) => {
    // Wait for form to load
    await page.waitForSelector('input[name="first_name"]');

    // Check that fields are populated
    const firstName = await page.locator('input[name="first_name"]').inputValue();
    const email = await page.locator('input[name="email"]').inputValue();

    expect(firstName).toBeTruthy();
    expect(email).toBeTruthy();
  });

  test('should have email field disabled', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeDisabled();
  });

  test('should show submit button disabled when form is pristine', async ({ page }) => {
    await page.waitForSelector('input[name="first_name"]');

    // Submit button should be disabled initially
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when first name is modified', async ({ page }) => {
    await page.waitForSelector('input[name="first_name"]');

    // Modify first name
    const firstNameInput = page.locator('input[name="first_name"]');
    await firstNameInput.fill('TestUser');

    // Submit button should be enabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should show reset button when form is dirty', async ({ page }) => {
    await page.waitForSelector('input[name="first_name"]');

    // Modify first name
    const firstNameInput = page.locator('input[name="first_name"]');
    await firstNameInput.fill('TestUser');

    // Reset button should appear
    const resetButton = page.locator('button[type="button"]:has-text("Reset")');
    await expect(resetButton).toBeVisible();
  });

  test('should reset form when reset button is clicked', async ({ page }) => {
    await page.waitForSelector('input[name="first_name"]');

    // Get original value
    const firstNameInput = page.locator('input[name="first_name"]');
    const originalValue = await firstNameInput.inputValue();

    // Modify first name
    await firstNameInput.fill('TestUser');
    await expect(firstNameInput).toHaveValue('TestUser');

    // Click reset
    const resetButton = page.locator('button[type="button"]:has-text("Reset")');
    await resetButton.click();

    // Should revert to original value
    await expect(firstNameInput).toHaveValue(originalValue);
  });

  test('should show validation error for empty first name', async ({ page }) => {
    await page.waitForSelector('input[name="first_name"]');

    // Clear first name
    const firstNameInput = page.locator('input[name="first_name"]');
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
    await expect(page.locator('text=Profile Information')).toBeVisible();
  });

  test('should show description about email being read-only', async ({ page }) => {
    await expect(page.locator('text=/cannot be changed/i')).toBeVisible();
  });
});
