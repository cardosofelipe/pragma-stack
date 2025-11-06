/**
 * Tests for OrganizationMembersTable Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationMembersTable } from '@/components/admin/organizations/OrganizationMembersTable';
import type { OrganizationMember, PaginationMeta } from '@/lib/api/hooks/useAdmin';

// Mock child components
jest.mock('@/components/admin/organizations/MemberActionMenu', () => ({
  MemberActionMenu: ({ member }: any) => (
    <div data-testid={`action-menu-${member.user_id}`}>Actions for {member.email}</div>
  ),
}));

describe('OrganizationMembersTable', () => {
  const mockMembers: OrganizationMember[] = [
    {
      user_id: 'user-1',
      email: 'john@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'owner',
      joined_at: '2025-01-01T00:00:00Z',
    },
    {
      user_id: 'user-2',
      email: 'jane@test.com',
      first_name: 'Jane',
      last_name: null,
      role: 'admin',
      joined_at: '2025-01-15T00:00:00Z',
    },
    {
      user_id: 'user-3',
      email: 'guest@test.com',
      first_name: '',
      last_name: '',
      role: 'guest',
      joined_at: '2025-02-01T00:00:00Z',
    },
  ];

  const mockPagination: PaginationMeta = {
    total: 3,
    page: 1,
    page_size: 20,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  const defaultProps = {
    members: mockMembers,
    organizationId: 'org-1',
    pagination: mockPagination,
    isLoading: false,
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with column headers', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();

    const actionsHeaders = screen.getAllByText('Actions');
    expect(actionsHeaders.length).toBeGreaterThan(0);
  });

  it('renders member rows with email', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    expect(screen.getByText('guest@test.com')).toBeInTheDocument();
  });

  it('renders member full names', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('shows "No name" for members without names', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    expect(screen.getByText('No name')).toBeInTheDocument();
  });

  it('renders role badges', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('renders formatted joined dates', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
    expect(screen.getByText('Feb 1, 2025')).toBeInTheDocument();
  });

  it('renders action menu for each member', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    expect(screen.getByTestId('action-menu-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('action-menu-user-2')).toBeInTheDocument();
    expect(screen.getByTestId('action-menu-user-3')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<OrganizationMembersTable {...defaultProps} isLoading={true} />);

    const skeletons = screen.getAllByRole('row');
    expect(skeletons.length).toBeGreaterThan(1); // Header + skeleton rows
  });

  it('shows empty state when no members', () => {
    render(<OrganizationMembersTable {...defaultProps} members={[]} />);

    expect(screen.getByText('No members found.')).toBeInTheDocument();
  });

  it('renders pagination info', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    expect(screen.getByText(/Showing 1 to 3 of 3 members/)).toBeInTheDocument();
  });

  it('calls onPageChange when page button clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    const paginationWithNext = { ...mockPagination, has_next: true, total_pages: 2 };

    render(
      <OrganizationMembersTable
        {...defaultProps}
        onPageChange={onPageChange}
        pagination={paginationWithNext}
      />
    );

    const nextButton = screen.getByRole('button', { name: 'Next' });
    await user.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous button on first page', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    const prevButton = screen.getByRole('button', { name: 'Previous' });
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<OrganizationMembersTable {...defaultProps} />);

    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeDisabled();
  });

  it('does not show pagination when loading', () => {
    render(<OrganizationMembersTable {...defaultProps} isLoading={true} />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('does not show pagination when no members', () => {
    render(<OrganizationMembersTable {...defaultProps} members={[]} />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});
