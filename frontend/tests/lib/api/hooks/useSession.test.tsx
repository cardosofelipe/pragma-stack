/**
 * Tests for useSession hooks
 * Tests session management hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useListSessions,
  useRevokeSession,
  useRevokeAllOtherSessions,
  type Session,
} from '@/lib/api/hooks/useSession';
import * as apiClient from '@/lib/api/client';

// Mock dependencies
jest.mock('@/lib/api/client');

const mockListMySessions = apiClient.listMySessions as jest.Mock;
const mockRevokeSession = apiClient.revokeSession as jest.Mock;

describe('useSession hooks', () => {
  let queryClient: QueryClient;

  const mockSessions: Session[] = [
    {
      id: '1',
      device_name: 'Chrome on Mac',
      ip_address: '192.168.1.1',
      location_city: 'San Francisco',
      location_country: 'USA',
      last_used_at: '2024-01-01T12:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-01-08T00:00:00Z',
      is_current: true,
    },
    {
      id: '2',
      device_name: 'Firefox on Windows',
      ip_address: '192.168.1.2',
      location_city: 'New York',
      location_country: 'USA',
      last_used_at: '2024-01-01T11:00:00Z',
      created_at: '2023-12-31T00:00:00Z',
      expires_at: '2024-01-07T00:00:00Z',
      is_current: false,
    },
  ];

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useListSessions', () => {
    it('successfully fetches sessions list', async () => {
      mockListMySessions.mockResolvedValueOnce({
        data: {
          sessions: mockSessions,
          total: 2,
        },
      });

      const { result } = renderHook(() => useListSessions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockListMySessions).toHaveBeenCalledWith({
        throwOnError: true,
      });
      expect(result.current.data).toEqual(mockSessions);
    });

    it('returns empty array when no sessions', async () => {
      mockListMySessions.mockResolvedValueOnce({
        data: {
          sessions: [],
          total: 0,
        },
      });

      const { result } = renderHook(() => useListSessions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('handles undefined sessions data', async () => {
      mockListMySessions.mockResolvedValueOnce({
        data: undefined,
      });

      const { result } = renderHook(() => useListSessions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('uses correct cache key', async () => {
      mockListMySessions.mockResolvedValueOnce({
        data: {
          sessions: mockSessions,
          total: 2,
        },
      });

      const { result } = renderHook(() => useListSessions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cachedData = queryClient.getQueryData(['sessions', 'list']);
      expect(cachedData).toEqual(mockSessions);
    });
  });

  describe('useRevokeSession', () => {
    it('successfully revokes a session', async () => {
      mockRevokeSession.mockResolvedValueOnce({
        data: { message: 'Session revoked successfully' },
      });

      const { result } = renderHook(() => useRevokeSession(), { wrapper });

      result.current.mutate('session-id-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockRevokeSession).toHaveBeenCalledWith({
        path: { session_id: 'session-id-123' },
        throwOnError: false,
      });
    });

    it('calls onSuccess callback when provided', async () => {
      const onSuccess = jest.fn();

      mockRevokeSession.mockResolvedValueOnce({
        data: { message: 'Session revoked successfully' },
      });

      const { result } = renderHook(() => useRevokeSession(onSuccess), { wrapper });

      result.current.mutate('session-id-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(onSuccess).toHaveBeenCalledWith('Session revoked successfully');
    });

    it('uses default message when no message in response', async () => {
      const onSuccess = jest.fn();

      mockRevokeSession.mockResolvedValueOnce({
        data: {},
      });

      const { result } = renderHook(() => useRevokeSession(onSuccess), { wrapper });

      result.current.mutate('session-id-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(onSuccess).toHaveBeenCalledWith('Session revoked successfully');
    });

    it('handles revocation errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      mockRevokeSession.mockResolvedValueOnce({
        error: {
          message: 'Revocation failed',
          errors: [{ field: 'general', message: 'Revocation failed' }],
        },
      });

      const { result } = renderHook(() => useRevokeSession(), { wrapper });

      result.current.mutate('session-id-123');

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(consoleError).toHaveBeenCalledWith(
        'Session revocation failed:',
        'An unexpected error occurred'
      );

      consoleError.mockRestore();
    });

    it('invalidates sessions query on success', async () => {
      mockRevokeSession.mockResolvedValueOnce({
        data: { message: 'Session revoked' },
      });

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRevokeSession(), { wrapper });

      result.current.mutate('session-id-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['sessions', 'list'],
      });
    });
  });

  describe('useRevokeAllOtherSessions', () => {
    beforeEach(() => {
      // Mock useListSessions data
      queryClient.setQueryData(['sessions', 'list'], mockSessions);
    });

    it('successfully revokes all other sessions', async () => {
      mockRevokeSession.mockResolvedValue({
        data: { message: 'Session revoked' },
      });

      const { result } = renderHook(() => useRevokeAllOtherSessions(), { wrapper });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should only revoke non-current sessions
      expect(mockRevokeSession).toHaveBeenCalledTimes(1);
      expect(mockRevokeSession).toHaveBeenCalledWith({
        path: { session_id: '2' },
        throwOnError: false,
      });
    });

    it('calls onSuccess with count message', async () => {
      const onSuccess = jest.fn();

      mockRevokeSession.mockResolvedValue({
        data: { message: 'Session revoked' },
      });

      const { result } = renderHook(() => useRevokeAllOtherSessions(onSuccess), { wrapper });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(onSuccess).toHaveBeenCalledWith('Successfully revoked 1 session');
    });

    it('handles plural session count in message', async () => {
      const onSuccess = jest.fn();

      // Set multiple non-current sessions
      const multipleSessions: Session[] = [
        { ...mockSessions[0], is_current: true },
        { ...mockSessions[1], id: '2', is_current: false },
        { ...mockSessions[1], id: '3', is_current: false },
      ];

      queryClient.setQueryData(['sessions', 'list'], multipleSessions);

      mockRevokeSession.mockResolvedValue({
        data: { message: 'Session revoked' },
      });

      const { result } = renderHook(() => useRevokeAllOtherSessions(onSuccess), { wrapper });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockRevokeSession).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenCalledWith('Successfully revoked 2 sessions');
    });

    it('handles no other sessions gracefully', async () => {
      const onSuccess = jest.fn();

      // Only current session
      queryClient.setQueryData(['sessions', 'list'], [mockSessions[0]]);

      const { result } = renderHook(() => useRevokeAllOtherSessions(onSuccess), { wrapper });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockRevokeSession).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith('No other sessions to revoke');
    });

    it('handles when no sessions are available', async () => {
      const onSuccess = jest.fn();

      // Set empty sessions array
      queryClient.setQueryData(['sessions', 'list'], []);

      const { result } = renderHook(() => useRevokeAllOtherSessions(onSuccess), { wrapper });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should succeed with message about no sessions
      expect(onSuccess).toHaveBeenCalledWith('No other sessions to revoke');
    });

    it('handles bulk revocation errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      mockRevokeSession.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRevokeAllOtherSessions(), { wrapper });

      result.current.mutate();

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
