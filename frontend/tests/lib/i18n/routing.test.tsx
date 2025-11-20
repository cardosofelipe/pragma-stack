/**
 * Tests for i18n routing configuration
 */

import { render, screen } from '@testing-library/react';

// Mock next-intl/routing to test our routing configuration
jest.mock('next-intl/routing', () => ({
  defineRouting: jest.fn((config) => config),
}));

// Mock next-intl/navigation to provide test implementations
jest.mock('next-intl/navigation', () => ({
  createNavigation: jest.fn(() => ({
    Link: ({ children, href, ...props }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
    usePathname: () => '/en/test',
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }),
  })),
}));

// Import after mocks are set up
import { routing, Link, usePathname, useRouter } from '@/lib/i18n/routing';

describe('i18n routing', () => {
  it('exposes supported locales and defaultLocale', () => {
    expect(routing.locales).toEqual(['en', 'it']);
    expect(routing.defaultLocale).toBe('en');
    // Using "always" strategy for clarity
    expect(routing.localePrefix).toBe('always');
  });

  it('provides Link wrapper that preserves href', () => {
    render(
      <Link href="/en/about" data-testid="test-link">
        About
      </Link>
    );
    const el = screen.getByTestId('test-link') as HTMLAnchorElement;
    expect(el.tagName).toBe('A');
    expect(el.getAttribute('href')).toBe('/en/about');
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('provides navigation hooks', () => {
    // Test component that uses the hooks
    function TestComponent() {
      const pathname = usePathname();
      const router = useRouter();
      return (
        <div>
          <span data-testid="pathname">{pathname}</span>
          <button data-testid="push-btn" onClick={() => router.push('/test')}>
            Push
          </button>
          <button data-testid="replace-btn" onClick={() => router.replace('/test')}>
            Replace
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // Verify hooks work within component
    expect(screen.getByTestId('pathname')).toHaveTextContent('/en/test');
    expect(screen.getByTestId('push-btn')).toBeInTheDocument();
    expect(screen.getByTestId('replace-btn')).toBeInTheDocument();
  });
});
