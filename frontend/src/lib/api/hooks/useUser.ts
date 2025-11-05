/**
 * User Management React Query Hooks
 *
 * Integrates with auto-generated API client and authStore for user profile management.
 * All hooks use generated SDK functions for type safety and OpenAPI compliance.
 *
 * @module lib/api/hooks/useUser
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCurrentUser } from '../client';
import { useAuth } from '@/lib/auth/AuthContext';
import type { User } from '@/lib/stores/authStore';
import { parseAPIError, getGeneralError } from '../errors';
import { authKeys } from './useAuth';

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update current user profile mutation
 * PATCH /api/v1/users/me
 *
 * On success:
 * - Updates user in auth store
 * - Invalidates auth queries
 *
 * @param onSuccess Optional callback after successful update
 * @returns React Query mutation
 */
export function useUpdateProfile(onSuccess?: (message: string) => void) {
  const queryClient = useQueryClient();
  const setUser = useAuth((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: {
      first_name?: string;
      last_name?: string;
      email?: string;
    }) => {
      const response = await updateCurrentUser({
        body: data,
        throwOnError: false,
      });

      if ('error' in response) {
        throw response.error;
      }

      // Type assertion: if no error, response has data
      const responseData = (response as { data: unknown }).data;

      // Validate response is a user object
      if (
        typeof responseData !== 'object' ||
        responseData === null ||
        !('id' in responseData)
      ) {
        throw new Error('Invalid profile update response: missing user data');
      }

      return responseData as User;
    },
    onSuccess: (data) => {
      // Update auth store with new user data
      setUser(data);

      // Invalidate auth queries to refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.me });

      // Call custom success callback if provided
      if (onSuccess) {
        onSuccess('Profile updated successfully');
      }
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Profile update failed:', generalError || 'Unknown error');
    },
  });
}
