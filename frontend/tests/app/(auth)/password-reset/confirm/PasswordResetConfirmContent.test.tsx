/**
 * Tests for Password Reset Confirm Content Component
 * Verifies token validation and form rendering
 */

import { render, screen, act } from '@testing-library/react';
import { useSearchParams, useRouter } from 'next/navigation';
import PasswordResetConfirmContent from '@/app/(auth)/password-reset/confirm/PasswordResetConfirmContent';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
  default: jest.fn(),
}));

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock dynamic import
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_importFn: () => Promise<any>, _options?: any) => {
    const Component = ({ onSuccess }: { onSuccess?: () => void }) => (
      <div data-testid="password-reset-confirm-form">
        <button onClick={onSuccess}>Submit</button>
      </div>
    );
    Component.displayName = 'PasswordResetConfirmForm';
    return Component;
  },
}));

// Mock Alert component
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('PasswordResetConfirmContent', () => {
  let mockPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('With valid token', () => {
    beforeEach(() => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: jest.fn((key: string) => (key === 'token' ? 'valid-token-123' : null)),
      });
    });

    it('renders without crashing', () => {
      render(<PasswordResetConfirmContent />);
      expect(screen.getByText('Set new password')).toBeInTheDocument();
    });

    it('renders heading and description', () => {
      render(<PasswordResetConfirmContent />);

      expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      expect(screen.getByText(/choose a strong password/i)).toBeInTheDocument();
    });

    it('renders PasswordResetConfirmForm with token', () => {
      render(<PasswordResetConfirmContent />);

      expect(screen.getByTestId('password-reset-confirm-form')).toBeInTheDocument();
    });

    it('redirects to login after successful password reset', () => {
      render(<PasswordResetConfirmContent />);

      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Trigger success handler
      act(() => {
        submitButton.click();
      });

      // Fast-forward time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('cleans up timeout on unmount', () => {
      const { unmount } = render(<PasswordResetConfirmContent />);

      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Trigger success handler
      act(() => {
        submitButton.click();
      });

      // Unmount before timeout fires
      unmount();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should not redirect because component was unmounted
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Without token', () => {
    beforeEach(() => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: jest.fn(() => null),
      });
    });

    it('shows invalid reset link error', () => {
      render(<PasswordResetConfirmContent />);

      expect(screen.getByRole('heading', { name: /invalid reset link/i })).toBeInTheDocument();
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });

    it('shows error message', () => {
      render(<PasswordResetConfirmContent />);

      expect(
        screen.getByText(/this password reset link is invalid or has expired/i)
      ).toBeInTheDocument();
    });

    it('shows link to request new reset', () => {
      render(<PasswordResetConfirmContent />);

      const link = screen.getByRole('link', { name: /request new reset link/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/password-reset');
    });

    it('does not render form when token is missing', () => {
      render(<PasswordResetConfirmContent />);

      expect(screen.queryByTestId('password-reset-confirm-form')).not.toBeInTheDocument();
    });
  });
});
