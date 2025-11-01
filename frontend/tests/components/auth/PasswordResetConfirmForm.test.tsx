/**
 * Tests for PasswordResetConfirmForm component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PasswordResetConfirmForm } from '@/components/auth/PasswordResetConfirmForm';

// Mock the usePasswordResetConfirm hook
const mockMutateAsync = jest.fn();
const mockUsePasswordResetConfirm = jest.fn(() => ({
  mutateAsync: mockMutateAsync,
  mutate: jest.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  isIdle: true,
  error: null,
  data: undefined,
  status: 'idle' as const,
  variables: undefined,
  reset: jest.fn(),
  context: undefined,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  submittedAt: 0,
}));

jest.mock('@/lib/api/hooks/useAuth', () => ({
  usePasswordResetConfirm: () => mockUsePasswordResetConfirm(),
}));

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

  beforeEach(() => {
    mockMutateAsync.mockClear();
    mockUsePasswordResetConfirm.mockClear();
  });

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

  describe('Form submission', () => {
    it('calls mutateAsync with token and new_password on valid submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetConfirmForm token={mockToken} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          token: mockToken,
          new_password: 'NewPassword123',
        });
      });
    });

    it('does not include confirm_password in API request', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetConfirmForm token={mockToken} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
        const callArgs = mockMutateAsync.mock.calls[0][0];
        expect(callArgs).not.toHaveProperty('confirm_password');
      });
    });

    it('displays success message after successful submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetConfirmForm token={mockToken} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/your password has been successfully reset/i)).toBeInTheDocument();
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetConfirmForm token={mockToken} />, {
        wrapper: createWrapper(),
      });

      const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
      const confirmInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement;

      await user.type(passwordInput, 'NewPassword123');
      await user.type(confirmInput, 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(passwordInput.value).toBe('');
        expect(confirmInput.value).toBe('');
      });
    });

    it('calls onSuccess callback after successful submission', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetConfirmForm token={mockToken} onSuccess={onSuccess} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('displays general error message from API', async () => {
      const user = userEvent.setup();
      const apiError = [
        {
          code: 'AUTH_003',
          message: 'Invalid or expired token',
        },
      ];
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<PasswordResetConfirmForm token={mockToken} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired token')).toBeInTheDocument();
      });
    });

    it('displays field-specific errors from API', async () => {
      const user = userEvent.setup();
      const apiError = [
        {
          code: 'VAL_003',
          message: 'Password does not meet requirements',
          field: 'new_password',
        },
      ];
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<PasswordResetConfirmForm token={mockToken} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('Password does not meet requirements')).toBeInTheDocument();
      });
    });

    it('displays generic error for unexpected error format', async () => {
      const user = userEvent.setup();
      const unexpectedError = new Error('Network error');
      mockMutateAsync.mockRejectedValueOnce(unexpectedError);

      render(<PasswordResetConfirmForm token={mockToken} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });

    it('clears success message on new submission', async () => {
      const user = userEvent.setup();
      // First submission succeeds
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetConfirmForm token={mockToken} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewPassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/your password has been successfully reset/i)).toBeInTheDocument();
      });

      // Second submission with error
      mockMutateAsync.mockRejectedValueOnce([
        { code: 'AUTH_003', message: 'Invalid or expired token' },
      ]);

      await user.type(screen.getByLabelText(/new password/i), 'AnotherPassword456');
      await user.type(screen.getByLabelText(/confirm password/i), 'AnotherPassword456');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.queryByText(/your password has been successfully reset/i)).not.toBeInTheDocument();
        expect(screen.getByText('Invalid or expired token')).toBeInTheDocument();
      });
    });
  });
});
