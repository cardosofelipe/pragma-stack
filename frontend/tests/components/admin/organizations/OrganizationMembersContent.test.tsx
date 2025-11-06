/**
 * Tests for OrganizationMembersContent Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationMembersContent } from '@/components/admin/organizations/OrganizationMembersContent';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

// Mock AuthContext
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: '1', email: 'admin@test.com', is_superuser: true },
  })),
}));

// Mock hooks
jest.mock('@/lib/api/hooks/useAdmin', () => ({
  useOrganizationMembers: jest.fn(),
  useGetOrganization: jest.fn(),
}));

// Mock child components
jest.mock('@/components/admin/organizations/OrganizationMembersTable', () => ({
  OrganizationMembersTable: ({ members, isLoading, onPageChange }: any) => (
    <div data-testid="organization-members-table">
      {isLoading ? 'Loading...' : `${members.length} members`}
      <button onClick={() => onPageChange(2)}>Page 2</button>
    </div>
  ),
}));

jest.mock('@/components/admin/organizations/AddMemberDialog', () => ({
  AddMemberDialog: ({ open, onOpenChange }: any) => (
    <div data-testid="add-member-dialog">
      {open && <button onClick={() => onOpenChange(false)}>Close Dialog</button>}
    </div>
  ),
}));

// Import hooks after mocking
import { useOrganizationMembers, useGetOrganization } from '@/lib/api/hooks/useAdmin';

describe('OrganizationMembersContent', () => {
  const mockOrganization = {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-organization',
    description: 'A test organization',
    is_active: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    member_count: 5,
  };

  const mockMembers = [
    {
      user_id: 'user-1',
      email: 'member1@test.com',
      first_name: 'Member',
      last_name: 'One',
      role: 'member' as const,
      joined_at: '2025-01-01',
    },
    {
      user_id: 'user-2',
      email: 'member2@test.com',
      first_name: 'Member',
      last_name: 'Two',
      role: 'admin' as const,
      joined_at: '2025-01-02',
    },
  ];

  const mockPagination = {
    total: 2,
    page: 1,
    page_size: 20,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetOrganization as jest.Mock).mockReturnValue({
      data: mockOrganization,
      isLoading: false,
    });
    (useOrganizationMembers as jest.Mock).mockReturnValue({
      data: { data: mockMembers, pagination: mockPagination },
      isLoading: false,
    });
  });

  it('renders organization name in header', () => {
    render(<OrganizationMembersContent organizationId="org-1" />);
    expect(screen.getByText('Test Organization Members')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<OrganizationMembersContent organizationId="org-1" />);
    expect(
      screen.getByText('Manage members and their roles within the organization')
    ).toBeInTheDocument();
  });

  it('renders add member button', () => {
    render(<OrganizationMembersContent organizationId="org-1" />);
    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
  });

  it('opens add member dialog when button clicked', async () => {
    const user = userEvent.setup();
    render(<OrganizationMembersContent organizationId="org-1" />);

    const addButton = screen.getByRole('button', { name: /add member/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('add-member-dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
    });
  });

  it('renders organization members table', () => {
    render(<OrganizationMembersContent organizationId="org-1" />);
    expect(screen.getByTestId('organization-members-table')).toBeInTheDocument();
  });

  it('passes members data to table', () => {
    render(<OrganizationMembersContent organizationId="org-1" />);
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useOrganizationMembers as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<OrganizationMembersContent organizationId="org-1" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows "Organization Members" when organization is loading', () => {
    (useGetOrganization as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<OrganizationMembersContent organizationId="org-1" />);
    expect(screen.getByText('Organization Members')).toBeInTheDocument();
  });

  it('handles empty members list', () => {
    (useOrganizationMembers as jest.Mock).mockReturnValue({
      data: { data: [], pagination: { ...mockPagination, total: 0 } },
      isLoading: false,
    });

    render(<OrganizationMembersContent organizationId="org-1" />);
    expect(screen.getByText('0 members')).toBeInTheDocument();
  });
});
