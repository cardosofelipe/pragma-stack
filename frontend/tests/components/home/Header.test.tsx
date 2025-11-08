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
  DemoCredentialsModal: ({ open, onClose }: any) => (
    open ? <div data-testid="demo-modal">
      <button onClick={onClose}>Close Modal</button>
    </div> : null
  ),
}));

describe('Header', () => {
  it('renders logo', () => {
    render(<Header />);

    expect(screen.getByText('FastNext')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
  });

  it('logo links to homepage', () => {
    render(<Header />);

    const logoLink = screen.getByRole('link', { name: /fastnext template/i });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  describe('Desktop Navigation', () => {
    it('renders navigation links', () => {
      render(<Header />);

      expect(screen.getByRole('link', { name: 'Components' })).toHaveAttribute('href', '/dev');
      expect(screen.getByRole('link', { name: 'Admin Demo' })).toHaveAttribute('href', '/admin');
    });

    it('renders GitHub link with star badge', () => {
      render(<Header />);

      const githubLinks = screen.getAllByRole('link', { name: /github/i });
      const desktopGithubLink = githubLinks.find(link =>
        link.getAttribute('href')?.includes('github.com')
      );

      expect(desktopGithubLink).toHaveAttribute('href', 'https://github.com/your-org/fast-next-template');
      expect(desktopGithubLink).toHaveAttribute('target', '_blank');
      expect(desktopGithubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders Try Demo button', () => {
      render(<Header />);

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      expect(demoButton).toBeInTheDocument();
    });

    it('renders Login button', () => {
      render(<Header />);

      const loginLinks = screen.getAllByRole('link', { name: /login/i });
      expect(loginLinks.length).toBeGreaterThan(0);
      expect(loginLinks[0]).toHaveAttribute('href', '/login');
    });

    it('opens demo modal when Try Demo button is clicked', () => {
      render(<Header />);

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      fireEvent.click(demoButton);

      expect(screen.getByTestId('demo-modal')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('renders mobile menu toggle button', () => {
      render(<Header />);

      // SheetTrigger wraps the button, so we need to find it by aria-label
      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('mobile menu contains navigation links', () => {
      render(<Header />);

      // Note: SheetContent is hidden by default in tests, but we can verify the links exist
      // The actual mobile menu behavior is tested in E2E tests
      const componentsLinks = screen.getAllByRole('link', { name: /components/i });
      expect(componentsLinks.length).toBeGreaterThan(0);
    });

    it('mobile menu contains GitHub link', () => {
      render(<Header />);

      const githubLinks = screen.getAllByRole('link', { name: /github/i });
      expect(githubLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Demo Modal Integration', () => {
    it('closes demo modal when close is called', () => {
      render(<Header />);

      // Open modal
      const demoButton = screen.getByRole('button', { name: /try demo/i });
      fireEvent.click(demoButton);
      expect(screen.getByTestId('demo-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);
      expect(screen.queryByTestId('demo-modal')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for icon buttons', () => {
      render(<Header />);

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toHaveAccessibleName();
    });

    it('has proper external link attributes', () => {
      render(<Header />);

      const githubLinks = screen.getAllByRole('link', { name: /github/i });
      const externalLink = githubLinks.find(link =>
        link.getAttribute('href')?.includes('github.com')
      );

      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
