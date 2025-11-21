/**
 * Authentication React Query Hooks
 *
 * Integrates with auto-generated API client and authStore for state management.
 * All hooks use generated SDK functions for type safety and OpenAPI compliance.
 *
 * @module lib/api/hooks/useAuth
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/lib/i18n/routing';
import {
  login,
  register,
  logout,
  logoutAll,
  getCurrentUserProfile,
  requestPasswordReset,
  confirmPasswordReset,
  changeCurrentUserPassword,
} from '../client';
import type { User } from '@/lib/stores/authStore';
import { useAuth } from '@/lib/auth/AuthContext';
import { parseAPIError, getGeneralError } from '../errors';
import { isTokenWithUser } from '../types';
import config from '@/config/app.config';

// ============================================================================
// Query Keys
// ============================================================================

export const authKeys = {
  me: ['auth', 'me'] as const,
  all: ['auth'] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get current user from token
 * GET /api/v1/auth/me
 *
 * Automatically syncs user data to auth store when fetched.
 * Only enabled when user is authenticated with access token.
 *
 * @returns React Query result with user data
 */
export function useMe() {
  const { isAuthenticated, accessToken } = useAuth();
  const setUser = useAuth((state) => state.setUser);

  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: async (): Promise<User> => {
      const response = await getCurrentUserProfile({
        throwOnError: true,
      });
      return response.data as User;
    },
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for auth endpoints
  });

  // Sync user data to auth store when fetched (TanStack Query v5 pattern)
  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Login mutation
 * POST /api/v1/auth/login
 *
 * On success:
 * - Stores tokens and user in auth store
 * - Invalidates auth queries
 * - Redirects to home page
 *
 * @param onSuccess Optional callback after successful login
 * @returns React Query mutation
 */
export function useLogin(onSuccess?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuth((state) => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await login({
        body: credentials,
        throwOnError: false, // Handle errors manually
      });

      if ('error' in response) {
        throw response.error;
      }

      // Type assertion: if no error, response has data
      const data = (response as { data: unknown }).data;

      // Type guard to ensure response has user data
      if (!isTokenWithUser(data)) {
        throw new Error('Invalid login response: missing user data');
      }

      return data;
    },
    onSuccess: async (data) => {
      const { access_token, refresh_token, user, expires_in } = data;

      // Update auth store with user and tokens
      await setAuth(user as User, access_token, refresh_token || '', expires_in);

      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.all });

      // Call custom success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect to home or intended destination
      router.push(config.routes.home);
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Login failed:', generalError || 'Unknown error');
    },
  });
}

/**
 * Register mutation
 * POST /api/v1/auth/register
 *
 * On success:
 * - Stores tokens and user in auth store
 * - Invalidates auth queries
 * - Redirects to home page (auto-login)
 *
 * @param onSuccess Optional callback after successful registration
 * @returns React Query mutation
 */
export function useRegister(onSuccess?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuth((state) => state.setAuth);

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      first_name: string;
      last_name?: string;
    }) => {
      const response = await register({
        body: {
          email: data.email,
          password: data.password,
          first_name: data.first_name,
          last_name: data.last_name || '',
        },
        throwOnError: false,
      });

      if ('error' in response) {
        throw response.error;
      }

      // Type assertion: if no error, response has data
      const responseData = (response as { data: unknown }).data;

      // Type guard to ensure response has user data
      if (!isTokenWithUser(responseData)) {
        throw new Error('Invalid registration response: missing user data');
      }

      return responseData;
    },
    onSuccess: async (data) => {
      const { access_token, refresh_token, user, expires_in } = data;

      // Update auth store with user and tokens (auto-login)
      await setAuth(user as User, access_token, refresh_token || '', expires_in);

      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.all });

      // Call custom success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect to home
      router.push(config.routes.home);
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Registration failed:', generalError || 'Unknown error');
    },
  });
}

