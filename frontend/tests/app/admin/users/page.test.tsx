/**
 * Tests for Admin Users Page
 * Verifies rendering of user management placeholder
 */

import { render, screen } from '@testing-library/react';
import AdminUsersPage from '@/app/admin/users/page';

describe('AdminUsersPage', () => {
  it('renders page title', () => {
    render(<AdminUsersPage />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('renders page description', () => {
    render(<AdminUsersPage />);

    expect(
      screen.getByText('View, create, and manage user accounts')
    ).toBeInTheDocument();
  });

  it('renders back button link', () => {
    render(<AdminUsersPage />);

    const backLink = screen.getByRole('link', { name: '' });
    expect(backLink).toHaveAttribute('href', '/admin');
  });

  it('renders coming soon message', () => {
    render(<AdminUsersPage />);

    expect(screen.getByText('User Management Coming Soon')).toBeInTheDocument();
  });

  it('renders feature list', () => {
    render(<AdminUsersPage />);

    expect(
      screen.getByText(/User list with search and filtering/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create\/edit\/delete user accounts/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Activate\/deactivate users/)).toBeInTheDocument();
    expect(
      screen.getByText(/Role and permission management/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Bulk operations/)).toBeInTheDocument();
  });

  it('renders with proper container structure', () => {
    const { container } = render(<AdminUsersPage />);

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'py-8');
  });
});
