/**
 * Tests for MemberActionMenu Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberActionMenu } from '@/components/admin/organizations/MemberActionMenu';
import type { OrganizationMember } from '@/lib/api/hooks/useAdmin';

// Mock hooks
const mockRemoveMember = jest.fn();
jest.mock('@/lib/api/hooks/useAdmin', () => ({
  useRemoveOrganizationMember: () => ({
    mutateAsync: mockRemoveMember,
  }),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MemberActionMenu', () => {
  const mockMember: OrganizationMember = {
    user_id: 'user-1',
    email: 'john@test.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'member',
    joined_at: '2025-01-01T00:00:00Z',
  };

  const props = {
    member: mockMember,
    organizationId: 'org-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveMember.mockResolvedValue({});
  });

  it('renders action menu button', () => {
    render(<MemberActionMenu {...props} />);

    const button = screen.getByRole('button', { name: /Actions for John Doe/i });
    expect(button).toBeInTheDocument();
  });

  it('opens menu when button clicked', async () => {
    const user = userEvent.setup();
    render(<MemberActionMenu {...props} />);

    const menuButton = screen.getByRole('button', { name: /Actions for/i });
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Remove Member')).toBeVisible();
    });
  });

  it('shows remove member option in menu', async () => {
    const user = userEvent.setup();
    render(<MemberActionMenu {...props} />);

    const menuButton = screen.getByRole('button', { name: /Actions for/i });
    await user.click(menuButton);

    await waitFor(() => {
      const removeOption = screen.getByText('Remove Member');
      expect(removeOption).toBeVisible();
    });
  });

  it('opens confirmation dialog when remove clicked', async () => {
    const user = userEvent.setup();
    render(<MemberActionMenu {...props} />);

    const menuButton = screen.getByRole('button', { name: /Actions for/i });
    await user.click(menuButton);

    const removeOption = await screen.findByText('Remove Member');
    await user.click(removeOption);

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to remove.*John Doe.*from this organization/)).toBeVisible();
    });
  });

  it('closes dialog when cancel clicked', async () => {
    const user = userEvent.setup();
    render(<MemberActionMenu {...props} />);

    // Open menu
    const menuButton = screen.getByRole('button', { name: /Actions for/i });
    await user.click(menuButton);

    // Click remove
    const removeOption = await screen.findByText('Remove Member');
    await user.click(removeOption);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      const confirmText = screen.queryByText(/Are you sure you want to remove/);
      expect(confirmText).toBeNull();
    });
  });

  it('uses email as fallback when name is missing', () => {
    const memberWithoutName = {
      ...mockMember,
      first_name: '',
      last_name: null,
    };

    render(<MemberActionMenu member={memberWithoutName} organizationId="org-1" />);

    const button = screen.getByRole('button', { name: /Actions for john@test.com/i });
    expect(button).toBeInTheDocument();
  });
});
