/**
 * Tests for RegistrationActivityChart Component
 */

import { render, screen } from '@testing-library/react';
import { RegistrationActivityChart } from '@/components/charts/RegistrationActivityChart';
import type { RegistrationActivityData } from '@/components/charts/RegistrationActivityChart';

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

describe('RegistrationActivityChart', () => {
  const mockData: RegistrationActivityData[] = [
    { date: 'Jan 1', registrations: 5 },
    { date: 'Jan 2', registrations: 8 },
    { date: 'Jan 3', registrations: 3 },
  ];

  it('renders chart card with title and description', () => {
    render(<RegistrationActivityChart data={mockData} />);

    expect(screen.getByText('User Registration Activity')).toBeInTheDocument();
    expect(screen.getByText('New user registrations over the last 14 days')).toBeInTheDocument();
  });

  it('renders chart with provided data', () => {
    render(<RegistrationActivityChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows empty state when no data is provided', () => {
    render(<RegistrationActivityChart />);

    expect(screen.getByText('User Registration Activity')).toBeInTheDocument();
    expect(screen.getByText('No registration data available')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows empty state when data array is empty', () => {
    render(<RegistrationActivityChart data={[]} />);

    expect(screen.getByText('User Registration Activity')).toBeInTheDocument();
    expect(screen.getByText('No registration data available')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows empty state when data has no registrations', () => {
    const emptyData = [
      { date: 'Jan 1', registrations: 0 },
      { date: 'Jan 2', registrations: 0 },
    ];
    render(<RegistrationActivityChart data={emptyData} />);

    expect(screen.getByText('User Registration Activity')).toBeInTheDocument();
    expect(screen.getByText('No registration data available')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<RegistrationActivityChart data={mockData} loading />);

    expect(screen.getByText('User Registration Activity')).toBeInTheDocument();

    // Chart should not be visible when loading
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
    expect(screen.queryByText('No registration data available')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<RegistrationActivityChart data={mockData} error="Failed to load chart data" />);

    expect(screen.getByText('User Registration Activity')).toBeInTheDocument();
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();

    // Chart should not be visible when error
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });
});
