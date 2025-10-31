/**
 * Authentication React Query Hooks
 * Integrates with authStore for state management
 * Implements all auth endpoints from backend API
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '../client';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/stores/authStore';
import type { APIError } from '../errors';
import config from '@/config/app.config';

// ============================================================================
// Types
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  user: User;
}

export interface SuccessResponse {
  success: true;
  message: string;
}

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
 * Updates auth store with fetched user data
 */
export function useMe() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const setUser = useAuthStore((state) => state.setUser);

  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: async (): Promise<User> => {
      const response = await apiClient.get<User>('/auth/me');
      return response.data;
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
 */
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    },
    onSuccess: async (data) => {
      const { access_token, refresh_token, user } = data;

      // Update auth store with user and tokens
      await setAuth(user, access_token, refresh_token);

      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.all });

      // Redirect to home or intended destination
      // TODO: Add redirect to intended route from query params
      router.push('/');
    },
    onError: (errors: APIError[]) => {
      console.error('Login failed:', errors);
      // Error toast will be handled in the component
    },
  });
}

/**
 * Register mutation
 * POST /api/v1/auth/register
 */
export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (data: RegisterData): Promise<AuthResponse> => {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      return response.data;
    },
    onSuccess: async (data) => {
      const { access_token, refresh_token, user } = data;

      // Update auth store with user and tokens
      await setAuth(user, access_token, refresh_token);

      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.all });

      // Redirect to home
      router.push('/');
    },
    onError: (errors: APIError[]) => {
      console.error('Registration failed:', errors);
      // Error toast will be handled in the component
    },
  });
}

/**
 * Logout mutation (current device only)
 * POST /api/v1/auth/logout
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: async (): Promise<SuccessResponse> => {
      const response = await apiClient.post<SuccessResponse>('/auth/logout');
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
    onError: async (errors: APIError[]) => {
      console.error('Logout failed:', errors);

      // Even if logout fails, clear local state
      await clearAuth();
      queryClient.clear();
      router.push(config.routes.login);
    },
  });
}

/**
 * Logout all devices mutation
 * POST /api/v1/auth/logout-all
 */
export function useLogoutAll() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: async (): Promise<SuccessResponse> => {
      const response = await apiClient.post<SuccessResponse>('/auth/logout-all');
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
    onError: async (errors: APIError[]) => {
      console.error('Logout all failed:', errors);

      // Even if logout fails, clear local state
      await clearAuth();
      queryClient.clear();
      router.push(config.routes.login);
    },
  });
}

/**
 * Password reset request mutation
 * POST /api/v1/auth/password-reset/request
 */
export function usePasswordResetRequest() {
  return useMutation({
    mutationFn: async (data: PasswordResetRequest): Promise<SuccessResponse> => {
      const response = await apiClient.post<SuccessResponse>(
        '/auth/password-reset/request',
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Password reset email sent:', data.message);
      // Success toast will be handled in the component
    },
    onError: (errors: APIError[]) => {
      console.error('Password reset request failed:', errors);
      // Error toast will be handled in the component
    },
  });
}

/**
 * Password reset confirm mutation
 * POST /api/v1/auth/password-reset/confirm
 */
export function usePasswordResetConfirm() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: PasswordResetConfirm): Promise<SuccessResponse> => {
      const response = await apiClient.post<SuccessResponse>(
        '/auth/password-reset/confirm',
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Password reset successful:', data.message);
      // Redirect to login
      router.push(`${config.routes.login}?reset=success`);
    },
    onError: (errors: APIError[]) => {
      console.error('Password reset confirm failed:', errors);
      // Error toast will be handled in the component
    },
  });
}

/**
 * Change password mutation (authenticated users)
 * PATCH /api/v1/users/me/password
 */
export function usePasswordChange() {
  return useMutation({
    mutationFn: async (data: PasswordChange): Promise<SuccessResponse> => {
      const response = await apiClient.patch<SuccessResponse>(
        '/users/me/password',
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Password changed successfully:', data.message);
      // Success toast will be handled in the component
    },
    onError: (errors: APIError[]) => {
      console.error('Password change failed:', errors);
      // Error toast will be handled in the component
    },
  });
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Check if user is authenticated
 * Convenience hook wrapping auth store
 */
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.isAuthenticated);
}

/**
 * Get current user
 * Convenience hook wrapping auth store
 */
export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user);
}

/**
 * Check if current user is admin
 */
export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  return user?.is_superuser === true;
}
