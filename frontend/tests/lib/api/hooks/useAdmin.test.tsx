/**
 * Tests for useAdmin hooks
 * Verifies admin statistics and list fetching functionality
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAdminStats,
  useAdminUsers,
  useAdminOrganizations,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useActivateUser,
  useDeactivateUser,
  useBulkUserAction,
} from '@/lib/api/hooks/useAdmin';
import {
  adminListUsers,
  adminListOrganizations,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminActivateUser,
  adminDeactivateUser,
  adminBulkUserAction,
} from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

// Mock dependencies
jest.mock('@/lib/api/client');
jest.mock('@/lib/auth/AuthContext');

const mockAdminListUsers = adminListUsers as jest.MockedFunction<typeof adminListUsers>;
const mockAdminListOrganizations = adminListOrganizations as jest.MockedFunction<typeof adminListOrganizations>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useAdmin hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useAdminStats', () => {
    const mockUsersData = {
      data: {
        data: [
          { is_active: true },
          { is_active: true },
          { is_active: false },
        ],
        pagination: { total: 3, page: 1, limit: 10000 },
      },
    };

    const mockOrgsData = {
      data: {
        pagination: { total: 5 },
      },
    };

    it('fetches and calculates stats when user is superuser', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListUsers.mockResolvedValue(mockUsersData as any);
      mockAdminListOrganizations.mockResolvedValue(mockOrgsData as any);

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        totalUsers: 3,
        activeUsers: 2,
        totalOrganizations: 5,
        totalSessions: 0,
      });

      expect(mockAdminListUsers).toHaveBeenCalledWith({
        query: { page: 1, limit: 100 },
        throwOnError: false,
      });

      expect(mockAdminListOrganizations).toHaveBeenCalledWith({
        query: { page: 1, limit: 100 },
        throwOnError: false,
      });
    });

    it('does not fetch when user is not superuser', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: false } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockAdminListUsers).not.toHaveBeenCalled();
      expect(mockAdminListOrganizations).not.toHaveBeenCalled();
    });

    it('does not fetch when user is null', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockAdminListUsers).not.toHaveBeenCalled();
    });

    it('handles users API error', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListUsers.mockResolvedValue({ error: 'Users fetch failed' } as any);

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it('handles organizations API error', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListUsers.mockResolvedValue(mockUsersData as any);
      mockAdminListOrganizations.mockResolvedValue({ error: 'Orgs fetch failed' } as any);

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe('useAdminUsers', () => {
    const mockResponse = {
      data: {
        data: [{ id: '1' }, { id: '2' }],
        pagination: { total: 2, page: 1, limit: 50 },
      },
    };

    it('fetches users when user is superuser', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListUsers.mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAdminUsers(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse.data);
      expect(mockAdminListUsers).toHaveBeenCalledWith({
        query: { page: 1, limit: 50 },
        throwOnError: false,
      });
    });

    it('uses custom page and limit parameters', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListUsers.mockResolvedValue(mockResponse as any);

      renderHook(() => useAdminUsers(2, 100), { wrapper });

      await waitFor(() => {
        expect(mockAdminListUsers).toHaveBeenCalledWith({
          query: { page: 2, limit: 100 },
          throwOnError: false,
        });
      });
    });

    it('does not fetch when user is not superuser', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: false } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => useAdminUsers(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockAdminListUsers).not.toHaveBeenCalled();
    });

    it('handles API error', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListUsers.mockResolvedValue({ error: 'Fetch failed' } as any);

      const { result } = renderHook(() => useAdminUsers(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe('useAdminOrganizations', () => {
    const mockResponse = {
      data: {
        data: [{ id: '1' }, { id: '2' }],
        pagination: { total: 2, page: 1, limit: 50 },
      },
    };

    it('fetches organizations when user is superuser', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListOrganizations.mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAdminOrganizations(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse.data);
      expect(mockAdminListOrganizations).toHaveBeenCalledWith({
        query: { page: 1, limit: 50 },
        throwOnError: false,
      });
    });

    it('uses custom page and limit parameters', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListOrganizations.mockResolvedValue(mockResponse as any);

      renderHook(() => useAdminOrganizations(3, 25), { wrapper });

      await waitFor(() => {
        expect(mockAdminListOrganizations).toHaveBeenCalledWith({
          query: { page: 3, limit: 25 },
          throwOnError: false,
        });
      });
    });

    it('does not fetch when user is not superuser', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: false } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => useAdminOrganizations(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockAdminListOrganizations).not.toHaveBeenCalled();
    });

    it('handles API error', async () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true } as any,
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockAdminListOrganizations.mockResolvedValue({ error: 'Fetch failed' } as any);

      const { result } = renderHook(() => useAdminOrganizations(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCreateUser', () => {
    it('creates a user successfully', async () => {
      const mockCreateUser = adminCreateUser as jest.MockedFunction<typeof adminCreateUser>;
      mockCreateUser.mockResolvedValue({
        data: { id: '1', email: 'newuser@example.com', first_name: 'New', last_name: 'User', is_active: true, is_superuser: false, created_at: '2025-01-01T00:00:00Z' },
      } as any);

      const { result } = renderHook(() => useCreateUser(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'newuser@example.com',
          first_name: 'New',
          last_name: 'User',
          password: 'Password123',
          is_active: true,
          is_superuser: false,
        });
      });

      expect(mockCreateUser).toHaveBeenCalledWith({
        body: {
          email: 'newuser@example.com',
          first_name: 'New',
          last_name: 'User',
          password: 'Password123',
          is_active: true,
          is_superuser: false,
        },
        throwOnError: false,
      });
    });

    it('handles create error', async () => {
      const mockCreateUser = adminCreateUser as jest.MockedFunction<typeof adminCreateUser>;
      mockCreateUser.mockResolvedValue({ error: 'Create failed' } as any);

      const { result } = renderHook(() => useCreateUser(), { wrapper });

      await expect(
        result.current.mutateAsync({
          email: 'test@example.com',
          first_name: 'Test',
          password: 'Password123',
          is_active: true,
          is_superuser: false,
        })
      ).rejects.toThrow('Failed to create user');
    });
  });

  describe('useUpdateUser', () => {
    it('updates a user successfully', async () => {
      const mockUpdateUser = adminUpdateUser as jest.MockedFunction<typeof adminUpdateUser>;
      mockUpdateUser.mockResolvedValue({
        data: { id: '1', email: 'updated@example.com', first_name: 'Updated', last_name: 'User', is_active: true, is_superuser: false, created_at: '2025-01-01T00:00:00Z' },
      } as any);

      const { result } = renderHook(() => useUpdateUser(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          userId: '1',
          userData: {
            email: 'updated@example.com',
            first_name: 'Updated',
          },
        });
      });

      expect(mockUpdateUser).toHaveBeenCalledWith({
        path: { user_id: '1' },
        body: {
          email: 'updated@example.com',
          first_name: 'Updated',
        },
        throwOnError: false,
      });
    });

    it('handles update error', async () => {
      const mockUpdateUser = adminUpdateUser as jest.MockedFunction<typeof adminUpdateUser>;
      mockUpdateUser.mockResolvedValue({ error: 'Update failed' } as any);

      const { result } = renderHook(() => useUpdateUser(), { wrapper });

      await expect(
        result.current.mutateAsync({
          userId: '1',
          userData: { email: 'test@example.com' },
        })
      ).rejects.toThrow('Failed to update user');
    });
  });

  describe('useDeleteUser', () => {
    it('deletes a user successfully', async () => {
      const mockDeleteUser = adminDeleteUser as jest.MockedFunction<typeof adminDeleteUser>;
      mockDeleteUser.mockResolvedValue({ data: { success: true } } as any);

      const { result } = renderHook(() => useDeleteUser(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(mockDeleteUser).toHaveBeenCalledWith({
        path: { user_id: '1' },
        throwOnError: false,
      });
    });

    it('handles delete error', async () => {
      const mockDeleteUser = adminDeleteUser as jest.MockedFunction<typeof adminDeleteUser>;
      mockDeleteUser.mockResolvedValue({ error: 'Delete failed' } as any);

      const { result } = renderHook(() => useDeleteUser(), { wrapper });

      await expect(result.current.mutateAsync('1')).rejects.toThrow('Failed to delete user');
    });
  });

  describe('useActivateUser', () => {
    it('activates a user successfully', async () => {
      const mockActivateUser = adminActivateUser as jest.MockedFunction<typeof adminActivateUser>;
      mockActivateUser.mockResolvedValue({ data: { success: true } } as any);

      const { result } = renderHook(() => useActivateUser(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(mockActivateUser).toHaveBeenCalledWith({
        path: { user_id: '1' },
        throwOnError: false,
      });
    });

    it('handles activate error', async () => {
      const mockActivateUser = adminActivateUser as jest.MockedFunction<typeof adminActivateUser>;
      mockActivateUser.mockResolvedValue({ error: 'Activate failed' } as any);

      const { result } = renderHook(() => useActivateUser(), { wrapper });

      await expect(result.current.mutateAsync('1')).rejects.toThrow('Failed to activate user');
    });
  });

  describe('useDeactivateUser', () => {
    it('deactivates a user successfully', async () => {
      const mockDeactivateUser = adminDeactivateUser as jest.MockedFunction<typeof adminDeactivateUser>;
      mockDeactivateUser.mockResolvedValue({ data: { success: true } } as any);

      const { result } = renderHook(() => useDeactivateUser(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(mockDeactivateUser).toHaveBeenCalledWith({
        path: { user_id: '1' },
        throwOnError: false,
      });
    });

    it('handles deactivate error', async () => {
      const mockDeactivateUser = adminDeactivateUser as jest.MockedFunction<typeof adminDeactivateUser>;
      mockDeactivateUser.mockResolvedValue({ error: 'Deactivate failed' } as any);

      const { result } = renderHook(() => useDeactivateUser(), { wrapper });

      await expect(result.current.mutateAsync('1')).rejects.toThrow('Failed to deactivate user');
    });
  });

  describe('useBulkUserAction', () => {
    it('performs bulk activate successfully', async () => {
      const mockBulkAction = adminBulkUserAction as jest.MockedFunction<typeof adminBulkUserAction>;
      mockBulkAction.mockResolvedValue({ data: { success: true, affected_count: 2 } } as any);

      const { result } = renderHook(() => useBulkUserAction(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          action: 'activate',
          userIds: ['1', '2'],
        });
      });

      expect(mockBulkAction).toHaveBeenCalledWith({
        body: { action: 'activate', user_ids: ['1', '2'] },
        throwOnError: false,
      });
    });

    it('performs bulk deactivate successfully', async () => {
      const mockBulkAction = adminBulkUserAction as jest.MockedFunction<typeof adminBulkUserAction>;
      mockBulkAction.mockResolvedValue({ data: { success: true, affected_count: 3 } } as any);

      const { result } = renderHook(() => useBulkUserAction(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          action: 'deactivate',
          userIds: ['1', '2', '3'],
        });
      });

      expect(mockBulkAction).toHaveBeenCalledWith({
        body: { action: 'deactivate', user_ids: ['1', '2', '3'] },
        throwOnError: false,
      });
    });

    it('performs bulk delete successfully', async () => {
      const mockBulkAction = adminBulkUserAction as jest.MockedFunction<typeof adminBulkUserAction>;
      mockBulkAction.mockResolvedValue({ data: { success: true, affected_count: 1 } } as any);

      const { result } = renderHook(() => useBulkUserAction(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          action: 'delete',
          userIds: ['1'],
        });
      });

      expect(mockBulkAction).toHaveBeenCalledWith({
        body: { action: 'delete', user_ids: ['1'] },
        throwOnError: false,
      });
    });

    it('handles bulk action error', async () => {
      const mockBulkAction = adminBulkUserAction as jest.MockedFunction<typeof adminBulkUserAction>;
      mockBulkAction.mockResolvedValue({ error: 'Bulk action failed' } as any);

      const { result } = renderHook(() => useBulkUserAction(), { wrapper });

      await expect(
        result.current.mutateAsync({
          action: 'activate',
          userIds: ['1', '2'],
        })
      ).rejects.toThrow('Failed to perform bulk action');
    });
  });
});
