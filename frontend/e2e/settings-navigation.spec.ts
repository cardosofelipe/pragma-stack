/**
 * E2E Tests for Settings Navigation
 * Tests navigation between settings pages
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks, loginViaUI } from './helpers/auth';

test.describe('Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks
    await setupAuthenticatedMocks(page);

    // Login via UI to establish authenticated session
    await loginViaUI(page);
  });

  test('should navigate from home to settings profile', async ({ page }) => {
    // From home page
    await expect(page).toHaveURL('/');

    // Navigate to settings/profile
    await page.goto('/settings/profile');

    // Verify navigation successful
    await expect(page).toHaveURL('/settings/profile');

    // Verify page loaded
    await expect(page.locator('h2')).toContainText('Profile');
  });

  test('should navigate from home to settings password', async ({ page }) => {
    // From home page
    await expect(page).toHaveURL('/');

    // Navigate to settings/password
    await page.goto('/settings/password');

    // Verify navigation successful
    await expect(page).toHaveURL('/settings/password');

    // Verify page loaded
    await expect(page.locator('h2')).toContainText('Password');
  });

  test('should navigate between settings pages', async ({ page }) => {
    // Start at profile page
    await page.goto('/settings/profile');
    await expect(page.locator('h2')).toContainText('Profile');

    // Navigate to password page
    await page.goto('/settings/password');
    await expect(page.locator('h2')).toContainText('Password');

    // Navigate back to profile page
    await page.goto('/settings/profile');
    await expect(page.locator('h2')).toContainText('Profile');
  });

  test('should redirect from /settings to /settings/profile', async ({ page }) => {
    // Navigate to base settings page
    await page.goto('/settings');

    // Should redirect to profile page
    await expect(page).toHaveURL('/settings/profile');

    // Verify profile page loaded
    await expect(page.locator('h2')).toContainText('Profile');
  });

  test('should display preferences page placeholder', async ({ page }) => {
    // Navigate to preferences page
    await page.goto('/settings/preferences');

    // Verify navigation successful
    await expect(page).toHaveURL('/settings/preferences');

    // Verify page loaded with placeholder content
    await expect(page.locator('h2')).toContainText('Preferences');
    await expect(page.getByText(/coming in task/i)).toBeVisible();
  });
});
