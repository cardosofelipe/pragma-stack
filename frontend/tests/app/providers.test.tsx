/**
 * Tests for Providers Component
 * Verifies React Query and Theme providers are configured correctly
 */

import { render, screen } from '@testing-library/react';
import { Providers } from '@/app/providers';

// Mock components
jest.mock('@/components/theme', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

jest.mock('@/components/auth', () => ({
  AuthInitializer: () => <div data-testid="auth-initializer" />,
}));

// Mock TanStack Query
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-provider">{children}</div>
  ),
}));

describe('Providers', () => {
  it('renders without crashing', () => {
    render(
      <Providers>
        <div>Test Content</div>
      </Providers>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('wraps children with ThemeProvider', () => {
    render(
      <Providers>
        <div>Test Content</div>
      </Providers>
    );

    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
  });

  it('wraps children with QueryClientProvider', () => {
    render(
      <Providers>
        <div>Test Content</div>
      </Providers>
    );

    expect(screen.getByTestId('query-provider')).toBeInTheDocument();
  });

  it('renders AuthInitializer', () => {
    render(
      <Providers>
        <div>Test Content</div>
      </Providers>
    );

    expect(screen.getByTestId('auth-initializer')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Providers>
        <div data-testid="test-child">Child Component</div>
      </Providers>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });
});
