/**
 * Tests for PasswordResetRequestForm component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PasswordResetRequestForm } from '@/components/auth/PasswordResetRequestForm';

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

  // Note: Async submission tests require API mocking with MSW
  // Will be added in Phase 9 (Testing Infrastructure)

  it('marks email field as required with asterisk', () => {
    render(<PasswordResetRequestForm />, { wrapper: createWrapper() });

    const labels = screen.getAllByText('*');
    expect(labels.length).toBeGreaterThan(0);
  });
});
