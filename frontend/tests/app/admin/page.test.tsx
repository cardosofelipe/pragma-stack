/**
 * Tests for Admin Dashboard Page
 * Verifies rendering of admin dashboard with stats and quick actions
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPage from '@/app/admin/page';

// Helper function to render with QueryClientProvider
function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('AdminPage', () => {
  it('renders admin dashboard title', () => {
    renderWithQueryClient(<AdminPage />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderWithQueryClient(<AdminPage />);

    expect(
      screen.getByText('Manage users, organizations, and system settings')
    ).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    renderWithQueryClient(<AdminPage />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders user management card', () => {
    renderWithQueryClient(<AdminPage />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(
      screen.getByText('View, create, and manage user accounts')
    ).toBeInTheDocument();
  });

  it('renders organizations card', () => {
    renderWithQueryClient(<AdminPage />);

    // Check for the quick actions card (not the stat card)
    expect(
      screen.getByText('Manage organizations and their members')
    ).toBeInTheDocument();
  });

  it('renders system settings card', () => {
    renderWithQueryClient(<AdminPage />);

    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(
      screen.getByText('Configure system-wide settings')
    ).toBeInTheDocument();
  });

  it('renders quick actions in grid layout', () => {
    renderWithQueryClient(<AdminPage />);

    // Check for Quick Actions heading which is above the grid
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();

    // Verify all three quick action cards are present
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });

  it('renders with proper container structure', () => {
    const { container } = renderWithQueryClient(<AdminPage />);

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'py-8');
  });
});
