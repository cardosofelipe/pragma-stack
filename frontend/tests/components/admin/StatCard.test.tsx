/**
 * Tests for StatCard Component
 * Verifies stat display, loading states, and trend indicators
 */

import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/admin/StatCard';
import { Users, Activity, Building2, FileText } from 'lucide-react';

describe('StatCard', () => {
  const defaultProps = {
    title: 'Total Users',
    value: 1234,
    icon: Users,
  };

  describe('Rendering', () => {
    it('renders stat card with test id', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.getByTestId('stat-card')).toBeInTheDocument();
    });

    it('renders title correctly', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.getByTestId('stat-title')).toHaveTextContent('Total Users');
    });

    it('renders numeric value correctly', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.getByTestId('stat-value')).toHaveTextContent('1234');
    });

    it('renders string value correctly', () => {
      render(<StatCard {...defaultProps} value="Active" />);

      expect(screen.getByTestId('stat-value')).toHaveTextContent('Active');
    });

    it('renders icon', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      // Icon should be rendered (lucide icons render as SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(
        <StatCard {...defaultProps} description="Total registered users" />
      );

      expect(screen.getByTestId('stat-description')).toHaveTextContent(
        'Total registered users'
      );
    });

    it('does not render description when not provided', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.queryByTestId('stat-description')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('applies loading class when loading', () => {
      render(<StatCard {...defaultProps} loading />);

      const card = screen.getByTestId('stat-card');
      expect(card).toHaveClass('animate-pulse');
    });

    it('shows skeleton for value when loading', () => {
      render(<StatCard {...defaultProps} loading />);

      // Value should not be visible
      expect(screen.queryByTestId('stat-value')).not.toBeInTheDocument();

      // Skeleton placeholder should be present
      const card = screen.getByTestId('stat-card');
      const skeleton = card.querySelector('.bg-muted.rounded');
      expect(skeleton).toBeInTheDocument();
    });

    it('hides description when loading', () => {
      render(
        <StatCard
          {...defaultProps}
          description="Test description"
          loading
        />
      );

      expect(screen.queryByTestId('stat-description')).not.toBeInTheDocument();
    });

    it('hides trend when loading', () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: 10, label: 'vs last month', isPositive: true }}
          loading
        />
      );

      expect(screen.queryByTestId('stat-trend')).not.toBeInTheDocument();
    });

    it('applies muted styles to icon when loading', () => {
      const { container } = render(<StatCard {...defaultProps} loading />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-muted-foreground');
    });
  });

  describe('Trend Indicator', () => {
    it('renders positive trend correctly', () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: 12.5, label: 'vs last month', isPositive: true }}
        />
      );

      const trend = screen.getByTestId('stat-trend');
      expect(trend).toBeInTheDocument();
      expect(trend).toHaveTextContent('↑');
      expect(trend).toHaveTextContent('12.5%');
      expect(trend).toHaveTextContent('vs last month');
      expect(trend).toHaveClass('text-green-600');
    });

    it('renders negative trend correctly', () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: 8.3, label: 'vs last week', isPositive: false }}
        />
      );

      const trend = screen.getByTestId('stat-trend');
      expect(trend).toBeInTheDocument();
      expect(trend).toHaveTextContent('↓');
      expect(trend).toHaveTextContent('8.3%');
      expect(trend).toHaveTextContent('vs last week');
      expect(trend).toHaveClass('text-red-600');
    });

    it('handles negative trend values with absolute value', () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: -5.0, label: 'vs last month', isPositive: false }}
        />
      );

      const trend = screen.getByTestId('stat-trend');
      // Should display absolute value
      expect(trend).toHaveTextContent('5%');
      expect(trend).not.toHaveTextContent('-5%');
    });

    it('does not render trend when not provided', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.queryByTestId('stat-trend')).not.toBeInTheDocument();
    });
  });

  describe('Icon Variations', () => {
    it('renders Users icon', () => {
      const { container } = render(<StatCard {...defaultProps} icon={Users} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders Activity icon', () => {
      const { container } = render(
        <StatCard {...defaultProps} icon={Activity} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders Building2 icon', () => {
      const { container } = render(
        <StatCard {...defaultProps} icon={Building2} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders FileText icon', () => {
      const { container } = render(
        <StatCard {...defaultProps} icon={FileText} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<StatCard {...defaultProps} className="custom-class" />);

      const card = screen.getByTestId('stat-card');
      expect(card).toHaveClass('custom-class');
    });

    it('applies default card styles', () => {
      render(<StatCard {...defaultProps} />);

      const card = screen.getByTestId('stat-card');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('p-6');
      expect(card).toHaveClass('shadow-sm');
    });

    it('applies primary color to icon by default', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-primary');
    });

    it('applies correct icon background', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      const iconWrapper = container.querySelector('.rounded-full');
      expect(iconWrapper).toHaveClass('bg-primary/10');
    });

    it('applies muted styles when loading', () => {
      const { container } = render(<StatCard {...defaultProps} loading />);

      const iconWrapper = container.querySelector('.rounded-full');
      expect(iconWrapper).toHaveClass('bg-muted');
    });
  });

  describe('Complex Scenarios', () => {
    it('renders all props together', () => {
      render(
        <StatCard
          title="Active Users"
          value={856}
          icon={Activity}
          description="Currently online"
          trend={{ value: 15.2, label: 'vs yesterday', isPositive: true }}
          className="custom-stat"
        />
      );

      expect(screen.getByTestId('stat-title')).toHaveTextContent('Active Users');
      expect(screen.getByTestId('stat-value')).toHaveTextContent('856');
      expect(screen.getByTestId('stat-description')).toHaveTextContent(
        'Currently online'
      );
      expect(screen.getByTestId('stat-trend')).toHaveTextContent('↑');
      expect(screen.getByTestId('stat-card')).toHaveClass('custom-stat');
    });

    it('handles zero value', () => {
      render(<StatCard {...defaultProps} value={0} />);

      expect(screen.getByTestId('stat-value')).toHaveTextContent('0');
    });

    it('handles very large numbers', () => {
      render(<StatCard {...defaultProps} value={1234567890} />);

      expect(screen.getByTestId('stat-value')).toHaveTextContent('1234567890');
    });

    it('handles formatted string values', () => {
      render(<StatCard {...defaultProps} value="1,234" />);

      expect(screen.getByTestId('stat-value')).toHaveTextContent('1,234');
    });

    it('handles percentage string values', () => {
      render(<StatCard {...defaultProps} value="98.5%" />);

      expect(screen.getByTestId('stat-value')).toHaveTextContent('98.5%');
    });
  });

  describe('Accessibility', () => {
    it('renders semantic HTML structure', () => {
      render(<StatCard {...defaultProps} />);

      const card = screen.getByTestId('stat-card');
      expect(card.tagName).toBe('DIV');
    });

    it('maintains readable text contrast', () => {
      render(<StatCard {...defaultProps} />);

      const title = screen.getByTestId('stat-title');
      expect(title).toHaveClass('text-muted-foreground');

      const value = screen.getByTestId('stat-value');
      expect(value).toHaveClass('font-bold');
    });

    it('renders description with appropriate text size', () => {
      render(
        <StatCard {...defaultProps} description="Test description" />
      );

      const description = screen.getByTestId('stat-description');
      expect(description).toHaveClass('text-xs');
    });
  });
});
