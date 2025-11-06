/**
 * Tests for OrganizationListTable Component
 * Verifies rendering, pagination, and organization interactions
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationListTable } from '@/components/admin/organizations/OrganizationListTable';
import type { Organization, PaginationMeta } from '@/lib/api/hooks/useAdmin';

// Mock OrganizationActionMenu component
jest.mock('@/components/admin/organizations/OrganizationActionMenu', () => ({
  OrganizationActionMenu: ({ organization }: any) => (
    <button data-testid={`action-menu-${organization.id}`}>
      Actions
    </button>
  ),
}));

describe('OrganizationListTable', () => {
  const mockOrganizations: Organization[] = [
    {
      id: '1',
      name: 'Acme Corporation',
      description: 'Leading provider of innovative solutions',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      member_count: 15,
    },
    {
      id: '2',
      name: 'Tech Startup Inc',
      description: null,
      is_active: false,
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
      member_count: 3,
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
    organizations: mockOrganizations,
    pagination: mockPagination,
    isLoading: false,
    onPageChange: jest.fn(),
    onEditOrganization: jest.fn(),
    onViewMembers: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders table with column headers', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();

      const actionsHeaders = screen.getAllByText('Actions');
      expect(actionsHeaders.length).toBeGreaterThan(0);
    });

    it('renders organization data in table rows', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
      expect(screen.getByText('Leading provider of innovative solutions')).toBeInTheDocument();
      expect(screen.getByText('Tech Startup Inc')).toBeInTheDocument();
    });

    it('renders status badges correctly', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('formats dates correctly', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
    });

    it('renders member counts correctly', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows placeholder text for missing description', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('renders action menu for each organization', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(screen.getByTestId('action-menu-1')).toBeInTheDocument();
      expect(screen.getByTestId('action-menu-2')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders skeleton loaders when loading', () => {
      render(<OrganizationListTable {...defaultProps} isLoading={true} organizations={[]} />);

      const skeletons = screen.getAllByRole('row').slice(1); // Exclude header row
      expect(skeletons).toHaveLength(5); // 5 skeleton rows
    });

    it('does not render organization data when loading', () => {
      render(<OrganizationListTable {...defaultProps} isLoading={true} />);

      expect(screen.queryByText('Acme Corporation')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no organizations', () => {
      render(
        <OrganizationListTable
          {...defaultProps}
          organizations={[]}
          pagination={{ ...mockPagination, total: 0 }}
        />
      );

      expect(
        screen.getByText('No organizations found.')
      ).toBeInTheDocument();
    });

    it('does not render pagination when empty', () => {
      render(
        <OrganizationListTable
          {...defaultProps}
          organizations={[]}
          pagination={{ ...mockPagination, total: 0 }}
        />
      );

      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('View Members Interaction', () => {
    it('calls onViewMembers when member count is clicked', async () => {
      const user = userEvent.setup();
      render(<OrganizationListTable {...defaultProps} />);

      // Click on the member count for first organization
      const memberButton = screen.getByText('15').closest('button');
      expect(memberButton).not.toBeNull();

      if (memberButton) {
        await user.click(memberButton);
        expect(defaultProps.onViewMembers).toHaveBeenCalledWith('1');
      }
    });

    it('does not call onViewMembers when handler is undefined', async () => {
      const user = userEvent.setup();
      render(
        <OrganizationListTable
          {...defaultProps}
          onViewMembers={undefined}
        />
      );

      const memberButton = screen.getByText('15').closest('button');
      expect(memberButton).not.toBeNull();

      // Should not throw error when clicked
      if (memberButton) {
        await user.click(memberButton);
      }
    });
  });

  describe('Pagination', () => {
    it('renders pagination info correctly', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(
        screen.getByText('Showing 1 to 2 of 2 organizations')
      ).toBeInTheDocument();
    });

    it('calculates pagination range correctly for page 2', () => {
      render(
        <OrganizationListTable
          {...defaultProps}
          pagination={{
            total: 50,
            page: 2,
            page_size: 20,
            total_pages: 3,
            has_next: true,
            has_prev: true,
          }}
        />
      );

      expect(
        screen.getByText('Showing 21 to 40 of 50 organizations')
      ).toBeInTheDocument();
    });

    it('renders pagination buttons', () => {
      render(<OrganizationListTable {...defaultProps} />);

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      render(<OrganizationListTable {...defaultProps} />);

      const prevButton = screen.getByText('Previous').closest('button');
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(<OrganizationListTable {...defaultProps} />);

      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).toBeDisabled();
    });

    it('enables previous button when not on first page', () => {
      render(
        <OrganizationListTable
          {...defaultProps}
          pagination={{
            ...mockPagination,
            page: 2,
            has_prev: true,
          }}
        />
      );

      const prevButton = screen.getByText('Previous').closest('button');
      expect(prevButton).not.toBeDisabled();
    });

    it('enables next button when not on last page', () => {
      render(
        <OrganizationListTable
          {...defaultProps}
          pagination={{
            ...mockPagination,
            has_next: true,
            total_pages: 2,
          }}
        />
      );

      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).not.toBeDisabled();
    });

    it('calls onPageChange when previous button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <OrganizationListTable
          {...defaultProps}
          pagination={{
            ...mockPagination,
            page: 2,
            has_prev: true,
          }}
        />
      );

      const prevButton = screen.getByText('Previous').closest('button');
      if (prevButton) {
        await user.click(prevButton);
        expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
      }
    });

    it('calls onPageChange when next button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <OrganizationListTable
          {...defaultProps}
          pagination={{
            ...mockPagination,
            has_next: true,
            total_pages: 2,
          }}
        />
      );

      const nextButton = screen.getByText('Next').closest('button');
      if (nextButton) {
        await user.click(nextButton);
        expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
      }
    });

    it('calls onPageChange when page number is clicked', async () => {
      const user = userEvent.setup();
      render(
        <OrganizationListTable
          {...defaultProps}
          pagination={{
            ...mockPagination,
            total_pages: 3,
          }}
        />
      );

      const pageButton = screen.getByText('1').closest('button');
      if (pageButton) {
        await user.click(pageButton);
        expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
      }
    });

    it('highlights current page button', () => {
      render(
        <OrganizationListTable
          {...defaultProps}
          pagination={{
            ...mockPagination,
            page: 2,
            total_pages: 3,
          }}
        />
      );

      const currentPageButton = screen.getByText('2').closest('button');
      const otherPageButton = screen.getByText('1').closest('button');

      // Current page should not have outline variant
      expect(currentPageButton).not.toHaveClass('border-input');
      // Other pages should have outline variant
      expect(otherPageButton).toHaveClass('border-input');
    });

    it('renders ellipsis for large page counts', () => {
      render(
        <OrganizationListTable
          {...defaultProps}
          pagination={{
            ...mockPagination,
            page: 5,
            total_pages: 10,
          }}
        />
      );

      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it('does not render pagination when loading', () => {
      render(<OrganizationListTable {...defaultProps} isLoading={true} organizations={[]} />);

      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });
});
