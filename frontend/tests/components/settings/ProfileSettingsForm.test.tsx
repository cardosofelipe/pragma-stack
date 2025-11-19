/**
 * Tests for ProfileSettingsForm Component
 * Tests profile editing functionality
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileSettingsForm } from '@/components/settings/ProfileSettingsForm';
import * as useAuthModule from '@/lib/api/hooks/useAuth';
import * as useUserModule from '@/lib/api/hooks/useUser';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/api/hooks/useAuth');
jest.mock('@/lib/api/hooks/useUser');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseCurrentUser = useAuthModule.useCurrentUser as jest.Mock;
const mockUseUpdateProfile = useUserModule.useUpdateProfile as jest.Mock;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('ProfileSettingsForm', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;
  const mockMutateAsync = jest.fn();

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    is_active: true,
    is_superuser: false,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    user = userEvent.setup();
    jest.clearAllMocks();

    // Mock useCurrentUser to return user
    mockUseCurrentUser.mockReturnValue(mockUser);

    // Mock useUpdateProfile
    mockUseUpdateProfile.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    });
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  describe('Rendering', () => {
    it('renders form with all fields', () => {
      renderWithProvider(<ProfileSettingsForm />);

      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('populates form with current user data', async () => {
      renderWithProvider(<ProfileSettingsForm />);

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
        const lastNameInput = screen.getByLabelText(/last name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

        expect(firstNameInput.value).toBe('John');
        expect(lastNameInput.value).toBe('Doe');
        expect(emailInput.value).toBe('test@example.com');
      });
    });

    it('disables email field', () => {
      renderWithProvider(<ProfileSettingsForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeDisabled();
    });

    it('shows email cannot be changed message', () => {
      renderWithProvider(<ProfileSettingsForm />);

      expect(screen.getByText(/cannot be changed.*contact support/i)).toBeInTheDocument();
    });

    it('marks first name as required', () => {
      renderWithProvider(<ProfileSettingsForm />);

      const firstNameLabel = screen.getByText(/first name/i);
      expect(firstNameLabel.parentElement?.textContent).toContain('*');
    });
  });

  describe('User Interactions', () => {
    it('allows typing in first name field', async () => {
      renderWithProvider(<ProfileSettingsForm />);

      await waitFor(() => {
        expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('John');
      });

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      expect((firstNameInput as HTMLInputElement).value).toBe('Jane');
    });

    it('allows typing in last name field', async () => {
      renderWithProvider(<ProfileSettingsForm />);

      await waitFor(() => {
        expect((screen.getByLabelText(/last name/i) as HTMLInputElement).value).toBe('Doe');
      });

      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');

      expect((lastNameInput as HTMLInputElement).value).toBe('Smith');
    });
  });

  describe('Form Submission', () => {
    it('uses useUpdateProfile hook correctly', async () => {
      renderWithProvider(<ProfileSettingsForm />);

      // Verify the hook is called
      expect(mockUseUpdateProfile).toHaveBeenCalled();

      // Verify the hook callback would call success handler
      const hookCallback = mockUseUpdateProfile.mock.calls[0][0];
      expect(typeof hookCallback).toBe('function');
    });

    it('calls success toast through hook callback', async () => {
      renderWithProvider(<ProfileSettingsForm />);

      // Get the hook callback
      const hookCallback = mockUseUpdateProfile.mock.calls[0][0];
      if (hookCallback) {
        hookCallback('Profile updated successfully');
        expect(mockToast.success).toHaveBeenCalledWith('Profile updated successfully');
      }
    });

    it('calls onSuccess callback when provided', async () => {
      const onSuccess = jest.fn();
      renderWithProvider(<ProfileSettingsForm onSuccess={onSuccess} />);

      // Verify onSuccess is passed to the component
      expect(onSuccess).not.toHaveBeenCalled(); // Not called on mount

      // The onSuccess would be called through the useUpdateProfile hook callback
      const hookCallback = mockUseUpdateProfile.mock.calls[0][0];
      if (hookCallback) {
        hookCallback('Profile updated successfully');
        expect(onSuccess).toHaveBeenCalled();
      }
    });
  });

  describe('Validation', () => {
    it('marks first name field as required in UI', () => {
      renderWithProvider(<ProfileSettingsForm />);

      // First name label should have asterisk indicating it's required
      const firstNameLabel = screen.getByText(/first name/i);
      expect(firstNameLabel.parentElement?.textContent).toContain('*');
    });
  });

  describe('Form State', () => {
    it('disables submit button when form is pristine', async () => {
      renderWithProvider(<ProfileSettingsForm />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /save changes/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('disables inputs while submitting', async () => {
      mockUseUpdateProfile.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        isSuccess: false,
        error: null,
      });

      renderWithProvider(<ProfileSettingsForm />);

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i);
        expect(firstNameInput).toBeDisabled();
      });
    });

    it('shows loading text while submitting', async () => {
      mockUseUpdateProfile.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        isSuccess: false,
        error: null,
      });

      renderWithProvider(<ProfileSettingsForm />);

      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });
  });
});
