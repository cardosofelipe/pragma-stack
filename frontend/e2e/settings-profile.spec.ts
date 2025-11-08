/**
 * E2E Tests for Profile Settings Page
 * Tests user profile management functionality
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks, loginViaUI, MOCK_USER } from './helpers/auth';

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks
    await setupAuthenticatedMocks(page);

    // Login via UI to establish authenticated session
    // Auth already cached in storage state (loginViaUI removed for performance)

    // Navigate to profile page
    await page.goto('/settings/profile');

    // Wait for page to render
    await page.waitForTimeout(1000);
  });

  test('should display profile form with user data', async ({ page }) => {
    // Check page title
    await expect(page.locator('h2')).toContainText('Profile Settings');

    // Wait for form to be populated with user data (use label-based selectors)
    const firstNameInput = page.getByLabel(/first name/i);
    await firstNameInput.waitFor({ state: 'visible', timeout: 10000 });

    // Verify form fields are populated with mock user data
    await expect(firstNameInput).toHaveValue(MOCK_USER.first_name);
    await expect(page.getByLabel(/last name/i)).toHaveValue(MOCK_USER.last_name);
    await expect(page.getByLabel(/email/i)).toHaveValue(MOCK_USER.email);
  });

  test('should show email as read-only', async ({ page }) => {
    // Wait for form to load
    const emailInput = page.getByLabel(/email/i);
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    // Verify email field is disabled or read-only
    const isDisabled = await emailInput.isDisabled();
    const isReadOnly = await emailInput.getAttribute('readonly');

    expect(isDisabled || isReadOnly !== null).toBeTruthy();
  });
});
