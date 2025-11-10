/**
 * Tests for Register Page
 * Smoke tests to verify page structure and component rendering
 */

import { render, screen } from '@testing-library/react';
import RegisterPage from '@/app/(auth)/register/page';

// Mock dynamic import
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_importFn: () => Promise<any>, _options?: any) => {
    const Component = () => <div data-testid="register-form">Mocked RegisterForm</div>;
    Component.displayName = 'RegisterForm';
    return Component;
  },
}));

describe('RegisterPage', () => {
  it('renders without crashing', () => {
    render(<RegisterPage />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  it('renders heading and description', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByText(/get started with your free account today/i)).toBeInTheDocument();
  });

  it('renders RegisterForm component', () => {
    render(<RegisterPage />);

    expect(screen.getByTestId('register-form')).toBeInTheDocument();
  });
});
