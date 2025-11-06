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
    await page.goto('/settings/profile', { waitUntil: 'networkidle' });

    // Verify navigation successful
    await expect(page).toHaveURL('/settings/profile');

    // Verify page loaded - use specific heading selector
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('should navigate from home to settings password', async ({ page }) => {
    // From home page
    await expect(page).toHaveURL('/');

    // Navigate to settings/password
    await page.goto('/settings/password', { waitUntil: 'networkidle' });

    // Verify navigation successful
    await expect(page).toHaveURL('/settings/password');

    // Verify page loaded - use specific heading selector
    await expect(page.getByRole('heading', { name: 'Password' })).toBeVisible();
  });

  test('should navigate between settings pages', async ({ page }) => {
    // Start at profile page
    await page.goto('/settings/profile', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

    // Navigate to password page
    await page.goto('/settings/password', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Password' })).toBeVisible();

    // Navigate back to profile page
    await page.goto('/settings/profile', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('should redirect from /settings to /settings/profile', async ({ page }) => {
    // Navigate to base settings page
    await page.goto('/settings', { waitUntil: 'networkidle' });

    // Should redirect to profile page
    await expect(page).toHaveURL('/settings/profile');

    // Verify profile page loaded - use specific heading selector
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('should display preferences page placeholder', async ({ page }) => {
    // Navigate to preferences page
    await page.goto('/settings/preferences', { waitUntil: 'networkidle' });

    // Verify navigation successful
    await expect(page).toHaveURL('/settings/preferences');

    // Verify page loaded with placeholder content
    await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
    await expect(page.getByText(/coming in task/i)).toBeVisible();
  });
});
