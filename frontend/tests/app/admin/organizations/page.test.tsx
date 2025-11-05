/**
 * Tests for Admin Organizations Page
 * Verifies rendering of organization management placeholder
 */

import { render, screen } from '@testing-library/react';
import AdminOrganizationsPage from '@/app/admin/organizations/page';

describe('AdminOrganizationsPage', () => {
  it('renders page title', () => {
    render(<AdminOrganizationsPage />);

    expect(screen.getByText('Organizations')).toBeInTheDocument();
  });

  it('renders page description', () => {
    render(<AdminOrganizationsPage />);

    expect(
      screen.getByText('Manage organizations and their members')
    ).toBeInTheDocument();
  });

  it('renders back button link', () => {
    render(<AdminOrganizationsPage />);

    const backLink = screen.getByRole('link', { name: '' });
    expect(backLink).toHaveAttribute('href', '/admin');
  });

  it('renders coming soon message', () => {
    render(<AdminOrganizationsPage />);

    expect(
      screen.getByText('Organization Management Coming Soon')
    ).toBeInTheDocument();
  });

  it('renders feature list', () => {
    render(<AdminOrganizationsPage />);

    expect(
      screen.getByText(/Organization list with search and filtering/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/View organization details and members/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Manage organization memberships/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Organization statistics and activity/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Bulk operations/)).toBeInTheDocument();
  });

  it('renders with proper container structure', () => {
    const { container } = render(<AdminOrganizationsPage />);

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'py-8');
  });
});
