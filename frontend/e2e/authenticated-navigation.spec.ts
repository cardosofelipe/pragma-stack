/**
 * E2E Tests for Authenticated Navigation
 * Tests header, footer, and settings navigation for authenticated users
 * Requires backend to be running
 */

import { test, expect } from '@playwright/test';

test.describe('Authenticated Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');

    // Fill in login credentials (using backend test user)
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');

    // Submit and wait for redirect to home
    await Promise.all([
      page.waitForURL('/'),
      page.click('button[type="submit"]'),
    ]);
  });

  test.describe('Header Navigation', () => {
    test('displays logo and navigates to home when clicked', async ({ page }) => {
      // Navigate to settings first
      await page.goto('/settings/profile');

      // Click logo
      const logo = page.getByRole('link', { name: /fastnext/i });
      await Promise.all([
        page.waitForURL('/'),
        logo.click(),
      ]);

      await expect(page).toHaveURL('/');
    });

    test('displays home link', async ({ page }) => {
      const homeLink = page.getByRole('link', { name: /^home$/i }).first();
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toHaveAttribute('href', '/');
    });

    test('displays user avatar', async ({ page }) => {
      // Avatar button should be visible
      const avatarButton = page.locator('button[class*="rounded-full"]').first();
      await expect(avatarButton).toBeVisible();
    });

    test('displays theme toggle button', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      await expect(themeToggle).toBeVisible();
    });
  });

  test.describe('User Dropdown Menu', () => {
    test('opens and displays user menu', async ({ page }) => {
      // Click avatar
      const avatarButton = page.locator('button[class*="rounded-full"]').first();
      await avatarButton.click();

      // Check menu items
      await expect(page.getByRole('menuitem', { name: /profile/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /settings/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /log out/i })).toBeVisible();
    });

    test('navigates to profile from dropdown', async ({ page }) => {
      // Open dropdown
      const avatarButton = page.locator('button[class*="rounded-full"]').first();
      await avatarButton.click();

      // Click profile
      const profileLink = page.getByRole('menuitem', { name: /^profile$/i });
      await Promise.all([
        page.waitForURL('/settings/profile'),
        profileLink.click(),
      ]);

      await expect(page).toHaveURL('/settings/profile');
    });

    test('logs out user', async ({ page }) => {
      // Open dropdown
      const avatarButton = page.locator('button[class*="rounded-full"]').first();
      await avatarButton.click();

      // Click logout
      const logoutButton = page.getByRole('menuitem', { name: /log out/i });
      await Promise.all([
        page.waitForURL('/login'),
        logoutButton.click(),
      ]);

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Settings Pages', () => {
    test('displays settings tabs', async ({ page }) => {
      await page.goto('/settings/profile');

      // All tabs should be visible
      await expect(page.getByRole('link', { name: /^profile$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^password$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^sessions$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^preferences$/i })).toBeVisible();
    });

    test('can navigate to password tab', async ({ page }) => {
      await page.goto('/settings/profile');

      const passwordTab = page.getByRole('link', { name: /^password$/i });
      await Promise.all([
        page.waitForURL('/settings/password'),
        passwordTab.click(),
      ]);

      await expect(page).toHaveURL('/settings/password');
    });

    test('can navigate to sessions tab', async ({ page }) => {
      await page.goto('/settings/profile');

      const sessionsTab = page.getByRole('link', { name: /^sessions$/i });
      await Promise.all([
        page.waitForURL('/settings/sessions'),
        sessionsTab.click(),
      ]);

      await expect(page).toHaveURL('/settings/sessions');
    });

    test('can navigate to preferences tab', async ({ page }) => {
      await page.goto('/settings/profile');

      const preferencesTab = page.getByRole('link', { name: /^preferences$/i });
      await Promise.all([
        page.waitForURL('/settings/preferences'),
        preferencesTab.click(),
      ]);

      await expect(page).toHaveURL('/settings/preferences');
    });

    test('active tab is highlighted', async ({ page }) => {
      await page.goto('/settings/password');

      const passwordTab = page.getByRole('link', { name: /^password$/i });
      const className = await passwordTab.getAttribute('class');
      expect(className).toContain('border-primary');
    });
  });

  test.describe('Footer', () => {
    test('displays copyright text', async ({ page }) => {
      const currentYear = new Date().getFullYear();
      const copyright = page.getByText(`© ${currentYear} FastNext Template`);
      await expect(copyright).toBeVisible();
    });

    test('displays settings link in footer', async ({ page }) => {
      const settingsLinks = page.getByRole('link', { name: /^settings$/i });
      // Should have at least one (in footer)
      await expect(settingsLinks.last()).toBeVisible();
    });

    test('displays GitHub link with correct attributes', async ({ page }) => {
      const githubLink = page.getByRole('link', { name: /github/i });
      await expect(githubLink).toBeVisible();
      await expect(githubLink).toHaveAttribute('target', '_blank');
      await expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  test.describe('Theme Toggle Integration', () => {
    test('can switch to dark theme from header', async ({ page }) => {
      // Open theme menu
      const themeButton = page.getByRole('button', { name: /toggle theme/i });
      await themeButton.click();

      // Select dark theme
      const darkOption = page.getByRole('menuitem', { name: /^dark$/i });
      await darkOption.click();

      // Wait for theme to apply
      await page.waitForTimeout(300);

      // Verify dark theme is active
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('theme persists on settings pages', async ({ page }) => {
      // Set dark theme
      const themeButton = page.getByRole('button', { name: /toggle theme/i });
      await themeButton.click();
      await page.getByRole('menuitem', { name: /^dark$/i }).click();
      await page.waitForTimeout(300);

      // Navigate to settings
      await page.goto('/settings/profile');
      await expect(page.locator('html')).toHaveClass(/dark/);

      // Navigate to different settings tab
      await page.goto('/settings/password');
      await expect(page.locator('html')).toHaveClass(/dark/);
    });
  });
});
