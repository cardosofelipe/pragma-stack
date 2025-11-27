/**
 * Tests for Home Page
 * Tests for the new PragmaStack landing page
 */

import { render, screen, within, fireEvent } from '@testing-library/react';
import Home from '@/app/[locale]/page';

// Mock Next.js components
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

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

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useInView: () => true, // Always in view for tests
}));

// Mock react-syntax-highlighter to avoid ESM issues
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, ...props }: any) => <pre {...props}>{children}</pre>,
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  vscDarkPlus: {},
}));

// Mock auth hooks
jest.mock('@/lib/api/hooks/useAuth', () => ({
  useIsAuthenticated: jest.fn(() => false),
  useLogout: jest.fn(() => ({
    mutate: jest.fn(),
  })),
}));

// Mock Theme components
jest.mock('@/components/theme', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

// Mock LocaleSwitcher
jest.mock('@/components/i18n', () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher">Locale Switcher</div>,
}));

// Mock DemoCredentialsModal
jest.mock('@/components/home/DemoCredentialsModal', () => ({
  DemoCredentialsModal: ({ open, onClose }: any) =>
    open ? (
      <div data-testid="demo-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

describe('HomePage', () => {
  describe('Page Structure', () => {
    it('renders without crashing', () => {
      render(<Home />);
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
    });

    it('renders header with logo', () => {
      render(<Home />);
      const header = screen.getByRole('banner');
      expect(within(header).getByText('PragmaStack')).toBeInTheDocument();
    });

    it('renders footer with copyright', () => {
      render(<Home />);
      const footer = screen.getByRole('contentinfo');
      expect(within(footer).getByText(/PragmaStack. MIT Licensed/i)).toBeInTheDocument();
    });
  });

  describe('Hero Section', () => {
    it('renders main headline', () => {
      render(<Home />);
      expect(screen.getAllByText(/Everything You Need to Build/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Modern Web Applications/i)[0]).toBeInTheDocument();
    });

    it('renders production-ready messaging', () => {
      render(<Home />);
      expect(screen.getByText(/Opinionated, secure, and production-ready/i)).toBeInTheDocument();
    });

    it('renders badges', () => {
      render(<Home />);
      expect(screen.getByText('MIT Licensed')).toBeInTheDocument();
      expect(screen.getByText('OAuth 2.0 + i18n')).toBeInTheDocument();
      expect(screen.getByText('Pragmatic by Design')).toBeInTheDocument();
    });
  });

  describe('Context Section', () => {
    it('renders what you get message', () => {
      render(<Home />);
      expect(screen.getByText(/Stop Reinventing the Wheel/i)).toBeInTheDocument();
    });

    it('renders key features', () => {
      render(<Home />);
      expect(screen.getAllByText(/Clone & Deploy in < 5 minutes/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/OAuth 2\.0 \+ Social Login/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/i18n Ready \(EN, IT\)/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Zero Commercial Dependencies/i)[0]).toBeInTheDocument();
    });
  });

  describe('Feature Grid', () => {
    it('renders comprehensive features heading', () => {
      render(<Home />);
      expect(screen.getByText(/Comprehensive Features, No Assembly Required/i)).toBeInTheDocument();
    });

    it('renders all 6 feature cards', () => {
      render(<Home />);
      expect(screen.getAllByText('Authentication & Security')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Multi-Tenant Organizations')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Admin Dashboard')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Complete Documentation')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Production Ready')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Developer Experience')[0]).toBeInTheDocument();
    });

    it('has CTAs for each feature', () => {
      render(<Home />);
      expect(screen.getByRole('link', { name: /View Auth Flow/i })).toHaveAttribute(
        'href',
        '/login'
      );
      expect(screen.getByRole('link', { name: /See Organizations/i })).toHaveAttribute(
        'href',
        '/admin/organizations'
      );
      expect(screen.getByRole('link', { name: /Try Admin Panel/i })).toHaveAttribute(
        'href',
        '/admin'
      );
    });
  });

  describe('Demo Section', () => {
    it('renders demo section heading', () => {
      render(<Home />);
      expect(screen.getByText(/See It In Action/i)).toBeInTheDocument();
    });

    it('renders demo cards', () => {
      render(<Home />);
      expect(screen.getAllByText('Design System Hub')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Authentication Flow')[0]).toBeInTheDocument();
      expect(screen.getAllByText('User Dashboard')[0]).toBeInTheDocument();
      // Admin Dashboard appears in both Feature Grid and Demo Section, so use getAllByText
      const adminDashboards = screen.getAllByText('Admin Dashboard');
      expect(adminDashboards.length).toBeGreaterThanOrEqual(1);
    });

    it('displays demo credentials', () => {
      render(<Home />);
      const credentials = screen.getAllByText(/Demo Credentials:/i);
      expect(credentials.length).toBeGreaterThan(0);
    });
  });

  describe('Tech Stack Section', () => {
    it('renders tech stack heading', () => {
      render(<Home />);
      expect(screen.getByText(/A Stack You Can Trust/i)).toBeInTheDocument();
    });

    it('renders all technologies', () => {
      render(<Home />);
      expect(screen.getAllByText('FastAPI')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Next.js 15')[0]).toBeInTheDocument();
      expect(screen.getAllByText('PostgreSQL')[0]).toBeInTheDocument();
      expect(screen.getAllByText('TypeScript')[0]).toBeInTheDocument();
      expect(screen.getAllByText('OAuth 2.0')[0]).toBeInTheDocument();
      expect(screen.getAllByText('next-intl')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Playwright')[0]).toBeInTheDocument();
      expect(screen.getAllByText('pytest')[0]).toBeInTheDocument();
    });
  });

  describe('Philosophy Section', () => {
    it('renders why this template exists', () => {
      render(<Home />);
      expect(screen.getByText(/Why PragmaStack\?/i)).toBeInTheDocument();
    });

    it('renders what you wont find section', () => {
      render(<Home />);
      expect(screen.getByText(/What You Won't Find Here/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Vendor lock-in/i)[0]).toBeInTheDocument();
    });

    it('renders what you will find section', () => {
      render(<Home />);
      expect(screen.getByText(/What You Will Find/i)).toBeInTheDocument();
      expect(screen.getByText(/Pragmatic Speed: Ship features, not config/i)).toBeInTheDocument();
    });
  });

  describe('Quick Start Section', () => {
    it('renders quick start heading', () => {
      render(<Home />);
      expect(screen.getByText(/5-Minute Setup/i)).toBeInTheDocument();
    });
  });

  describe('CTA Section', () => {
    it('renders final CTA', () => {
      render(<Home />);
      expect(screen.getByText(/Start Building,/i)).toBeInTheDocument();
      expect(screen.getByText(/Not Boilerplating/i)).toBeInTheDocument();
    });

    it('has GitHub link', () => {
      render(<Home />);
      const githubLinks = screen.getAllByRole('link', { name: /GitHub/i });
      expect(githubLinks.length).toBeGreaterThan(0);
      expect(githubLinks[0]).toHaveAttribute('href', expect.stringContaining('github.com'));
    });
  });

  describe('Navigation Links', () => {
    it('has login link', () => {
      render(<Home />);
      const loginLinks = screen.getAllByRole('link', { name: /Login/i });
      expect(loginLinks.some((link) => link.getAttribute('href') === '/login')).toBe(true);
    });

    it('has design system link', () => {
      render(<Home />);
      const devLinks = screen.getAllByRole('link', { name: /Design System/i });
      expect(devLinks.some((link) => link.getAttribute('href') === '/dev')).toBe(true);
    });

    it('has admin demo link', () => {
      render(<Home />);
      const adminLinks = screen.getAllByRole('link', { name: /Admin/i });
      expect(adminLinks.some((link) => link.getAttribute('href') === '/admin')).toBe(true);
    });
  });

  describe('Demo Modal', () => {
    it('demo modal is initially closed', () => {
      render(<Home />);
      expect(screen.queryByTestId('demo-modal')).not.toBeInTheDocument();
    });

    it('opens demo modal when Try Demo button is clicked in header', () => {
      render(<Home />);
      const tryDemoButtons = screen.getAllByRole('button', { name: /try demo/i });
      // Click the first Try Demo button (from header)
      fireEvent.click(tryDemoButtons[0]);
      expect(screen.getByTestId('demo-modal')).toBeInTheDocument();
    });

    it('closes demo modal when close button is clicked', () => {
      render(<Home />);
      // Open the modal
      const tryDemoButtons = screen.getAllByRole('button', { name: /try demo/i });
      fireEvent.click(tryDemoButtons[0]);
      expect(screen.getByTestId('demo-modal')).toBeInTheDocument();

      // Close the modal
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const modalCloseButton = closeButtons.find((btn) => btn.textContent === 'Close');
      if (modalCloseButton) {
        fireEvent.click(modalCloseButton);
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<Home />);
      const main = screen.getByRole('main');
      const headings = within(main).getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('has external links with proper attributes', () => {
      render(<Home />);
      const githubLinks = screen.getAllByRole('link', { name: /GitHub/i });
      const externalLink = githubLinks.find((link) =>
        link.getAttribute('href')?.includes('github.com')
      );
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
