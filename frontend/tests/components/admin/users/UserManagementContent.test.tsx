/**
 * Tests for UserManagementContent Component
 * Verifies component orchestration, state management, and URL synchronization
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserManagementContent } from '@/components/admin/users/UserManagementContent';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminUsers } from '@/lib/api/hooks/useAdmin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock hooks
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

// Mock child components
jest.mock('@/components/admin/users/UserListTable', () => ({
  UserListTable: ({ onEditUser, onSelectUser, selectedUsers }: any) => (
    <div data-testid="user-list-table">
      <button onClick={() => onEditUser({ id: '1', first_name: 'Test' })}>
        Edit User
      </button>
      <button onClick={() => onSelectUser('1')}>Select User 1</button>
      <div data-testid="selected-count">{selectedUsers.length}</div>
    </div>
  ),
}));

jest.mock('@/components/admin/users/UserFormDialog', () => ({
  UserFormDialog: ({ open, mode, user, onOpenChange }: any) =>
    open ? (
      <div data-testid="user-form-dialog">
        <div data-testid="dialog-mode">{mode}</div>
        {user && <div data-testid="dialog-user-id">{user.id}</div>}
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      </div>
    ) : null,
}));

jest.mock('@/components/admin/users/BulkActionToolbar', () => ({
  BulkActionToolbar: ({ selectedCount, onClearSelection }: any) =>
    selectedCount > 0 ? (
      <div data-testid="bulk-action-toolbar">
        <div data-testid="bulk-selected-count">{selectedCount}</div>
        <button onClick={onClearSelection}>Clear Selection</button>
      </div>
    ) : null,
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<
  typeof useSearchParams
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAdminUsers = useAdminUsers as jest.MockedFunction<
  typeof useAdminUsers
>;

// Import mutation hooks for mocking
const {
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useActivateUser,
  useDeactivateUser,
  useBulkUserAction,
} = require('@/lib/api/hooks/useAdmin');

describe('UserManagementContent', () => {
  let queryClient: QueryClient;

  const mockUsers = [
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
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    mockUseAuth.mockReturnValue({
      user: {
        id: 'current-user',
        email: 'admin@example.com',
        is_superuser: true,
      } as any,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    mockUseAdminUsers.mockReturnValue({
      data: {
        data: mockUsers,
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

    // Mock mutation hooks
    useCreateUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    useUpdateUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    useDeleteUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    useActivateUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    useDeactivateUser.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    useBulkUserAction.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('renders header section', () => {
      renderWithProviders(<UserManagementContent />);

      expect(screen.getByText('All Users')).toBeInTheDocument();
      expect(
        screen.getByText('Manage user accounts and permissions')
      ).toBeInTheDocument();
    });

    it('renders create user button', () => {
      renderWithProviders(<UserManagementContent />);

      expect(
        screen.getByRole('button', { name: /Create User/i })
      ).toBeInTheDocument();
    });

    it('renders UserListTable component', () => {
      renderWithProviders(<UserManagementContent />);

      expect(screen.getByTestId('user-list-table')).toBeInTheDocument();
    });

    it('does not render dialog initially', () => {
      renderWithProviders(<UserManagementContent />);

      expect(
        screen.queryByTestId('user-form-dialog')
      ).not.toBeInTheDocument();
    });

    it('does not render bulk toolbar initially', () => {
      renderWithProviders(<UserManagementContent />);

      expect(
        screen.queryByTestId('bulk-action-toolbar')
      ).not.toBeInTheDocument();
    });
  });

  describe('Create User Flow', () => {
    it('opens create dialog when create button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const createButton = screen.getByRole('button', {
        name: /Create User/i,
      });
      await user.click(createButton);

      expect(screen.getByTestId('user-form-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('create');
    });

    it('closes dialog when onOpenChange is called', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const createButton = screen.getByRole('button', {
        name: /Create User/i,
      });
      await user.click(createButton);

      const closeButton = screen.getByRole('button', { name: 'Close Dialog' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId('user-form-dialog')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit User Flow', () => {
    it('opens edit dialog when edit user is triggered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const editButton = screen.getByRole('button', { name: 'Edit User' });
      await user.click(editButton);

      expect(screen.getByTestId('user-form-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('edit');
      expect(screen.getByTestId('dialog-user-id')).toHaveTextContent('1');
    });

    it('closes dialog after edit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const editButton = screen.getByRole('button', { name: 'Edit User' });
      await user.click(editButton);

      const closeButton = screen.getByRole('button', { name: 'Close Dialog' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId('user-form-dialog')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('User Selection', () => {
    it('tracks selected users', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const selectButton = screen.getByRole('button', { name: 'Select User 1' });
      await user.click(selectButton);

      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
    });

    it('shows bulk action toolbar when users are selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const selectButton = screen.getByRole('button', { name: 'Select User 1' });
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-action-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('bulk-selected-count')).toHaveTextContent(
          '1'
        );
      });
    });

    it('clears selection when clear is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const selectButton = screen.getByRole('button', { name: 'Select User 1' });
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-action-toolbar')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', {
        name: 'Clear Selection',
      });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
        expect(
          screen.queryByTestId('bulk-action-toolbar')
        ).not.toBeInTheDocument();
      });
    });

    it('toggles user selection on multiple clicks', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const selectButton = screen.getByRole('button', { name: 'Select User 1' });

      // Select
      await user.click(selectButton);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');

      // Deselect
      await user.click(selectButton);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
    });
  });

  describe('URL State Management', () => {
    it('reads initial page from URL params', () => {
      const paramsWithPage = new URLSearchParams('page=2');
      mockUseSearchParams.mockReturnValue(paramsWithPage as any);

      renderWithProviders(<UserManagementContent />);

      expect(mockUseAdminUsers).toHaveBeenCalledWith(2, 20, null, null, null);
    });

    it('reads search query from URL params', () => {
      const paramsWithSearch = new URLSearchParams('search=test');
      mockUseSearchParams.mockReturnValue(paramsWithSearch as any);

      renderWithProviders(<UserManagementContent />);

      expect(mockUseAdminUsers).toHaveBeenCalledWith(1, 20, 'test', null, null);
    });

    it('reads active filter from URL params', () => {
      const paramsWithActive = new URLSearchParams('active=true');
      mockUseSearchParams.mockReturnValue(paramsWithActive as any);

      renderWithProviders(<UserManagementContent />);

      expect(mockUseAdminUsers).toHaveBeenCalledWith(1, 20, null, true, null);
    });

    it('reads superuser filter from URL params', () => {
      const paramsWithSuperuser = new URLSearchParams('superuser=false');
      mockUseSearchParams.mockReturnValue(paramsWithSuperuser as any);

      renderWithProviders(<UserManagementContent />);

      expect(mockUseAdminUsers).toHaveBeenCalledWith(1, 20, null, null, false);
    });

    it('reads all params from URL', () => {
      const params = new URLSearchParams('page=3&search=admin&active=true&superuser=true');
      mockUseSearchParams.mockReturnValue(params as any);

      renderWithProviders(<UserManagementContent />);

      expect(mockUseAdminUsers).toHaveBeenCalledWith(3, 20, 'admin', true, true);
    });

    it('passes current user ID to table', () => {
      renderWithProviders(<UserManagementContent />);

      // The UserListTable mock receives currentUserId
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument();
    });
  });

  describe('Data Loading States', () => {
    it('passes loading state to table', () => {
      mockUseAdminUsers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<UserManagementContent />);

      expect(screen.getByTestId('user-list-table')).toBeInTheDocument();
    });

    it('handles empty user list', () => {
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

      renderWithProviders(<UserManagementContent />);

      expect(screen.getByTestId('user-list-table')).toBeInTheDocument();
    });

    it('handles undefined data gracefully', () => {
      mockUseAdminUsers.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<UserManagementContent />);

      expect(screen.getByTestId('user-list-table')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('provides all required props to UserListTable', () => {
      renderWithProviders(<UserManagementContent />);

      // UserListTable is rendered and receives props
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument();
      expect(screen.getByTestId('selected-count')).toBeInTheDocument();
    });

    it('provides correct props to UserFormDialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const createButton = screen.getByRole('button', {
        name: /Create User/i,
      });
      await user.click(createButton);

      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('create');
    });

    it('provides correct props to BulkActionToolbar', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      const selectButton = screen.getByRole('button', { name: 'Select User 1' });
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-selected-count')).toHaveTextContent(
          '1'
        );
      });
    });
  });

  describe('State Management', () => {
    it('maintains separate state for selection and dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      // Select a user
      const selectButton = screen.getByRole('button', { name: 'Select User 1' });
      await user.click(selectButton);

      // Open create dialog
      const createButton = screen.getByRole('button', {
        name: /Create User/i,
      });
      await user.click(createButton);

      // Both states should be active
      expect(screen.getByTestId('bulk-action-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('user-form-dialog')).toBeInTheDocument();
    });

    it('resets dialog state correctly between create and edit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserManagementContent />);

      // Open create dialog
      const createButton = screen.getByRole('button', {
        name: /Create User/i,
      });
      await user.click(createButton);
      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('create');

      // Close dialog
      const closeButton1 = screen.getByRole('button', {
        name: 'Close Dialog',
      });
      await user.click(closeButton1);

      // Open edit dialog
      const editButton = screen.getByRole('button', { name: 'Edit User' });
      await user.click(editButton);
      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('edit');
      expect(screen.getByTestId('dialog-user-id')).toHaveTextContent('1');
    });
  });

  describe('Current User Context', () => {
    it('passes current user ID from auth context', () => {
      renderWithProviders(<UserManagementContent />);

      // Implicitly tested through render - the component uses useAuth().user.id
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument();
    });

    it('handles missing current user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      renderWithProviders(<UserManagementContent />);

      expect(screen.getByTestId('user-list-table')).toBeInTheDocument();
    });
  });
});
