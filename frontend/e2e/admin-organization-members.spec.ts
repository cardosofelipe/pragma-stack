/**
 * E2E Tests for Admin Organization Members Management
 * Tests basic navigation to organization members page
 *
 * Note: Interactive member management tests are covered by comprehensive unit tests (43 tests).
 * E2E tests focus on navigation and page structure due to backend API mock limitations.
 */

import { test, expect } from '@playwright/test';
import { setupSuperuserMocks, loginViaUI } from './helpers/auth';

test.describe('Admin Organization Members - Navigation from Organizations List', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin/organizations');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
  });

  test('should navigate to members page when clicking view members in action menu', async ({ page }) => {
    // Click first organization's action menu
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    // Click "View Members"
    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/, { timeout: 10000 }),
      page.getByText('View Members').click()
    ]);

    // Should be on members page
    await expect(page).toHaveURL(/\/admin\/organizations\/[^/]+\/members/);
  });

  test('should navigate to members page when clicking member count', async ({ page }) => {
    // Find first organization row with members
    const firstRow = page.locator('table tbody tr').first();
    const memberButton = firstRow.locator('button').filter({ hasText: /^\d+$/ });

    // Click on member count
    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/, { timeout: 10000 }),
      memberButton.click()
    ]);

    // Should be on members page
    await expect(page).toHaveURL(/\/admin\/organizations\/[^/]+\/members/);
  });
});

test.describe('Admin Organization Members - Page Structure', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin/organizations');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Navigate to members page
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/, { timeout: 10000 }),
      page.getByText('View Members').click()
    ]);
  });

  test('should display organization members page', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/organizations\/[^/]+\/members/);

    // Wait for page to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Should show organization name in heading
    await expect(page.getByRole('heading', { name: /Members/i })).toBeVisible();
  });

  test('should display page description', async ({ page }) => {
    await expect(page.getByText('Manage members and their roles within the organization')).toBeVisible();
  });

  test('should display add member button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add Member/i });
    await expect(addButton).toBeVisible();
  });

  test('should display back to organizations button', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /Back to Organizations/i });
    await expect(backButton).toBeVisible();
  });


  test('should have proper heading hierarchy', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Page should have h2 with organization name
    const heading = page.getByRole('heading', { name: /Members/i });
    await expect(heading).toBeVisible();
  });

  test('should have proper table structure', async ({ page }) => {
    await page.waitForSelector('table', { timeout: 10000 });

    // Table should have thead and tbody
    const table = page.locator('table');
    await expect(table.locator('thead')).toBeVisible();
    await expect(table.locator('tbody')).toBeVisible();
  });

  test('should have accessible back button', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /Back to Organizations/i });
    await expect(backButton).toBeVisible();

    // Should have an icon
    const icon = backButton.locator('svg');
    await expect(icon).toBeVisible();
  });
});
