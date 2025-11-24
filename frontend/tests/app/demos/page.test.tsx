/**
 * Tests for Demo Tour Page
 */

import { render, screen, within } from '@testing-library/react';
import DemoTourPage from '@/app/[locale]/demos/page';

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

describe('DemoTourPage', () => {
  describe('Page Structure', () => {
    it('renders without crashing', () => {
      render(<DemoTourPage />);
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('renders header with navigation', () => {
      render(<DemoTourPage />);
      const header = screen.getByRole('banner');
      expect(within(header).getByText('Demo Tour')).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
      expect(within(header).getByRole('link', { name: /start exploring/i })).toHaveAttribute(
        'href',
        '/login'
      );
    });
  });

  describe('Hero Section', () => {
    it('renders hero heading and description', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Explore All Features')).toBeInTheDocument();
      expect(
        screen.getByText(/Try everything with our pre-configured demo accounts/i)
      ).toBeInTheDocument();
    });

    it('renders Interactive Demo badge', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Interactive Demo')).toBeInTheDocument();
    });
  });

  describe('Quick Start Guide', () => {
    it('renders quick start heading', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Quick Start Guide')).toBeInTheDocument();
      expect(screen.getByText('Follow these simple steps to get started')).toBeInTheDocument();
    });

    it('renders all 3 quick start steps', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Choose a Demo')).toBeInTheDocument();
      expect(screen.getByText(/Browse the demo categories below/i)).toBeInTheDocument();

      expect(screen.getByText('Use Credentials')).toBeInTheDocument();
      expect(screen.getByText(/Copy the demo credentials and login/i)).toBeInTheDocument();

      expect(screen.getByText('Explore Freely')).toBeInTheDocument();
      expect(
        screen.getByText(/Test all features - everything resets automatically/i)
      ).toBeInTheDocument();
    });
  });

  describe('Demo Categories', () => {
    it('renders demo categories heading', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Demo Categories')).toBeInTheDocument();
      expect(screen.getByText('Explore different areas of the template')).toBeInTheDocument();
    });

    it('renders Design System Hub category', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Design System Hub')).toBeInTheDocument();
      expect(
        screen.getByText(/Browse components, layouts, spacing, and forms/i)
      ).toBeInTheDocument();
      expect(screen.getByText('All UI components')).toBeInTheDocument();
      expect(screen.getByText('Layout patterns')).toBeInTheDocument();
      expect(screen.getByText('Spacing philosophy')).toBeInTheDocument();
      expect(screen.getByText('Form implementations')).toBeInTheDocument();
    });

    it('renders Authentication System category with credentials', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Authentication System')).toBeInTheDocument();
      expect(screen.getByText(/Test login, registration, password reset/i)).toBeInTheDocument();
      expect(screen.getByText('Login & logout')).toBeInTheDocument();
      expect(screen.getByText('Registration')).toBeInTheDocument();
      expect(screen.getByText('Password reset')).toBeInTheDocument();
      expect(screen.getByText('Session tokens')).toBeInTheDocument();

      // Check for credentials
      const authCards = screen.getAllByText(/demo@example\.com/i);
      expect(authCards.length).toBeGreaterThan(0);
      const demo123 = screen.getAllByText(/DemoPass1234!/i);
      expect(demo123.length).toBeGreaterThan(0);
    });

    it('renders User Features category with credentials', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('User Features')).toBeInTheDocument();
      expect(screen.getByText(/Experience user settings, profile management/i)).toBeInTheDocument();
      expect(screen.getByText('Profile editing')).toBeInTheDocument();
      expect(screen.getByText('Password changes')).toBeInTheDocument();
      expect(screen.getByText('Active sessions')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    it('renders Admin Dashboard category with credentials', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Explore admin panel with user management/i)).toBeInTheDocument();
      expect(screen.getByText('User management')).toBeInTheDocument();
      expect(screen.getByText('Analytics charts')).toBeInTheDocument();
      expect(screen.getByText('Bulk operations')).toBeInTheDocument();
      expect(screen.getByText('Organization control')).toBeInTheDocument();

      // Check for admin credentials
      expect(screen.getByText(/admin@example\.com/i)).toBeInTheDocument();
      expect(screen.getByText(/AdminPass1234!/i)).toBeInTheDocument();
    });

    it('shows Login Required badge for authenticated demos', () => {
      render(<DemoTourPage />);
      const loginRequiredBadges = screen.getAllByText('Login Required');
      // Should be 3: Auth, User Features, Admin Dashboard
      expect(loginRequiredBadges.length).toBe(3);
    });

    it('has working links to each demo category', () => {
      render(<DemoTourPage />);

      // Design System Hub
      const exploreLinks = screen.getAllByRole('link', { name: /explore/i });
      expect(exploreLinks.some((link) => link.getAttribute('href') === '/dev')).toBe(true);

      // Authentication System
      const tryNowLinks = screen.getAllByRole('link', { name: /try now/i });
      expect(tryNowLinks.length).toBeGreaterThan(0);
      expect(tryNowLinks.some((link) => link.getAttribute('href') === '/login')).toBe(true);
      expect(tryNowLinks.some((link) => link.getAttribute('href') === '/settings')).toBe(true);
      expect(tryNowLinks.some((link) => link.getAttribute('href') === '/admin')).toBe(true);
    });
  });

  describe('Suggested Exploration Paths', () => {
    it('renders exploration paths heading', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Suggested Exploration Paths')).toBeInTheDocument();
      expect(screen.getByText('Choose your adventure based on available time')).toBeInTheDocument();
    });

    it('renders Quick Tour path', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Quick Tour (5 min)')).toBeInTheDocument();
      expect(screen.getByText('Browse Design System components')).toBeInTheDocument();
      expect(screen.getByText('Test login flow')).toBeInTheDocument();
      expect(screen.getByText('View user settings')).toBeInTheDocument();
    });

    it('renders Full Experience path', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Full Experience (15 min)')).toBeInTheDocument();
      expect(screen.getByText('Explore all design system pages')).toBeInTheDocument();
      expect(screen.getByText('Try complete auth flow')).toBeInTheDocument();
      expect(screen.getByText('Update profile and password')).toBeInTheDocument();
      expect(screen.getByText('Check active sessions')).toBeInTheDocument();
      expect(screen.getByText('Login as admin and manage users')).toBeInTheDocument();
      expect(screen.getByText('View analytics dashboard')).toBeInTheDocument();
    });

    it('exploration path items have links', () => {
      render(<DemoTourPage />);

      // Quick Tour links
      const devLinks = screen.getAllByRole('link');
      const hasDevLink = devLinks.some((link) => link.getAttribute('href') === '/dev');
      expect(hasDevLink).toBe(true);

      const hasLoginLink = devLinks.some((link) => link.getAttribute('href') === '/login');
      expect(hasLoginLink).toBe(true);

      const hasSettingsLink = devLinks.some((link) => link.getAttribute('href') === '/settings');
      expect(hasSettingsLink).toBe(true);
    });
  });

  describe('Feature Checklist', () => {
    it('renders checklist heading', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('What to Try')).toBeInTheDocument();
      expect(screen.getByText(/Complete checklist of features to explore/i)).toBeInTheDocument();
    });

    it('renders Feature Checklist card', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Feature Checklist')).toBeInTheDocument();
      expect(
        screen.getByText(/Try these features to experience the full power/i)
      ).toBeInTheDocument();
    });

    it('renders all checklist items', () => {
      render(<DemoTourPage />);

      expect(screen.getByText('Browse design system components')).toBeInTheDocument();
      expect(screen.getByText('Test login/logout flow')).toBeInTheDocument();
      expect(screen.getByText('Register a new account')).toBeInTheDocument();
      expect(screen.getByText('Reset password')).toBeInTheDocument();
      expect(screen.getByText('Update user profile')).toBeInTheDocument();
      expect(screen.getByText('Change password')).toBeInTheDocument();
      expect(screen.getByText('View active sessions')).toBeInTheDocument();
      expect(screen.getByText('Login as admin')).toBeInTheDocument();
      expect(screen.getByText('Manage users (admin)')).toBeInTheDocument();
      expect(screen.getByText('View analytics (admin)')).toBeInTheDocument();
      expect(screen.getByText('Perform bulk operations (admin)')).toBeInTheDocument();
      expect(screen.getByText('Explore organizations (admin)')).toBeInTheDocument();
    });
  });

  describe('CTA Section', () => {
    it('renders final CTA heading', () => {
      render(<DemoTourPage />);
      expect(screen.getByText('Ready to Start?')).toBeInTheDocument();
      expect(
        screen.getByText(/Pick a demo category above or jump right into the action/i)
      ).toBeInTheDocument();
    });

    it('has CTA buttons', () => {
      render(<DemoTourPage />);

      const tryAuthLinks = screen.getAllByRole('link', { name: /try authentication flow/i });
      expect(tryAuthLinks.some((link) => link.getAttribute('href') === '/login')).toBe(true);

      const browseDesignLinks = screen.getAllByRole('link', { name: /browse design system/i });
      expect(browseDesignLinks.some((link) => link.getAttribute('href') === '/dev')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<DemoTourPage />);
      const main = screen.getByRole('main');
      const headings = within(main).getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('has proper role attributes', () => {
      render(<DemoTourPage />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('has multiple navigation links throughout the page', () => {
      render(<DemoTourPage />);

      const allLinks = screen.getAllByRole('link');

      // Should have links to: /, /dev, /login, /settings, /admin, and various /settings/* and /admin/* paths
      expect(allLinks.length).toBeGreaterThan(10);

      // Verify key destination paths exist
      const hrefs = allLinks.map((link) => link.getAttribute('href'));
      expect(hrefs).toContain('/');
      expect(hrefs).toContain('/dev');
      expect(hrefs).toContain('/login');
      expect(hrefs).toContain('/settings');
      expect(hrefs).toContain('/admin');
    });
  });
});
