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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminListUsers,
  adminListOrganizations,
  adminCreateUser,
  adminGetUser,
  adminUpdateUser,
  adminDeleteUser,
  adminActivateUser,
  adminDeactivateUser,
  adminBulkUserAction,
  adminCreateOrganization,
  adminUpdateOrganization,
  adminDeleteOrganization,
  adminGetOrganization,
  adminListOrganizationMembers,
  adminAddOrganizationMember,
  adminRemoveOrganizationMember,
  type UserCreate,
  type UserUpdate,
  type OrganizationCreate,
  type OrganizationUpdate,
  type AddMemberRequest,
} from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Constants for admin hooks
 */
const STATS_FETCH_LIMIT = 100; // Maximum allowed by backend pagination (use pagination.total for actual count)
const STATS_REFETCH_INTERVAL = 30000; // 30 seconds - refetch interval for near real-time stats
const DEFAULT_PAGE_LIMIT = 50; // Default number of records per page for paginated lists

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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async (): Promise<AdminStats> => {
      // Fetch users list
      // Use high limit to get all users for stats calculation
      const usersResponse = await adminListUsers({
        query: {
          page: 1,
          limit: STATS_FETCH_LIMIT,
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
          limit: STATS_FETCH_LIMIT,
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
    refetchInterval: STATS_REFETCH_INTERVAL,
    // Keep previous data while refetching to avoid UI flicker
    placeholderData: (previousData) => previousData,
    // Only fetch if user is a superuser (frontend guard)
    enabled: user?.is_superuser === true,
  });
}

/**
 * Pagination metadata structure
 */
export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * User interface matching backend UserResponse
 */
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

/**
 * Paginated user list response
 */
export interface PaginatedUserResponse {
  data: User[];
  pagination: PaginationMeta;
}

/**
 * Hook to fetch paginated list of all users (for admin)
 *
 * @param page - Page number (1-indexed)
 * @param limit - Number of records per page
 * @param search - Search query for email or name
 * @param is_active - Filter by active status (true, false, or null for all)
 * @param is_superuser - Filter by superuser status (true, false, or null for all)
 * @returns Paginated list of users
 */
export function useAdminUsers(
  page = 1,
  limit = DEFAULT_PAGE_LIMIT,
  search?: string | null,
  is_active?: boolean | null,
  is_superuser?: boolean | null
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'users', page, limit, search, is_active, is_superuser],
    queryFn: async (): Promise<PaginatedUserResponse> => {
      const response = await adminListUsers({
        query: {
          page,
          limit,
          ...(search ? { search } : {}),
          ...(is_active !== null && is_active !== undefined ? { is_active } : {}),
          ...(is_superuser !== null && is_superuser !== undefined ? { is_superuser } : {}),
        },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to fetch users');
      }

      // Type assertion: if no error, response has data
      return (response as { data: PaginatedUserResponse }).data;
    },
    // Only fetch if user is a superuser (frontend guard)
    enabled: user?.is_superuser === true,
  });
}

/**
 * Hook to fetch paginated list of all organizations (for admin)
 *
 * @param page - Page number (1-indexed)
 * @param limit - Number of records per page
 * @returns Paginated list of organizations
 */
export function useAdminOrganizations(page = 1, limit = DEFAULT_PAGE_LIMIT) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'organizations', page, limit],
    queryFn: async (): Promise<PaginatedOrganizationResponse> => {
      const response = await adminListOrganizations({
        query: { page, limit },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to fetch organizations');
      }

      // Type assertion: if no error, response has data
      return (response as { data: PaginatedOrganizationResponse }).data;
    },
    // Only fetch if user is a superuser (frontend guard)
    enabled: user?.is_superuser === true,
  });
}

/**
 * Hook to create a new user (admin only)
 *
 * @returns Mutation hook for creating users
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: UserCreate) => {
      const response = await adminCreateUser({
        body: userData,
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to create user');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate user queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/**
 * Hook to update an existing user (admin only)
 *
 * @returns Mutation hook for updating users
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      userData,
    }: {
      userId: string;
      userData: UserUpdate;
    }) => {
      const response = await adminUpdateUser({
        path: { user_id: userId },
        body: userData,
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to update user');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate user queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/**
 * Hook to delete a user (admin only)
 *
 * @returns Mutation hook for deleting users
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminDeleteUser({
        path: { user_id: userId },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to delete user');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate user queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/**
 * Hook to activate a user (admin only)
 *
 * @returns Mutation hook for activating users
 */
