/**
 * Tests for BulkActionToolbar Component
 * Verifies toolbar rendering, visibility logic, and button states
 * Note: Complex AlertDialog interactions are tested in E2E tests (admin-users.spec.ts)
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionToolbar } from '@/components/admin/users/BulkActionToolbar';
import { useBulkUserAction } from '@/lib/api/hooks/useAdmin';

// Mock dependencies
jest.mock('@/lib/api/hooks/useAdmin', () => ({
  useBulkUserAction: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseBulkUserAction = useBulkUserAction as jest.MockedFunction<
  typeof useBulkUserAction
>;

describe('BulkActionToolbar', () => {
  const mockBulkActionMutate = jest.fn();
  const mockOnClearSelection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseBulkUserAction.mockReturnValue({
      mutateAsync: mockBulkActionMutate,
      isPending: false,
    } as any);

    mockBulkActionMutate.mockResolvedValue({});
  });

  describe('Visibility', () => {
    it('does not render when no users selected', () => {
      render(
        <BulkActionToolbar
          selectedCount={0}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={[]}
        />
      );

      expect(
        screen.queryByTestId('bulk-action-toolbar')
      ).not.toBeInTheDocument();
    });

    it('renders when one user is selected', () => {
      render(
        <BulkActionToolbar
          selectedCount={1}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1']}
        />
      );

      expect(screen.getByTestId('bulk-action-toolbar')).toBeInTheDocument();
    });

    it('renders when multiple users are selected', () => {
      render(
        <BulkActionToolbar
          selectedCount={5}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3', '4', '5']}
        />
      );

      expect(screen.getByTestId('bulk-action-toolbar')).toBeInTheDocument();
    });
  });

  describe('Selection Count Display', () => {
    it('shows singular text for one user', () => {
      render(
        <BulkActionToolbar
          selectedCount={1}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1']}
        />
      );

      expect(screen.getByText('1 user selected')).toBeInTheDocument();
    });

    it('shows plural text for multiple users', () => {
      render(
        <BulkActionToolbar
          selectedCount={5}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3', '4', '5']}
        />
      );

      expect(screen.getByText('5 users selected')).toBeInTheDocument();
    });

    it('shows correct count for 10 users', () => {
      render(
        <BulkActionToolbar
          selectedCount={10}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={Array.from({ length: 10 }, (_, i) => String(i + 1))}
        />
      );

      expect(screen.getByText('10 users selected')).toBeInTheDocument();
    });
  });

  describe('Clear Selection', () => {
    it('renders clear selection button', () => {
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      const clearButton = screen.getByRole('button', {
        name: 'Clear selection',
      });
      expect(clearButton).toBeInTheDocument();
    });

    it('calls onClearSelection when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      const clearButton = screen.getByRole('button', {
        name: 'Clear selection',
      });
      await user.click(clearButton);

      expect(mockOnClearSelection).toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('renders activate button', () => {
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      expect(
        screen.getByRole('button', { name: /Activate/ })
      ).toBeInTheDocument();
    });

    it('renders deactivate button', () => {
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      expect(
        screen.getByRole('button', { name: /Deactivate/ })
      ).toBeInTheDocument();
    });

    it('renders delete button', () => {
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      expect(
        screen.getByRole('button', { name: /Delete/ })
      ).toBeInTheDocument();
    });

    it('disables buttons when action is pending', () => {
      mockUseBulkUserAction.mockReturnValue({
        mutateAsync: mockBulkActionMutate,
        isPending: true,
      } as any);

      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      const activateButton = screen.getByRole('button', { name: /Activate/ });
      const deactivateButton = screen.getByRole('button', {
        name: /Deactivate/,
      });
      const deleteButton = screen.getByRole('button', { name: /Delete/ });

      expect(activateButton).toBeDisabled();
      expect(deactivateButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it('enables buttons when action is not pending', () => {
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      const activateButton = screen.getByRole('button', { name: /Activate/ });
      const deactivateButton = screen.getByRole('button', {
        name: /Deactivate/,
      });
      const deleteButton = screen.getByRole('button', { name: /Delete/ });

      expect(activateButton).not.toBeDisabled();
      expect(deactivateButton).not.toBeDisabled();
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Confirmation Dialogs', () => {
    it('shows activate confirmation dialog when activate is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      const activateButton = screen.getByRole('button', { name: /Activate/ });
      await user.click(activateButton);

      await waitFor(() => {
        expect(screen.getByText('Activate Users')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to activate 3 users\?/)
        ).toBeInTheDocument();
      });
    });

    it('shows deactivate confirmation dialog when deactivate is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BulkActionToolbar
          selectedCount={2}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2']}
        />
      );

      const deactivateButton = screen.getByRole('button', {
        name: /Deactivate/,
      });
      await user.click(deactivateButton);

      await waitFor(() => {
        expect(screen.getByText('Deactivate Users')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to deactivate 2 users\?/)
        ).toBeInTheDocument();
      });
    });

    it('shows delete confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BulkActionToolbar
          selectedCount={5}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3', '4', '5']}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/ });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Users')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to delete 5 users\?/)
        ).toBeInTheDocument();
      });
    });

    it('uses singular text in confirmation for one user', async () => {
      const user = userEvent.setup();
      render(
        <BulkActionToolbar
          selectedCount={1}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1']}
        />
      );

      const activateButton = screen.getByRole('button', { name: /Activate/ });
      await user.click(activateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Are you sure you want to activate 1 user\?/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Toolbar Positioning', () => {
    it('renders toolbar with fixed positioning', () => {
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      const toolbar = screen.getByTestId('bulk-action-toolbar');
      expect(toolbar).toHaveClass('fixed');
      expect(toolbar).toHaveClass('bottom-6');
      expect(toolbar).toHaveClass('left-1/2');
      expect(toolbar).toHaveClass('-translate-x-1/2');
      expect(toolbar).toHaveClass('z-50');
    });
  });

  describe('Hook Integration', () => {
    it('calls useBulkUserAction hook', () => {
      render(
        <BulkActionToolbar
          selectedCount={3}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={['1', '2', '3']}
        />
      );

      expect(mockUseBulkUserAction).toHaveBeenCalled();
    });
  });

  describe('Props Handling', () => {
    it('handles empty selectedUserIds array', () => {
      render(
        <BulkActionToolbar
          selectedCount={0}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={[]}
        />
      );

      expect(
        screen.queryByTestId('bulk-action-toolbar')
      ).not.toBeInTheDocument();
    });

    it('handles large selection counts', () => {
      render(
        <BulkActionToolbar
          selectedCount={100}
          onClearSelection={mockOnClearSelection}
          selectedUserIds={Array.from({ length: 100 }, (_, i) =>
            String(i + 1)
          )}
        />
      );

      expect(screen.getByText('100 users selected')).toBeInTheDocument();
    });
  });
});
