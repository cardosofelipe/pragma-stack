/**
 * Tests for Admin Dashboard Page
 * Verifies rendering of admin page placeholder content
 */

import { render, screen } from '@testing-library/react';
import AdminPage from '@/app/admin/page';

describe('AdminPage', () => {
  it('renders admin dashboard title', () => {
    render(<AdminPage />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<AdminPage />);

    expect(
      screen.getByText('Manage users, organizations, and system settings')
    ).toBeInTheDocument();
  });

  it('renders users management card', () => {
    render(<AdminPage />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(
      screen.getByText('Manage user accounts and permissions')
    ).toBeInTheDocument();
  });

  it('renders organizations management card', () => {
    render(<AdminPage />);

    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(
      screen.getByText('View and manage organizations')
    ).toBeInTheDocument();
  });

  it('renders system settings card', () => {
    render(<AdminPage />);

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(
      screen.getByText('System settings and configuration')
    ).toBeInTheDocument();
  });

  it('displays coming soon messages', () => {
    render(<AdminPage />);

    const comingSoonMessages = screen.getAllByText('Coming soon...');
    expect(comingSoonMessages).toHaveLength(3);
  });

  it('renders cards in grid layout', () => {
    const { container } = render(<AdminPage />);

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('gap-4', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('renders with proper container structure', () => {
    const { container } = render(<AdminPage />);

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-4', 'py-8');
  });
});
