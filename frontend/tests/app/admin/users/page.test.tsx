/**
 * Tests for Admin Users Page
 * Verifies rendering of user management page with proper mocks
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminUsersPage from '@/app/admin/users/page';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminUsers } from '@/lib/api/hooks/useAdmin';

// Mock Next.js navigation hooks
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock dependencies
jest.mock('@/lib/auth/AuthContext');
jest.mock('@/lib/api/hooks/useAdmin', () => ({
  useAdminUsers: jest.fn(),
  useCreateUser: jest.fn(),
  useUpdateUser: jest.fn(),
  useDeleteUser: jest.fn(),
  useActivateUser: jest.fn(),
  useDeactivateUser: jest.fn(),
  useBulkUserAction: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAdminUsers = useAdminUsers as jest.MockedFunction<typeof useAdminUsers>;

// Import mutation hooks for mocking
const {
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useActivateUser,
  useDeactivateUser,
  useBulkUserAction,
} = require('@/lib/api/hooks/useAdmin');

const mockUseCreateUser = useCreateUser as jest.MockedFunction<typeof useCreateUser>;
const mockUseUpdateUser = useUpdateUser as jest.MockedFunction<typeof useUpdateUser>;
const mockUseDeleteUser = useDeleteUser as jest.MockedFunction<typeof useDeleteUser>;
const mockUseActivateUser = useActivateUser as jest.MockedFunction<typeof useActivateUser>;
const mockUseDeactivateUser = useDeactivateUser as jest.MockedFunction<typeof useDeactivateUser>;
const mockUseBulkUserAction = useBulkUserAction as jest.MockedFunction<typeof useBulkUserAction>;

describe('AdminUsersPage', () => {
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

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'admin@example.com', is_superuser: true } as any,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    mockUseAdminUsers.mockReturnValue({
      data: {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          page_size: 20,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    // Mock mutation hooks
    mockUseCreateUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    mockUseUpdateUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    mockUseDeleteUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    mockUseActivateUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    mockUseDeactivateUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    mockUseBulkUserAction.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders page title', () => {
    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('renders page description', () => {
    renderWithProviders(<AdminUsersPage />);

    expect(
      screen.getByText('View, create, and manage user accounts')
    ).toBeInTheDocument();
  });

  it('renders back button link', () => {
    renderWithProviders(<AdminUsersPage />);

    const backLink = screen.getByRole('link', { name: '' });
    expect(backLink).toHaveAttribute('href', '/admin');
  });

  it('renders "All Users" heading in content', () => {
    renderWithProviders(<AdminUsersPage />);

    const allUsersHeadings = screen.getAllByText('All Users');
    expect(allUsersHeadings.length).toBeGreaterThan(0);
    expect(allUsersHeadings[0]).toBeInTheDocument();
  });

  it('renders "Manage user accounts and permissions" description', () => {
    renderWithProviders(<AdminUsersPage />);

    expect(
      screen.getByText('Manage user accounts and permissions')
    ).toBeInTheDocument();
  });

  it('renders create user button', () => {
    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('renders with proper container structure', () => {
    const { container } = renderWithProviders(<AdminUsersPage />);

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'py-8');
  });

  it('renders empty state when no users', () => {
    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByText('No users found. Try adjusting your filters.')).toBeInTheDocument();
  });

  it('renders user list table with users', () => {
    mockUseAdminUsers.mockReturnValue({
      data: {
        data: [
          {
            id: '1',
            email: 'user1@example.com',
            first_name: 'User',
            last_name: 'One',
            is_active: true,
            is_superuser: false,
            created_at: '2025-01-01T00:00:00Z',
          },
          {
            id: '2',
            email: 'user2@example.com',
            first_name: 'User',
            last_name: 'Two',
            is_active: false,
            is_superuser: true,
            created_at: '2025-01-02T00:00:00Z',
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          page_size: 20,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });
});
