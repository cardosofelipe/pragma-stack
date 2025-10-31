/**
 * API Client with secure token refresh and error handling
 * Implements singleton refresh pattern to prevent race conditions
 */

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { parseAPIError, type APIErrorResponse } from './errors';
import config from '@/config';

/**
 * Separate axios instance for auth endpoints
 * Prevents interceptor loops during token refresh
 */
const authClient = axios.create({
  baseURL: config.api.url,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Main API client instance
 */
export const apiClient = axios.create({
  baseURL: config.api.url,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Token refresh state
 * Singleton pattern prevents multiple simultaneous refresh requests
 */
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Refresh access token using refresh token
 * Implements singleton pattern to prevent race conditions
 * @returns Promise resolving to new access token
 */
async function refreshAccessToken(): Promise<string> {
  // If already refreshing, return existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Start new refresh
  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Use separate auth client to avoid interceptor loop
      const response = await authClient.post<{
        access_token: string;
        refresh_token: string;
        expires_in?: number;
        token_type: string;
      }>('/auth/refresh', {
        refresh_token: refreshToken,
      });

      // Validate response structure
      if (!response.data?.access_token || !response.data?.refresh_token) {
        throw new Error('Invalid refresh response format');
      }

      const { access_token, refresh_token, expires_in } = response.data;

      // Update tokens in store
      await useAuthStore.getState().setTokens(access_token, refresh_token, expires_in);

      return access_token;
    } catch (error) {
      // Refresh failed - clear auth and redirect
      console.error('Token refresh failed:', error);
      await useAuthStore.getState().clearAuth();

      if (typeof window !== 'undefined') {
        window.location.href = config.routes.login;
      }

      throw error;
    } finally {
      // Reset refresh state
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Request interceptor - Add authentication token
 */
apiClient.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    // Get access token from auth store
    const accessToken = useAuthStore.getState().accessToken;

    // Add Authorization header if token exists
    if (accessToken) {
      requestConfig.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Debug logging in development
    if (config.debug.api) {
      console.log('🚀 API Request:', {
        method: requestConfig.method?.toUpperCase(),
        url: requestConfig.url,
        hasAuth: !!accessToken,
      });
    }

    return requestConfig;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    // Debug logging in development
    if (config.debug.api) {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
      });
    }

    return response;
  },
  async (error: AxiosError<APIErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Debug logging in development
    if (config.env.isDevelopment) {
      console.error('❌ API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
      });
    }

    // Handle 401 Unauthorized - Token refresh logic
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token (singleton pattern)
        const newAccessToken = await refreshAccessToken();

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed - error already logged, auth cleared
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('Access forbidden - insufficient permissions');
      // Toast notification would be added here in Phase 4
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.warn(`Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`);
      // Toast notification would be added here in Phase 4
    }

    // Handle 500+ Server Errors
    if (error.response?.status && error.response.status >= 500) {
      console.error('Server error occurred');
      // Toast notification would be added here in Phase 4
    }

    // Handle Network Errors
    if (!error.response) {
      console.error('Network error - check your connection');
      // Toast notification would be added here in Phase 4
    }

    // Parse and reject with structured error
    const parsedErrors = parseAPIError(error);
    return Promise.reject(parsedErrors);
  }
);

// Export default for convenience
export default apiClient;
