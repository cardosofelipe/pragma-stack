/**
 * E2E Tests for OAuth Authentication
 * Tests OAuth button display and interaction on login/register pages
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks } from './helpers/auth';

test.describe('OAuth Authentication', () => {
  test.describe('Login Page OAuth', () => {
    test.beforeEach(async ({ page }) => {
      // Set up API mocks including OAuth providers
      await setupAuthenticatedMocks(page);
    });

    test('should display OAuth provider buttons on login page', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for OAuth buttons to load (they fetch providers from API)
      await page.waitForSelector('text=Continue with Google', { timeout: 10000 });

      // Verify both OAuth buttons are visible
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
    });

    test('should display divider between form and OAuth buttons', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      await page.waitForSelector('text=Continue with Google', { timeout: 10000 });

      // Verify divider text is present
      await expect(page.getByText(/or continue with/i)).toBeVisible();
    });

    test('should have Google OAuth button with correct icon', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      const googleButton = page.getByRole('button', { name: /continue with google/i });
      await googleButton.waitFor({ state: 'visible', timeout: 10000 });

      // Verify button contains an SVG icon
      const svg = googleButton.locator('svg');
      await expect(svg).toBeVisible();
    });

    test('should have GitHub OAuth button with correct icon', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      const githubButton = page.getByRole('button', { name: /continue with github/i });
      await githubButton.waitFor({ state: 'visible', timeout: 10000 });

      // Verify button contains an SVG icon
      const svg = githubButton.locator('svg');
      await expect(svg).toBeVisible();
    });
  });

  test.describe('Register Page OAuth', () => {
    test.beforeEach(async ({ page }) => {
      // Set up API mocks including OAuth providers
      await setupAuthenticatedMocks(page);
    });

    test('should display OAuth provider buttons on register page', async ({ page }) => {
      await page.goto('/en/register');

      // Wait for OAuth buttons to load
      await page.waitForSelector('text=Sign up with Google', { timeout: 10000 });

      // Verify both OAuth buttons are visible with register-specific text
      await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign up with github/i })).toBeVisible();
    });

    test('should display divider between form and OAuth buttons on register page', async ({
      page,
    }) => {
      await page.goto('/en/register');

      // Wait for OAuth buttons to load
      await page.waitForSelector('text=Sign up with Google', { timeout: 10000 });

      // Verify divider text is present
      await expect(page.getByText(/or continue with/i)).toBeVisible();
    });
  });

  test.describe('OAuth Button Interaction', () => {
    test.beforeEach(async ({ page }) => {
      // Set up API mocks including OAuth providers
      await setupAuthenticatedMocks(page);
    });

    test('should call OAuth authorization endpoint when clicking Google button', async ({
      page,
    }) => {
      // Track API calls
      let authorizationCalled = false;
      await page.route('**/api/v1/oauth/authorize/google*', async (route) => {
        authorizationCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authorization_url: 'https://accounts.google.com/o/oauth2/auth?mock=true',
            state: 'mock-state',
          }),
        });
      });

      // Prevent actual navigation to external URL
      await page.route('https://accounts.google.com/**', (route) => route.abort());

      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      const googleButton = page.getByRole('button', { name: /continue with google/i });
      await googleButton.waitFor({ state: 'visible', timeout: 10000 });

      // Click Google OAuth button
      await googleButton.click();

      // Wait for API call to complete
      await page.waitForTimeout(500);

      // Verify authorization endpoint was called
      expect(authorizationCalled).toBe(true);
    });

    test('should call OAuth authorization endpoint when clicking GitHub button', async ({
      page,
    }) => {
      // Track API calls
      let authorizationCalled = false;
      await page.route('**/api/v1/oauth/authorize/github*', async (route) => {
        authorizationCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authorization_url: 'https://github.com/login/oauth/authorize?mock=true',
            state: 'mock-state',
          }),
        });
      });

      // Prevent actual navigation to external URL
      await page.route('https://github.com/**', (route) => route.abort());

      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      const githubButton = page.getByRole('button', { name: /continue with github/i });
      await githubButton.waitFor({ state: 'visible', timeout: 10000 });

      // Click GitHub OAuth button
      await githubButton.click();

      // Wait for API call to complete
      await page.waitForTimeout(500);

      // Verify authorization endpoint was called
      expect(authorizationCalled).toBe(true);
    });
  });
});
