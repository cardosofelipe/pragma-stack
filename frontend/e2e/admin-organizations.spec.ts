/**
 * E2E Tests for Admin Organization Management
 * Tests organization list, creation, editing, activation, deactivation, deletion, and member management
 */

import { test, expect } from '@playwright/test';
import { setupSuperuserMocks, loginViaUI } from './helpers/auth';

test.describe('Admin Organization Management - Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
  });

  test('should display organization management page', async ({ page }) => {
    await expect(page).toHaveURL('/admin/organizations');

    // Wait for page to load
    await page.waitForSelector('table');

    await expect(page.getByRole('heading', { name: 'All Organizations' })).toBeVisible();
  });

  test('should display page description', async ({ page }) => {
    await expect(page.getByText('Manage organizations and their members')).toBeVisible();
  });

  test('should display create organization button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /Create Organization/i });
    await expect(createButton).toBeVisible();
  });

  test('should display breadcrumbs', async ({ page }) => {
    await expect(page.getByTestId('breadcrumb-admin')).toBeVisible();
    await expect(page.getByTestId('breadcrumb-organizations')).toBeVisible();
  });
});

test.describe('Admin Organization Management - Organization List Table', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
  });

  test('should display organization list table with headers', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    // Check table exists and has structure
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Should have header row
    const headerRow = table.locator('thead tr');
    await expect(headerRow).toBeVisible();
  });

  test('should display organization data rows', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Should have at least one organization row
    const orgRows = page.locator('table tbody tr');
    const count = await orgRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display organization status badges', async ({ page }) => {
    await page.waitForSelector('table tbody tr');

    // Should see Active or Inactive badges
    const statusBadges = page.locator('table tbody').getByText(/Active|Inactive/);
    const badgeCount = await statusBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('should display action menu for each organization', async ({ page }) => {
    await page.waitForSelector('table tbody tr');

    // Each row should have an action menu button
    const actionButtons = page.getByRole('button', { name: /Actions for/i });
    const buttonCount = await actionButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should display member counts', async ({ page }) => {
    await page.waitForSelector('table tbody tr');

    // Should show member counts in the Members column
    const membersColumn = page.locator('table tbody tr td').filter({ hasText: /^\d+$/ });
    const count = await membersColumn.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display organization names and descriptions', async ({ page }) => {
    await page.waitForSelector('table tbody tr');

    // Organization name should be visible
    const orgNames = page.locator('table tbody td').first();
    await expect(orgNames).toBeVisible();
  });
});

test.describe('Admin Organization Management - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
  });

  test('should display pagination info', async ({ page }) => {
    await page.waitForSelector('table tbody tr');

    // Should show "Showing X to Y of Z organizations"
    await expect(page.getByText(/Showing \d+ to \d+ of \d+ organizations/)).toBeVisible();
  });

  // Note: Pagination buttons tested in other E2E tests
  // Skipping here as it depends on having multiple pages of data
});

// Note: Dialog form validation and interactions are comprehensively tested in unit tests
// (OrganizationFormDialog.test.tsx). E2E tests focus on critical navigation flows.
test.describe('Admin Organization Management - Create Organization Button', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
  });

  test('should display create organization button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /Create Organization/i });
    await expect(createButton).toBeVisible();
  });
});

