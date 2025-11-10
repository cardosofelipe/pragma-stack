/**
 * Tests for LoginForm component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock the useLogin hook
const mockMutateAsync = jest.fn();
const mockUseLogin = jest.fn(() => ({
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
  useLogin: () => mockUseLogin(),
}));

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock auth store
jest.mock('@/lib/stores/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    setAuth: jest.fn(),
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
    mockUseLogin.mockClear();
  });

  it('renders login form with email and password fields', () => {
    render(<LoginForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows password requirements validation', async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'short');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows register link when enabled', () => {
    render(<LoginForm showRegisterLink />, { wrapper: createWrapper() });

    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('shows password reset link when enabled', () => {
    render(<LoginForm showPasswordResetLink />, { wrapper: createWrapper() });

    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  describe('Form submission', () => {
    it('calls mutateAsync with form data on valid submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<LoginForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
        });
      });
    });

    it('calls onSuccess callback after successful login', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<LoginForm onSuccess={onSuccess} />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('displays general error message from API', async () => {
      const user = userEvent.setup();
      const apiError = [
        {
          code: 'AUTH_001',
          message: 'Invalid credentials',
        },
      ];
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<LoginForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword1');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('displays field-specific errors from API', async () => {
      const user = userEvent.setup();
      const apiError = [
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          field: 'email',
        },
        {
          code: 'VALIDATION_ERROR',
          message: 'Password is too weak',
          field: 'password',
        },
      ];
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<LoginForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
        expect(screen.getByText('Password is too weak')).toBeInTheDocument();
      });
    });

    it('displays generic error for unexpected error format', async () => {
      const user = userEvent.setup();
      const unexpectedError = new Error('Network error');
      mockMutateAsync.mockRejectedValueOnce(unexpectedError);

      render(<LoginForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('clears previous errors on new submission', async () => {
      const user = userEvent.setup();
      const apiError = [
        {
          code: 'AUTH_001',
          message: 'Invalid credentials',
        },
      ];

      // First submission fails
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<LoginForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword1');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Second submission succeeds
      mockMutateAsync.mockResolvedValueOnce(undefined);

      await user.clear(passwordInput);
      await user.type(passwordInput, 'CorrectPassword1');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });
  });
});
