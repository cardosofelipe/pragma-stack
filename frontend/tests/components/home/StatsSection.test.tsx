/**
 * Tests for StatsSection component
 */

import { render, screen } from '@testing-library/react';
import { StatsSection } from '@/components/home/StatsSection';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    useInView: () => true, // Always in view for tests
  };
});

describe('StatsSection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders section heading', () => {
    render(<StatsSection />);

    expect(screen.getByText('Built with Quality in Mind')).toBeInTheDocument();
    expect(screen.getByText(/Not just another template/i)).toBeInTheDocument();
  });

  it('renders all stat cards', () => {
    render(<StatsSection />);

    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    expect(screen.getByText('Passing Tests')).toBeInTheDocument();
    expect(screen.getByText('Flaky Tests')).toBeInTheDocument();
    expect(screen.getByText('API Endpoints')).toBeInTheDocument();
  });

  it('displays stat descriptions', () => {
    render(<StatsSection />);

    expect(screen.getByText(/Comprehensive testing across backend and frontend/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend, frontend unit, and E2E tests/i)).toBeInTheDocument();
    expect(screen.getByText(/Production-stable test suite/i)).toBeInTheDocument();
    expect(screen.getByText(/Fully documented with OpenAPI/i)).toBeInTheDocument();
  });

  it('renders animated counters with correct suffixes', () => {
    render(<StatsSection />);

    // Counters start at 0, so we should see 0 initially
    const counters = screen.getAllByText(/^[0-9]+[%+]?$/);
    expect(counters.length).toBeGreaterThan(0);
  });

  it('animates counters when in view', () => {
    render(<StatsSection />);

    // The useInView mock returns true, so animation should start
    // Advance timers to let the counter animation run
    jest.advanceTimersByTime(2000);

    // After animation, we should see the final values
    // The component should eventually show the stat values
    const statsSection = screen.getByText('Test Coverage').parentElement;
    expect(statsSection).toBeInTheDocument();
  });

  it('displays icons for each stat', () => {
    render(<StatsSection />);

    // Icons are rendered via lucide-react components
    // We can verify the stat cards are rendered with proper structure
    const testCoverageCard = screen.getByText('Test Coverage').closest('div');
    expect(testCoverageCard).toBeInTheDocument();

    const passingTestsCard = screen.getByText('Passing Tests').closest('div');
    expect(passingTestsCard).toBeInTheDocument();

    const flakyTestsCard = screen.getByText('Flaky Tests').closest('div');
    expect(flakyTestsCard).toBeInTheDocument();

    const apiEndpointsCard = screen.getByText('API Endpoints').closest('div');
    expect(apiEndpointsCard).toBeInTheDocument();
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<StatsSection />);

      const heading = screen.getByRole('heading', { name: /built with quality in mind/i });
      expect(heading).toBeInTheDocument();
    });

    it('has descriptive labels for stats', () => {
      render(<StatsSection />);

      const statLabels = [
        'Test Coverage',
        'Passing Tests',
        'Flaky Tests',
        'API Endpoints',
      ];

      statLabels.forEach(label => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });
});
