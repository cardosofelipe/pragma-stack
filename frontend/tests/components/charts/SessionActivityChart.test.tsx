/**
 * Tests for SessionActivityChart Component
 */

import { render, screen } from '@testing-library/react';
import { SessionActivityChart } from '@/components/charts/SessionActivityChart';
import type { SessionActivityData } from '@/components/charts/SessionActivityChart';

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

describe('SessionActivityChart', () => {
  const mockData: SessionActivityData[] = [
    { date: 'Jan 1', activeSessions: 30, newSessions: 5 },
    { date: 'Jan 2', activeSessions: 35, newSessions: 7 },
    { date: 'Jan 3', activeSessions: 32, newSessions: 6 },
  ];

  it('renders chart card with title and description', () => {
    render(<SessionActivityChart data={mockData} />);

    expect(screen.getByText('Session Activity')).toBeInTheDocument();
    expect(screen.getByText('Active and new sessions over the last 14 days')).toBeInTheDocument();
  });

  it('renders chart with provided data', () => {
    render(<SessionActivityChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with mock data when no data is provided', () => {
    render(<SessionActivityChart />);

    expect(screen.getByText('Session Activity')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<SessionActivityChart data={mockData} loading />);

    expect(screen.getByText('Session Activity')).toBeInTheDocument();

    // Chart should not be visible when loading
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<SessionActivityChart data={mockData} error="Failed to load chart data" />);

    expect(screen.getByText('Session Activity')).toBeInTheDocument();
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();

    // Chart should not be visible when error
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('renders with empty data array', () => {
    render(<SessionActivityChart data={[]} />);

    expect(screen.getByText('Session Activity')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
