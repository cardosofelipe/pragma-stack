/**
 * Tests for UserStatusChart Component
 */

import { render, screen } from '@testing-library/react';
import { UserStatusChart } from '@/components/charts/UserStatusChart';
import type { UserStatusData } from '@/components/charts/UserStatusChart';

// Capture label function at module level for testing
let capturedLabelFunction: ((entry: any) => string) | null = null;

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');

  const MockPie = (props: any) => {
    // Capture the label function for testing
    if (props.label && typeof props.label === 'function') {
      capturedLabelFunction = props.label;
    }
    return <div data-testid="pie-chart">{props.children}</div>;
  };

  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart-container">{children}</div>
    ),
    Pie: MockPie,
    Cell: ({ fill }: { fill: string }) => <div data-testid="cell" style={{ fill }} />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
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

  describe('renderLabel function', () => {
    beforeEach(() => {
      capturedLabelFunction = null;
    });

    it('formats label with name and percentage', () => {
      render(<UserStatusChart data={mockData} />);

      expect(capturedLabelFunction).toBeTruthy();

      if (capturedLabelFunction) {
        const result = capturedLabelFunction({ name: 'Active', percent: 0.75 });
        expect(result).toBe('Active: 75%');
      }
    });

    it('formats label with zero percent', () => {
      render(<UserStatusChart data={mockData} />);

      if (capturedLabelFunction) {
        const result = capturedLabelFunction({ name: 'Inactive', percent: 0 });
        expect(result).toBe('Inactive: 0%');
      }
    });

    it('formats label with 100 percent', () => {
      render(<UserStatusChart data={mockData} />);

      if (capturedLabelFunction) {
        const result = capturedLabelFunction({ name: 'All Users', percent: 1 });
        expect(result).toBe('All Users: 100%');
      }
    });

    it('rounds percentage to nearest whole number', () => {
      render(<UserStatusChart data={mockData} />);

      if (capturedLabelFunction) {
        const result = capturedLabelFunction({ name: 'Pending', percent: 0.4567 });
        expect(result).toBe('Pending: 46%');
      }
    });

    it('handles small percentages', () => {
      render(<UserStatusChart data={mockData} />);

      if (capturedLabelFunction) {
        const result = capturedLabelFunction({ name: 'Suspended', percent: 0.025 });
        expect(result).toBe('Suspended: 3%');
      }
    });
  });
});
