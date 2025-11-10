/**
 * Tests for UserListTable Component
 * Verifies rendering, search, filtering, pagination, and user interactions
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserListTable } from '@/components/admin/users/UserListTable';
import type { User, PaginationMeta } from '@/lib/api/hooks/useAdmin';

// Mock UserActionMenu component
jest.mock('@/components/admin/users/UserActionMenu', () => ({
  UserActionMenu: ({ user, isCurrentUser }: any) => (
    <button data-testid={`action-menu-${user.id}`}>Actions {isCurrentUser && '(current)'}</button>
  ),
}));

describe('UserListTable', () => {
  const mockUsers: User[] = [
    {
      id: '1',
      email: 'user1@example.com',
      first_name: 'Alice',
      last_name: 'Smith',
      is_active: true,
      is_superuser: false,
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'user2@example.com',
      first_name: 'Bob',
      last_name: null,
      is_active: false,
      is_superuser: true,
      created_at: '2025-01-02T00:00:00Z',
    },
  ];

  const mockPagination: PaginationMeta = {
    total: 2,
    page: 1,
    page_size: 20,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  const defaultProps = {
    users: mockUsers,
    pagination: mockPagination,
    isLoading: false,
    selectedUsers: [],
    onSelectUser: jest.fn(),
    onSelectAll: jest.fn(),
    onPageChange: jest.fn(),
    onSearch: jest.fn(),
    onFilterActive: jest.fn(),
    onFilterSuperuser: jest.fn(),
    onEditUser: jest.fn(),
    currentUserId: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders table with column headers', () => {
      render(<UserListTable {...defaultProps} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Superuser')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();

      const actionsHeaders = screen.getAllByText('Actions');
      expect(actionsHeaders.length).toBeGreaterThan(0);
    });

    it('renders user data in table rows', () => {
      render(<UserListTable {...defaultProps} />);

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });

    it('renders status badges correctly', () => {
      render(<UserListTable {...defaultProps} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders superuser icons correctly', () => {
      render(<UserListTable {...defaultProps} />);

      const yesIcons = screen.getAllByLabelText('Yes');
      const noIcons = screen.getAllByLabelText('No');

      expect(yesIcons).toHaveLength(1); // Bob is superuser
      expect(noIcons).toHaveLength(1); // Alice is not superuser
    });

    it('formats dates correctly', () => {
      render(<UserListTable {...defaultProps} />);

      expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('Jan 2, 2025')).toBeInTheDocument();
    });

    it('shows "You" badge for current user', () => {
      render(<UserListTable {...defaultProps} currentUserId="1" />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders skeleton loaders when loading', () => {
      render(<UserListTable {...defaultProps} isLoading={true} users={[]} />);

      const skeletons = screen.getAllByRole('row').slice(1); // Exclude header row
      expect(skeletons).toHaveLength(5); // 5 skeleton rows
    });

    it('does not render user data when loading', () => {
      render(<UserListTable {...defaultProps} isLoading={true} />);

      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no users', () => {
      render(
        <UserListTable {...defaultProps} users={[]} pagination={{ ...mockPagination, total: 0 }} />
      );

      expect(screen.getByText('No users found. Try adjusting your filters.')).toBeInTheDocument();
    });

    it('does not render pagination when no users', () => {
      render(
        <UserListTable {...defaultProps} users={[]} pagination={{ ...mockPagination, total: 0 }} />
      );

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('renders search input', () => {
      render(<UserListTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search by name or email...');
      expect(searchInput).toBeInTheDocument();
    });

    it('calls onSearch after debounce delay', async () => {
      const user = userEvent.setup();
      render(<UserListTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search by name or email...');

      await user.type(searchInput, 'alice');

      // Should not call immediately
      expect(defaultProps.onSearch).not.toHaveBeenCalled();

      // Should call after debounce (300ms)
      await waitFor(
        () => {
          expect(defaultProps.onSearch).toHaveBeenCalledWith('alice');
        },
        { timeout: 500 }
      );
    });

    it('updates search input value', async () => {
      const user = userEvent.setup();
      render(<UserListTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search by name or email...'
      ) as HTMLInputElement;

      await user.type(searchInput, 'test');

      expect(searchInput.value).toBe('test');
    });
  });

  describe('Filter Functionality', () => {
    it('renders status filter dropdown', () => {
      render(<UserListTable {...defaultProps} />);

      expect(screen.getByText('All Status')).toBeInTheDocument();
    });

    it('renders user type filter dropdown', () => {
      render(<UserListTable {...defaultProps} />);

      // Find "All Users" in the filter dropdown (not the heading)
      const selectTriggers = screen.getAllByRole('combobox');
      const userTypeFilter = selectTriggers.find(
        (trigger) => within(trigger).queryByText('All Users') !== null
      );

      expect(userTypeFilter).toBeInTheDocument();
    });

    // Note: Select component interaction tests are better suited for E2E tests
    // Unit tests verify that the filters render correctly with proper callbacks
  });

  describe('Selection Functionality', () => {
    it('renders select all checkbox', () => {
      render(<UserListTable {...defaultProps} />);

      const selectAllCheckbox = screen.getByLabelText('Select all users');
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('calls onSelectAll when select all checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<UserListTable {...defaultProps} />);

      const selectAllCheckbox = screen.getByLabelText('Select all users');
      await user.click(selectAllCheckbox);

      expect(defaultProps.onSelectAll).toHaveBeenCalledWith(true);
    });

    it('renders individual user checkboxes', () => {
      render(<UserListTable {...defaultProps} />);

      expect(screen.getByLabelText('Select Alice Smith')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Bob')).toBeInTheDocument();
    });

    it('calls onSelectUser when individual checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<UserListTable {...defaultProps} />);

      const userCheckbox = screen.getByLabelText('Select Alice Smith');
      await user.click(userCheckbox);

      expect(defaultProps.onSelectUser).toHaveBeenCalledWith('1');
    });

    it('checks individual checkbox when user is selected', () => {
      render(<UserListTable {...defaultProps} selectedUsers={['1']} />);

      const userCheckbox = screen.getByLabelText('Select Alice Smith');
      expect(userCheckbox).toHaveAttribute('data-state', 'checked');
    });

    it('checks select all checkbox when all users are selected', () => {
      render(<UserListTable {...defaultProps} selectedUsers={['1', '2']} />);

      const selectAllCheckbox = screen.getByLabelText('Select all users');
      expect(selectAllCheckbox).toHaveAttribute('data-state', 'checked');
    });

    it('disables checkbox for current user', () => {
      render(<UserListTable {...defaultProps} currentUserId="1" />);

      const currentUserCheckbox = screen.getByLabelText('Select Alice Smith');
      expect(currentUserCheckbox).toBeDisabled();
    });

    it('disables select all checkbox when loading', () => {
      render(<UserListTable {...defaultProps} isLoading={true} users={[]} />);

      const selectAllCheckbox = screen.getByLabelText('Select all users');
      expect(selectAllCheckbox).toBeDisabled();
    });

    it('disables select all checkbox when no users', () => {
      render(
        <UserListTable {...defaultProps} users={[]} pagination={{ ...mockPagination, total: 0 }} />
      );

      const selectAllCheckbox = screen.getByLabelText('Select all users');
      expect(selectAllCheckbox).toBeDisabled();
    });
  });

  describe('Pagination', () => {
    const paginatedProps = {
      ...defaultProps,
      pagination: {
        total: 100,
        page: 2,
        page_size: 20,
        total_pages: 5,
        has_next: true,
        has_prev: true,
      },
    };

    it('renders pagination info', () => {
      render(<UserListTable {...paginatedProps} />);

      expect(screen.getByText(/Showing 21 to 40 of 100 users/)).toBeInTheDocument();
    });

    it('renders previous button', () => {
      render(<UserListTable {...paginatedProps} />);

      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    it('renders next button', () => {
      render(<UserListTable {...paginatedProps} />);

      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('renders page number buttons', () => {
      render(<UserListTable {...paginatedProps} />);

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    });

    it('highlights current page button', () => {
      render(<UserListTable {...paginatedProps} />);

      const currentPageButton = screen.getByRole('button', { name: '2' });
      expect(currentPageButton.className).toContain('bg-primary');
    });

    it('calls onPageChange when previous button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserListTable {...paginatedProps} />);

      const previousButton = screen.getByText('Previous');
      await user.click(previousButton);

      expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange when next button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserListTable {...paginatedProps} />);

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
    });

    it('calls onPageChange when page number is clicked', async () => {
      const user = userEvent.setup();
      render(<UserListTable {...paginatedProps} />);

      const pageButton = screen.getByRole('button', { name: '3' });
      await user.click(pageButton);

      expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
    });

    it('disables previous button on first page', () => {
      render(
        <UserListTable
          {...paginatedProps}
          pagination={{ ...paginatedProps.pagination, page: 1, has_prev: false }}
        />
      );

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(
        <UserListTable
          {...paginatedProps}
          pagination={{ ...paginatedProps.pagination, page: 5, has_next: false }}
        />
      );

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('shows ellipsis for skipped pages', () => {
      render(
        <UserListTable
          {...paginatedProps}
          pagination={{
            ...paginatedProps.pagination,
            total_pages: 10,
            page: 5,
          }}
        />
      );

      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it('does not render pagination when loading', () => {
      render(<UserListTable {...paginatedProps} isLoading={true} />);

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });

    it('does not render pagination when no users', () => {
      render(
        <UserListTable {...defaultProps} users={[]} pagination={{ ...mockPagination, total: 0 }} />
      );

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('renders action menu for each user', () => {
      render(<UserListTable {...defaultProps} />);

      expect(screen.getByTestId('action-menu-1')).toBeInTheDocument();
      expect(screen.getByTestId('action-menu-2')).toBeInTheDocument();
    });

    it('passes correct props to UserActionMenu', () => {
      render(<UserListTable {...defaultProps} currentUserId="1" />);

      expect(screen.getByText('Actions (current)')).toBeInTheDocument();
    });
  });
});
