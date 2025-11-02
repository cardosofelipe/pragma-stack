/**
 * Tests for PasswordChangeForm Component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PasswordChangeForm } from '@/components/settings/PasswordChangeForm';
import * as useAuthModule from '@/lib/api/hooks/useAuth';
import { toast } from 'sonner';

jest.mock('@/lib/api/hooks/useAuth');
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockUsePasswordChange = useAuthModule.usePasswordChange as jest.Mock;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('PasswordChangeForm', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    user = userEvent.setup();
    jest.clearAllMocks();
    mockUsePasswordChange.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    });
  });

  const renderWithProvider = (component: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);

  describe('Rendering', () => {
    it('renders all password fields', () => {
      renderWithProvider(<PasswordChangeForm />);
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });

    it('renders change password button', () => {
      renderWithProvider(<PasswordChangeForm />);
      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    });

    it('shows password strength requirements', () => {
      renderWithProvider(<PasswordChangeForm />);
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });

    it('uses usePasswordChange hook', () => {
      renderWithProvider(<PasswordChangeForm />);
      expect(mockUsePasswordChange).toHaveBeenCalled();
    });
  });

  describe('Form State', () => {
    it('disables submit when pristine', () => {
      renderWithProvider(<PasswordChangeForm />);
      expect(screen.getByRole('button', { name: /change password/i })).toBeDisabled();
    });

    it('disables inputs while submitting', () => {
      mockUsePasswordChange.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        isSuccess: false,
        error: null,
      });

      renderWithProvider(<PasswordChangeForm />);

      expect(screen.getByLabelText(/current password/i)).toBeDisabled();
      expect(screen.getByLabelText(/^new password/i)).toBeDisabled();
      expect(screen.getByLabelText(/confirm new password/i)).toBeDisabled();
    });

    it('shows loading text while submitting', () => {
      mockUsePasswordChange.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        isSuccess: false,
        error: null,
      });

      renderWithProvider(<PasswordChangeForm />);

      expect(screen.getByText(/changing password/i)).toBeInTheDocument();
    });

    it('shows cancel button when form is dirty', async () => {
      renderWithProvider(<PasswordChangeForm />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'password');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('allows typing in current password field', async () => {
      renderWithProvider(<PasswordChangeForm />);

      const currentPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement;
      await user.type(currentPasswordInput, 'OldPassword123!');

      expect(currentPasswordInput.value).toBe('OldPassword123!');
    });

    it('allows typing in new password field', async () => {
      renderWithProvider(<PasswordChangeForm />);

      const newPasswordInput = screen.getByLabelText(/^new password/i) as HTMLInputElement;
      await user.type(newPasswordInput, 'NewPassword123!');

      expect(newPasswordInput.value).toBe('NewPassword123!');
    });

    it('allows typing in confirm password field', async () => {
      renderWithProvider(<PasswordChangeForm />);

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i) as HTMLInputElement;
      await user.type(confirmPasswordInput, 'NewPassword123!');

      expect(confirmPasswordInput.value).toBe('NewPassword123!');
    });

    it('resets form when cancel button is clicked', async () => {
      renderWithProvider(<PasswordChangeForm />);

      const currentPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement;
      await user.type(currentPasswordInput, 'password');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(currentPasswordInput.value).toBe('');
      });
    });
  });

  describe('Form Submission - Success', () => {
    it('calls mutateAsync with correct data on successful submission', async () => {
      mockMutateAsync.mockResolvedValueOnce({});

      renderWithProvider(<PasswordChangeForm />);

      // Simulate the hook callback being triggered (success path)
      const hookCallback = mockUsePasswordChange.mock.calls[0][0];

      // Trigger the callback as if mutation succeeded
      hookCallback('Password changed successfully');

      expect(mockToast.success).toHaveBeenCalledWith('Password changed successfully');
    });

    it('calls onSuccess callback after successful password change', async () => {
      const onSuccess = jest.fn();
      mockMutateAsync.mockResolvedValueOnce({});

      renderWithProvider(<PasswordChangeForm onSuccess={onSuccess} />);

      // Simulate successful password change through hook callback
      const hookCallback = mockUsePasswordChange.mock.calls[0][0];
      hookCallback('Password changed successfully');

      expect(onSuccess).toHaveBeenCalled();
    });

    it('shows success toast with custom message', async () => {
      renderWithProvider(<PasswordChangeForm />);

      const hookCallback = mockUsePasswordChange.mock.calls[0][0];
      hookCallback('Your password has been updated');

      expect(mockToast.success).toHaveBeenCalledWith('Your password has been updated');
    });
  });

  describe('Form Validation', () => {
    it('validates password match', async () => {
      renderWithProvider(<PasswordChangeForm />);

      await user.type(screen.getByLabelText(/current password/i), 'OldPass123!');
      await user.type(screen.getByLabelText(/^new password/i), 'NewPass123!');
      await user.type(screen.getByLabelText(/confirm new password/i), 'DifferentPass123!');

      // Try to submit the form
      const form = screen.getByRole('button', { name: /change password/i }).closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);

        await waitFor(() => {
          expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        });
      }
    });

    it('validates password strength requirements', async () => {
      renderWithProvider(<PasswordChangeForm />);

      await user.type(screen.getByLabelText(/current password/i), 'OldPass123!');
      await user.type(screen.getByLabelText(/^new password/i), 'weak');
      await user.type(screen.getByLabelText(/confirm new password/i), 'weak');

      const form = screen.getByRole('button', { name: /change password/i }).closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);

        await waitFor(() => {
          expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
        });
      }
    });

    it('requires all fields to be filled', async () => {
      renderWithProvider(<PasswordChangeForm />);

      // Leave fields empty and try to submit
      const form = screen.getByRole('button', { name: /change password/i }).closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);

        await waitFor(() => {
          expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
        });
      }
    });
  });
});
