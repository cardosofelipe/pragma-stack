/**
 * Tests for Login Page
 * Smoke tests to verify page structure and component rendering
 */

import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';

// Mock dynamic import
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_importFn: () => Promise<any>, _options?: any) => {
    const Component = () => <div data-testid="login-form">Mocked LoginForm</div>;
    Component.displayName = 'LoginForm';
    return Component;
  },
}));

describe('LoginPage', () => {
  it('renders without crashing', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('renders heading and description', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByText(/access your dashboard and manage your account/i)).toBeInTheDocument();
  });

  it('renders LoginForm component', () => {
    render(<LoginPage />);

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });
});
