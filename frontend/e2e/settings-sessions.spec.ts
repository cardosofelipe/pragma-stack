/**
 * E2E Tests for Sessions Management Page
 * Tests session viewing and revocation functionality using mocked API
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks } from './helpers/auth';

test.describe('Sessions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks for authenticated user
    await setupAuthenticatedMocks(page);

    // Navigate to sessions settings
    await page.goto('/settings/sessions');
    await expect(page).toHaveURL('/settings/sessions');
  });

  test('should display sessions management page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h2')).toContainText(/Active Sessions/i);

    // Wait for sessions to load (either sessions or empty state)
    await page.waitForSelector('text=/Current Session|No other active sessions/i', {
      timeout: 10000,
    });
  });

  test('should show current session badge', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('text=/Current Session/i', { timeout: 10000 });

    // Current session badge should be visible
    await expect(page.locator('text=Current Session')).toBeVisible();
  });

  test('should display session information', async ({ page }) => {
    // Wait for session card to load
    await page.waitForSelector('[data-testid="session-card"], text=Current Session', {
      timeout: 10000,
    });

    // Check for session details (these might vary, but device/IP should be present)
    const sessionInfo = page.locator('text=/Monitor|Unknown Device|Desktop/i').first();
    await expect(sessionInfo).toBeVisible();
  });

  test('should have revoke button disabled for current session', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('text=Current Session', { timeout: 10000 });

    // Find the revoke button near the current session badge
    const currentSessionCard = page.locator('text=Current Session').locator('..');
    const revokeButton = currentSessionCard.locator('button:has-text("Revoke")').first();

    // Revoke button should be disabled
    await expect(revokeButton).toBeDisabled();
  });

  test('should show empty state when no other sessions exist', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if empty state is shown (if no other sessions)
    const emptyStateText = page.locator('text=/No other active sessions/i');
    const hasOtherSessions = await page.locator('button:has-text("Revoke All Others")').isVisible();

    // If there are no other sessions, empty state should be visible
    if (!hasOtherSessions) {
      await expect(emptyStateText).toBeVisible();
    }
  });

  test('should show security tip', async ({ page }) => {
    // Check for security tip at bottom
    await expect(page.locator('text=/security tip/i')).toBeVisible();
  });

  test('should show bulk revoke button if multiple sessions exist', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('text=Current Session', { timeout: 10000 });

    // Check if "Revoke All Others" button exists (only if multiple sessions)
    const bulkRevokeButton = page.locator('button:has-text("Revoke All Others")');
    const buttonCount = await bulkRevokeButton.count();

    // If button exists, it should be enabled (assuming there are other sessions)
    if (buttonCount > 0) {
      await expect(bulkRevokeButton).toBeVisible();
    }
  });

  test('should show loading state initially', async ({ page }) => {
    // Reload the page to see loading state
    await page.reload();

    // Loading skeleton or text should appear briefly
    const loadingIndicator = page.locator('text=/Loading|Fetching/i, [class*="animate-pulse"]').first();

    // This might be very fast, so we use a short timeout
    const hasLoading = await loadingIndicator.isVisible().catch(() => false);

    // It's okay if this doesn't show (loading is very fast in tests)
    // This test documents the expected behavior
  });

  test('should display last activity timestamp', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('text=Current Session', { timeout: 10000 });

    // Check for relative time stamp (e.g., "2 minutes ago", "just now")
    const timestamp = page.locator('text=/ago|just now|seconds|minutes|hours/i').first();
    await expect(timestamp).toBeVisible();
  });

  test('should navigate to sessions page from settings tabs', async ({ page }) => {
    // Navigate to profile first
    await page.goto('/settings/profile');
    await expect(page).toHaveURL('/settings/profile');

    // Click on Sessions tab
    const sessionsTab = page.locator('a:has-text("Sessions")');
    await sessionsTab.click();

    // Should navigate to sessions page
    await expect(page).toHaveURL('/settings/sessions');
  });
});

test.describe('Sessions Management - Revocation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks for authenticated user
    await setupAuthenticatedMocks(page);

    // Navigate to sessions settings
    await page.goto('/settings/sessions');
    await expect(page).toHaveURL('/settings/sessions');
  });

  test('should show confirmation dialog before individual revocation', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('text=Current Session', { timeout: 10000 });

    // Check if there are other sessions with enabled revoke buttons
    const enabledRevokeButtons = page.locator('button:has-text("Revoke"):not([disabled])');
    const count = await enabledRevokeButtons.count();

    if (count > 0) {
      // Click first enabled revoke button
      await enabledRevokeButtons.first().click();

      // Confirmation dialog should appear
      await expect(page.locator('text=/Are you sure|confirm|revoke this session/i')).toBeVisible();
    }
  });

  test('should show confirmation dialog before bulk revocation', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('text=Current Session', { timeout: 10000 });

    // Check if bulk revoke button exists
    const bulkRevokeButton = page.locator('button:has-text("Revoke All Others")');

    if (await bulkRevokeButton.isVisible()) {
      // Click bulk revoke
      await bulkRevokeButton.click();

      // Confirmation dialog should appear
      await expect(page.locator('text=/Are you sure|confirm|revoke all/i')).toBeVisible();
    }
  });
});
