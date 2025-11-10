/**
 * Tests for HeroSection component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { HeroSection } from '@/components/home/HeroSection';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
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

// Mock DemoCredentialsModal
jest.mock('@/components/home/DemoCredentialsModal', () => ({
  DemoCredentialsModal: ({ open, onClose }: any) => (
    open ? <div data-testid="demo-modal">
      <button onClick={onClose}>Close Modal</button>
    </div> : null
  ),
}));

describe('HeroSection', () => {
  it('renders badge with key highlights', () => {
    render(<HeroSection onOpenDemoModal={function(): void {
        throw new Error("Function not implemented.");
    } } />);

    expect(screen.getByText('MIT Licensed')).toBeInTheDocument();
    expect(screen.getAllByText('97% Test Coverage')[0]).toBeInTheDocument();
    expect(screen.getByText('Production Ready')).toBeInTheDocument();
  });

  it('renders main headline', () => {
    render(<HeroSection onOpenDemoModal={function(): void {
        throw new Error("Function not implemented.");
    } } />);

    expect(screen.getAllByText(/Everything You Need to Build/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Modern Web Applications/i)[0]).toBeInTheDocument();
  });

  it('renders subheadline with key messaging', () => {
    render(<HeroSection onOpenDemoModal={function(): void {
        throw new Error("Function not implemented.");
    } } />);

    expect(screen.getByText(/Production-ready FastAPI \+ Next.js template/i)).toBeInTheDocument();
    expect(screen.getByText(/Start building features on day one/i)).toBeInTheDocument();
  });

  it('renders Try Live Demo button', () => {
    render(<HeroSection onOpenDemoModal={function(): void {
        throw new Error("Function not implemented.");
    } } />);

    const demoButton = screen.getByRole('button', { name: /try live demo/i });
    expect(demoButton).toBeInTheDocument();
  });

  it('renders View on GitHub link', () => {
    render(<HeroSection onOpenDemoModal={function(): void {
        throw new Error("Function not implemented.");
    } } />);

    const githubLink = screen.getByRole('link', { name: /view on github/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/your-org/fast-next-template');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Explore Components link', () => {
    render(<HeroSection onOpenDemoModal={function(): void {
        throw new Error("Function not implemented.");
    } } />);

    const componentsLink = screen.getByRole('link', { name: /explore components/i });
    expect(componentsLink).toHaveAttribute('href', '/dev');
  });

  it('displays test coverage stats', () => {
    render(<HeroSection onOpenDemoModal={function(): void {
        throw new Error("Function not implemented.");
    } } />);

    const coverageTexts = screen.getAllByText('97%');
    expect(coverageTexts.length).toBeGreaterThan(0);

    const testCountTexts = screen.getAllByText('743');
    expect(testCountTexts.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Passing Tests/i)[0]).toBeInTheDocument();

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/Flaky Tests/i)).toBeInTheDocument();
  });

  it('calls onOpenDemoModal when Try Live Demo button is clicked', () => {
    const mockOnOpenDemoModal = jest.fn();
    render(<HeroSection onOpenDemoModal={mockOnOpenDemoModal} />);

    const demoButton = screen.getByRole('button', { name: /try live demo/i });
    fireEvent.click(demoButton);

    expect(mockOnOpenDemoModal).toHaveBeenCalledTimes(1);
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<HeroSection onOpenDemoModal={function(): void {
          throw new Error("Function not implemented.");
      } } />);

      const heading = screen.getAllByRole('heading', { level: 1 })[0];
      expect(heading).toBeInTheDocument();
    });

    it('has proper external link attributes', () => {
      render(<HeroSection onOpenDemoModal={function(): void {
          throw new Error("Function not implemented.");
      } } />);

      const githubLink = screen.getByRole('link', { name: /view on github/i });
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
