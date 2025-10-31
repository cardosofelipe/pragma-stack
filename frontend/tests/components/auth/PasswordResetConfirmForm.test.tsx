/**
 * Tests for PasswordResetConfirmForm component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PasswordResetConfirmForm } from '@/components/auth/PasswordResetConfirmForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PasswordResetConfirmForm', () => {
  const mockToken = 'test-reset-token-123';

  it('renders password reset confirm form with all fields', () => {
    render(<PasswordResetConfirmForm token={mockToken} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reset password/i })
    ).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    render(<PasswordResetConfirmForm token={mockToken} />, {
      wrapper: createWrapper(),
    });

    const submitButton = screen.getByRole('button', { name: /reset password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/new password is required/i)).toBeInTheDocument();
      expect(
        screen.getByText(/please confirm your password/i)
      ).toBeInTheDocument();
    });
  });

  it('shows password strength indicators', async () => {
    const user = userEvent.setup();
    render(<PasswordResetConfirmForm token={mockToken} />, {
      wrapper: createWrapper(),
    });

    const passwordInput = screen.getByLabelText(/new password/i);
    await user.type(passwordInput, 'a');

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/contains a number/i)).toBeInTheDocument();
      expect(screen.getByText(/contains an uppercase letter/i)).toBeInTheDocument();
    });
  });

  it('validates password meets requirements', async () => {
    const user = userEvent.setup();
    render(<PasswordResetConfirmForm token={mockToken} />, {
      wrapper: createWrapper(),
    });

    const passwordInput = screen.getByLabelText(/new password/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });

    await user.type(passwordInput, 'short');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
    });
  });

  it('validates password confirmation matches', async () => {
    const user = userEvent.setup();
    render(<PasswordResetConfirmForm token={mockToken} />, {
      wrapper: createWrapper(),
    });

    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });

    await user.type(passwordInput, 'Password123');
    await user.type(confirmInput, 'Different123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows instructions text', () => {
    render(<PasswordResetConfirmForm token={mockToken} />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByText(/enter your new password below/i)
    ).toBeInTheDocument();
  });

  it('shows login link when enabled', () => {
    render(<PasswordResetConfirmForm token={mockToken} showLoginLink />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/remember your password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to login/i })
    ).toBeInTheDocument();
  });

  // Note: Async submission tests require API mocking with MSW
  // Will be added in Phase 9 (Testing Infrastructure)

  it('marks required fields with asterisk', () => {
    render(<PasswordResetConfirmForm token={mockToken} />, {
      wrapper: createWrapper(),
    });

    const labels = screen.getAllByText('*');
    expect(labels.length).toBeGreaterThanOrEqual(2); // At least 2 required fields
  });

  it('uses provided token in form', () => {
    const { container } = render(
      <PasswordResetConfirmForm token={mockToken} />,
      { wrapper: createWrapper() }
    );

    const hiddenInput = container.querySelector('input[type="hidden"]');
    expect(hiddenInput).toHaveValue(mockToken);
  });
});
