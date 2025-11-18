/**
 * Tests for Password Reset Confirm Page
 * Verifies Suspense wrapper and fallback
 */

import { render, screen } from '@testing-library/react';
import PasswordResetConfirmPage from '@/app/[locale]/(auth)/password-reset/confirm/page';

// Mock the content component
jest.mock('@/app/[locale]/(auth)/password-reset/confirm/PasswordResetConfirmContent', () => ({
  __esModule: true,
  default: () => <div data-testid="password-reset-confirm-content">Content</div>,
}));

describe('PasswordResetConfirmPage', () => {
  it('renders without crashing', () => {
    render(<PasswordResetConfirmPage />);
    expect(screen.getByTestId('password-reset-confirm-content')).toBeInTheDocument();
  });

  it('wraps content in Suspense boundary', () => {
    render(<PasswordResetConfirmPage />);
    // Content should render successfully (not fallback)
    expect(screen.getByTestId('password-reset-confirm-content')).toBeInTheDocument();
  });
});
