/**
 * Tests for Organization Members Page
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import OrganizationMembersPage from '@/app/admin/organizations/[id]/members/page';

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
  useOrganizationMembers: jest.fn(() => ({
    data: { data: [], pagination: { total: 0, page: 1, page_size: 20, total_pages: 1, has_next: false, has_prev: false } },
    isLoading: false,
  })),
  useGetOrganization: jest.fn(() => ({
    data: { id: 'org-1', name: 'Test Org', slug: 'test-org', description: '', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', member_count: 0 },
    isLoading: false,
  })),
}));

// Mock child components
jest.mock('@/components/admin/organizations/OrganizationMembersContent', () => ({
  OrganizationMembersContent: ({ organizationId }: any) => (
    <div data-testid="organization-members-content">Organization Members Content for {organizationId}</div>
  ),
}));

describe('OrganizationMembersPage', () => {
  const mockParams = { id: 'org-123' };

  it('renders organization members page', () => {
    render(<OrganizationMembersPage params={mockParams} />);

    expect(screen.getByTestId('organization-members-content')).toBeInTheDocument();
  });

  it('passes organization ID to content component', () => {
    render(<OrganizationMembersPage params={mockParams} />);

    expect(screen.getByText(/org-123/)).toBeInTheDocument();
  });

  it('renders back button link', () => {
    const { container } = render(<OrganizationMembersPage params={mockParams} />);

    const backLink = container.querySelector('a[href="/admin/organizations"]');
    expect(backLink).toBeInTheDocument();
  });

  it('renders container with proper spacing', () => {
    const { container } = render(<OrganizationMembersPage params={mockParams} />);

    const mainContainer = container.querySelector('.container');
    expect(mainContainer).toBeInTheDocument();
  });
});
