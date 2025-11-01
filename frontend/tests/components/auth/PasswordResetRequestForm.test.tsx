/**
 * Tests for PasswordResetRequestForm component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PasswordResetRequestForm } from '@/components/auth/PasswordResetRequestForm';

// Mock the usePasswordResetRequest hook
const mockMutateAsync = jest.fn();
const mockUsePasswordResetRequest = jest.fn(() => ({
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
  usePasswordResetRequest: () => mockUsePasswordResetRequest(),
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

describe('PasswordResetRequestForm', () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
    mockUsePasswordResetRequest.mockClear();
  });

  it('renders password reset form with email field', () => {
    render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send reset instructions/i })
    ).toBeInTheDocument();
  });

  it('shows validation error for empty email', async () => {
    const user = userEvent.setup();
    render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', {
      name: /send reset instructions/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  // Note: Email validation is primarily handled by HTML5 type="email" attribute
  // Zod provides additional validation layer

  it('shows instructions text', () => {
    render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

    expect(
      screen.getByText(/enter your email address and we'll send you instructions/i)
    ).toBeInTheDocument();
  });

  it('shows login link when enabled', () => {
    render(<PasswordResetRequestForm showLoginLink />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/remember your password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to login/i })
    ).toBeInTheDocument();
  });

  it('marks email field as required with asterisk', () => {
    render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

    const labels = screen.getAllByText('*');
    expect(labels.length).toBeGreaterThan(0);
  });

  describe('Form submission', () => {
    it('calls mutateAsync with email on valid submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({ email: 'test@example.com' });
      });
    });

    it('displays success message after successful submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(screen.getByText(/password reset instructions have been sent/i)).toBeInTheDocument();
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(emailInput.value).toBe('');
      });
    });

    it('calls onSuccess callback after successful submission', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetRequestForm onSuccess={onSuccess} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('displays general error message from API', async () => {
      const user = userEvent.setup();
      const apiError = [
        {
          code: 'USER_001',
          message: 'User not found',
        },
      ];
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/email/i), 'notfound@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument();
      });
    });

    it('displays field-specific errors from API', async () => {
      const user = userEvent.setup();
      const apiError = [
        {
          code: 'VAL_002',
          message: 'Invalid email format',
          field: 'email',
        },
      ];
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('displays generic error for unexpected error format', async () => {
      const user = userEvent.setup();
      const unexpectedError = new Error('Network error');
      mockMutateAsync.mockRejectedValueOnce(unexpectedError);

      render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });

    it('clears success message on new submission', async () => {
      const user = userEvent.setup();
      // First submission succeeds
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(screen.getByText(/password reset instructions have been sent/i)).toBeInTheDocument();
      });

      // Second submission with error
      mockMutateAsync.mockRejectedValueOnce([{ code: 'USER_001', message: 'User not found' }]);

      await user.type(emailInput, 'another@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(screen.queryByText(/password reset instructions have been sent/i)).not.toBeInTheDocument();
        expect(screen.getByText('User not found')).toBeInTheDocument();
      });
    });
  });
});
