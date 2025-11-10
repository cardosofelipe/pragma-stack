/**
 * Tests for Password Reset Page
 * Smoke tests to verify page structure and component rendering
 */

import { render, screen } from '@testing-library/react';
import PasswordResetPage from '@/app/(auth)/password-reset/page';

// Mock dynamic import
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_importFn: () => Promise<any>, _options?: any) => {
    const Component = () => <div data-testid="password-reset-form">Mocked PasswordResetRequestForm</div>;
    Component.displayName = 'PasswordResetRequestForm';
    return Component;
  },
}));

describe('PasswordResetPage', () => {
  it('renders without crashing', () => {
    render(<PasswordResetPage />);
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
  });

  it('renders heading and description', () => {
    render(<PasswordResetPage />);

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByText(/we'll send you an email with instructions/i)).toBeInTheDocument();
  });

  it('renders PasswordResetRequestForm component', () => {
    render(<PasswordResetPage />);

    expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
  });
});
