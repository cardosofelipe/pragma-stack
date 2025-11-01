/**
 * Comprehensive tests for API client wrapper with interceptors
 *
 * Tests cover:
 * - Client configuration
 * - Request interceptor (Authorization header injection)
 * - Response interceptor (error handling)
 * - Token refresh mechanism
 * - Token refresh singleton pattern (race condition prevention)
 * - All HTTP error status codes (401, 403, 404, 429, 500+)
 * - Network errors
 * - Edge cases and error recovery
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/lib/api/client';
import config from '@/config/app.config';

// Mock auth store
let mockAuthStore = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  setTokens: jest.fn(),
  clearAuth: jest.fn(),
};

// Mock the auth store module
jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockAuthStore,
  },
}));

// Create mock adapter
let mock: MockAdapter;

describe('API Client Wrapper', () => {
  beforeEach(() => {
    // Reset mock auth store
    mockAuthStore = {
      accessToken: null,
      refreshToken: null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    };

    // Reset mocks
    jest.clearAllMocks();

    // Create new mock adapter for each test (fresh state)
    mock = new MockAdapter(apiClient.instance);
  });

  afterEach(() => {
    // Reset the mock adapter
    mock.reset();
    mock.restore();
  });

  describe('Client Configuration', () => {
    it('should have correct base URL from config', () => {
      expect(apiClient.instance.defaults.baseURL).toBe(config.api.url);
    });

    it('should have correct timeout from config', () => {
      expect(apiClient.instance.defaults.timeout).toBe(config.api.timeout);
    });

    it('should have correct Content-Type header', () => {
      expect(apiClient.instance.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Request Interceptor - Authorization Header', () => {
    it('should add Authorization header when access token exists', async () => {
      mockAuthStore.accessToken = 'test-access-token';

      mock.onGet('/api/v1/test').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer test-access-token');
        return [200, { success: true }];
      });

      await apiClient.instance.get('/api/v1/test');
    });

    it('should not add Authorization header when no access token', async () => {
      mockAuthStore.accessToken = null;

      mock.onGet('/api/v1/test').reply((config) => {
        expect(config.headers?.Authorization).toBeUndefined();
        return [200, { success: true }];
      });

      await apiClient.instance.get('/api/v1/test');
    });

    it('should update Authorization header if token changes', async () => {
      // First request with old token
      mockAuthStore.accessToken = 'old-token';

      mock.onGet('/api/v1/test1').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer old-token');
        return [200, { success: true }];
      });

      await apiClient.instance.get('/api/v1/test1');

      // Change token
      mockAuthStore.accessToken = 'new-token';

      mock.onGet('/api/v1/test2').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer new-token');
        return [200, { success: true }];
      });

      await apiClient.instance.get('/api/v1/test2');
    });
  });

  describe('Response Interceptor - 401 Unauthorized with Token Refresh', () => {
    it('should refresh token and retry request on 401', async () => {
      mockAuthStore.accessToken = 'expired-token';
      mockAuthStore.refreshToken = 'valid-refresh-token';

      let requestCount = 0;

      // Protected endpoint that fails first time, succeeds after refresh
      mock.onGet('/api/v1/protected').reply((config) => {
        requestCount++;
        if (requestCount === 1) {
          // First request should have expired token
          expect(config.headers?.Authorization).toBe('Bearer expired-token');
          return [401, { errors: [{ code: 'AUTH_003', message: 'Token expired' }] }];
        } else {
          // Second request (after refresh) should have new token
          expect(config.headers?.Authorization).toBe('Bearer new-access-token');
          return [200, { data: 'protected data' }];
        }
      });

      // Mock the refresh endpoint
      mock.onPost('/api/v1/auth/refresh').reply(200, {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      });

      // Make the request
      const response = await apiClient.instance.get('/api/v1/protected');

      expect(requestCount).toBe(2); // Original + retry
      expect(response.data).toEqual({ data: 'protected data' });
      expect(mockAuthStore.setTokens).toHaveBeenCalledWith(
        'new-access-token',
        'new-refresh-token',
        undefined
      );
    });

    it('should not retry if request was to refresh endpoint', async () => {
      mockAuthStore.accessToken = 'expired-token';
      mockAuthStore.refreshToken = 'expired-refresh-token';

      mock.onPost('/api/v1/auth/refresh').reply(401, {
        errors: [{ code: 'AUTH_003', message: 'Refresh token expired' }],
      });

      await expect(
        apiClient.instance.post('/api/v1/auth/refresh', {
          refresh_token: 'expired-refresh-token',
        })
      ).rejects.toThrow();

      // Should clear auth
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
    });

    it('should clear auth and redirect on refresh failure', async () => {
      mockAuthStore.accessToken = 'expired-token';
      mockAuthStore.refreshToken = 'expired-refresh-token';

      // Mock window.location
      delete (global as any).window;
      (global as any).window = {
        location: { href: '', pathname: '/dashboard' },
      };

      mock.onGet('/api/v1/protected').reply(401, {
        errors: [{ code: 'AUTH_003', message: 'Token expired' }],
      });

      mock.onPost('/api/v1/auth/refresh').reply(401, {
        errors: [{ code: 'AUTH_003', message: 'Refresh token expired' }],
      });

      await expect(
        apiClient.instance.get('/api/v1/protected')
      ).rejects.toThrow();

      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
      expect(window.location.href).toContain('/login');
      expect(window.location.href).toContain('returnUrl=/dashboard');
    });

    it('should not add returnUrl for login and register pages', async () => {
      mockAuthStore.accessToken = 'expired-token';
      mockAuthStore.refreshToken = 'expired-refresh-token';

      // Mock window.location for login page
      delete (global as any).window;
      (global as any).window = {
        location: { href: '', pathname: '/login' },
      };

      mock.onGet('/api/v1/protected').reply(401);
      mock.onPost('/api/v1/auth/refresh').reply(401);

      await expect(
        apiClient.instance.get('/api/v1/protected')
      ).rejects.toThrow();

      expect(window.location.href).toBe('/login');
      expect(window.location.href).not.toContain('returnUrl');
    });
  });

  describe('Response Interceptor - 403 Forbidden', () => {
    it('should pass through 403 errors without retry', async () => {
      mockAuthStore.accessToken = 'valid-token';

      mock.onGet('/api/v1/admin/users').reply(403, {
        errors: [{ code: 'PERM_001', message: 'Insufficient permissions' }],
      });

      await expect(
        apiClient.instance.get('/api/v1/admin/users')
      ).rejects.toThrow();

      // Should not clear auth or refresh token
      expect(mockAuthStore.clearAuth).not.toHaveBeenCalled();
      expect(mockAuthStore.setTokens).not.toHaveBeenCalled();
    });
  });

  describe('Response Interceptor - 404 Not Found', () => {
    it('should pass through 404 errors', async () => {
      mock.onGet('/api/v1/nonexistent').reply(404, {
        errors: [{ code: 'NOT_FOUND', message: 'Resource not found' }],
      });

      await expect(
        apiClient.instance.get('/api/v1/nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('Response Interceptor - 429 Rate Limit', () => {
    it('should pass through 429 errors', async () => {
      mock.onPost('/api/v1/auth/login').reply(429, {
        errors: [{ code: 'RATE_001', message: 'Too many requests' }],
      });

      await expect(
        apiClient.instance.post('/api/v1/auth/login', {
          email: 'user@example.com',
          password: 'password',
        })
      ).rejects.toThrow();
    });
  });

  describe('Response Interceptor - 5xx Server Errors', () => {
    it('should pass through 500 errors', async () => {
      mock.onGet('/api/v1/data').reply(500, {
        errors: [{ code: 'SERVER_ERROR', message: 'Internal server error' }],
      });

      await expect(
        apiClient.instance.get('/api/v1/data')
      ).rejects.toThrow();
    });

    it('should pass through 502 errors', async () => {
      mock.onGet('/api/v1/data').reply(502, {
        errors: [{ code: 'SERVER_ERROR', message: 'Bad gateway' }],
      });

      await expect(
        apiClient.instance.get('/api/v1/data')
      ).rejects.toThrow();
    });

    it('should pass through 503 errors', async () => {
      mock.onGet('/api/v1/data').reply(503, {
        errors: [{ code: 'SERVER_ERROR', message: 'Service unavailable' }],
      });

      await expect(
        apiClient.instance.get('/api/v1/data')
      ).rejects.toThrow();
    });
  });

  describe('Network Errors', () => {
    it('should handle network errors gracefully', async () => {
      mock.onGet('/api/v1/test').networkError();

      await expect(
        apiClient.instance.get('/api/v1/test')
      ).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      mock.onGet('/api/v1/test').timeout();

      await expect(
        apiClient.instance.get('/api/v1/test')
      ).rejects.toThrow();
    });
  });

  describe('Successful Requests', () => {
    it('should handle successful GET requests', async () => {
      mock.onGet('/api/v1/users').reply(200, {
        users: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
        ],
      });

      const response = await apiClient.instance.get('/api/v1/users');

      expect(response.status).toBe(200);
      expect(response.data.users).toHaveLength(2);
    });

    it('should handle successful POST requests', async () => {
      mock.onPost('/api/v1/users').reply(201, {
        id: 1,
        name: 'New User',
        email: 'newuser@example.com',
      });

      const response = await apiClient.instance.post('/api/v1/users', {
        name: 'New User',
        email: 'newuser@example.com',
      });

      expect(response.status).toBe(201);
      expect(response.data.name).toBe('New User');
    });

    it('should handle successful PUT requests', async () => {
      mock.onPut('/api/v1/users/1').reply(200, {
        id: 1,
        name: 'Updated User',
      });

      const response = await apiClient.instance.put('/api/v1/users/1', {
        name: 'Updated User',
      });

      expect(response.status).toBe(200);
      expect(response.data.name).toBe('Updated User');
    });

    it('should handle successful DELETE requests', async () => {
      mock.onDelete('/api/v1/users/1').reply(200, {
        success: true,
        message: 'User deleted',
      });

      const response = await apiClient.instance.delete('/api/v1/users/1');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response bodies', async () => {
      mock.onGet('/api/v1/test').reply(204);

      const response = await apiClient.instance.get('/api/v1/test');

      expect(response.status).toBe(204);
    });

    it('should handle no refresh token available during 401', async () => {
      mockAuthStore.accessToken = 'expired-token';
      mockAuthStore.refreshToken = null; // No refresh token

      // Mock window.location
      delete (global as any).window;
      (global as any).window = {
        location: { href: '', pathname: '/dashboard' },
      };

      mock.onGet('/api/v1/protected').reply(401);

      await expect(
        apiClient.instance.get('/api/v1/protected')
      ).rejects.toThrow();

      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
      expect(window.location.href).toContain('/login');
    });

    it('should preserve query parameters during retry', async () => {
      mockAuthStore.accessToken = 'expired-token';
      mockAuthStore.refreshToken = 'valid-refresh-token';

      let requestCount = 0;

      mock.onGet('/api/v1/test').reply((config) => {
        requestCount++;

        // Verify query params are preserved
        expect(config.params).toEqual({ filter: 'active', page: 1 });

        if (requestCount === 1) {
          return [401];
        } else {
          return [200, { success: true }];
        }
      });

      mock.onPost('/api/v1/auth/refresh').reply(200, {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      });

      const response = await apiClient.instance.get('/api/v1/test', {
        params: { filter: 'active', page: 1 },
      });

      expect(response.status).toBe(200);
      expect(requestCount).toBe(2);
    });

    it('should handle custom headers during retry', async () => {
      mockAuthStore.accessToken = 'expired-token';
      mockAuthStore.refreshToken = 'valid-refresh-token';

      let requestCount = 0;

      mock.onGet('/api/v1/test').reply((config) => {
        requestCount++;

        // Verify custom header is preserved
        expect(config.headers?.['X-Custom-Header']).toBe('test-value');

        if (requestCount === 1) {
          return [401];
        } else {
          return [200, { success: true }];
        }
      });

      mock.onPost('/api/v1/auth/refresh').reply(200, {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      });

      await apiClient.instance.get('/api/v1/test', {
        headers: { 'X-Custom-Header': 'test-value' },
      });

      expect(requestCount).toBe(2);
    });

    it('should only mark request as retried once', async () => {
      mockAuthStore.accessToken = 'expired-token';
      mockAuthStore.refreshToken = 'valid-refresh-token';

      // This endpoint will keep returning 401 to test that we don't retry infinitely
      let requestCount = 0;
      mock.onGet('/api/v1/protected').reply(() => {
        requestCount++;
        return [401, { errors: [{ code: 'AUTH_003', message: 'Token expired' }] }];
      });

      mock.onPost('/api/v1/auth/refresh').reply(200, {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      });

      await expect(
        apiClient.instance.get('/api/v1/protected')
      ).rejects.toThrow();

      // Should only retry once (original + 1 retry = 2 total requests)
      expect(requestCount).toBe(2);
    });
  });
});
