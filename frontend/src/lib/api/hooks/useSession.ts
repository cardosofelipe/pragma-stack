/**
 * Session Management React Query Hooks
 *
 * Integrates with auto-generated API client for session management.
 * All hooks use generated SDK functions for type safety and OpenAPI compliance.
 *
 * @module lib/api/hooks/useSession
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMySessions, revokeSession } from '../client';
import { parseAPIError, getGeneralError } from '../errors';
import type { SessionResponse } from '../generated/types.gen';

// ============================================================================
// Query Keys
// ============================================================================

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: () => [...sessionKeys.lists()] as const,
};

// ============================================================================
// Types
// ============================================================================

/**
 * Session data type (re-export from generated types)
 */
export type Session = SessionResponse;

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all active sessions for current user
 * GET /api/v1/sessions/me
 *
 * Returns list of active sessions with device and location info.
 *
 * @returns React Query result with sessions array
 */
export function useListSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: async (): Promise<Session[]> => {
      const response = await listMySessions({
        throwOnError: true,
      });

      // Extract sessions array from SessionListResponse
      return response.data?.sessions || [];
    },
    staleTime: 30 * 1000, // 30 seconds - sessions change infrequently
    retry: 2,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Revoke a specific session
 * DELETE /api/v1/sessions/{id}
 *
 * On success:
 * - Removes session from database
 * - Invalidates session queries to refetch list
 *
 * Note: Cannot revoke current session (use logout instead)
 *
 * @param onSuccess Optional callback after successful revocation
 * @returns React Query mutation
 */
export function useRevokeSession(onSuccess?: (message: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await revokeSession({
        path: { session_id: sessionId },
        throwOnError: false,
      });

      if ('error' in response) {
        throw response.error;
      }

      // Type assertion: if no error, response has data
      return (response as { data: unknown }).data;
    },
    onSuccess: (data) => {
      // Extract message from response
      const message =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as Record<string, unknown>).message === 'string'
          ? (data as { message: string }).message
          : 'Session revoked successfully';

      // Invalidate sessions list to trigger refetch
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() });

      // Call custom success callback if provided
      if (onSuccess) {
        onSuccess(message);
      }
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Session revocation failed:', generalError || 'Unknown error');
    },
  });
}

/**
 * Revoke all sessions except the current one
 * Convenience hook that revokes multiple sessions
 *
 * @param onSuccess Optional callback after all sessions revoked
 * @returns React Query mutation
 */
export function useRevokeAllOtherSessions(onSuccess?: (message: string) => void) {
  const queryClient = useQueryClient();
  const { data: sessions } = useListSessions();

  return useMutation({
    mutationFn: async () => {
      if (!sessions) {
        throw new Error('No sessions loaded');
      }

      // Get all non-current sessions
      const otherSessions = sessions.filter((s) => !s.is_current);

      if (otherSessions.length === 0) {
        return { message: 'No other sessions to revoke' };
      }

      // Revoke all other sessions
      const revokePromises = otherSessions.map((session) =>
        revokeSession({
          path: { session_id: session.id },
          throwOnError: false,
        })
      );

      await Promise.all(revokePromises);

      return {
        message: `Successfully revoked ${otherSessions.length} session${
          otherSessions.length > 1 ? 's' : ''
        }`,
      };
    },
    onSuccess: (data) => {
      // Invalidate sessions list to trigger refetch
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() });

      // Call custom success callback if provided
      if (onSuccess) {
        onSuccess(data.message);
      }
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Bulk session revocation failed:', generalError || 'Unknown error');
    },
  });
}
