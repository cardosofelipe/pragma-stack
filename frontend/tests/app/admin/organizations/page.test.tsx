/**
 * Tests for Admin Organizations Page
 * Basic structural tests - full component testing in E2E tests
 */

import { render, screen } from '@testing-library/react';
import AdminOrganizationsPage from '@/app/admin/organizations/page';

// Mock the entire OrganizationManagementContent component
jest.mock('@/components/admin/organizations/OrganizationManagementContent', () => ({
  OrganizationManagementContent: () => (
    <div data-testid="organization-management">Organization Management</div>
  ),
}));

describe('AdminOrganizationsPage', () => {
  it('renders with proper container structure', () => {
    const { container } = render(<AdminOrganizationsPage />);

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'py-8');
  });

  it('renders organization management content', () => {
    render(<AdminOrganizationsPage />);

    expect(screen.getByTestId('organization-management')).toBeInTheDocument();
  });
});
