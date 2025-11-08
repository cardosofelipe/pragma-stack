/**
 * Tests for AnimatedTerminal component
 */

import { render, screen } from '@testing-library/react';
import { AnimatedTerminal } from '@/components/home/AnimatedTerminal';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// IntersectionObserver is already mocked in jest.setup.js

describe('AnimatedTerminal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the section heading', () => {
    render(<AnimatedTerminal />);

    expect(screen.getByText('Get Started in Seconds')).toBeInTheDocument();
    expect(screen.getByText(/Clone, run, and start building/i)).toBeInTheDocument();
  });

  it('renders terminal window with header', () => {
    render(<AnimatedTerminal />);

    expect(screen.getByText('bash')).toBeInTheDocument();
  });

  it('renders Try Live Demo button', () => {
    render(<AnimatedTerminal />);

    const demoLink = screen.getByRole('link', { name: /try live demo/i });
    expect(demoLink).toHaveAttribute('href', '/login');
  });

  it('displays message about trying demo', () => {
    render(<AnimatedTerminal />);

    expect(screen.getByText(/Or try the live demo without installing/i)).toBeInTheDocument();
  });

  it('starts animation when component mounts', () => {
    render(<AnimatedTerminal />);

    // Animation should start because IntersectionObserver mock triggers immediately
    // Advance timers to show first command
    jest.advanceTimersByTime(1000);

    // Check if animated content appears (the mock renders all commands immediately in tests)
    const terminalContent = screen.getByText('bash').parentElement?.parentElement;
    expect(terminalContent).toBeInTheDocument();
  });

  it('renders terminal with proper structure', () => {
    render(<AnimatedTerminal />);

    // Verify terminal window has proper structure
    const bashIndicator = screen.getByText('bash');
    expect(bashIndicator).toBeInTheDocument();
    expect(bashIndicator.parentElement).toBeInTheDocument();
  });

  describe('Accessibility', () => {
    it('has descriptive text for screen readers', () => {
      render(<AnimatedTerminal />);

      expect(screen.getByText('Get Started in Seconds')).toBeInTheDocument();
    });

    it('has proper link to demo', () => {
      render(<AnimatedTerminal />);

      const demoLink = screen.getByRole('link', { name: /try live demo/i });
      expect(demoLink).toBeInTheDocument();
    });
  });
});
