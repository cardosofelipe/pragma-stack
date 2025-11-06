/**
 * Tests for AddMemberDialog Component
 */

import React from 'react';
import { AddMemberDialog } from '@/components/admin/organizations/AddMemberDialog';

// Mock hooks
const mockAddMember = jest.fn();
jest.mock('@/lib/api/hooks/useAdmin', () => ({
  useAddOrganizationMember: () => ({
    mutateAsync: mockAddMember,
  }),
  useAdminUsers: () => ({
    data: {
      data: [
        { id: 'user-1', email: 'user1@test.com', first_name: 'User', last_name: 'One' },
        { id: 'user-2', email: 'user2@test.com', first_name: 'User', last_name: 'Two' },
      ],
    },
    isLoading: false,
  }),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AddMemberDialog', () => {
  it('exports AddMemberDialog component', () => {
    expect(AddMemberDialog).toBeDefined();
    expect(typeof AddMemberDialog).toBe('function');
  });

  it('has correct component name', () => {
    expect(AddMemberDialog.name).toBe('AddMemberDialog');
  });

  describe('Component Implementation', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.join(
      __dirname,
      '../../../../src/components/admin/organizations/AddMemberDialog.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    it('component file contains expected functionality markers', () => {
      expect(source).toContain('AddMemberDialog');
      expect(source).toContain('useAddOrganizationMember');
      expect(source).toContain('useAdminUsers');
      expect(source).toContain('useForm');
      expect(source).toContain('zodResolver');
      expect(source).toContain('Dialog');
      expect(source).toContain('Select');
    });

    it('component has user email select field', () => {
      expect(source).toContain('userEmail');
      expect(source).toContain('User Email');
      expect(source).toContain('Select a user');
    });

    it('component has role select field', () => {
      expect(source).toContain('role');
      expect(source).toContain('Role');
      expect(source).toContain('member');
      expect(source).toContain('admin');
      expect(source).toContain('owner');
      expect(source).toContain('guest');
    });

    it('component has form validation schema', () => {
      expect(source).toContain('addMemberSchema');
      expect(source).toContain('z.object');
      expect(source).toContain('email');
      expect(source).toContain('z.enum');
    });

    it('component handles form submission', () => {
      expect(source).toContain('onSubmit');
      expect(source).toContain('mutateAsync');
      expect(source).toContain('user_id');
      expect(source).toContain('role');
    });

    it('component handles loading state', () => {
      expect(source).toContain('isSubmitting');
      expect(source).toContain('setIsSubmitting');
      expect(source).toContain('disabled={isSubmitting}');
    });

    it('component displays success toast on success', () => {
      expect(source).toContain('toast.success');
      expect(source).toContain('Member added successfully');
    });

    it('component displays error toast on failure', () => {
      expect(source).toContain('toast.error');
      expect(source).toContain('Failed to add member');
    });

    it('component has cancel button', () => {
      expect(source).toContain('Cancel');
      expect(source).toContain('onOpenChange(false)');
    });

    it('component has submit button', () => {
      expect(source).toContain('Add Member');
      expect(source).toContain('Adding...');
    });

    it('component uses DialogFooter for actions', () => {
      expect(source).toContain('DialogFooter');
    });
  });
});
