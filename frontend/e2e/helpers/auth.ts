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
 * Set up API mocking for authenticated E2E tests
 * Intercepts backend API calls and returns mock data
 * Routes persist across client-side navigation
 *
 * @param page Playwright page object
 */
export async function setupAuthenticatedMocks(page: Page): Promise<void> {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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

  // Inject mock auth store that persists across navigation
  // This creates a mock Zustand store accessible via window.__TEST_AUTH_STORE__
  // CRITICAL: Must be set BEFORE React renders to be picked up by AuthProvider
  await page.addInitScript((mockUser) => {
    // Create a stable state object that persists
    const authState = {
      user: mockUser,
      accessToken: 'mock.access.token', // Valid JWT format (3 parts)
      refreshToken: 'mock.refresh.token',
      isAuthenticated: true,
      isLoading: false,
      tokenExpiresAt: Date.now() + 900000,
      setAuth: async () => {},
      setTokens: async () => {},
      setUser: () => {},
      clearAuth: async () => {},
      loadAuthFromStorage: async () => {
        // No-op in tests - state is already set
      },
      isTokenExpired: () => false,
    };

    // Mock Zustand hook - must support both selector and no-selector calls
    const mockAuthStore: any = (selector?: any) => {
      // If selector provided, call it with the state
      if (selector && typeof selector === 'function') {
        return selector(authState);
      }
      // Otherwise return the full state
      return authState;
    };

    // Add getState method that Zustand stores have
    mockAuthStore.getState = () => authState;

    // Add subscribe method (required by Zustand)
    mockAuthStore.subscribe = () => () => {}; // Returns unsubscribe function

    // Make it globally available for AuthProvider
    (window as any).__TEST_AUTH_STORE__ = mockAuthStore;

    // Also set a flag to indicate we're in a test environment
    (window as any).__E2E_TEST__ = true;
  }, MOCK_USER);
}
