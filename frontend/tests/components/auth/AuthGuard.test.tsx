/**
 * Tests for AuthGuard component
 * Security-critical: Route protection and access control
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/AuthGuard';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockPathname = '/protected';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
}));

// Mock auth store
let mockAuthState: {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  _hasHydrated: boolean;
} = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  _hasHydrated: true, // In tests, assume store is always hydrated
};

jest.mock('@/lib/stores/authStore', () => ({
  useAuthStore: () => mockAuthState,
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
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default unauthenticated state
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      _hasHydrated: true, // In tests, assume store is always hydrated
    };
    mockMeState = {
      isLoading: false,
      data: null,
    };
  });

  describe('Loading States', () => {
    it('shows loading spinner when auth is loading', () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
        user: null,
        _hasHydrated: true,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows loading spinner when user data is loading', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: null,
        _hasHydrated: true,
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

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows custom fallback when provided', () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
        user: null,
        _hasHydrated: true,
      };

      render(
        <AuthGuard fallback={<div>Please wait...</div>}>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
      // Default spinner should not be shown
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('redirects to login when not authenticated', async () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        _hasHydrated: true,
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
        _hasHydrated: true,
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
          is_superuser: true, // Admin user must have is_superuser: true
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        _hasHydrated: true,
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
        _hasHydrated: true,
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
        _hasHydrated: true,
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
        _hasHydrated: true,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('returnUrl=%2Fprotected')
        );
      });
    });
  });

  describe('Integration with useMe', () => {
    it('shows loading while useMe fetches user data', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: null,
        _hasHydrated: true,
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

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
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
        _hasHydrated: true,
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
