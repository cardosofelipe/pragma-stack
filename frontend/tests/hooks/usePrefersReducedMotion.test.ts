/**
 * Tests for usePrefersReducedMotion hook
 * Tests media query detection for accessibility preferences
 */

import { renderHook, act } from '@testing-library/react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

describe('usePrefersReducedMotion', () => {
  let mockMatchMedia: jest.Mock;
  let mockListeners: ((event: MediaQueryListEvent) => void)[];

  beforeEach(() => {
    mockListeners = [];

    mockMatchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mockListeners.push(listener);
        }
      }),
      removeEventListener: jest.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          const index = mockListeners.indexOf(listener);
          if (index > -1) {
            mockListeners.splice(index, 1);
          }
        }
      }),
      dispatchEvent: jest.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when user does not prefer reduced motion', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('returns true when user prefers reduced motion', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it('updates when media query preference changes to true', () => {
    const mockMediaQuery = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: jest.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mockListeners.push(listener);
        }
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      mockListeners.forEach(listener => {
        listener({ matches: true } as MediaQueryListEvent);
      });
    });

    expect(result.current).toBe(true);
  });

  it('updates when media query preference changes to false', () => {
    const mockMediaQuery = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: jest.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mockListeners.push(listener);
        }
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);

    // Simulate media query change
    act(() => {
      mockListeners.forEach(listener => {
        listener({ matches: false } as MediaQueryListEvent);
      });
    });

    expect(result.current).toBe(false);
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = jest.fn();

    const mockMediaQuery = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: jest.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mockListeners.push(listener);
        }
      }),
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { unmount } = renderHook(() => usePrefersReducedMotion());

    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('handles SSR environment safely', () => {
    const originalWindow = global.window;

    // @ts-ignore - Simulating SSR
    delete global.window;

    const { result } = renderHook(() => usePrefersReducedMotion());

    // Should return false in SSR environment
    expect(result.current).toBe(false);

    // Restore window
    global.window = originalWindow;
  });
});
