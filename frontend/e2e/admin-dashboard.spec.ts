/**
 * E2E Tests for Admin Dashboard
 * Tests dashboard statistics and analytics charts
 */

import { test, expect } from '@playwright/test';
import { setupSuperuserMocks, loginViaUI } from './helpers/auth';

test.describe('Admin Dashboard - Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin');
  });

  test('should display admin dashboard page', async ({ page }) => {
    await expect(page).toHaveURL('/admin');

    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(page.getByText('Manage users, organizations, and system settings')).toBeVisible();
  });

  test('should display page title', async ({ page }) => {
    await expect(page).toHaveTitle('Admin Dashboard');
  });
});

test.describe('Admin Dashboard - Statistics Cards', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin');
  });

  test('should display all stat cards', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('[data-testid="dashboard-stats"]', { timeout: 10000 });

    // Check all stat cards are visible
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Active Users')).toBeVisible();
    await expect(page.getByText('Organizations')).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();
  });

  test('should display stat card values', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('[data-testid="dashboard-stats"]', { timeout: 10000 });

    // Stats should have numeric values (from mock data)
    const statsContainer = page.locator('[data-testid="dashboard-stats"]');
    await expect(statsContainer).toContainText('150'); // Total users
    await expect(statsContainer).toContainText('120'); // Active users
    await expect(statsContainer).toContainText('25'); // Organizations
    await expect(statsContainer).toContainText('45'); // Sessions
  });
});

test.describe('Admin Dashboard - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin');
  });

  test('should display quick actions section', async ({ page }) => {
    await expect(page.getByText('Quick Actions')).toBeVisible();
  });

  test('should display all quick action cards', async ({ page }) => {
    await expect(page.getByText('User Management')).toBeVisible();
    await expect(page.getByText('Organizations')).toBeVisible();
    await expect(page.getByText('System Settings')).toBeVisible();
  });

  test('should navigate to users page when clicking user management', async ({ page }) => {
    const userManagementLink = page.getByRole('link', { name: /User Management/i });

    await Promise.all([
      page.waitForURL('/admin/users', { timeout: 10000 }),
      userManagementLink.click()
    ]);

    await expect(page).toHaveURL('/admin/users');
  });

  test('should navigate to organizations page when clicking organizations', async ({ page }) => {
    const organizationsLink = page.getByRole('link', { name: /Organizations/i });

    await Promise.all([
      page.waitForURL('/admin/organizations', { timeout: 10000 }),
      organizationsLink.click()
    ]);

    await expect(page).toHaveURL('/admin/organizations');
  });
});

test.describe('Admin Dashboard - Analytics Charts', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin');
  });

  test('should display analytics overview section', async ({ page }) => {
    await expect(page.getByText('Analytics Overview')).toBeVisible();
  });

  test('should display user growth chart', async ({ page }) => {
    await expect(page.getByText('User Growth')).toBeVisible();
    await expect(page.getByText('Total and active users over the last 30 days')).toBeVisible();
  });

  test('should display session activity chart', async ({ page }) => {
    await expect(page.getByText('Session Activity')).toBeVisible();
    await expect(page.getByText('Active and new sessions over the last 14 days')).toBeVisible();
  });

  test('should display organization distribution chart', async ({ page }) => {
    await expect(page.getByText('Organization Distribution')).toBeVisible();
    await expect(page.getByText('Member count by organization')).toBeVisible();
  });

  test('should display user status chart', async ({ page }) => {
    await expect(page.getByText('User Status Distribution')).toBeVisible();
    await expect(page.getByText('Breakdown of users by status')).toBeVisible();
  });

  test('should display all four charts in grid layout', async ({ page }) => {
    // All charts should be visible
    const userGrowthChart = page.getByText('User Growth');
    const sessionActivityChart = page.getByText('Session Activity');
    const orgDistributionChart = page.getByText('Organization Distribution');
    const userStatusChart = page.getByText('User Status Distribution');

    await expect(userGrowthChart).toBeVisible();
    await expect(sessionActivityChart).toBeVisible();
    await expect(orgDistributionChart).toBeVisible();
    await expect(userStatusChart).toBeVisible();
  });
});

test.describe('Admin Dashboard - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupSuperuserMocks(page);
    await loginViaUI(page);
    await page.goto('/admin');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // H1: Admin Dashboard
    await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible();

    // H2: Quick Actions
    await expect(page.getByRole('heading', { level: 2, name: 'Quick Actions' })).toBeVisible();

    // H2: Analytics Overview
    await expect(page.getByRole('heading', { level: 2, name: 'Analytics Overview' })).toBeVisible();
  });

  test('should have accessible links for quick actions', async ({ page }) => {
    const userManagementLink = page.getByRole('link', { name: /User Management/i });
    const organizationsLink = page.getByRole('link', { name: /Organizations/i });
    const settingsLink = page.getByRole('link', { name: /System Settings/i });

    await expect(userManagementLink).toBeVisible();
    await expect(organizationsLink).toBeVisible();
    await expect(settingsLink).toBeVisible();
  });
});
