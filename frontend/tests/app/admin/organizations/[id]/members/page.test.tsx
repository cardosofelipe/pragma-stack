/**
 * Tests for Admin Organization Members Page
 */

import { render, screen } from '@testing-library/react';
import OrganizationMembersPage from '@/app/admin/organizations/[id]/members/page';

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock OrganizationMembersContent component
jest.mock('@/components/admin/organizations/OrganizationMembersContent', () => ({
  OrganizationMembersContent: ({ organizationId }: { organizationId: string }) => (
    <div data-testid="organization-members-content">
      Organization ID: {organizationId}
    </div>
  ),
}));

describe('OrganizationMembersPage', () => {
  it('renders back button to organizations', async () => {
    const params = Promise.resolve({ id: 'org-123' });
    render(await OrganizationMembersPage({ params }));

    const backLink = screen.getByRole('link');
    expect(backLink).toHaveAttribute('href', '/admin/organizations');
  });

  it('renders organization members content with correct ID', async () => {
    const params = Promise.resolve({ id: 'org-456' });
    render(await OrganizationMembersPage({ params }));

    expect(screen.getByTestId('organization-members-content')).toBeInTheDocument();
    expect(screen.getByText('Organization ID: org-456')).toBeInTheDocument();
  });

  it('renders container with proper styling', async () => {
    const params = Promise.resolve({ id: 'org-789' });
    const { container } = render(await OrganizationMembersPage({ params }));

    const mainContainer = container.querySelector('.container');
    expect(mainContainer).toBeInTheDocument();
  });

  it('handles different organization IDs', async () => {
    const testIds = ['org-001', 'org-abc-123', 'test-org'];

    for (const testId of testIds) {
      const params = Promise.resolve({ id: testId });
      const { unmount } = render(await OrganizationMembersPage({ params }));

      expect(screen.getByText(`Organization ID: ${testId}`)).toBeInTheDocument();
      unmount();
    }
  });
});
