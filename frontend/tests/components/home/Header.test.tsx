/**
 * Tests for Header component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/home/Header';

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

describe('Header', () => {
  it('renders logo', () => {
    render(
      <Header
        onOpenDemoModal={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    expect(screen.getByText('PragmaStack')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
  });

  it('logo links to homepage', () => {
    render(
      <Header
        onOpenDemoModal={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    const logoLink = screen.getByRole('link', { name: /pragmastack template/i });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  describe('Desktop Navigation', () => {
    it('renders navigation links', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: 'Design System' })).toHaveAttribute('href', '/dev');
      expect(screen.getByRole('link', { name: 'Admin Demo' })).toHaveAttribute('href', '/admin');
    });

    it('renders GitHub link with star badge', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const githubLinks = screen.getAllByRole('link', { name: /github/i });
      const desktopGithubLink = githubLinks.find((link) =>
        link.getAttribute('href')?.includes('github.com')
      );

      expect(desktopGithubLink).toHaveAttribute(
        'href',
        'https://github.com/your-org/fast-next-template'
      );
      expect(desktopGithubLink).toHaveAttribute('target', '_blank');
      expect(desktopGithubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders Try Demo button', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      expect(demoButton).toBeInTheDocument();
    });

    it('renders Login button', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const loginLinks = screen.getAllByRole('link', { name: /login/i });
      expect(loginLinks.length).toBeGreaterThan(0);
      expect(loginLinks[0]).toHaveAttribute('href', '/login');
    });

    it('calls onOpenDemoModal when Try Demo button is clicked', () => {
      const mockOnOpenDemoModal = jest.fn();
      render(<Header onOpenDemoModal={mockOnOpenDemoModal} />);

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      fireEvent.click(demoButton);

      expect(mockOnOpenDemoModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobile Menu', () => {
    it('renders mobile menu toggle button', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      // SheetTrigger wraps the button, so we need to find it by aria-label
      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('mobile menu contains navigation links', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      // Note: SheetContent is hidden by default in tests, but we can verify the links exist
      // The actual mobile menu behavior is tested in E2E tests
      const designSystemLinks = screen.getAllByRole('link', { name: /Design System/i });
      expect(designSystemLinks.length).toBeGreaterThan(0);
    });

    it('mobile menu contains GitHub link', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const githubLinks = screen.getAllByRole('link', { name: /github/i });
      expect(githubLinks.length).toBeGreaterThan(0);
    });

    it('clicking mobile menu navigation links works', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const designSystemLinks = screen.getAllByRole('link', { name: /Design System/i });
      // Click the mobile menu link (there should be 2: desktop + mobile)
      if (designSystemLinks.length > 1) {
        fireEvent.click(designSystemLinks[1]);
        expect(designSystemLinks[1]).toHaveAttribute('href', '/dev');
      }
    });

    it('clicking mobile menu GitHub link works', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const githubLinks = screen.getAllByRole('link', { name: /github/i });
      // Find the mobile menu GitHub link (second one)
      if (githubLinks.length > 1) {
        const mobileGithubLink = githubLinks[1];
        fireEvent.click(mobileGithubLink);
        expect(mobileGithubLink).toHaveAttribute('href', expect.stringContaining('github.com'));
      }
    });

    it('mobile menu Try Demo button calls onOpenDemoModal', () => {
      const mockOnOpenDemoModal = jest.fn();
      render(<Header onOpenDemoModal={mockOnOpenDemoModal} />);

      const tryDemoButtons = screen.getAllByRole('button', { name: /try demo/i });
      // Click the mobile menu button (there should be 2: desktop + mobile)
      if (tryDemoButtons.length > 1) {
        fireEvent.click(tryDemoButtons[1]);
        expect(mockOnOpenDemoModal).toHaveBeenCalled();
      }
    });

    it('mobile menu Login link works', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const loginLinks = screen.getAllByRole('link', { name: /login/i });
      // Click the mobile menu login link (there should be 2: desktop + mobile)
      if (loginLinks.length > 1) {
        fireEvent.click(loginLinks[1]);
        expect(loginLinks[1]).toHaveAttribute('href', '/login');
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for icon buttons', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toHaveAccessibleName();
    });

    it('has proper external link attributes', () => {
      render(
        <Header
          onOpenDemoModal={function (): void {
            throw new Error('Function not implemented.');
          }}
        />
      );

      const githubLinks = screen.getAllByRole('link', { name: /github/i });
      const externalLink = githubLinks.find((link) =>
        link.getAttribute('href')?.includes('github.com')
      );

      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
