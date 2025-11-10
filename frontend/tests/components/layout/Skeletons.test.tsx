/**
 * Tests for Skeleton Loading Components
 * Verifies structure and rendering of loading placeholders
 */

import { render, screen } from '@testing-library/react';
import { HeaderSkeleton } from '@/components/layout/HeaderSkeleton';
import { AuthLoadingSkeleton } from '@/components/layout/AuthLoadingSkeleton';

describe('HeaderSkeleton', () => {
  it('renders header skeleton structure', () => {
    render(<HeaderSkeleton />);

    // Check for header element
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('sticky', 'top-0', 'z-50', 'w-full', 'border-b');
  });

  it('renders with correct layout structure', () => {
    const { container } = render(<HeaderSkeleton />);

    // Check for container
    const contentDiv = container.querySelector('.container');
    expect(contentDiv).toBeInTheDocument();

    // Check for animated skeleton elements
    const skeletonElements = container.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('has proper styling classes', () => {
    render(<HeaderSkeleton />);

    // Verify backdrop blur and background
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-background/95', 'backdrop-blur');
  });
});

describe('AuthLoadingSkeleton', () => {
  it('renders full page skeleton structure', () => {
    render(<AuthLoadingSkeleton />);

    // Check for header (via HeaderSkeleton)
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // Check for main content area
    expect(screen.getByRole('main')).toBeInTheDocument();

    // Check for footer (via Footer component)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders with flex layout', () => {
    const { container } = render(<AuthLoadingSkeleton />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'min-h-screen', 'flex-col');
  });

  it('renders main content with container', () => {
    render(<AuthLoadingSkeleton />);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('flex-1');

    // Check for container inside main
    const contentContainer = main.querySelector('.container');
    expect(contentContainer).toBeInTheDocument();
  });

  it('renders skeleton placeholders in main content', () => {
    render(<AuthLoadingSkeleton />);

    const main = screen.getByRole('main');

    // Check for animated skeleton elements
    const skeletonElements = main.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('includes HeaderSkeleton component', () => {
    render(<AuthLoadingSkeleton />);

    // HeaderSkeleton should render a banner role
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    // Should have skeleton animation
    const { container } = render(<HeaderSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('includes Footer component', () => {
    render(<AuthLoadingSkeleton />);

    // Footer should render with contentinfo role
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });
});
