/**
 * Tests for ChartCard Component
 */

import { render, screen } from '@testing-library/react';
import { ChartCard } from '@/components/charts/ChartCard';

describe('ChartCard', () => {
  const mockChildren = <div>Chart Content</div>;

  it('renders with title and children', () => {
    render(<ChartCard title="Test Chart">{mockChildren}</ChartCard>);

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Chart Content')).toBeInTheDocument();
  });

  it('renders with title and description', () => {
    render(
      <ChartCard title="Test Chart" description="Test description">
        {mockChildren}
      </ChartCard>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading is true', () => {
    render(
      <ChartCard title="Test Chart" loading>
        {mockChildren}
      </ChartCard>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument();

    // Skeleton should be visible
    const skeleton = document.querySelector('.h-\\[300px\\]');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows error alert when error is provided', () => {
    render(
      <ChartCard title="Test Chart" error="Failed to load data">
        {mockChildren}
      </ChartCard>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChartCard title="Test Chart" className="custom-class">
        {mockChildren}
      </ChartCard>
    );

    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('renders without description when not provided', () => {
    render(<ChartCard title="Test Chart">{mockChildren}</ChartCard>);

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Chart Content')).toBeInTheDocument();

    // Description should not be present
    const cardDescription = document.querySelector('[class*="CardDescription"]');
    expect(cardDescription).not.toBeInTheDocument();
  });

  it('prioritizes error over loading state', () => {
    render(
      <ChartCard title="Test Chart" loading error="Error message">
        {mockChildren}
      </ChartCard>
    );

    // Error should be shown
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Loading skeleton should not be shown
    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument();
  });
});
