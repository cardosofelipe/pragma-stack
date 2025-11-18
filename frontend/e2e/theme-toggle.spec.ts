/**
 * E2E Tests for Theme Toggle
 * Tests theme switching on public pages (login/register)
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Toggle on Public Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/en/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('theme is applied on login page', async ({ page }) => {
    await page.goto('/en/login');

    // Wait for page to load and theme to be applied
    await page.waitForTimeout(500);

    // Check that a theme class is applied
    const htmlElement = page.locator('html');
    const className = await htmlElement.getAttribute('class');

    // Should have either 'light' or 'dark' class
    expect(className).toMatch(/light|dark/);
  });

  test('theme persists across page navigation', async ({ page }) => {
    await page.goto('/en/login');
    await page.waitForTimeout(500);

    // Set theme to dark via localStorage
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });

    // Reload to apply theme
    await page.reload();
    await page.waitForTimeout(500);

    // Verify dark theme is applied
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Navigate to register page
    await page.goto('/en/register');
    await page.waitForTimeout(500);

    // Theme should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Navigate to password reset
    await page.goto('/en/password-reset');
    await page.waitForTimeout(500);

    // Theme should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('can switch theme programmatically', async ({ page }) => {
    await page.goto('/en/login');

    // Set to light theme
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
    });
    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.locator('html')).toHaveClass(/light/);
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Switch to dark theme
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).not.toHaveClass(/light/);
  });
});
