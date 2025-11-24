/**
 * Tests for OrganizationDistributionChart Component
 */

import { render, screen } from '@testing-library/react';
import { OrganizationDistributionChart } from '@/components/charts/OrganizationDistributionChart';
import type { OrgDistributionData } from '@/components/charts/OrganizationDistributionChart';

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

describe('OrganizationDistributionChart', () => {
  const mockData: OrgDistributionData[] = [
    { name: 'Engineering', value: 45 },
    { name: 'Marketing', value: 28 },
    { name: 'Sales', value: 35 },
  ];

  it('renders chart card with title and description', () => {
    render(<OrganizationDistributionChart data={mockData} />);

    expect(screen.getByText('Organization Distribution')).toBeInTheDocument();
    expect(screen.getByText('Member count by organization')).toBeInTheDocument();
  });

  it('renders chart with provided data', () => {
    render(<OrganizationDistributionChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with mock data when no data is provided', () => {
    render(<OrganizationDistributionChart />);

    expect(screen.getByText('Organization Distribution')).toBeInTheDocument();
    expect(screen.getByText('No organization data available')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<OrganizationDistributionChart data={mockData} loading />);

    expect(screen.getByText('Organization Distribution')).toBeInTheDocument();

    // Chart should not be visible when loading
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<OrganizationDistributionChart data={mockData} error="Failed to load chart data" />);

    expect(screen.getByText('Organization Distribution')).toBeInTheDocument();
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();

    // Chart should not be visible when error
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('renders with empty data array', () => {
    render(<OrganizationDistributionChart data={[]} />);

    expect(screen.getByText('Organization Distribution')).toBeInTheDocument();
    expect(screen.getByText('No organization data available')).toBeInTheDocument();
  });
});
