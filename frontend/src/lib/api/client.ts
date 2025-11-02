/**
 * API Client Configuration with Interceptors
 *
 * This module configures the auto-generated API client with:
 * - Token refresh interceptor (prevents race conditions with singleton pattern)
 * - Request interceptor (adds Authorization header)
 * - Response interceptor (handles 401, 403, 429, 500 errors)
 *
 * IMPORTANT: Do NOT modify generated files. All customization happens here.
 *
 * @module lib/api/client
 */

import type { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { client } from './generated/client.gen';
import { refreshToken as refreshTokenFn } from './generated/sdk.gen';
import config from '@/config/app.config';

/**
 * Token refresh state management (singleton pattern)
 * Prevents race conditions when multiple requests fail with 401 simultaneously
 *
 * The refreshPromise acts as both the lock and the shared promise.
 * If it exists, a refresh is in progress - all concurrent requests wait for the same promise.
 */
let refreshPromise: Promise<string> | null = null;

/**
 * Auth store accessor
 * Dynamically imported to avoid circular dependencies
 *
 * Note: Tested via E2E tests when interceptors are invoked
 */
/* istanbul ignore next */
const getAuthStore = async () => {
  const { useAuthStore } = await import('@/lib/stores/authStore');
  return useAuthStore.getState();
};

/**
 * Refresh access token using refresh token
 *
 * Note: Tested in E2E tests
 *
 * @returns Promise<string> New access token
 * @throws Error if refresh fails
 */
/* istanbul ignore next */
async function refreshAccessToken(): Promise<string> {
  // Singleton pattern: reuse in-flight refresh request
  // If a refresh is already in progress, return the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  // Create and store the refresh promise immediately to prevent race conditions
  refreshPromise = (async () => {
    try {
      const authStore = await getAuthStore();
      const { refreshToken } = authStore;

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      if (config.debug.api) {
        console.log('[API Client] Refreshing access token...');
      }

      // Use generated SDK function for refresh
      const response = await refreshTokenFn({
        body: { refresh_token: refreshToken },
        throwOnError: true,
      });

      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token || refreshToken;

      // Update tokens in store
      // Note: Token type from OpenAPI spec doesn't include expires_in,
      // but backend may return it. We handle both cases gracefully.
      await authStore.setTokens(
        newAccessToken,
        newRefreshToken,
        undefined // expires_in not in spec, will use default
      );

      if (config.debug.api) {
        console.log('[API Client] Token refreshed successfully');
      }

      return newAccessToken;
    } catch (error) {
      if (config.debug.api) {
        console.error('[API Client] Token refresh failed:', error);
      }

      // Clear auth and redirect to login
      const authStore = await getAuthStore();
      await authStore.clearAuth();

      // Redirect to login if we're in browser
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const returnUrl = currentPath !== '/login' && currentPath !== '/register'
          ? `?returnUrl=${encodeURIComponent(currentPath)}`
          : '';
        window.location.href = `/login${returnUrl}`;
      }

      throw error;
    } finally {
      // Clear the promise so future 401s will trigger a new refresh
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Request Interceptor
 * Adds Authorization header with access token to all requests
 *
 * Note: Interceptor behavior tested in E2E tests
 */
client.instance.interceptors.request.use(
  /* istanbul ignore next */ async (requestConfig: InternalAxiosRequestConfig) => {
    const authStore = await getAuthStore();
    const { accessToken } = authStore;

    // Add Authorization header if token exists
    if (accessToken && requestConfig.headers) {
      requestConfig.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (config.debug.api) {
      console.log('[API Client] Request:', requestConfig.method?.toUpperCase(), requestConfig.url);
    }

    return requestConfig;
  },
  /* istanbul ignore next */ (error) => {
    if (config.debug.api) {
      console.error('[API Client] Request error:', error);
    }
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles errors and token refresh
 *
 * Note: Interceptor behavior tested in E2E tests
 */
client.instance.interceptors.response.use(
  /* istanbul ignore next */ (response: AxiosResponse) => {
    if (config.debug.api) {
      console.log('[API Client] Response:', response.status, response.config.url);
    }
    return response;
  },
  /* istanbul ignore next */ async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (config.debug.api) {
      console.error('[API Client] Response error:', error.response?.status, error.config?.url);
    }

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If refresh endpoint itself fails with 401, clear auth and reject
      if (originalRequest.url?.includes('/auth/refresh')) {
        const authStore = await getAuthStore();
        await authStore.clearAuth();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Refresh token
        const newAccessToken = await refreshAccessToken();

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return client.instance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      if (config.debug.api) {
        console.warn('[API Client] Access forbidden (403)');
      }
      // Let the component handle this (might be permission issue, not auth)
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      if (config.debug.api) {
        console.warn('[API Client] Rate limit exceeded (429)');
      }
      // Add retry-after handling if needed in future
    }

    // Handle 500+ Server Errors
    if (error.response?.status && error.response.status >= 500) {
      if (config.debug.api) {
        console.error('[API Client] Server error:', error.response.status);
      }
      // Could add error tracking service integration here
    }

    return Promise.reject(error);
  }
);

/**
 * Configure the generated client with base settings
 */
client.setConfig({
  baseURL: config.api.url,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Configured API client instance
 * Use this for all API calls
 */
export { client as apiClient };

/**
 * Re-export all SDK functions for convenience
 * These are already configured with interceptors
 */
export * from './generated/sdk.gen';

/**
 * Re-export types for convenience
 */
export type * from './generated/types.gen';
