/**
 * E2E Tests for Admin Access Control
 * Tests admin panel access, navigation, and stats display
 */

import { test, expect } from '@playwright/test';
import {
  setupAuthenticatedMocks,
  setupSuperuserMocks,
  loginViaUI,
} from './helpers/auth';

test.describe('Admin Access Control', () => {
  test('regular user should not see admin link in header', async ({ page }) => {
    // Set up mocks for regular user (not superuser)
    await setupAuthenticatedMocks(page);
    await loginViaUI(page);

    // Should not see admin link in navigation
    const adminLinks = page.getByRole('link', { name: /admin/i });
    const visibleAdminLinks = await adminLinks.count();
    expect(visibleAdminLinks).toBe(0);
  });

  test('regular user should be redirected when accessing admin page directly', async ({
    page,
  }) => {
    // Set up mocks for regular user
    await setupAuthenticatedMocks(page);
    await loginViaUI(page);

    // Try to access admin page directly
    await page.goto('/admin');

    // Should be redirected away from admin (to login or home)
    await page.waitForURL(/\/(auth\/login|$)/, { timeout: 5000 });
    expect(page.url()).not.toContain('/admin');
  });

  test('superuser should see admin link in header', async ({ page }) => {
    // Set up mocks for superuser
    await setupSuperuserMocks(page);
    await loginViaUI(page);

    // Navigate to settings page to ensure user state is loaded
    // (AuthGuard fetches user on protected pages)
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

    // Should see admin link in header navigation bar
    // Use exact text match to avoid matching "Admin Panel" from sidebar
    const headerAdminLink = page
      .locator('header nav')
      .getByRole('link', { name: 'Admin', exact: true });
    await expect(headerAdminLink).toBeVisible();
    await expect(headerAdminLink).toHaveAttribute('href', '/admin');
  });

  test('superuser should be able to access admin dashboard', async ({
    page,
  }) => {
    // Set up mocks for superuser
    await setupSuperuserMocks(page);
    await loginViaUI(page);

    // Navigate to admin page
    await page.goto('/admin');

    // Should see admin dashboard
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin');
  });

  test('should display page title and description', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    await expect(page.getByText(/manage users, organizations/i)).toBeVisible();
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Wait for stats container to be present
    await page.waitForSelector('[data-testid="dashboard-stats"]', {
      state: 'attached',
      timeout: 15000,
    });

    // Wait for at least one stat card to finish loading (not in loading state)
    await page.waitForSelector('[data-testid="stat-value"]', {
      timeout: 15000,
    });

    // Should display all stat cards
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(4);

    // Should have stat titles (use test IDs to avoid ambiguity with sidebar)
    const statTitles = page.locator('[data-testid="stat-title"]');
    await expect(statTitles).toHaveCount(4);
    await expect(statTitles.filter({ hasText: 'Total Users' })).toBeVisible();
    await expect(statTitles.filter({ hasText: 'Active Users' })).toBeVisible();
    await expect(statTitles.filter({ hasText: 'Organizations' })).toBeVisible();
    await expect(
      statTitles.filter({ hasText: 'Active Sessions' })
    ).toBeVisible();
  });

  test('should display quick action cards', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Quick Actions', exact: true })
    ).toBeVisible();

    // Should have three action cards (use unique descriptive text to avoid sidebar matches)
    await expect(
      page.getByText('View, create, and manage user accounts')
    ).toBeVisible();
    await expect(
      page.getByText('Manage organizations and their members')
    ).toBeVisible();
    await expect(page.getByText('Configure system-wide settings')).toBeVisible();
  });
});

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin');
  });

  test('should display admin sidebar', async ({ page }) => {
    const sidebar = page.getByTestId('admin-sidebar');
    await expect(sidebar).toBeVisible();

    // Should have all navigation items
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-users')).toBeVisible();
    await expect(page.getByTestId('nav-organizations')).toBeVisible();
    await expect(page.getByTestId('nav-settings')).toBeVisible();
  });

  test('should display breadcrumbs', async ({ page }) => {
    const breadcrumbs = page.getByTestId('breadcrumbs');
    await expect(breadcrumbs).toBeVisible();

    // Should show 'Admin' breadcrumb
    await expect(page.getByTestId('breadcrumb-admin')).toBeVisible();
  });

  test('should navigate to users page', async ({ page }) => {
    await page.goto('/admin/users');

    await expect(page).toHaveURL('/admin/users');
    await expect(page.locator('h1')).toContainText('User Management');

    // Breadcrumbs should show Admin > Users
    await expect(page.getByTestId('breadcrumb-admin')).toBeVisible();
    await expect(page.getByTestId('breadcrumb-users')).toBeVisible();

    // Sidebar users link should be active
    const usersLink = page.getByTestId('nav-users');
    await expect(usersLink).toHaveClass(/bg-accent/);
  });

  test('should navigate to organizations page', async ({ page }) => {
    await page.goto('/admin/organizations');

    await expect(page).toHaveURL('/admin/organizations');
    await expect(page.getByRole('heading', { name: 'All Organizations' })).toBeVisible();

    // Breadcrumbs should show Admin > Organizations
    await expect(page.getByTestId('breadcrumb-admin')).toBeVisible();
    await expect(page.getByTestId('breadcrumb-organizations')).toBeVisible();

    // Sidebar organizations link should be active
    const orgsLink = page.getByTestId('nav-organizations');
    await expect(orgsLink).toHaveClass(/bg-accent/);
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/admin/settings');

    await expect(page).toHaveURL('/admin/settings');
    await expect(page.locator('h1')).toContainText('System Settings');

    // Breadcrumbs should show Admin > Settings
    await expect(page.getByTestId('breadcrumb-admin')).toBeVisible();
    await expect(page.getByTestId('breadcrumb-settings')).toBeVisible();

    // Sidebar settings link should be active
    const settingsLink = page.getByTestId('nav-settings');
    await expect(settingsLink).toHaveClass(/bg-accent/);
  });

  test('should toggle sidebar collapse', async ({ page }) => {
    const toggleButton = page.getByTestId('sidebar-toggle');
    await expect(toggleButton).toBeVisible();

    // Should show expanded text initially
    await expect(page.getByText('Admin Panel')).toBeVisible();

    // Click to collapse
    await toggleButton.click();

    // Text should be hidden when collapsed
    await expect(page.getByText('Admin Panel')).not.toBeVisible();

    // Click to expand
    await toggleButton.click();

    // Text should be visible again
    await expect(page.getByText('Admin Panel')).toBeVisible();
  });

  test('should navigate back to dashboard from users page', async ({
    page,
  }) => {
    await page.goto('/admin/users');

    // Click dashboard link in sidebar
    const dashboardLink = page.getByTestId('nav-dashboard');
    await dashboardLink.click();

    await page.waitForURL('/admin', { timeout: 5000 });
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });
});

