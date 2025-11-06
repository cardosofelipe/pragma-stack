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
 * Mock superuser data for E2E testing
 */
export const MOCK_SUPERUSER = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  phone_number: null,
  is_active: true,
  is_superuser: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock organization data for E2E testing
 */
export const MOCK_ORGANIZATIONS = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    name: 'Acme Corporation',
    slug: 'acme-corporation',
    description: 'Leading provider of innovative solutions',
    is_active: true,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
    member_count: 15,
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    name: 'Tech Startup Inc',
    slug: 'tech-startup-inc',
    description: 'Building the future of technology',
    is_active: false,
    created_at: new Date('2025-01-15').toISOString(),
    updated_at: new Date('2025-01-15').toISOString(),
    member_count: 3,
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    name: 'Global Enterprises',
    slug: 'global-enterprises',
    description: null,
    is_active: true,
    created_at: new Date('2025-02-01').toISOString(),
    updated_at: new Date('2025-02-01').toISOString(),
    member_count: 42,
  },
];

/**
 * Authenticate user via REAL login flow
 * Tests actual user behavior: fill form → submit → API call → store tokens → redirect
 * Requires setupAuthenticatedMocks() to be called first
 *
 * @param page Playwright page object
 * @param email User email (defaults to mock user email)
 * @param password User password (defaults to mock password)
 */
export async function loginViaUI(page: Page, email = 'test@example.com', password = 'Password123!'): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

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
  // Set E2E test mode flag to skip encryption in storage.ts
  await page.addInitScript(() => {
    (window as any).__PLAYWRIGHT_TEST__ = true;
  });

  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Mock POST /api/v1/auth/login - Login endpoint
  await page.route(`${baseURL}/api/v1/auth/login`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: MOCK_USER,
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJleHAiOjk5OTk5OTk5OTl9.signature',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDIiLCJleHAiOjk5OTk5OTk5OTl9.signature',
          expires_in: 3600,
          token_type: 'bearer',
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
        body: JSON.stringify(MOCK_USER),
      });
    } else if (route.request().method() === 'PATCH') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_USER, ...postData }),
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
          sessions: [MOCK_SESSION],
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

/**
 * Set up API mocking for superuser E2E tests
 * Similar to setupAuthenticatedMocks but returns MOCK_SUPERUSER instead
 * Also mocks admin endpoints for stats display
 *
 * @param page Playwright page object
 */
export async function setupSuperuserMocks(page: Page): Promise<void> {
  // Set E2E test mode flag
  await page.addInitScript(() => {
    (window as any).__PLAYWRIGHT_TEST__ = true;
  });

  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Mock POST /api/v1/auth/login - Login endpoint (returns superuser)
  await page.route(`${baseURL}/api/v1/auth/login`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: MOCK_SUPERUSER,
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDMiLCJleHAiOjk5OTk5OTk5OTl9.signature',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDQiLCJleHAiOjk5OTk5OTk5OTl9.signature',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/v1/users/me - Get current user (superuser)
  await page.route(`${baseURL}/api/v1/users/me`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SUPERUSER),
      });
    } else if (route.request().method() === 'PATCH') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_SUPERUSER, ...postData }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/v1/admin/users - Get all users (admin endpoint)
  await page.route(`${baseURL}/api/v1/admin/users*`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [MOCK_USER, MOCK_SUPERUSER],
          pagination: {
            total: 2,
            page: 1,
            page_size: 50,
            total_pages: 1,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/v1/admin/organizations - Get all organizations (admin endpoint)
  await page.route(`${baseURL}/api/v1/admin/organizations*`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: MOCK_ORGANIZATIONS,
          pagination: {
            total: MOCK_ORGANIZATIONS.length,
            page: 1,
            page_size: 50,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock sessions endpoints (same as regular user)
  await page.route(`${baseURL}/api/v1/sessions**`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [MOCK_SESSION],
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(`${baseURL}/api/v1/sessions/*`, async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Session revoked successfully',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/v1/admin/stats - Get dashboard statistics
  await page.route(`${baseURL}/api/v1/admin/stats`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_users: 150,
          active_users: 120,
          total_organizations: 25,
          active_sessions: 45,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/v1/admin/organizations/:id - Get single organization
  await page.route(`${baseURL}/api/v1/admin/organizations/*/`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      // Extract org ID from URL
      const url = route.request().url();
      const orgId = url.match(/organizations\/([^/]+)/)?.[1];
      const org = MOCK_ORGANIZATIONS.find(o => o.id === orgId) || MOCK_ORGANIZATIONS[0];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(org),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/v1/admin/organizations/:id/members - Get organization members
  await page.route(`${baseURL}/api/v1/admin/organizations/*/members*`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: {
            total: 0,
            page: 1,
            page_size: 20,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/v1/admin/sessions - Get all sessions (for stats calculation)
  await page.route(`${baseURL}/api/v1/admin/sessions*`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [MOCK_SESSION],
          pagination: {
            total: 45, // Total sessions for stats
            page: 1,
            page_size: 100,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}
