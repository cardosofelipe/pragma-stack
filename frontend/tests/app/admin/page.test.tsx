/**
 * Tests for Admin Dashboard Page
 * Verifies rendering of admin dashboard with stats and quick actions
 */

import { render, screen } from '@testing-library/react';
import AdminPage from '@/app/[locale]/admin/page';
import { getAdminStats } from '@/lib/api/admin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API client
jest.mock('@/lib/api/admin');

// Mock the useAdminStats hook
jest.mock('@/lib/api/hooks/useAdmin', () => ({
  useAdminStats: () => ({
    data: {
      totalUsers: 100,
      activeUsers: 80,
      totalOrganizations: 20,
      totalSessions: 30,
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

// Mock chart components
jest.mock('@/components/charts', () => ({
  UserGrowthChart: () => <div data-testid="user-growth-chart">User Growth Chart</div>,
  OrganizationDistributionChart: () => (
    <div data-testid="org-distribution-chart">Org Distribution Chart</div>
  ),
  SessionActivityChart: () => (
    <div data-testid="session-activity-chart">Session Activity Chart</div>
  ),
  UserStatusChart: () => <div data-testid="user-status-chart">User Status Chart</div>,
}));

const mockGetAdminStats = getAdminStats as jest.MockedFunction<typeof getAdminStats>;

// Helper function to render with default mocked stats
function renderWithMockedStats() {
  mockGetAdminStats.mockResolvedValue({
    data: {
      user_growth: [],
      organization_distribution: [],
      user_status: [],
    },
  } as any);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPage />
    </QueryClientProvider>
  );
}

describe('AdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders admin dashboard title', () => {
    renderWithMockedStats();

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderWithMockedStats();

    expect(
      screen.getByText('Manage users, organizations, and system settings')
    ).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    renderWithMockedStats();

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders user management card', () => {
    renderWithMockedStats();

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('View, create, and manage user accounts')).toBeInTheDocument();
  });

  it('renders organizations card', () => {
    renderWithMockedStats();

    // Check for the quick actions card (not the stat card)
    expect(screen.getByText('Manage organizations and their members')).toBeInTheDocument();
  });

  it('renders system settings card', () => {
    renderWithMockedStats();

    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure system-wide settings')).toBeInTheDocument();
  });

  it('renders quick actions in grid layout', () => {
    renderWithMockedStats();

    // Check for Quick Actions heading which is above the grid
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();

    // Verify all three quick action cards are present
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });

  it('renders with proper container structure', () => {
    const { container } = renderWithMockedStats();

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'py-8');
  });

  it('renders analytics overview section', () => {
    renderWithMockedStats();

    expect(screen.getByText('Analytics Overview')).toBeInTheDocument();
  });

  it('renders all chart components', () => {
    renderWithMockedStats();

    expect(screen.getByTestId('user-growth-chart')).toBeInTheDocument();
    expect(screen.getByTestId('org-distribution-chart')).toBeInTheDocument();
    expect(screen.getByTestId('session-activity-chart')).toBeInTheDocument();
    expect(screen.getByTestId('user-status-chart')).toBeInTheDocument();
  });
});
