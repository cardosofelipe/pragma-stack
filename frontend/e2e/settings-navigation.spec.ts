/**
 * E2E Tests for Settings Navigation
 * Tests navigation between settings pages
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks } from './helpers/auth';

test.describe('Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks
    await setupAuthenticatedMocks(page);

    // Login via UI to establish authenticated session
    // Auth already cached in storage state (loginViaUI removed for performance)
  });

  test('should navigate from home to settings profile', async ({ page }) => {
    // Start at home page (auth already cached in storage state)
    await page.goto('/en');
    await expect(page).toHaveURL('/en');

    // Navigate to settings/profile
    await page.goto('/en/settings/profile');

    // Verify navigation successful
    await expect(page).toHaveURL('/en/settings/profile');

    // Verify page loaded - use specific heading selector
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('should navigate from home to settings password', async ({ page }) => {
    // Start at home page (auth already cached in storage state)
    await page.goto('/en');
    await expect(page).toHaveURL('/en');

    // Navigate to settings/password
    await page.goto('/en/settings/password');

    // Verify navigation successful
    await expect(page).toHaveURL('/en/settings/password');

    // Verify page loaded - use specific heading selector
    await expect(page.getByRole('heading', { name: 'Password' })).toBeVisible();
  });

  test('should navigate between settings pages', async ({ page }) => {
    // Start at profile page
    await page.goto('/en/settings/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

    // Navigate to password page
    await page.goto('/en/settings/password');
    await expect(page.getByRole('heading', { name: 'Password' })).toBeVisible();

    // Navigate back to profile page
    await page.goto('/en/settings/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('should redirect from /settings to /settings/profile', async ({ page }) => {
    // Navigate to base settings page
    await page.goto('/en/settings');

    // Should redirect to profile page
    await expect(page).toHaveURL('/en/settings/profile');

    // Verify profile page loaded - use specific heading selector
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('should display preferences page placeholder', async ({ page }) => {
    // Navigate to preferences page
    await page.goto('/en/settings/preferences');

    // Verify navigation successful
    await expect(page).toHaveURL('/en/settings/preferences');

    // Verify page loaded with placeholder content
    await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
    await expect(page.getByText(/coming in task/i)).toBeVisible();
  });
});