export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminActivateUser({
        path: { user_id: userId },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to activate user');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate user queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/**
 * Hook to deactivate a user (admin only)
 *
 * @returns Mutation hook for deactivating users
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminDeactivateUser({
        path: { user_id: userId },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to deactivate user');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate user queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/**
 * Hook to perform bulk actions on users (admin only)
 *
 * @returns Mutation hook for bulk user actions
 */
export function useBulkUserAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      userIds,
    }: {
      action: 'activate' | 'deactivate' | 'delete';
      userIds: string[];
    }) => {
      const response = await adminBulkUserAction({
        body: { action, user_ids: userIds },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to perform bulk action');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate user queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/**
 * Organization interface matching backend OrganizationResponse
 */
export interface Organization {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  member_count: number;
}

/**
 * Paginated organization list response
 */
export interface PaginatedOrganizationResponse {
  data: Organization[];
  pagination: PaginationMeta;
}

/**
 * Organization member interface matching backend OrganizationMemberResponse
 */
export interface OrganizationMember {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
}

/**
 * Paginated organization member list response
 */
export interface PaginatedOrganizationMemberResponse {
  data: OrganizationMember[];
  pagination: PaginationMeta;
}

/**
 * Hook to create a new organization (admin only)
 *
 * @returns Mutation hook for creating organizations
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orgData: OrganizationCreate) => {
      const response = await adminCreateOrganization({
        body: orgData,
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to create organization');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate organization queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/**
 * Hook to update an existing organization (admin only)
 *
 * @returns Mutation hook for updating organizations
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      orgData,
    }: {
      orgId: string;
      orgData: OrganizationUpdate;
    }) => {
      const response = await adminUpdateOrganization({
        path: { org_id: orgId },
        body: orgData,
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to update organization');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate organization queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });
}

/**
 * Hook to delete an organization (admin only)
 *
 * @returns Mutation hook for deleting organizations
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const response = await adminDeleteOrganization({
        path: { org_id: orgId },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to delete organization');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      // Invalidate organization queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/**
 * Hook to fetch single organization (admin only)
 *
 * @param orgId - Organization ID
 * @returns Query hook for fetching organization
 */
export function useGetOrganization(orgId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'organization', orgId],
    queryFn: async () => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      const response = await adminGetOrganization({
        path: { org_id: orgId },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to fetch organization');
      }

      return (response as { data: unknown }).data;
    },
    enabled: user?.is_superuser === true && !!orgId,
  });
}

/**
 * Hook to fetch organization members (admin only)
 *
 * @param orgId - Organization ID
 * @param page - Page number (1-indexed)
 * @param limit - Number of records per page
 * @returns Paginated list of organization members
 */
export function useOrganizationMembers(
  orgId: string | null,
  page = 1,
  limit = DEFAULT_PAGE_LIMIT
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'organization', orgId, 'members', page, limit],
    queryFn: async (): Promise<PaginatedOrganizationMemberResponse> => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      const response = await adminListOrganizationMembers({
        path: { org_id: orgId },
        query: { page, limit },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to fetch organization members');
      }

      return (response as { data: PaginatedOrganizationMemberResponse }).data;
    },
    enabled: user?.is_superuser === true && !!orgId,
  });
}

/**
 * Hook to add a member to an organization (admin only)
 *
 * @returns Mutation hook for adding organization members
 */
export function useAddOrganizationMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      memberData,
    }: {
      orgId: string;
      memberData: AddMemberRequest;
    }) => {
      const response = await adminAddOrganizationMember({
        path: { org_id: orgId },
        body: memberData,
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to add organization member');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate member queries to refetch
      queryClient.invalidateQueries({
        queryKey: ['admin', 'organization', variables.orgId, 'members'],
      });
      // Invalidate organization list to update member count
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });
}

/**
 * Hook to remove a member from an organization (admin only)
 *
 * @returns Mutation hook for removing organization members
 */
export function useRemoveOrganizationMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      userId,
    }: {
      orgId: string;
      userId: string;
    }) => {
      const response = await adminRemoveOrganizationMember({
        path: { org_id: orgId, user_id: userId },
        throwOnError: false,
      });

      if ('error' in response) {
        throw new Error('Failed to remove organization member');
      }

      return (response as { data: unknown }).data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate member queries to refetch
      queryClient.invalidateQueries({
        queryKey: ['admin', 'organization', variables.orgId, 'members'],
      });
      // Invalidate organization list to update member count
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });
}
