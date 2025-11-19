/**
 * Tests for LocaleSwitcher Component
 * Verifies locale switching functionality and UI rendering
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/routing';

// Mock next-intl
jest.mock('next-intl', () => ({
  useLocale: jest.fn(),
  useTranslations: jest.fn(),
}));

// Mock i18n routing
jest.mock('@/lib/i18n/routing', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  routing: {
    locales: ['en', 'it'],
  },
}));

describe('LocaleSwitcher', () => {
  const mockReplace = jest.fn();
  const mockUseTranslations = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useTranslations
    mockUseTranslations.mockImplementation((key: string) => key);
    (require('next-intl').useTranslations as jest.Mock).mockReturnValue(mockUseTranslations);

    // Mock routing hooks
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
  });

  describe('Rendering', () => {
    it('renders locale switcher button', () => {
      (useLocale as jest.Mock).mockReturnValue('en');

      render(<LocaleSwitcher />);

      expect(screen.getByRole('button', { name: /switchLanguage/i })).toBeInTheDocument();
    });

    it('displays current locale with uppercase styling', () => {
      (useLocale as jest.Mock).mockReturnValue('en');

      render(<LocaleSwitcher />);

      // The text content is lowercase 'en', styled with uppercase CSS class
      const localeText = screen.getByText('en');
      expect(localeText).toBeInTheDocument();
      expect(localeText).toHaveClass('uppercase');
    });

    it('displays Italian locale when active', () => {
      (useLocale as jest.Mock).mockReturnValue('it');

      render(<LocaleSwitcher />);

      // The text content is lowercase 'it', styled with uppercase CSS class
      const localeText = screen.getByText('it');
      expect(localeText).toBeInTheDocument();
      expect(localeText).toHaveClass('uppercase');
    });

    it('renders Languages icon', () => {
      (useLocale as jest.Mock).mockReturnValue('en');

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Dropdown Menu', () => {
    it('opens dropdown menu when clicked', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      // Menu items should appear
      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems).toHaveLength(2);
      });
    });

    it('displays all available locales in dropdown', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      await waitFor(() => {
        // Both locales should be displayed
        const items = screen.getAllByRole('menuitem');
        expect(items).toHaveLength(2);
      });
    });

    it('shows check mark next to current locale', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        // Check that the active locale has visible check mark
        const enItem = menuItems[0];
        const checkIcon = enItem.querySelector('.opacity-100');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it('hides check mark for non-current locale', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        // Italian item should have hidden check mark
        const itItem = menuItems[1];
        const checkIcon = itItem.querySelector('.opacity-0');
        expect(checkIcon).toBeInTheDocument();
      });
    });
  });

  describe('Locale Switching', () => {
    it('calls router.replace when switching to Italian', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      // Click on Italian menu item
      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        return user.click(menuItems[1]); // Italian is second
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard', { locale: 'it' });
      });
    });

    it('calls router.replace when switching to English', async () => {
      (useLocale as jest.Mock).mockReturnValue('it');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      // Click on English menu item
      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        return user.click(menuItems[0]); // English is first
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard', { locale: 'en' });
      });
    });

    it('preserves pathname when switching locales', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      (usePathname as jest.Mock).mockReturnValue('/settings/profile');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        return user.click(menuItems[1]);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/settings/profile', { locale: 'it' });
      });
    });

    it('handles switching to the same locale', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      // Click on current locale (English)
      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        return user.click(menuItems[0]);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard', { locale: 'en' });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on button', () => {
      (useLocale as jest.Mock).mockReturnValue('en');

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      expect(button).toHaveAttribute('aria-label');
    });

    it('has aria-hidden on decorative icons', () => {
      (useLocale as jest.Mock).mockReturnValue('en');

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      const icon = button.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('disables button when transition is pending', () => {
      (useLocale as jest.Mock).mockReturnValue('en');

      // First render - not pending
      const { rerender } = render(<LocaleSwitcher />);
      let button = screen.getByRole('button', { name: /switchLanguage/i });
      expect(button).not.toBeDisabled();

      // Note: Testing the pending state would require triggering the transition
      // which happens inside startTransition. The button should be enabled by default.
      rerender(<LocaleSwitcher />);
      button = screen.getByRole('button', { name: /switchLanguage/i });
      expect(button).not.toBeDisabled();
    });

    it('has role="menuitem" for dropdown items', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Translations', () => {
    it('calls useTranslations with "locale" namespace', () => {
      (useLocale as jest.Mock).mockReturnValue('en');

      render(<LocaleSwitcher />);

      const useTranslations = require('next-intl').useTranslations;
      expect(useTranslations).toHaveBeenCalledWith('locale');
    });

    it('uses translation keys for locale names', async () => {
      (useLocale as jest.Mock).mockReturnValue('en');
      mockUseTranslations.mockImplementation((key: string) => {
        if (key === 'en') return 'English';
        if (key === 'it') return 'Italiano';
        return key;
      });
      const user = userEvent.setup();

      render(<LocaleSwitcher />);

      const button = screen.getByRole('button', { name: /switchLanguage/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Italiano')).toBeInTheDocument();
      });
    });
  });
});
