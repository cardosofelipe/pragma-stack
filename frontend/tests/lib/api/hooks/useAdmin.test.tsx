/**
 * Tests for useAdmin hooks
 * Verifies admin statistics and list fetching functionality
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminStats, useAdminUsers, useAdminOrganizations } from '@/lib/api/hooks/useAdmin';
import { adminListUsers, adminListOrganizations } from '@/lib/api/client';
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
        query: { page: 1, limit: 10000 },
        throwOnError: false,
      });

      expect(mockAdminListOrganizations).toHaveBeenCalledWith({
        query: { page: 1, limit: 10000 },
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
});
