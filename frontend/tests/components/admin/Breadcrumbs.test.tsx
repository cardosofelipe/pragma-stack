/**
 * Tests for Breadcrumbs Component
 * Verifies breadcrumb generation, navigation, and accessibility
 */

import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { usePathname } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

describe('Breadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders breadcrumbs container with correct test id', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');

      render(<Breadcrumbs />);

      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    });

    it('renders breadcrumbs with proper aria-label', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');

      render(<Breadcrumbs />);

      const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
      expect(nav).toBeInTheDocument();
    });

    it('returns null for empty pathname', () => {
      (usePathname as jest.Mock).mockReturnValue('');

      const { container } = render(<Breadcrumbs />);

      expect(container.firstChild).toBeNull();
    });

    it('returns null for root pathname', () => {
      (usePathname as jest.Mock).mockReturnValue('/');

      const { container } = render(<Breadcrumbs />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Single Level Navigation', () => {
    it('renders single breadcrumb for /admin', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');

      render(<Breadcrumbs />);

      expect(screen.getByTestId('breadcrumb-admin')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('renders current page without link', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');

      render(<Breadcrumbs />);

      const breadcrumb = screen.getByTestId('breadcrumb-admin');
      expect(breadcrumb.tagName).toBe('SPAN');
      expect(breadcrumb).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Multi-Level Navigation', () => {
    it('renders breadcrumbs for /admin/users', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      expect(screen.getByTestId('breadcrumb-admin')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-users')).toBeInTheDocument();
    });

    it('renders parent breadcrumbs as links', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      const adminBreadcrumb = screen.getByTestId('breadcrumb-admin');
      expect(adminBreadcrumb.tagName).toBe('A');
      expect(adminBreadcrumb).toHaveAttribute('href', '/admin');
    });

    it('renders last breadcrumb as current page', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      const usersBreadcrumb = screen.getByTestId('breadcrumb-users');
      expect(usersBreadcrumb.tagName).toBe('SPAN');
      expect(usersBreadcrumb).toHaveAttribute('aria-current', 'page');
    });

    it('renders breadcrumbs for /admin/organizations', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/organizations');

      render(<Breadcrumbs />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Organizations')).toBeInTheDocument();
    });

    it('renders breadcrumbs for /admin/settings', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/settings');

      render(<Breadcrumbs />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Three-Level Navigation', () => {
    it('renders all levels correctly', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users/123');

      render(<Breadcrumbs />);

      expect(screen.getByTestId('breadcrumb-admin')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-users')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-123')).toBeInTheDocument();
    });

    it('renders all parent links correctly', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users/123');

      render(<Breadcrumbs />);

      const adminBreadcrumb = screen.getByTestId('breadcrumb-admin');
      expect(adminBreadcrumb).toHaveAttribute('href', '/admin');

      const usersBreadcrumb = screen.getByTestId('breadcrumb-users');
      expect(usersBreadcrumb).toHaveAttribute('href', '/admin/users');
    });

    it('renders last level as current page', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users/123');

      render(<Breadcrumbs />);

      const lastBreadcrumb = screen.getByTestId('breadcrumb-123');
      expect(lastBreadcrumb.tagName).toBe('SPAN');
      expect(lastBreadcrumb).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Separator Icons', () => {
    it('renders separator between breadcrumbs', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      const { container } = render(<Breadcrumbs />);

      // ChevronRight icons should be present
      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('does not render separator before first breadcrumb', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');

      const { container } = render(<Breadcrumbs />);

      // No separator icons for single breadcrumb
      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBe(0);
    });

    it('renders correct number of separators', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users/123');

      const { container } = render(<Breadcrumbs />);

      // 3 breadcrumbs = 2 separators
      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBe(2);
    });
  });

  describe('Label Mapping', () => {
    it('uses predefined label for admin', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');

      render(<Breadcrumbs />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('uses predefined label for users', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('uses predefined label for organizations', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/organizations');

      render(<Breadcrumbs />);

      expect(screen.getByText('Organizations')).toBeInTheDocument();
    });

    it('uses predefined label for settings', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/settings');

      render(<Breadcrumbs />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('uses pathname segment for unmapped paths', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/unknown-path');

      render(<Breadcrumbs />);

      expect(screen.getByText('unknown-path')).toBeInTheDocument();
    });

    it('displays numeric IDs as-is', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users/123');

      render(<Breadcrumbs />);

      expect(screen.getByText('123')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct styles to parent links', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      const adminBreadcrumb = screen.getByTestId('breadcrumb-admin');
      expect(adminBreadcrumb).toHaveClass('text-muted-foreground');
      expect(adminBreadcrumb).toHaveClass('hover:text-foreground');
    });

    it('applies correct styles to current page', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      const usersBreadcrumb = screen.getByTestId('breadcrumb-users');
      expect(usersBreadcrumb).toHaveClass('font-medium');
      expect(usersBreadcrumb).toHaveClass('text-foreground');
    });
  });

  describe('Accessibility', () => {
    it('has proper navigation role', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');

      render(<Breadcrumbs />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('has aria-label for navigation', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');

      render(<Breadcrumbs />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('marks current page with aria-current', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      const currentPage = screen.getByTestId('breadcrumb-users');
      expect(currentPage).toHaveAttribute('aria-current', 'page');
    });

    it('marks separator icons as aria-hidden', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      const { container } = render(<Breadcrumbs />);

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('parent breadcrumbs are keyboard accessible', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      const adminLink = screen.getByTestId('breadcrumb-admin');
      expect(adminLink.tagName).toBe('A');
      expect(adminLink).toHaveAttribute('href');
    });
  });
});
