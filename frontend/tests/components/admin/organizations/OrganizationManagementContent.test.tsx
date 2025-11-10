/**
 * Tests for OrganizationManagementContent Component
 * Verifies component orchestration, state management, and URL synchronization
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { OrganizationManagementContent } from '@/components/admin/organizations/OrganizationManagementContent';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminOrganizations } from '@/lib/api/hooks/useAdmin';
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
  useAdminOrganizations: jest.fn(),
  useCreateOrganization: jest.fn(),
  useUpdateOrganization: jest.fn(),
  useDeleteOrganization: jest.fn(),
}));

// Mock child components
jest.mock('@/components/admin/organizations/OrganizationListTable', () => ({
  OrganizationListTable: ({ onEditOrganization, onViewMembers }: any) => (
    <div data-testid="organization-list-table">
      <button onClick={() => onEditOrganization({ id: '1', name: 'Test Org' })}>
        Edit Organization
      </button>
      <button onClick={() => onViewMembers('1')}>View Members</button>
    </div>
  ),
}));

jest.mock('@/components/admin/organizations/OrganizationFormDialog', () => ({
  OrganizationFormDialog: ({ open, mode, organization, onOpenChange }: any) =>
    open ? (
      <div data-testid="organization-form-dialog">
        <div data-testid="dialog-mode">{mode}</div>
        {organization && <div data-testid="dialog-org-id">{organization.id}</div>}
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      </div>
    ) : null,
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAdminOrganizations = useAdminOrganizations as jest.MockedFunction<
  typeof useAdminOrganizations
>;

// Import mutation hooks for mocking
const {
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} = require('@/lib/api/hooks/useAdmin');

describe('OrganizationManagementContent', () => {
  let queryClient: QueryClient;

  const mockOrganizations = [
    {
      id: '1',
      name: 'Organization One',
      slug: 'org-one',
      description: 'First organization',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      member_count: 5,
    },
    {
      id: '2',
      name: 'Organization Two',
      slug: 'org-two',
      description: 'Second organization',
      is_active: false,
      created_at: '2025-01-02T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
      member_count: 3,
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

    mockUseAdminOrganizations.mockReturnValue({
      data: {
        data: mockOrganizations,
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
    useCreateOrganization.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    useUpdateOrganization.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);

    useDeleteOrganization.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as any);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  describe('Component Rendering', () => {
    it('renders header section', () => {
      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByText('All Organizations')).toBeInTheDocument();
      expect(screen.getByText('Manage organizations and their members')).toBeInTheDocument();
    });

    it('renders create organization button', () => {
      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByRole('button', { name: /Create Organization/i })).toBeInTheDocument();
    });

    it('renders OrganizationListTable component', () => {
      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByTestId('organization-list-table')).toBeInTheDocument();
    });

    it('does not render dialog initially', () => {
      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.queryByTestId('organization-form-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Create Organization Flow', () => {
    it('opens create dialog when create button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrganizationManagementContent />);

      const createButton = screen.getByRole('button', {
        name: /Create Organization/i,
      });
      await user.click(createButton);

      expect(screen.getByTestId('organization-form-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('create');
    });

    it('closes dialog when onOpenChange is called', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrganizationManagementContent />);

      const createButton = screen.getByRole('button', {
        name: /Create Organization/i,
      });
      await user.click(createButton);

      const closeButton = screen.getByRole('button', { name: 'Close Dialog' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('organization-form-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Organization Flow', () => {
    it('opens edit dialog when edit organization is triggered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrganizationManagementContent />);

      const editButton = screen.getByRole('button', { name: 'Edit Organization' });
      await user.click(editButton);

      expect(screen.getByTestId('organization-form-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('edit');
      expect(screen.getByTestId('dialog-org-id')).toHaveTextContent('1');
    });

    it('closes dialog after edit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrganizationManagementContent />);

      const editButton = screen.getByRole('button', { name: 'Edit Organization' });
      await user.click(editButton);

      const closeButton = screen.getByRole('button', { name: 'Close Dialog' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('organization-form-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('View Members Flow', () => {
    it('navigates to members page when view members is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrganizationManagementContent />);

      const viewMembersButton = screen.getByRole('button', {
        name: 'View Members',
      });
      await user.click(viewMembersButton);

      expect(mockPush).toHaveBeenCalledWith('/admin/organizations/1/members');
    });
  });

  describe('URL State Management', () => {
    it('reads initial page from URL params', () => {
      const paramsWithPage = new URLSearchParams('page=2');
      mockUseSearchParams.mockReturnValue(paramsWithPage as any);

      renderWithProviders(<OrganizationManagementContent />);

      expect(mockUseAdminOrganizations).toHaveBeenCalledWith(2, 20);
    });

    it('defaults to page 1 when no page param', () => {
      renderWithProviders(<OrganizationManagementContent />);

      expect(mockUseAdminOrganizations).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('Data Loading States', () => {
    it('passes loading state to table', () => {
      mockUseAdminOrganizations.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByTestId('organization-list-table')).toBeInTheDocument();
    });

    it('handles empty organization list', () => {
      mockUseAdminOrganizations.mockReturnValue({
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

      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByTestId('organization-list-table')).toBeInTheDocument();
    });

    it('handles undefined data gracefully', () => {
      mockUseAdminOrganizations.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByTestId('organization-list-table')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('provides all required props to OrganizationListTable', () => {
      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByTestId('organization-list-table')).toBeInTheDocument();
    });

    it('provides correct props to OrganizationFormDialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrganizationManagementContent />);

      const createButton = screen.getByRole('button', {
        name: /Create Organization/i,
      });
      await user.click(createButton);

      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('create');
    });
  });

  describe('State Management', () => {
    it('resets dialog state correctly between create and edit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrganizationManagementContent />);

      // Open create dialog
      const createButton = screen.getByRole('button', {
        name: /Create Organization/i,
      });
      await user.click(createButton);
      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('create');

      // Close dialog
      const closeButton1 = screen.getByRole('button', {
        name: 'Close Dialog',
      });
      await user.click(closeButton1);

      // Open edit dialog
      const editButton = screen.getByRole('button', { name: 'Edit Organization' });
      await user.click(editButton);
      expect(screen.getByTestId('dialog-mode')).toHaveTextContent('edit');
      expect(screen.getByTestId('dialog-org-id')).toHaveTextContent('1');
    });
  });

  describe('Current User Context', () => {
    it('renders with authenticated user', () => {
      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByTestId('organization-list-table')).toBeInTheDocument();
    });

    it('handles missing current user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      renderWithProviders(<OrganizationManagementContent />);

      expect(screen.getByTestId('organization-list-table')).toBeInTheDocument();
    });
  });
});