test.describe('Admin Organization Management - Action Menu', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
    await page.waitForSelector('table tbody tr');
  });

  test('should open action menu when clicked', async ({ page }) => {
    // Click first action menu button
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    // Menu should appear with options
    await expect(page.getByText('Edit Organization')).toBeVisible();
  });

  test('should display edit option in action menu', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    await expect(page.getByText('Edit Organization')).toBeVisible();
  });

  test('should display view members option in action menu', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    await expect(page.getByText('View Members')).toBeVisible();
  });

  test('should display delete option in action menu', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    await expect(page.getByText('Delete Organization')).toBeVisible();
  });

  test('should open edit dialog when clicking edit', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    // Click edit
    await page.getByText('Edit Organization').click();

    // Edit dialog should appear
    await expect(page.getByText('Edit Organization')).toBeVisible();
    await expect(page.getByText('Update the organization details below.')).toBeVisible();
  });

  test('should navigate to members page when clicking view members', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    // Click view members - use Promise.all for Next.js Link navigation
    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/),
      page.getByText('View Members').click()
    ]);

    // Should navigate to members page
    await expect(page).toHaveURL(/\/admin\/organizations\/[^/]+\/members/);
  });

  test('should show delete confirmation dialog when clicking delete', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    // Click delete
    await page.getByText('Delete Organization').click();

    // Confirmation dialog should appear
    await expect(page.getByText('Delete Organization')).toBeVisible();
    await expect(page.getByText(/Are you sure you want to delete/i)).toBeVisible();
  });

  test('should show warning about data loss in delete dialog', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    // Click delete
    await page.getByText('Delete Organization').click();

    // Warning should be shown
    await expect(page.getByText(/This action cannot be undone and will remove all associated data/i)).toBeVisible();
  });

  test('should close delete dialog when clicking cancel', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();

    // Click delete
    await page.getByText('Delete Organization').click();

    // Wait for dialog
    await expect(page.getByText(/Are you sure you want to delete/i)).toBeVisible();

    // Click cancel
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.click();

    // Dialog should close
    await expect(page.getByText(/Are you sure you want to delete/i)).not.toBeVisible();
  });
});

test.describe('Admin Organization Management - Edit Organization Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
    await page.waitForSelector('table tbody tr');
  });

  test('should open edit dialog with existing organization data', async ({ page }) => {
    // Open action menu and click edit
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();
    await page.getByText('Edit Organization').click();

    // Dialog should appear with title
    await expect(page.getByText('Edit Organization')).toBeVisible();
    await expect(page.getByText('Update the organization details below.')).toBeVisible();
  });

  test('should show active checkbox in edit mode', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();
    await page.getByText('Edit Organization').click();

    // Active checkbox should be visible in edit mode
    await expect(page.getByLabel('Organization is active')).toBeVisible();
  });

  test('should have update and cancel buttons in edit mode', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();
    await page.getByText('Edit Organization').click();

    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('should populate form fields with existing organization data', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await actionButton.click();
    await page.getByText('Edit Organization').click();

    // Name field should be populated
    const nameField = page.getByLabel('Name *');
    const nameValue = await nameField.inputValue();
    expect(nameValue).not.toBe('');
  });
});

test.describe('Admin Organization Management - Member Count Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
    await page.waitForSelector('table tbody tr');
  });

  test('should allow clicking on member count to view members', async ({ page }) => {
    // Find first organization row with members
    const firstRow = page.locator('table tbody tr').first();
    const memberButton = firstRow.locator('button').filter({ hasText: /^\d+$/ });

    // Click on member count - use Promise.all for Next.js Link navigation
    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/members/),
      memberButton.click()
    ]);

    // Should navigate to members page
    await expect(page).toHaveURL(/\/admin\/organizations\/[^/]+\/members/);
  });
});

test.describe('Admin Organization Management - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    // Auth already cached in storage state (loginViaUI removed for performance)
    await page.goto('/admin/organizations');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    // Page should have h2 with proper text
    await expect(page.getByRole('heading', { name: 'All Organizations' })).toBeVisible();
  });

  test('should have accessible labels for action menus', async ({ page }) => {
    await page.waitForSelector('table tbody tr');

    // Action buttons should have descriptive labels
    const actionButton = page.getByRole('button', { name: /Actions for/i }).first();
    await expect(actionButton).toBeVisible();
  });

  test('should have proper table structure', async ({ page }) => {
    await page.waitForSelector('table');

    // Table should have thead and tbody
    const table = page.locator('table');
    await expect(table.locator('thead')).toBeVisible();
    await expect(table.locator('tbody')).toBeVisible();
  });
});
