/**
 * Tests for UserActionMenu Component
 * Verifies dropdown menu actions, confirmation dialogs, and user permissions
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserActionMenu } from '@/components/admin/users/UserActionMenu';
import {
  useActivateUser,
  useDeactivateUser,
  useDeleteUser,
  type User,
} from '@/lib/api/hooks/useAdmin';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/api/hooks/useAdmin', () => ({
  useActivateUser: jest.fn(),
  useDeactivateUser: jest.fn(),
  useDeleteUser: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseActivateUser = useActivateUser as jest.MockedFunction<typeof useActivateUser>;
const mockUseDeactivateUser = useDeactivateUser as jest.MockedFunction<typeof useDeactivateUser>;
const mockUseDeleteUser = useDeleteUser as jest.MockedFunction<typeof useDeleteUser>;

describe('UserActionMenu', () => {
  const mockUser: User = {
    id: '1',
    email: 'user@example.com',
    first_name: 'Test',
    last_name: 'User',
    is_active: true,
    is_superuser: false,
    created_at: '2025-01-01T00:00:00Z',
  };

  const mockActivateMutate = jest.fn();
  const mockDeactivateMutate = jest.fn();
  const mockDeleteMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseActivateUser.mockReturnValue({
      mutateAsync: mockActivateMutate,
      isPending: false,
    } as any);

    mockUseDeactivateUser.mockReturnValue({
      mutateAsync: mockDeactivateMutate,
      isPending: false,
    } as any);

    mockUseDeleteUser.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    } as any);

    mockActivateMutate.mockResolvedValue({});
    mockDeactivateMutate.mockResolvedValue({});
    mockDeleteMutate.mockResolvedValue({});
  });

  describe('Menu Rendering', () => {
    it('renders menu trigger button', () => {
      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      expect(menuButton).toBeInTheDocument();
    });

    it('shows menu items when opened', async () => {
      const user = userEvent.setup();
      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    it('shows deactivate option for active user', async () => {
      const user = userEvent.setup();
      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      expect(screen.getByText('Deactivate')).toBeInTheDocument();
      expect(screen.queryByText('Activate')).not.toBeInTheDocument();
    });

    it('shows activate option for inactive user', async () => {
      const user = userEvent.setup();
      const inactiveUser = { ...mockUser, is_active: false };

      render(<UserActionMenu user={inactiveUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      expect(screen.getByText('Activate')).toBeInTheDocument();
      expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
    });

    it('shows delete option', async () => {
      const user = userEvent.setup();
      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });
  });

  describe('Edit Action', () => {
    it('calls onEdit when edit is clicked', async () => {
      const user = userEvent.setup();
      const mockOnEdit = jest.fn();

      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={mockOnEdit} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const editButton = screen.getByText('Edit User');
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockUser);
    });

    it('closes menu after edit is clicked', async () => {
      const user = userEvent.setup();
      const mockOnEdit = jest.fn();

      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={mockOnEdit} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const editButton = screen.getByText('Edit User');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
      });
    });
  });

  describe('Activate Action', () => {
    it('activates user immediately without confirmation', async () => {
      const user = userEvent.setup();
      const inactiveUser = { ...mockUser, is_active: false };

      render(<UserActionMenu user={inactiveUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const activateButton = screen.getByText('Activate');
      await user.click(activateButton);

      await waitFor(() => {
        expect(mockActivateMutate).toHaveBeenCalledWith('1');
      });
    });

    it('shows success toast on activation', async () => {
      const user = userEvent.setup();
      const inactiveUser = { ...mockUser, is_active: false };

      render(<UserActionMenu user={inactiveUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const activateButton = screen.getByText('Activate');
      await user.click(activateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Test User has been activated successfully.');
      });
    });

    it('shows error toast on activation failure', async () => {
      const user = userEvent.setup();
      const inactiveUser = { ...mockUser, is_active: false };

      mockActivateMutate.mockRejectedValueOnce(new Error('Network error'));

      render(<UserActionMenu user={inactiveUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const activateButton = screen.getByText('Activate');
      await user.click(activateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('Deactivate Action', () => {
    it('shows confirmation dialog when deactivate is clicked', async () => {
      const user = userEvent.setup();

      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const deactivateButton = screen.getByText('Deactivate');
      await user.click(deactivateButton);

      expect(screen.getByText('Deactivate User')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to deactivate Test User\?/)
      ).toBeInTheDocument();
    });

    it('shows confirmation dialog when deactivate is clicked', async () => {
      const user = userEvent.setup();

      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const deactivateButton = screen.getByText('Deactivate');
      await user.click(deactivateButton);

      // Verify dialog opens with correct content
      await waitFor(() => {
        expect(screen.getByText('Deactivate User')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to deactivate Test User\?/)
        ).toBeInTheDocument();
      });
    });

    it('disables deactivate option for current user', async () => {
      const user = userEvent.setup();

      render(<UserActionMenu user={mockUser} isCurrentUser={true} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const deactivateButton = screen.getByText('Deactivate');
      // Radix UI disabled menu items use aria-disabled
      expect(deactivateButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Delete Action', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();

      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete User');
      await user.click(deleteButton);

      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete Test User\?/)).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone\./)).toBeInTheDocument();
    });

    it('deletes user when confirmed', async () => {
      const user = userEvent.setup();

      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete User');
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteMutate).toHaveBeenCalledWith('1');
      });
    });

    it('cancels deletion when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete User');
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockDeleteMutate).not.toHaveBeenCalled();
    });

    it('shows success toast on deletion', async () => {
      const user = userEvent.setup();

      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete User');
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Test User has been deleted successfully.');
      });
    });

    it('disables delete option for current user', async () => {
      const user = userEvent.setup();

      render(<UserActionMenu user={mockUser} isCurrentUser={true} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete User');
      // Radix UI disabled menu items use aria-disabled
      expect(deleteButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('User Name Display', () => {
    it('displays full name when last name is provided', async () => {
      render(<UserActionMenu user={mockUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      expect(menuButton).toBeInTheDocument();
    });

    it('displays first name only when last name is null', async () => {
      const userWithoutLastName = { ...mockUser, last_name: null };

      render(
        <UserActionMenu user={userWithoutLastName} isCurrentUser={false} onEdit={jest.fn()} />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test',
      });
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error toast with custom message on error', async () => {
      const user = userEvent.setup();
      const inactiveUser = { ...mockUser, is_active: false };

      mockActivateMutate.mockRejectedValueOnce(new Error('Custom error'));

      render(<UserActionMenu user={inactiveUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const activateButton = screen.getByText('Activate');
      await user.click(activateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Custom error');
      });
    });

    it('shows generic error message for non-Error objects', async () => {
      const user = userEvent.setup();
      const inactiveUser = { ...mockUser, is_active: false };

      mockActivateMutate.mockRejectedValueOnce('String error');

      render(<UserActionMenu user={inactiveUser} isCurrentUser={false} onEdit={jest.fn()} />);

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Test User',
      });
      await user.click(menuButton);

      const activateButton = screen.getByText('Activate');
      await user.click(activateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to activate user');
      });
    });
  });
});