/**
 * Logout mutation
 * POST /api/v1/auth/logout
 *
 * On success:
 * - Clears auth store
 * - Clears React Query cache
 * - Redirects to login
 *
 * @returns React Query mutation
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuth((state) => state.clearAuth);
  const refreshToken = useAuth((state) => state.refreshToken);

  return useMutation({
    mutationFn: async () => {
      if (!refreshToken) {
        // If no refresh token, just clear local state
        return { success: true, message: 'Logged out locally' };
      }

      const response = await logout({
        body: { refresh_token: refreshToken },
        throwOnError: false,
      });

      if ('error' in response) {
        // Still clear local state even if server logout fails
        console.warn('Server logout failed, clearing local state anyway');
      }

      return response.data;
    },
    onSuccess: async () => {
      // Clear auth store
      await clearAuth();

      // Clear all React Query cache
      queryClient.clear();

      // Redirect to login
      router.push(config.routes.login);
    },
    onError: async (error: unknown) => {
      console.error('Logout error:', error);
      // Still clear auth and redirect even on error
      await clearAuth();
      queryClient.clear();
      router.push(config.routes.login);
    },
  });
}

/**
 * Logout from all devices mutation
 * POST /api/v1/auth/logout-all
 *
 * On success:
 * - Clears auth store
 * - Clears React Query cache
 * - Redirects to login
 *
 * @returns React Query mutation
 */
export function useLogoutAll() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuth((state) => state.clearAuth);

  return useMutation({
    mutationFn: async () => {
      const response = await logoutAll({
        throwOnError: false,
      });

      if ('error' in response) {
        // Still clear local state even if server logout fails
        console.warn('Server logout-all failed, clearing local state anyway');
      }

      return response.data;
    },
    onSuccess: async () => {
      // Clear auth store
      await clearAuth();

      // Clear all React Query cache
      queryClient.clear();

      // Redirect to login
      router.push(config.routes.login);
    },
    onError: async (error: unknown) => {
      console.error('Logout-all error:', error);
      // Still clear auth and redirect even on error
      await clearAuth();
      queryClient.clear();
      router.push(config.routes.login);
    },
  });
}

/**
 * Password reset request mutation
 * POST /api/v1/auth/password-reset/request
 *
 * Sends password reset email to user.
 *
 * @param onSuccess Optional callback after successful request
 * @returns React Query mutation
 */
export function usePasswordResetRequest(onSuccess?: (message: string) => void) {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await requestPasswordReset({
        body: data,
        throwOnError: false,
      });

      if ('error' in response) {
        throw response.error;
      }

      // Type assertion: if no error, response has data
      return (response as { data: unknown }).data;
    },
    onSuccess: (data) => {
      const message =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as Record<string, unknown>).message === 'string'
          ? (data as { message: string }).message
          : 'Password reset email sent successfully';

      if (onSuccess) {
        onSuccess(message);
      }
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Password reset request failed:', generalError || 'Unknown error');
    },
  });
}

/**
 * Password reset confirm mutation
 * POST /api/v1/auth/password-reset/confirm
 *
 * Resets password using token from email.
 *
 * @param onSuccess Optional callback after successful reset
 * @returns React Query mutation
 */
export function usePasswordResetConfirm(onSuccess?: (message: string) => void) {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { token: string; new_password: string }) => {
      const response = await confirmPasswordReset({
        body: data,
        throwOnError: false,
      });

      if ('error' in response) {
        throw response.error;
      }

      // Type assertion: if no error, response has data
      return (response as { data: unknown }).data;
    },
    onSuccess: (data) => {
      const message =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as Record<string, unknown>).message === 'string'
          ? (data as { message: string }).message
          : 'Password reset successful';

      if (onSuccess) {
        onSuccess(message);
      }

      // Redirect to login after success
      setTimeout(() => {
        router.push(config.routes.login);
      }, 2000);
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Password reset failed:', generalError || 'Unknown error');
    },
  });
}

/**
 * Password change mutation (for authenticated users)
 * POST /api/v1/auth/password/change
 *
 * Changes password for currently authenticated user.
 *
 * @param onSuccess Optional callback after successful change
 * @returns React Query mutation
 */
export function usePasswordChange(onSuccess?: (message: string) => void) {
  return useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const response = await changeCurrentUserPassword({
        body: data,
        throwOnError: false,
      });

      if ('error' in response) {
        throw response.error;
      }

      // Type assertion: if no error, response has data
      return (response as { data: unknown }).data;
    },
    onSuccess: (data) => {
      const message =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as Record<string, unknown>).message === 'string'
          ? (data as { message: string }).message
          : 'Password changed successfully';

      if (onSuccess) {
        onSuccess(message);
      }
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Password change failed:', generalError || 'Unknown error');
    },
  });
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Check if user is authenticated
 * @returns boolean indicating authentication status
 */
export function useIsAuthenticated(): boolean {
  return useAuth((state) => state.isAuthenticated);
}

/**
 * Get current user from auth store
 * @returns Current user or null
 */
export function useCurrentUser(): User | null {
  return useAuth((state) => state.user);
}

/**
 * Check if current user is admin
 * @returns boolean indicating admin status
 */
export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  return user?.is_superuser === true;
}
