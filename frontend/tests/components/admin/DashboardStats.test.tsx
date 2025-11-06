/**
 * Tests for DashboardStats Component
 * Verifies dashboard statistics display and error handling
 */

import { render, screen } from '@testing-library/react';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { useAdminStats } from '@/lib/api/hooks/useAdmin';

// Mock the useAdminStats hook
jest.mock('@/lib/api/hooks/useAdmin');

const mockUseAdminStats = useAdminStats as jest.MockedFunction<typeof useAdminStats>;

describe('DashboardStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all stat cards with data', () => {
    mockUseAdminStats.mockReturnValue({
      data: {
        totalUsers: 150,
        activeUsers: 120,
        totalOrganizations: 25,
        totalSessions: 45,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<DashboardStats />);

    // Check stat cards are rendered
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('All registered users')).toBeInTheDocument();

    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Users with active status')).toBeInTheDocument();

    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Total organizations')).toBeInTheDocument();

    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Current active sessions')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockUseAdminStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<DashboardStats />);

    // StatCard component should render loading state
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseAdminStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error occurred'),
    } as any);

    render(<DashboardStats />);

    expect(screen.getByText(/Failed to load dashboard statistics/)).toBeInTheDocument();
    expect(screen.getByText(/Network error occurred/)).toBeInTheDocument();
  });

  it('renders error state with default message when error message is missing', () => {
    mockUseAdminStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: {} as any,
    } as any);

    render(<DashboardStats />);

    expect(screen.getByText(/Failed to load dashboard statistics/)).toBeInTheDocument();
    expect(screen.getByText(/Unknown error/)).toBeInTheDocument();
  });

  it('renders with zero values', () => {
    mockUseAdminStats.mockReturnValue({
      data: {
        totalUsers: 0,
        activeUsers: 0,
        totalOrganizations: 0,
        totalSessions: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<DashboardStats />);

    // Check all zeros are displayed
    const zeroValues = screen.getAllByText('0');
    expect(zeroValues.length).toBe(4); // 4 stat cards with 0 value
  });

  it('renders with dashboard-stats test id', () => {
    mockUseAdminStats.mockReturnValue({
      data: {
        totalUsers: 100,
        activeUsers: 80,
        totalOrganizations: 20,
        totalSessions: 30,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const { container } = render(<DashboardStats />);

    const dashboardStats = container.querySelector('[data-testid="dashboard-stats"]');
    expect(dashboardStats).toBeInTheDocument();
    expect(dashboardStats).toHaveClass('grid', 'gap-4', 'md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('renders icons with aria-hidden', () => {
    mockUseAdminStats.mockReturnValue({
      data: {
        totalUsers: 100,
        activeUsers: 80,
        totalOrganizations: 20,
        totalSessions: 30,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const { container } = render(<DashboardStats />);

    // Check that icons have aria-hidden attribute
    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });
});
