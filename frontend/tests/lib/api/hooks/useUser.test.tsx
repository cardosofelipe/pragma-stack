/**
 * Tests for useUser hooks
 * Tests user profile management hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateProfile } from '@/lib/api/hooks/useUser';
import { useAuthStore } from '@/lib/stores/authStore';
import * as apiClient from '@/lib/api/client';

// Mock dependencies
jest.mock('@/lib/stores/authStore');
jest.mock('@/lib/api/client');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUpdateCurrentUser = apiClient.updateCurrentUser as jest.Mock;

describe('useUser hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useUpdateProfile', () => {
    const mockSetUser = jest.fn();

    beforeEach(() => {
      mockUseAuthStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          const mockState = { setUser: mockSetUser };
          return selector(mockState);
        }
        return mockSetUser;
      });
    });

    it('successfully updates profile', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Updated',
        last_name: 'Name',
        is_active: true,
        is_superuser: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUpdateCurrentUser.mockResolvedValueOnce({
        data: updatedUser,
      });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      result.current.mutate({
        first_name: 'Updated',
        last_name: 'Name',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockUpdateCurrentUser).toHaveBeenCalledWith({
        body: { first_name: 'Updated', last_name: 'Name' },
        throwOnError: false,
      });
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
    });

    it('calls onSuccess callback when provided', async () => {
      const onSuccess = jest.fn();
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        is_superuser: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUpdateCurrentUser.mockResolvedValueOnce({
        data: updatedUser,
      });

      const { result } = renderHook(() => useUpdateProfile(onSuccess), { wrapper });

      result.current.mutate({
        first_name: 'Test',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(onSuccess).toHaveBeenCalledWith('Profile updated successfully');
    });

    it('handles update errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      mockUpdateCurrentUser.mockResolvedValueOnce({
        error: {
          message: 'Update failed',
          errors: [{ field: 'general', message: 'Update failed' }],
        },
      });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      result.current.mutate({
        first_name: 'Test',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(consoleError).toHaveBeenCalledWith(
        'Profile update failed:',
        'An unexpected error occurred'
      );

      consoleError.mockRestore();
    });

    it('invalidates auth queries on success', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        is_superuser: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUpdateCurrentUser.mockResolvedValueOnce({
        data: updatedUser,
      });

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      result.current.mutate({
        first_name: 'Test',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['auth', 'me'],
      });
    });

    it('updates only first_name when last_name is not provided', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: '',
        is_active: true,
        is_superuser: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUpdateCurrentUser.mockResolvedValueOnce({
        data: updatedUser,
      });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      result.current.mutate({
        first_name: 'Test',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockUpdateCurrentUser).toHaveBeenCalledWith({
        body: { first_name: 'Test' },
        throwOnError: false,
      });
    });
  });
});
