/**
 * Tests for Profile Settings Page
 * Smoke tests for page rendering
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfileSettingsPage from '@/app/[locale]/(authenticated)/settings/profile/page';
import { AuthProvider } from '@/lib/auth/AuthContext';

// Mock API hooks
jest.mock('@/lib/api/hooks/useAuth', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('@/lib/api/hooks/useUser', () => ({
  useUpdateProfile: jest.fn(),
}));

// Import mocked hooks
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { useUpdateProfile } from '@/lib/api/hooks/useUser';

// Mock store hook for AuthProvider
const mockStoreHook = ((selector?: (state: any) => any) => {
  const state = {
    isAuthenticated: true,
    user: {
      id: '1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
      is_superuser: false,
      created_at: '2024-01-01T00:00:00Z',
    },
    accessToken: 'token',
    refreshToken: 'refresh',
    isLoading: false,
    tokenExpiresAt: null,
    setAuth: jest.fn(),
    setTokens: jest.fn(),
    setUser: jest.fn(),
    clearAuth: jest.fn(),
    loadAuthFromStorage: jest.fn(),
    isTokenExpired: jest.fn(() => false),
  };
  return selector ? selector(state) : state;
}) as any;

describe('ProfileSettingsPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    is_active: true,
    is_superuser: false,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockUpdateProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useCurrentUser to return test user
    (useCurrentUser as jest.Mock).mockReturnValue(mockUser);

    // Mock useUpdateProfile to return mutation handlers
    (useUpdateProfile as jest.Mock).mockReturnValue({
      mutateAsync: mockUpdateProfile,
      isPending: false,
    });
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider store={mockStoreHook}>{component}</AuthProvider>
      </QueryClientProvider>
    );
  };

  it('renders without crashing', () => {
    renderWithProvider(<ProfileSettingsPage />);
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
  });

  it('renders heading', () => {
    renderWithProvider(<ProfileSettingsPage />);
    expect(screen.getByRole('heading', { name: /profile settings/i })).toBeInTheDocument();
  });

  it('shows description text', () => {
    renderWithProvider(<ProfileSettingsPage />);
    expect(screen.getByText(/manage your profile information/i)).toBeInTheDocument();
  });
});
