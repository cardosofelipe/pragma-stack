/**
 * Tests for RegisterForm component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterForm } from '@/components/auth/RegisterForm';

// Mock the useRegister hook
const mockMutateAsync = jest.fn();
const mockUseRegister = jest.fn(() => ({
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
  useRegister: () => mockUseRegister(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/stores/authStore', () => ({
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
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('RegisterForm', () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
    mockUseRegister.mockClear();
  });

  it('renders registration form with all fields', () => {
    render(<RegisterForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows password strength indicators', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(passwordInput, 'a');

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/contains a number/i)).toBeInTheDocument();
      expect(screen.getByText(/contains an uppercase letter/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation matches', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const firstNameInput = screen.getByLabelText(/first name/i);
    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    await user.type(firstNameInput, 'Test');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmInput, 'Different123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows login link when enabled', () => {
    render(<RegisterForm showLoginLink />, { wrapper: createWrapper() });

    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('marks first name and email as required with asterisk', () => {
    render(<RegisterForm />, { wrapper: createWrapper() });

    const labels = screen.getAllByText('*');
    expect(labels.length).toBeGreaterThan(0);
  });

  describe('Form submission', () => {
    it('calls mutateAsync with form data on valid submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<RegisterForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'Password123',
        });
      });
    });

    it('excludes confirmPassword from API request', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<RegisterForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
        const callArgs = mockMutateAsync.mock.calls[0][0];
        expect(callArgs).not.toHaveProperty('confirmPassword');
      });
    });

    it('calls onSuccess callback after successful registration', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      mockMutateAsync.mockResolvedValueOnce(undefined);

      render(<RegisterForm onSuccess={onSuccess} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('displays general error message from API', async () => {
      const user = userEvent.setup();
      const apiError = [
        {
          code: 'USER_002',
          message: 'This email is already registered',
        },
      ];
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<RegisterForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/^email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('This email is already registered')).toBeInTheDocument();
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
      ];
      mockMutateAsync.mockRejectedValueOnce(apiError);

      render(<RegisterForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('displays generic error for unexpected error format', async () => {
      const user = userEvent.setup();
      const unexpectedError = new Error('Network error');
      mockMutateAsync.mockRejectedValueOnce(unexpectedError);

      render(<RegisterForm />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });
  });
});
