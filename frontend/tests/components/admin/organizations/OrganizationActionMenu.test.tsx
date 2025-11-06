/**
 * Tests for OrganizationActionMenu Component
 * Verifies dropdown menu actions and delete confirmation dialog
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationActionMenu } from '@/components/admin/organizations/OrganizationActionMenu';
import {
  useDeleteOrganization,
  type Organization,
} from '@/lib/api/hooks/useAdmin';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/api/hooks/useAdmin', () => ({
  useDeleteOrganization: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseDeleteOrganization = useDeleteOrganization as jest.MockedFunction<
  typeof useDeleteOrganization
>;

describe('OrganizationActionMenu', () => {
  const mockOrganization: Organization = {
    id: '1',
    name: 'Acme Corporation',
    slug: 'acme-corporation',
    description: 'Leading provider',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    member_count: 10,
  };

  const mockDeleteMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDeleteOrganization.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    } as any);

    mockDeleteMutate.mockResolvedValue({});
  });

  describe('Menu Rendering', () => {
    it('renders menu trigger button', () => {
      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      expect(menuButton).toBeInTheDocument();
    });

    it('shows menu items when opened', async () => {
      const user = userEvent.setup();
      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      expect(screen.getByText('Edit Organization')).toBeInTheDocument();
      expect(screen.getByText('View Members')).toBeInTheDocument();
      expect(screen.getByText('Delete Organization')).toBeInTheDocument();
    });
  });

  describe('Edit Action', () => {
    it('calls onEdit when edit is clicked', async () => {
      const user = userEvent.setup();
      const mockOnEdit = jest.fn();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={mockOnEdit}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const editButton = screen.getByText('Edit Organization');
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockOrganization);
    });

    it('does not call onEdit when handler is undefined', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={undefined}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const editButton = screen.getByText('Edit Organization');
      // Should not throw error when clicked
      await user.click(editButton);
    });

    it('closes menu after edit is clicked', async () => {
      const user = userEvent.setup();
      const mockOnEdit = jest.fn();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={mockOnEdit}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const editButton = screen.getByText('Edit Organization');
      await user.click(editButton);

      // Menu should close after clicking
      await waitFor(() => {
        const editButton = screen.queryByText('Edit Organization');
        expect(editButton).toBeNull();
      });
    });
  });

  describe('View Members Action', () => {
    it('calls onViewMembers when clicked', async () => {
      const user = userEvent.setup();
      const mockOnViewMembers = jest.fn();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={mockOnViewMembers}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const viewMembersButton = screen.getByText('View Members');
      await user.click(viewMembersButton);

      expect(mockOnViewMembers).toHaveBeenCalledWith(mockOrganization.id);
    });

    it('does not call onViewMembers when handler is undefined', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={undefined}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const viewMembersButton = screen.getByText('View Members');
      // Should not throw error when clicked
      await user.click(viewMembersButton);
    });

    it('closes menu after view members is clicked', async () => {
      const user = userEvent.setup();
      const mockOnViewMembers = jest.fn();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={mockOnViewMembers}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const viewMembersButton = screen.getByText('View Members');
      await user.click(viewMembersButton);

      // Menu should close after clicking
      await waitFor(() => {
        const viewButton = screen.queryByText('View Members');
        expect(viewButton).toBeNull();
      });
    });
  });

  describe('Delete Action', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Organization');
      await user.click(deleteButton);

      expect(screen.getByText('Delete Organization')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete Acme Corporation/)
      ).toBeInTheDocument();
    });

    it('shows warning about data loss in dialog', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Organization');
      await user.click(deleteButton);

      expect(
        screen.getByText(/This action cannot be undone and will remove all associated data/)
      ).toBeInTheDocument();
    });

    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Organization');
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByText(/Are you sure you want to delete/)
        ).not.toBeInTheDocument();
      });
    });

    it('calls delete mutation when confirmed', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Organization');
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteMutate).toHaveBeenCalledWith(mockOrganization.id);
      });
    });

    it('shows success toast after deletion', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Organization');
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Acme Corporation has been deleted successfully.'
        );
      });
    });

    it('shows error toast on deletion failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to delete organization';
      mockDeleteMutate.mockRejectedValueOnce(new Error(errorMessage));

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Organization');
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('closes dialog after successful deletion', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationActionMenu
          organization={mockOrganization}
          onEdit={jest.fn()}
          onViewMembers={jest.fn()}
        />
      );

      const menuButton = screen.getByRole('button', {
        name: 'Actions for Acme Corporation',
      });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Organization');
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.queryByText(/Are you sure you want to delete/)
        ).not.toBeInTheDocument();
      });
    });
  });
});
