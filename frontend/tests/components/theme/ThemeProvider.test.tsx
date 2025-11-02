/**
 * Tests for ThemeProvider
 * Verifies theme state management, localStorage persistence, and system preference detection
 */

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider';

// Test component to access theme context
function TestComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  let mockLocalStorage: { [key: string]: string };
  let mockMatchMedia: jest.Mock;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    // Mock matchMedia
    mockMatchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    // Mock document.documentElement
    document.documentElement.classList.remove('light', 'dark');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('defaults to system theme when no stored preference', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    });

    it('loads stored theme preference from localStorage', async () => {
      mockLocalStorage['theme'] = 'dark';

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });
    });

    it('ignores invalid theme values from localStorage', () => {
      mockLocalStorage['theme'] = 'invalid';

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    });
  });

  describe('Theme Switching', () => {
    it('updates theme when setTheme is called', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const lightButton = screen.getByRole('button', { name: 'Set Light' });

      await act(async () => {
        lightButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
    });

    it('persists theme to localStorage when changed', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const darkButton = screen.getByRole('button', { name: 'Set Dark' });

      await act(async () => {
        darkButton.click();
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
      });
    });
  });

  describe('Resolved Theme', () => {
    it('resolves light theme correctly', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const lightButton = screen.getByRole('button', { name: 'Set Light' });

      await act(async () => {
        lightButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
        expect(document.documentElement.classList.contains('light')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('resolves dark theme correctly', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const darkButton = screen.getByRole('button', { name: 'Set Dark' });

      await act(async () => {
        darkButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });

    it('resolves system theme to light when system prefers light', async () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const systemButton = screen.getByRole('button', { name: 'Set System' });

      await act(async () => {
        systemButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      });
    });

    it('resolves system theme to dark when system prefers dark', async () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const systemButton = screen.getByRole('button', { name: 'Set System' });

      await act(async () => {
        systemButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      });
    });
  });

  describe('DOM Updates', () => {
    it('applies theme class to document element', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const lightButton = screen.getByRole('button', { name: 'Set Light' });

      await act(async () => {
        lightButton.click();
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });

    it('removes previous theme class when switching', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Set to light
      await act(async () => {
        screen.getByRole('button', { name: 'Set Light' }).click();
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      // Switch to dark
      await act(async () => {
        screen.getByRole('button', { name: 'Set Dark' }).click();
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('throws error when useTheme is used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within ThemeProvider');

      consoleError.mockRestore();
    });
  });

  describe('System Preference Changes', () => {
    it('listens to system preference changes', () => {
      const mockAddEventListener = jest.fn();

      mockMatchMedia.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('updates resolved theme when system preference changes', async () => {
      let changeHandler: (() => void) | null = null;
      const mockMediaQueryList = {
        matches: false, // Initially light
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn((event: string, handler: () => void) => {
          if (event === 'change') {
            changeHandler = handler;
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };

      mockMatchMedia.mockImplementation(() => mockMediaQueryList);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Set to system theme
      const systemButton = screen.getByRole('button', { name: 'Set System' });
      await act(async () => {
        systemButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      });

      // Simulate system preference change to dark
      mockMediaQueryList.matches = true;

      await act(async () => {
        if (changeHandler) {
          changeHandler();
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('does not update when system preference changes but theme is not system', async () => {
      let changeHandler: (() => void) | null = null;
      const mockMediaQueryList = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn((event: string, handler: () => void) => {
          if (event === 'change') {
            changeHandler = handler;
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };

      mockMatchMedia.mockImplementation(() => mockMediaQueryList);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Set to explicit light theme
      const lightButton = screen.getByRole('button', { name: 'Set Light' });
      await act(async () => {
        lightButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      });

      // Simulate system preference change to dark (should not affect explicit theme)
      mockMediaQueryList.matches = true;

      await act(async () => {
        if (changeHandler) {
          changeHandler();
        }
      });

      // Should still be light because theme is set to 'light', not 'system'
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('cleans up event listener on unmount', () => {
      const mockRemoveEventListener = jest.fn();

      mockMatchMedia.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: mockRemoveEventListener,
        dispatchEvent: jest.fn(),
      }));

      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});