test.describe('Admin Breadcrumbs', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
  });

  test('should show single breadcrumb on dashboard', async ({ page }) => {
    await page.goto('/admin');

    const breadcrumbs = page.getByTestId('breadcrumbs');
    await expect(breadcrumbs).toBeVisible();

    // Should show only 'Admin' (as current page, not a link)
    const adminBreadcrumb = page.getByTestId('breadcrumb-admin');
    await expect(adminBreadcrumb).toBeVisible();
    await expect(adminBreadcrumb).toHaveAttribute('aria-current', 'page');
  });

  test('should show clickable parent breadcrumb', async ({ page }) => {
    await page.goto('/admin/users');

    // 'Admin' should be a clickable link (test ID is on the Link element itself)
    const adminBreadcrumb = page.getByTestId('breadcrumb-admin');
    await expect(adminBreadcrumb).toBeVisible();
    await expect(adminBreadcrumb).toHaveAttribute('href', '/admin');

    // 'Users' should be current page (not a link, so it's a span)
    const usersBreadcrumb = page.getByTestId('breadcrumb-users');
    await expect(usersBreadcrumb).toBeVisible();
    await expect(usersBreadcrumb).toHaveAttribute('aria-current', 'page');
  });

  test('should navigate via breadcrumb link', async ({ page }) => {
    await page.goto('/admin/users');

    // Click 'Admin' breadcrumb to go back to dashboard
    const adminBreadcrumb = page.getByTestId('breadcrumb-admin');

    await Promise.all([
      page.waitForURL('/admin', { timeout: 10000 }),
      adminBreadcrumb.click()
    ]);

    await expect(page).toHaveURL('/admin');
  });
});
