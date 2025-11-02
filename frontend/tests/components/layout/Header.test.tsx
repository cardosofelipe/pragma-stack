/**
 * Tests for Header Component
 * Verifies navigation, user menu, and auth-based rendering
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '@/lib/api/hooks/useAuth';
import { usePathname } from 'next/navigation';
import type { User } from '@/stores/authStore';

// Mock dependencies
jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/lib/api/hooks/useAuth', () => ({
  useLogout: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/components/theme', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

// Helper to create mock user
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone_number: null,
    is_active: true,
    is_superuser: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    ...overrides,
  };
}

describe('Header', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (usePathname as jest.Mock).mockReturnValue('/');

    (useLogout as jest.Mock).mockReturnValue({
      mutate: mockLogout,
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('renders header with logo', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser(),
      });

      render(<Header />);

      expect(screen.getByText('FastNext')).toBeInTheDocument();
    });

    it('renders theme toggle', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser(),
      });

      render(<Header />);

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('renders user avatar with initials', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: 'John',
          last_name: 'Doe',
        }),
      });

      render(<Header />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders user avatar with single initial when no last name', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: 'John',
          last_name: null,
        }),
      });

      render(<Header />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('renders default initial when no first name', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: '',
        }),
      });

      render(<Header />);

      expect(screen.getByText('U')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('renders home link', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser(),
      });

      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('renders admin link for superusers', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({ is_superuser: true }),
      });

      render(<Header />);

      const adminLink = screen.getByRole('link', { name: /admin/i });
      expect(adminLink).toHaveAttribute('href', '/admin');
    });

    it('does not render admin link for regular users', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({ is_superuser: false }),
      });

      render(<Header />);

      const adminLinks = screen.queryAllByRole('link', { name: /admin/i });
      // Filter out the one in the dropdown menu
      const navAdminLinks = adminLinks.filter(
        (link) => !link.closest('[role="menu"]')
      );
      expect(navAdminLinks).toHaveLength(0);
    });

    it('highlights active navigation link', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({ is_superuser: true }),
      });

      render(<Header />);

      const adminLink = screen.getByRole('link', { name: /admin/i });
      expect(adminLink).toHaveClass('bg-primary');
    });
  });

  describe('User Dropdown Menu', () => {
    it('opens dropdown when avatar is clicked', async () => {
      const user = userEvent.setup();

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        }),
      });

      render(<Header />);

      // Find avatar button by looking for the button containing the avatar initials
      const avatarButton = screen.getByText('JD').closest('button')!;
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('displays user info in dropdown', async () => {
      const user = userEvent.setup();

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        }),
      });

      render(<Header />);

      const avatarButton = screen.getByText('JD').closest('button')!;
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('includes profile link in dropdown', async () => {
      const user = userEvent.setup();

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser(),
      });

      render(<Header />);

      const avatarButton = screen.getByText('TU').closest('button')!;
      await user.click(avatarButton);

      const profileLink = await screen.findByRole('menuitem', { name: /profile/i });
      expect(profileLink).toHaveAttribute('href', '/settings/profile');
    });

    it('includes settings link in dropdown', async () => {
      const user = userEvent.setup();

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser(),
      });

      render(<Header />);

      const avatarButton = screen.getByText('TU').closest('button')!;
      await user.click(avatarButton);

      const settingsLink = await screen.findByRole('menuitem', { name: /settings/i });
      expect(settingsLink).toHaveAttribute('href', '/settings/password');
    });

    it('includes admin panel link for superusers', async () => {
      const user = userEvent.setup();

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({ is_superuser: true }),
      });

      render(<Header />);

      const avatarButton = screen.getByText('TU').closest('button')!;
      await user.click(avatarButton);

      const adminLink = await screen.findByRole('menuitem', { name: /admin panel/i });
      expect(adminLink).toHaveAttribute('href', '/admin');
    });

    it('does not include admin panel link for regular users', async () => {
      const user = userEvent.setup();

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser({ is_superuser: false }),
      });

      render(<Header />);

      const avatarButton = screen.getByText('TU').closest('button')!;
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /admin panel/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Logout Functionality', () => {
    it('calls logout when logout button is clicked', async () => {
      const user = userEvent.setup();

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser(),
      });

      render(<Header />);

      const avatarButton = screen.getByText('TU').closest('button')!;
      await user.click(avatarButton);

      const logoutButton = await screen.findByRole('menuitem', { name: /log out/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when logging out', async () => {
      const user = userEvent.setup();

      (useLogout as jest.Mock).mockReturnValue({
        mutate: mockLogout,
        isPending: true,
      });

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser(),
      });

      render(<Header />);

      const avatarButton = screen.getByText('TU').closest('button')!;
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('Logging out...')).toBeInTheDocument();
      });
    });

    it('disables logout button when logging out', async () => {
      const user = userEvent.setup();

      (useLogout as jest.Mock).mockReturnValue({
        mutate: mockLogout,
        isPending: true,
      });

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: createMockUser(),
      });

      render(<Header />);

      const avatarButton = screen.getByText('TU').closest('button')!;
      await user.click(avatarButton);

      const logoutButton = await screen.findByRole('menuitem', { name: /logging out/i });
      expect(logoutButton).toHaveAttribute('data-disabled');
    });
  });
});
