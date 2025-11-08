/**
 * Authentication Setup for Playwright Tests
 *
 * This file sets up authenticated browser states that can be reused across tests.
 * Instead of logging in via UI for every test (5-7s overhead), we login once per
 * worker and save the storage state (cookies, localStorage) to disk.
 *
 * Performance Impact:
 * - Before: 133 tests × 5-7s login = ~700s overhead
 * - After: 2 logins (once per role) × 5s = ~10s overhead
 * - Savings: ~690s (~11 minutes) per test run
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { setupAuthenticatedMocks, setupSuperuserMocks, loginViaUI } from './helpers/auth';

// Use absolute paths to ensure correct file location
const ADMIN_STORAGE_STATE = path.join(__dirname, '.auth', 'admin.json');
const USER_STORAGE_STATE = path.join(__dirname, '.auth', 'user.json');

/**
 * Setup: Authenticate as admin/superuser
 * This runs ONCE before all admin tests
 */
setup('authenticate as admin', async ({ page }) => {
  // Set up API mocks for superuser
  await setupSuperuserMocks(page);

  // Login via UI (one time only)
  await loginViaUI(page);

  // Verify we're actually logged in
  await page.goto('/settings');
  await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

  // Verify admin access
  const adminLink = page.locator('header nav').getByRole('link', { name: 'Admin', exact: true });
  await expect(adminLink).toBeVisible();

  // Save authenticated state to file
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });

  console.log('✅ Admin authentication state saved to:', ADMIN_STORAGE_STATE);
});

/**
 * Setup: Authenticate as regular user
 * This runs ONCE before all user tests
 */
setup('authenticate as regular user', async ({ page }) => {
  // Set up API mocks for regular user
  await setupAuthenticatedMocks(page);

  // Login via UI (one time only)
  await loginViaUI(page);

  // Verify we're actually logged in
  await page.goto('/settings');
  await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

  // Verify NOT admin (regular user)
  const adminLink = page.locator('header nav').getByRole('link', { name: 'Admin', exact: true });
  await expect(adminLink).not.toBeVisible();

  // Save authenticated state to file
  await page.context().storageState({ path: USER_STORAGE_STATE });

  console.log('✅ Regular user authentication state saved to:', USER_STORAGE_STATE);
});
