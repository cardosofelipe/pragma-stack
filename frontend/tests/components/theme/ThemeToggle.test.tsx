/**
 * Tests for ThemeToggle
 * Verifies theme toggle button functionality and dropdown menu
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useTheme } from '@/components/theme/ThemeProvider';

// Mock theme provider for controlled testing
jest.mock('@/components/theme/ThemeProvider', () => {
  const actual = jest.requireActual('@/components/theme/ThemeProvider');
  return {
    ...actual,
    useTheme: jest.fn(),
  };
});

describe('ThemeToggle', () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock return value
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    });
  });

  describe('Rendering', () => {
    it('renders theme toggle button', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      expect(button).toBeInTheDocument();
    });

    it('displays sun icon when resolved theme is light', () => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        resolvedTheme: 'light',
      });

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      // Sun icon should be visible
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('displays moon icon when resolved theme is dark', () => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        resolvedTheme: 'dark',
      });

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      // Moon icon should be visible
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Dropdown Menu', () => {
    it('opens dropdown menu when button is clicked', async () => {
      const user = userEvent.setup();

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /light/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /dark/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /system/i })).toBeInTheDocument();
      });
    });

    it('calls setTheme with "light" when light option is clicked', async () => {
      const user = userEvent.setup();

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(button);

      const lightOption = await screen.findByRole('menuitem', { name: /light/i });
      await user.click(lightOption);

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('calls setTheme with "dark" when dark option is clicked', async () => {
      const user = userEvent.setup();

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(button);

      const darkOption = await screen.findByRole('menuitem', { name: /dark/i });
      await user.click(darkOption);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('calls setTheme with "system" when system option is clicked', async () => {
      const user = userEvent.setup();

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(button);

      const systemOption = await screen.findByRole('menuitem', { name: /system/i });
      await user.click(systemOption);

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });
  });

  describe('Active Theme Indicator', () => {
    it('shows checkmark for light theme when active', async () => {
      const user = userEvent.setup();

      (useTheme as jest.Mock).mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        resolvedTheme: 'light',
      });

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(button);

      const lightOption = await screen.findByRole('menuitem', { name: /light/i });
      expect(lightOption).toHaveTextContent('✓');
    });

    it('shows checkmark for dark theme when active', async () => {
      const user = userEvent.setup();

      (useTheme as jest.Mock).mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        resolvedTheme: 'dark',
      });

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(button);

      const darkOption = await screen.findByRole('menuitem', { name: /dark/i });
      expect(darkOption).toHaveTextContent('✓');
    });

    it('shows checkmark for system theme when active', async () => {
      const user = userEvent.setup();

      (useTheme as jest.Mock).mockReturnValue({
        theme: 'system',
        setTheme: mockSetTheme,
        resolvedTheme: 'light',
      });

      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(button);

      const systemOption = await screen.findByRole('menuitem', { name: /system/i });
      expect(systemOption).toHaveTextContent('✓');
    });
  });

});
