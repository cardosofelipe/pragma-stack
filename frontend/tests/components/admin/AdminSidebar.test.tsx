/**
 * Tests for AdminSidebar Component
 * Verifies navigation, active states, collapsible behavior, and user info display
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/lib/auth/AuthContext';
import { mockUsePathname } from 'next-intl/navigation';
import type { User } from '@/lib/stores/authStore';

// Mock dependencies
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Helper to create mock user
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    phone_number: null,
    is_active: true,
    is_superuser: true,
    created_at: new Date().toISOString(),
    updated_at: null,
    ...overrides,
  };
}

describe('AdminSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/admin');
    (useAuth as unknown as jest.Mock).mockReturnValue({
      user: createMockUser(),
    });
  });

  describe('Rendering', () => {
    it('renders sidebar with admin panel title', () => {
      render(<AdminSidebar />);
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('renders sidebar with correct test id', () => {
      render(<AdminSidebar />);
      expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
    });

    it('renders all navigation items', () => {
      render(<AdminSidebar />);

      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-users')).toBeInTheDocument();
      expect(screen.getByTestId('nav-organizations')).toBeInTheDocument();
      expect(screen.getByTestId('nav-settings')).toBeInTheDocument();
    });

    it('renders navigation items with correct hrefs', () => {
      render(<AdminSidebar />);

      expect(screen.getByTestId('nav-dashboard')).toHaveAttribute('href', '/admin');
      expect(screen.getByTestId('nav-users')).toHaveAttribute('href', '/admin/users');
      expect(screen.getByTestId('nav-organizations')).toHaveAttribute(
        'href',
        '/admin/organizations'
      );
      expect(screen.getByTestId('nav-settings')).toHaveAttribute('href', '/admin/settings');
    });

    it('renders navigation items with text labels', () => {
      render(<AdminSidebar />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Organizations')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders collapse toggle button', () => {
      render(<AdminSidebar />);

      const toggleButton = screen.getByTestId('sidebar-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', 'Collapse sidebar');
    });
  });

  describe('Active State Highlighting', () => {
    it('highlights dashboard link when on /admin', () => {
      mockUsePathname.mockReturnValue('/admin');

      render(<AdminSidebar />);

      const dashboardLink = screen.getByTestId('nav-dashboard');
      expect(dashboardLink).toHaveClass('bg-accent');
    });

    it('highlights users link when on /admin/users', () => {
      mockUsePathname.mockReturnValue('/admin/users');

      render(<AdminSidebar />);

      const usersLink = screen.getByTestId('nav-users');
      expect(usersLink).toHaveClass('bg-accent');
    });

    it('highlights users link when on /admin/users/123', () => {
      mockUsePathname.mockReturnValue('/admin/users/123');

      render(<AdminSidebar />);

      const usersLink = screen.getByTestId('nav-users');
      expect(usersLink).toHaveClass('bg-accent');
    });

    it('highlights organizations link when on /admin/organizations', () => {
      mockUsePathname.mockReturnValue('/admin/organizations');

      render(<AdminSidebar />);

      const orgsLink = screen.getByTestId('nav-organizations');
      expect(orgsLink).toHaveClass('bg-accent');
    });

    it('highlights settings link when on /admin/settings', () => {
      mockUsePathname.mockReturnValue('/admin/settings');

      render(<AdminSidebar />);

      const settingsLink = screen.getByTestId('nav-settings');
      expect(settingsLink).toHaveClass('bg-accent');
    });

    it('does not highlight dashboard when on other admin routes', () => {
      mockUsePathname.mockReturnValue('/admin/users');

      render(<AdminSidebar />);

      const dashboardLink = screen.getByTestId('nav-dashboard');
      expect(dashboardLink).not.toHaveClass('bg-accent');
      expect(dashboardLink).toHaveClass('text-muted-foreground');
    });
  });

  describe('Collapsible Behavior', () => {
    it('starts in expanded state', () => {
      render(<AdminSidebar />);

      // Title should be visible in expanded state
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();

      // Navigation labels should be visible
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('collapses when toggle button is clicked', async () => {
      const user = userEvent.setup();

      render(<AdminSidebar />);

      const toggleButton = screen.getByTestId('sidebar-toggle');
      await user.click(toggleButton);

      // Title should be hidden when collapsed
      await waitFor(() => {
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
      });

      // Button aria-label should update
      expect(toggleButton).toHaveAttribute('aria-label', 'Expand sidebar');
    });

    it('expands when toggle button is clicked twice', async () => {
      const user = userEvent.setup();

      render(<AdminSidebar />);

      const toggleButton = screen.getByTestId('sidebar-toggle');

      // Collapse
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
      });

      // Expand
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      });

      expect(toggleButton).toHaveAttribute('aria-label', 'Collapse sidebar');
    });

    it('adds title attribute to links when collapsed', async () => {
      const user = userEvent.setup();

      render(<AdminSidebar />);

      const dashboardLink = screen.getByTestId('nav-dashboard');

      // No title in expanded state
      expect(dashboardLink).not.toHaveAttribute('title');

      // Click to collapse
      const toggleButton = screen.getByTestId('sidebar-toggle');
      await user.click(toggleButton);

      // Title should be present in collapsed state
      await waitFor(() => {
        expect(dashboardLink).toHaveAttribute('title', 'Dashboard');
      });
    });

    it('hides navigation labels when collapsed', async () => {
      const user = userEvent.setup();

      render(<AdminSidebar />);

      const toggleButton = screen.getByTestId('sidebar-toggle');
      await user.click(toggleButton);

      await waitFor(() => {
        // Labels should not be visible (checking specific span text)
        const dashboardSpan = screen.queryByText('Dashboard');
        const usersSpan = screen.queryByText('Users');
        const orgsSpan = screen.queryByText('Organizations');
        const settingsSpan = screen.queryByText('Settings');

        expect(dashboardSpan).not.toBeInTheDocument();
        expect(usersSpan).not.toBeInTheDocument();
        expect(orgsSpan).not.toBeInTheDocument();
        expect(settingsSpan).not.toBeInTheDocument();
      });
    });
  });

  describe('User Info Display', () => {
    it('displays user info when expanded', () => {
      (useAuth as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
        }),
      });

      render(<AdminSidebar />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('displays user initial from first name', () => {
      (useAuth as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: 'Alice',
          last_name: 'Smith',
        }),
      });

      render(<AdminSidebar />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('displays email initial when no first name', () => {
      (useAuth as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: '',
          email: 'test@example.com',
        }),
      });

      render(<AdminSidebar />);

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('hides user info when collapsed', async () => {
      const user = userEvent.setup();

      (useAuth as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
        }),
      });

      render(<AdminSidebar />);

      // User info should be visible initially
      expect(screen.getByText('John Doe')).toBeInTheDocument();

      // Collapse sidebar
      const toggleButton = screen.getByTestId('sidebar-toggle');
      await user.click(toggleButton);

      // User info should be hidden
      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.queryByText('john.doe@example.com')).not.toBeInTheDocument();
      });
    });

    it('does not render user info when user is null', () => {
      (useAuth as unknown as jest.Mock).mockReturnValue({
        user: null,
      });

      render(<AdminSidebar />);

      // User info section should not be present
      expect(screen.queryByText(/admin@example.com/i)).not.toBeInTheDocument();
    });

    it('truncates long user names', () => {
      (useAuth as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: 'VeryLongFirstName',
          last_name: 'VeryLongLastName',
          email: 'verylongemail@example.com',
        }),
      });

      render(<AdminSidebar />);

      const nameElement = screen.getByText('VeryLongFirstName VeryLongLastName');
      expect(nameElement).toHaveClass('truncate');

      const emailElement = screen.getByText('verylongemail@example.com');
      expect(emailElement).toHaveClass('truncate');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on toggle button', () => {
      render(<AdminSidebar />);

      const toggleButton = screen.getByTestId('sidebar-toggle');
      expect(toggleButton).toHaveAttribute('aria-label', 'Collapse sidebar');
    });

    it('updates aria-label when collapsed', async () => {
      const user = userEvent.setup();

      render(<AdminSidebar />);

      const toggleButton = screen.getByTestId('sidebar-toggle');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(toggleButton).toHaveAttribute('aria-label', 'Expand sidebar');
      });
    });

    it('navigation links are keyboard accessible', () => {
      render(<AdminSidebar />);

      const dashboardLink = screen.getByTestId('nav-dashboard');
      const usersLink = screen.getByTestId('nav-users');

      expect(dashboardLink.tagName).toBe('A');
      expect(usersLink.tagName).toBe('A');
    });
  });
});
