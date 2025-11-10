/**
 * E2E Tests for Admin Organization Members Management
 * Tests AddMemberDialog Select interactions (excluded from unit tests with istanbul ignore)
 * and basic navigation to organization members page
 */

import { test, expect } from '@playwright/test';
import { setupSuperuserMocks } from './helpers/auth';

test.describe('Admin Organization Members - Navigation from Organizations List', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
    await page.waitForSelector('table tbody tr');
  });

  test('should navigate to members page when clicking view members in action menu', async ({ page }) => {
    // Click first organization's action menu
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    // Click "View Members"
    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/),
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
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/),
      memberButton.click()
    ]);

    // Should be on members page
    await expect(page).toHaveURL(/\/admin\/organizations\/[^/]+\/members/);
  });
});

test.describe('Admin Organization Members - Page Structure', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
    await page.waitForSelector('table tbody tr');

    // Navigate to members page
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/),
      page.getByText('View Members').click()
    ]);
  });

  test('should display organization members page', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/organizations\/[^/]+\/members/);

    // Wait for page to load
    await page.waitForSelector('table');

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
    await page.waitForSelector('table');

    // Page should have h2 with organization name
    const heading = page.getByRole('heading', { name: /Members/i });
    await expect(heading).toBeVisible();
  });

  test('should have proper table structure', async ({ page }) => {
    await page.waitForSelector('table');

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

test.describe('Admin Organization Members - AddMemberDialog E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
    await page.waitForSelector('table tbody tr');

    // Navigate to members page
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/),
      page.getByText('View Members').click()
    ]);

    // Open Add Member dialog
    const addButton = page.getByRole('button', { name: /Add Member/i });
    await addButton.click();

    // Wait for dialog to be visible
    await page.waitForSelector('[role="dialog"]');
  });

  test('should open add member dialog when clicking add member button', async ({ page }) => {
    // Dialog should be visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Should have dialog title
    await expect(page.getByRole('heading', { name: /Add Member/i })).toBeVisible();
  });

  test('should display dialog description', async ({ page }) => {
    await expect(page.getByText(/Add a user to this organization and assign them a role/i)).toBeVisible();
  });

  test('should display user email select field', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText('User Email *')).toBeVisible();
  });

  test('should display role select field', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText('Role *')).toBeVisible();
  });

  test('should display add member and cancel buttons', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('button', { name: /^Add Member$/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Cancel/i })).toBeVisible();
  });

  test('should close dialog when clicking cancel', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');
    const cancelButton = dialog.getByRole('button', { name: /Cancel/i });

    await cancelButton.click();

    // Dialog should be closed
    await expect(dialog).not.toBeVisible();
  });

  test('should open user email select dropdown when clicked', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');

    // Click user email select trigger
    const userSelect = dialog.getByRole('combobox').first();
    await userSelect.click();

    // Dropdown should be visible with mock user options
    await expect(page.getByRole('option', { name: /test@example.com/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /admin@example.com/i })).toBeVisible();
  });

  test('should select user email from dropdown', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');

    // Click user email select trigger
    const userSelect = dialog.getByRole('combobox').first();
    await userSelect.click();

    // Select first user
    await page.getByRole('option', { name: /test@example.com/i }).click();

    // Selected value should be visible
    await expect(userSelect).toContainText('test@example.com');
  });

  test('should open role select dropdown when clicked', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');

    // Click role select trigger (second combobox)
    const roleSelects = dialog.getByRole('combobox');
    const roleSelect = roleSelects.nth(1);
    await roleSelect.click();

    // Dropdown should show role options
    await expect(page.getByRole('option', { name: /^Owner$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^Admin$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^Member$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^Guest$/i })).toBeVisible();
  });

  test('should select role from dropdown', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');

    // Click role select trigger
    const roleSelects = dialog.getByRole('combobox');
    const roleSelect = roleSelects.nth(1);
    await roleSelect.click();

    // Select admin role
    await page.getByRole('option', { name: /^Admin$/i }).click();

    // Selected value should be visible
    await expect(roleSelect).toContainText('Admin');
  });

  test('should have default role as Member', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');
    const roleSelects = dialog.getByRole('combobox');
    const roleSelect = roleSelects.nth(1);

    // Default role should be Member
    await expect(roleSelect).toContainText('Member');
  });
});
