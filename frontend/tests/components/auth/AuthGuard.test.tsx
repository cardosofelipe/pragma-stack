/**
 * Tests for AuthGuard component
 * Security-critical: Route protection and access control
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { mockUsePathname, mockPush } from 'next-intl/navigation';

// Mock auth state via Context
let mockAuthState: {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
} = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
};

jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useMe hook
let mockMeState: {
  isLoading: boolean;
  data: any;
} = {
  isLoading: false,
  data: null,
};

jest.mock('@/lib/api/hooks/useAuth', () => ({
  useMe: () => mockMeState,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Configure pathname mock
    mockUsePathname.mockReturnValue('/protected');

    // Reset to default unauthenticated state
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
    };
    mockMeState = {
      isLoading: false,
      data: null,
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Loading States', () => {
    it('shows nothing initially when auth is loading (before 150ms)', () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
        user: null,
      };

      const { container } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      // Before 150ms delay, component returns null (empty)
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows skeleton after 150ms when auth is loading', () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
        user: null,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      // Fast-forward past the 150ms delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Skeleton should be visible (check for skeleton structure)
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header skeleton
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows skeleton after 150ms when user data is loading', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: null,
      };
      mockMeState = {
        isLoading: true,
        data: null,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      // Fast-forward past the 150ms delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Skeleton should be visible
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header skeleton
    });

    it('shows custom fallback after 150ms when provided', () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
        user: null,
      };

      render(
        <AuthGuard fallback={<div>Please wait...</div>}>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      // Fast-forward past the 150ms delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
      // Default skeleton should not be shown
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('redirects to login when not authenticated', async () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?returnUrl=%2Fprotected');
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders children when authenticated', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
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
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Admin Access Control', () => {
    it('renders children for admin user when requireAdmin is true', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
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
      };

      render(
        <AuthGuard requireAdmin>
          <div>Admin Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('redirects non-admin user when requireAdmin is true', async () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'user@example.com',
          first_name: 'Regular',
          last_name: 'User',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };

      render(
        <AuthGuard requireAdmin>
          <div>Admin Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('does not redirect regular user when requireAdmin is false', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'user@example.com',
          first_name: 'Regular',
          last_name: 'User',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };

      render(
        <AuthGuard requireAdmin={false}>
          <div>User Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('User Content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Return URL Preservation', () => {
    it('preserves current path in returnUrl when redirecting', async () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('returnUrl=%2Fprotected'));
      });
    });
  });

  describe('Integration with useMe', () => {
    it('shows skeleton after 150ms while useMe fetches user data', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: null,
      };
      mockMeState = {
        isLoading: true,
        data: null,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      // Fast-forward past the 150ms delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Skeleton should be visible
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header skeleton
    });

    it('renders children after useMe completes', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
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
      };
      mockMeState = {
        isLoading: false,
        data: {
          id: '1',
          email: 'user@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
