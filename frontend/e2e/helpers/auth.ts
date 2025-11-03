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
 *
 * @param page Playwright page object
 */
export async function setupAuthenticatedMocks(page: Page): Promise<void> {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Mock GET /api/v1/users/me - Get current user
  await page.route(`${baseURL}/api/v1/users/me`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_USER,
      }),
    });
  });

  // Mock PATCH /api/v1/users/me - Update user profile
  await page.route(`${baseURL}/api/v1/users/me`, async (route: Route) => {
    if (route.request().method() === 'PATCH') {
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
          data: [MOCK_SESSION],
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

  // Inject mock auth store BEFORE navigation
  // This must happen before the page loads to ensure AuthProvider picks it up
  await page.addInitScript((mockUser) => {
    // Create a mock Zustand hook that returns our mocked auth state
    const mockAuthStore: any = (selector?: any) => {
      const state = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        isAuthenticated: true,
        isLoading: false,
        tokenExpiresAt: Date.now() + 900000, // 15 minutes from now
        // Mock action functions
        setAuth: async () => {},
        setTokens: async () => {},
        setUser: () => {},
        clearAuth: async () => {},
        loadAuthFromStorage: async () => {},
        isTokenExpired: () => false,
      };
      return selector ? selector(state) : state;
    };

    // Add getState method for non-React contexts (API client, etc.)
    mockAuthStore.getState = () => ({
      user: mockUser,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      isAuthenticated: true,
      isLoading: false,
      tokenExpiresAt: Date.now() + 900000,
      setAuth: async () => {},
      setTokens: async () => {},
      setUser: () => {},
      clearAuth: async () => {},
      loadAuthFromStorage: async () => {},
      isTokenExpired: () => false,
    });

    // Inject into window for AuthProvider to pick up
    (window as any).__TEST_AUTH_STORE__ = mockAuthStore;
  }, MOCK_USER);
}
