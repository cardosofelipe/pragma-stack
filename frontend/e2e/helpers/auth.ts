/**
 * Authentication & API mocking helper for E2E tests
 * Provides mock API responses for testing authenticated pages
 * without requiring a real backend
 */

import { Page, Route } from '@playwright/test';

/**
 * Mock user data for E2E testing
 */
export const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone_number: null,
  is_active: true,
  is_superuser: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock session data for E2E testing
 */
export const MOCK_SESSION = {
  id: '00000000-0000-0000-0000-000000000002',
  device_type: 'Desktop',
  device_name: 'Chrome on Linux',
  ip_address: '127.0.0.1',
  location: 'Local',
  last_used_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  is_current: true,
};

/**
 * Authenticate user via REAL login flow
 * Tests actual user behavior: fill form → submit → API call → store tokens → redirect
 * Requires setupAuthenticatedMocks() to be called first
 *
 * @param page Playwright page object
 * @param email User email (defaults to mock user email)
 * @param password User password (defaults to mock password)
 */
export async function loginViaUI(page: Page, email = 'test@example.com', password = 'password123'): Promise<void> {
  // Navigate to login page
  await page.goto('/auth/login');

  // Fill login form
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);

  // Submit and wait for navigation to home
  await Promise.all([
    page.waitForURL('/', { timeout: 10000 }),
    page.locator('button[type="submit"]').click(),
  ]);

  // Wait for auth to settle
  await page.waitForTimeout(500);
}

/**
 * Set up API mocking for authenticated E2E tests
 * Intercepts backend API calls and returns mock data
 * Routes persist across client-side navigation
 *
 * @param page Playwright page object
 */
export async function setupAuthenticatedMocks(page: Page): Promise<void> {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Mock POST /api/v1/auth/login - Login endpoint
  await page.route(`${baseURL}/api/v1/auth/login`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: MOCK_USER,
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJleHAiOjk5OTk5OTk5OTl9.signature',
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDIiLCJleHAiOjk5OTk5OTk5OTl9.signature',
            expires_in: 3600,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/v1/users/me - Get current user
  // Mock PATCH /api/v1/users/me - Update user profile
  await page.route(`${baseURL}/api/v1/users/me`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_USER,
        }),
      });
    } else if (route.request().method() === 'PATCH') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_USER, ...postData },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock POST /api/v1/auth/change-password - Change password
  await page.route(`${baseURL}/api/v1/auth/change-password`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Password changed successfully',
      }),
    });
  });

  // Mock GET /api/v1/sessions - Get user sessions
  await page.route(`${baseURL}/api/v1/sessions**`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            sessions: [MOCK_SESSION],
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock DELETE /api/v1/sessions/:id - Revoke session
  await page.route(`${baseURL}/api/v1/sessions/*`, async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Session revoked successfully',
        }),
      });
    } else {
      await route.continue();
    }
  });

  /**
   * E2E tests now use the REAL auth store with mocked API routes.
   * We inject authentication by calling setAuth() directly in the page context.
   * This tests the actual production code path including encryption.
   */
}
