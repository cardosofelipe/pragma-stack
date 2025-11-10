/**
 * Tests for useAuth hooks
 * Note: Full API integration tests require MSW (planned for Phase 9)
 * These tests cover hook setup, types, and basic integration
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIsAuthenticated, useCurrentUser, useIsAdmin } from '@/lib/api/hooks/useAuth';
import { AuthProvider } from '@/lib/auth/AuthContext';

// Mock auth state (Context-injected)
let mockAuthState: any = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  tokenExpiresAt: null,
  // Action stubs (unused in these tests)
  setAuth: jest.fn(),
  setTokens: jest.fn(),
  setUser: jest.fn(),
  clearAuth: jest.fn(),
  loadAuthFromStorage: jest.fn(),
  isTokenExpired: jest.fn(() => false),
};

// Mock store hook compatible with AuthContext (Zustand-like hook)
const mockStoreHook = ((selector?: (state: any) => any) => {
  return selector ? selector(mockAuthState) : mockAuthState;
}) as any;

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider store={mockStoreHook}>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('useAuth Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    };
  });

  describe('useIsAuthenticated', () => {
    it('returns false when not authenticated', () => {
      mockAuthState = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
      };

      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(false);
    });

    it('returns true when authenticated', () => {
      mockAuthState = {
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'user@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      };

      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useCurrentUser', () => {
    it('returns null when not authenticated', () => {
      mockAuthState = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
      };

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeNull();
    });

    it('returns user when authenticated', () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        is_superuser: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockAuthState = {
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      };

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual(mockUser);
    });
  });

  describe('useIsAdmin', () => {
    it('returns false when not authenticated', () => {
      mockAuthState = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
      };

      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(false);
    });

    it('returns false for regular user', () => {
      mockAuthState = {
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'user@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      };

      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(false);
    });

    it('returns true for admin user', () => {
      mockAuthState = {
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          is_active: true,
          is_superuser: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      };

      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(true);
    });
  });

  // Note: Mutation hooks (useLogin, useRegister, etc.) require MSW for full testing
  // These will be tested in Phase 9 with proper API mocking
  // For now, we've tested the convenience hooks which improve coverage significantly
});
