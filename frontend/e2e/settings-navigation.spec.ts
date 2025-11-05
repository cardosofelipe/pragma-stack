/**
 * E2E Tests for Settings Navigation
 * Tests navigation between different settings pages using mocked API
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks } from './helpers/auth';

test.describe('Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks for authenticated user
    await setupAuthenticatedMocks(page);

    // Delay to ensure auth store injection completes before navigation
    await page.waitForTimeout(200);

    // Navigate to settings
    await page.goto('/settings/profile');
    await expect(page).toHaveURL('/settings/profile');

    // Wait for page to fully load with auth context
    await page.waitForSelector('h2:has-text("Profile")', { timeout: 10000 });
  });

  test('should display settings tabs', async ({ page }) => {
    // Check all tabs are visible
    await expect(page.locator('a:has-text("Profile")')).toBeVisible();
    await expect(page.locator('a:has-text("Password")')).toBeVisible();
    await expect(page.locator('a:has-text("Sessions")')).toBeVisible();
  });

  test('should highlight active tab', async ({ page }) => {
    // Profile tab should be active (check for active styling)
    const profileTab = page.locator('a:has-text("Profile")').first();

    // Check if it has active state (could be via class or aria-current)
    const hasActiveClass = await profileTab.evaluate((el) => {
      return el.classList.contains('active') ||
             el.getAttribute('aria-current') === 'page' ||
             el.classList.contains('bg-muted') ||
             el.getAttribute('data-state') === 'active';
    });

    expect(hasActiveClass).toBeTruthy();
  });

  test('should navigate from Profile to Password', async ({ page }) => {
    // Click Password tab
    const passwordTab = page.locator('a:has-text("Password")').first();

    await Promise.all([
      page.waitForURL('/settings/password', { timeout: 10000 }),
      passwordTab.click(),
    ]);

    await expect(page).toHaveURL('/settings/password');
    await expect(page.locator('h2')).toContainText(/Password Settings/i);
  });

  test('should navigate from Profile to Sessions', async ({ page }) => {
    // Click Sessions tab
    const sessionsTab = page.locator('a:has-text("Sessions")').first();

    await Promise.all([
      page.waitForURL('/settings/sessions', { timeout: 10000 }),
      sessionsTab.click(),
    ]);

    await expect(page).toHaveURL('/settings/sessions');
    await expect(page.locator('h2')).toContainText(/Active Sessions/i);
  });

  test('should navigate from Password to Profile', async ({ page }) => {
    // Go to password page first
    await page.goto('/settings/password');
    await expect(page).toHaveURL('/settings/password');

    // Click Profile tab
    const profileTab = page.locator('a:has-text("Profile")').first();

    await Promise.all([
      page.waitForURL('/settings/profile', { timeout: 10000 }),
      profileTab.click(),
    ]);

    await expect(page).toHaveURL('/settings/profile');
    await expect(page.locator('h2')).toContainText(/Profile/i);
  });

  test('should navigate from Sessions to Password', async ({ page }) => {
    // Go to sessions page first
    await page.goto('/settings/sessions');
    await expect(page).toHaveURL('/settings/sessions');

    // Click Password tab
    const passwordTab = page.locator('a:has-text("Password")').first();

    await Promise.all([
      page.waitForURL('/settings/password', { timeout: 10000 }),
      passwordTab.click(),
    ]);

    await expect(page).toHaveURL('/settings/password');
    await expect(page.locator('h2')).toContainText(/Password Settings/i);
  });

  test('should maintain layout when navigating between tabs', async ({ page }) => {
    // Check header exists
    await expect(page.locator('header')).toBeVisible();

    // Navigate to different tabs
    await page.goto('/settings/password');
    await expect(page.locator('header')).toBeVisible();

    await page.goto('/settings/sessions');
    await expect(page.locator('header')).toBeVisible();

    // Layout should be consistent
  });

  test('should have working back button navigation', async ({ page }) => {
    // Navigate to password page
    await page.goto('/settings/password');
    await expect(page).toHaveURL('/settings/password');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/settings/profile');

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL('/settings/password');
  });

  test('should access settings from header dropdown', async ({ page }) => {
    // Go to home page
    await page.goto('/');

    // Open user menu (avatar button)
    const userMenuButton = page.locator('button[aria-label="User menu"], button:has([class*="avatar"])').first();

    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();

      // Click Settings option
      const settingsLink = page.locator('a:has-text("Settings"), [role="menuitem"]:has-text("Settings")').first();

      if (await settingsLink.isVisible()) {
        await Promise.all([
          page.waitForURL(/\/settings/, { timeout: 10000 }),
          settingsLink.click(),
        ]);

        // Should navigate to settings (probably profile as default)
        await expect(page.url()).toMatch(/\/settings/);
      }
    }
  });

  test('should redirect /settings to /settings/profile', async ({ page }) => {
    // Navigate to base settings URL
    await page.goto('/settings');

    // Should redirect to profile
    await expect(page).toHaveURL('/settings/profile');
  });
});
