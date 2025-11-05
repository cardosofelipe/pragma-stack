/**
 * Admin Hooks
 * React Query hooks for admin operations
 *
 * TODO - Stats Optimization (Option A):
 * Currently calculating stats from multiple endpoints (Option B).
 * For better performance at scale, consider implementing a dedicated
 * /api/v1/admin/stats endpoint that returns pre-calculated counts
 * to avoid fetching full lists.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { adminListUsers, adminListOrganizations } from '@/lib/api/client';

/**
 * Admin Stats interface
 */
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  totalSessions: number; // TODO: Requires admin sessions endpoint
}

/**
 * Hook to fetch admin statistics
 * Calculates stats from existing endpoints (Option B)
 *
 * @returns Admin statistics including user and organization counts
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async (): Promise<AdminStats> => {
      // Fetch users list
      // Use high limit to get all users for stats calculation
      const usersResponse = await adminListUsers({
        query: {
          page: 1,
          limit: 10000, // High limit to get all users for stats
        },
        throwOnError: false,
      });

      if ('error' in usersResponse) {
        throw new Error('Failed to fetch users');
      }

      // Type assertion: if no error, response has data
      const usersData = (usersResponse as { data: { data: Array<{ is_active: boolean }>; pagination: { total: number } } }).data;
      const users = usersData?.data || [];
      const totalUsers = usersData?.pagination?.total || 0;
      const activeUsers = users.filter((u) => u.is_active).length;

      // Fetch organizations list
      const orgsResponse = await adminListOrganizations({
        query: {
          page: 1,
          limit: 10000, // High limit to get all orgs for stats
        },
        throwOnError: false,
      });

      if ('error' in orgsResponse) {
        throw new Error('Failed to fetch organizations');
      }

      // Type assertion: if no error, response has data
      const orgsData = (orgsResponse as { data: { pagination: { total: number } } }).data;
      const totalOrganizations = orgsData?.pagination?.total || 0;

      // TODO: Add admin sessions endpoint
      // Currently no admin-level endpoint exists to fetch all sessions
      // across all users. The /api/v1/sessions/me endpoint only returns
      // sessions for the current user.
      //
      // Once backend implements /api/v1/admin/sessions, uncomment below:
      // const sessionsResponse = await adminListSessions({
      //   query: { page: 1, limit: 10000 },
      //   throwOnError: false,
      // });
      // const totalSessions = sessionsResponse.data?.pagination?.total || 0;

      const totalSessions = 0; // Placeholder until admin sessions endpoint exists

      return {
        totalUsers,
        activeUsers,
        totalOrganizations,
        totalSessions,
      };
    },
    // Refetch every 30 seconds for near real-time stats
    refetchInterval: 30000,
    // Keep previous data while refetching to avoid UI flicker
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch paginated list of all users (for admin)
 *
 * @param page - Page number (1-indexed)
 * @param limit - Number of records per page
 * @returns Paginated list of users
 */
export function useAdminUsers(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['admin', 'users', page, limit],
    queryFn: async () => {
      const response = await adminListUsers({
        query: { page, limit },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to fetch users');
      }

      // Type assertion: if no error, response has data
      return (response as { data: unknown }).data;
    },
  });
}

/**
 * Hook to fetch paginated list of all organizations (for admin)
 *
 * @param page - Page number (1-indexed)
 * @param limit - Number of records per page
 * @returns Paginated list of organizations
 */
export function useAdminOrganizations(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['admin', 'organizations', page, limit],
    queryFn: async () => {
      const response = await adminListOrganizations({
        query: { page, limit },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to fetch organizations');
      }

      // Type assertion: if no error, response has data
      return (response as { data: unknown }).data;
    },
  });
}
