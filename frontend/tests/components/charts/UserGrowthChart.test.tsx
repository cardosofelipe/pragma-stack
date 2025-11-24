/**
 * Tests for UserGrowthChart Component
 */

import { render, screen } from '@testing-library/react';
import { UserGrowthChart } from '@/components/charts/UserGrowthChart';
import type { UserGrowthData } from '@/components/charts/UserGrowthChart';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

describe('UserGrowthChart', () => {
  const mockData: UserGrowthData[] = [
    { date: 'Jan 1', total_users: 100, active_users: 80 },
    { date: 'Jan 2', total_users: 105, active_users: 85 },
    { date: 'Jan 3', total_users: 110, active_users: 90 },
  ];

  it('renders chart card with title and description', () => {
    render(<UserGrowthChart data={mockData} />);

    expect(screen.getByText('User Growth')).toBeInTheDocument();
    expect(screen.getByText('Total and active users over the last 30 days')).toBeInTheDocument();
  });

  it('renders chart with provided data', () => {
    render(<UserGrowthChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with mock data when no data is provided', () => {
    render(<UserGrowthChart />);

    expect(screen.getByText('User Growth')).toBeInTheDocument();
    expect(screen.getByText('No user growth data available')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<UserGrowthChart data={mockData} loading />);

    expect(screen.getByText('User Growth')).toBeInTheDocument();

    // Chart should not be visible when loading
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<UserGrowthChart data={mockData} error="Failed to load chart data" />);

    expect(screen.getByText('User Growth')).toBeInTheDocument();
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();

    // Chart should not be visible when error
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('renders with empty data array', () => {
    render(<UserGrowthChart data={[]} />);

    expect(screen.getByText('User Growth')).toBeInTheDocument();
    expect(screen.getByText('No user growth data available')).toBeInTheDocument();
  });
});
