/**
 * Tests for UserStatusChart Component
 */

import { render, screen } from '@testing-library/react';
import { UserStatusChart } from '@/components/charts/UserStatusChart';
import type { UserStatusData } from '@/components/charts/UserStatusChart';

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

describe('UserStatusChart', () => {
  const mockData: UserStatusData[] = [
    { name: 'Active', value: 142, color: 'hsl(var(--chart-1))' },
    { name: 'Inactive', value: 28, color: 'hsl(var(--chart-2))' },
    { name: 'Pending', value: 15, color: 'hsl(var(--chart-3))' },
  ];

  it('renders chart card with title and description', () => {
    render(<UserStatusChart data={mockData} />);

    expect(screen.getByText('User Status Distribution')).toBeInTheDocument();
    expect(screen.getByText('Breakdown of users by status')).toBeInTheDocument();
  });

  it('renders chart with provided data', () => {
    render(<UserStatusChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with mock data when no data is provided', () => {
    render(<UserStatusChart />);

    expect(screen.getByText('User Status Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<UserStatusChart data={mockData} loading />);

    expect(screen.getByText('User Status Distribution')).toBeInTheDocument();

    // Chart should not be visible when loading
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<UserStatusChart data={mockData} error="Failed to load chart data" />);

    expect(screen.getByText('User Status Distribution')).toBeInTheDocument();
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();

    // Chart should not be visible when error
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('renders with empty data array', () => {
    render(<UserStatusChart data={[]} />);

    expect(screen.getByText('User Status Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
