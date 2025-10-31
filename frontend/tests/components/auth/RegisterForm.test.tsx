/**
 * Tests for RegisterForm component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterForm } from '@/components/auth/RegisterForm';

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
});
