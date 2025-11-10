/**
 * Tests for CTASection component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { CTASection } from '@/components/home/CTASection';

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

// Mock DemoCredentialsModal
jest.mock('@/components/home/DemoCredentialsModal', () => ({
  DemoCredentialsModal: ({ open, onClose }: any) =>
    open ? (
      <div data-testid="demo-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

describe('CTASection', () => {
  it('renders main headline', () => {
    render(
      <CTASection
        onOpenDemoModal={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    expect(screen.getByText(/Start Building,/i)).toBeInTheDocument();
    expect(screen.getByText(/Not Boilerplating/i)).toBeInTheDocument();
  });

  it('renders subtext with key messaging', () => {
    render(
      <CTASection
        onOpenDemoModal={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    expect(screen.getByText(/Clone the repository, read the docs/i)).toBeInTheDocument();
    expect(screen.getByText(/Free forever, MIT licensed/i)).toBeInTheDocument();
  });

  it('renders GitHub CTA button', () => {
    render(
      <CTASection
        onOpenDemoModal={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    const githubLink = screen.getByRole('link', { name: /get started on github/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/your-org/fast-next-template');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Try Live Demo button', () => {
    render(
      <CTASection
        onOpenDemoModal={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    const demoButton = screen.getByRole('button', { name: /try live demo/i });
    expect(demoButton).toBeInTheDocument();
  });

  it('renders Read Documentation link', () => {
    render(
      <CTASection
        onOpenDemoModal={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    const docsLink = screen.getByRole('link', { name: /read documentation/i });
    expect(docsLink).toHaveAttribute(
      'href',
      'https://github.com/your-org/fast-next-template#documentation'
    );
    expect(docsLink).toHaveAttribute('target', '_blank');
    expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders help text with internal links', () => {
    render(
      <CTASection
        onOpenDemoModal={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    expect(screen.getByText(/Need help getting started\?/i)).toBeInTheDocument();

    const componentShowcaseLink = screen.getByRole('link', { name: /component showcase/i });
    expect(componentShowcaseLink).toHaveAttribute('href', '/dev');

    const adminDashboardLink = screen.getByRole('link', { name: /admin dashboard demo/i });
    expect(adminDashboardLink).toHaveAttribute('href', '/admin');
  });

  it('calls onOpenDemoModal when Try Live Demo button is clicked', () => {
    const mockOnOpenDemoModal = jest.fn();
    render(<CTASection onOpenDemoModal={mockOnOpenDemoModal} />);

    const demoButton = screen.getByRole('button', { name: /try live demo/i });
    fireEvent.click(demoButton);

    expect(mockOnOpenDemoModal).toHaveBeenCalledTimes(1);
  });

  describe('Accessibility', () => {
    it('has proper external link attributes', () => {
      render(
        <CTASection
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const externalLinks = [
        screen.getByRole('link', { name: /get started on github/i }),
        screen.getByRole('link', { name: /read documentation/i }),
      ];

      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('has descriptive button text', () => {
      render(
        <CTASection
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      expect(screen.getByRole('button', { name: /try live demo/i })).toBeInTheDocument();
    });
  });
});
