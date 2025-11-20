/**
 * Tests for i18n routing configuration
 */

import { routing, Link, usePathname, useRouter, redirect } from '@/lib/i18n/routing';
import { render, screen } from '@testing-library/react';

describe('i18n routing', () => {
  it('exposes supported locales and defaultLocale', () => {
    expect(routing.locales).toEqual(['en', 'it']);
    expect(routing.defaultLocale).toBe('en');
    // Using "always" strategy for clarity (property exists in the config object)
    // @ts-expect-error typed export may not include localePrefix
    expect(routing.localePrefix).toBe('always');
  });

  it('provides Link wrapper that preserves href and children', () => {
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

  it('provides navigation hooks and redirect function', () => {
    const pathname = usePathname();
    const router = useRouter();

    expect(pathname).toBe('/en/test');
    expect(typeof redirect).toBe('function');
    expect(router).toEqual(
      expect.objectContaining({ push: expect.any(Function), replace: expect.any(Function) })
    );
  });
});
