/**
 * AddMemberDialog Component
 * Dialog for adding a new member to an organization
 */

'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAddOrganizationMember, useAdminUsers } from '@/lib/api/hooks/useAdmin';

/**
 * Form schema for adding a member
 */
const addMemberSchema = z.object({
  userEmail: z.string().min(1, 'User email is required').email('Invalid email'),
  role: z.enum(['owner', 'admin', 'member', 'guest'], {
    required_error: 'Role is required',
  }),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function AddMemberDialog({ open, onOpenChange, organizationId }: AddMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all users for the dropdown (simplified - in production, use search/autocomplete)
  const { data: usersData } = useAdminUsers(1, 100);
  const users = usersData?.data || [];

  const addMember = useAddOrganizationMember();

  // Form
  const form = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      userEmail: '',
      role: 'member',
    },
  });

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = form;
  const selectedRole = watch('role');
  const selectedEmail = watch('userEmail');

  // istanbul ignore next - Form submission with Select components tested in E2E (admin-organization-members.spec.ts)
  const onSubmit = async (data: AddMemberFormData) => {
    setIsSubmitting(true);

    try {
      // Find user by email
      const selectedUser = users.find((u) => u.email === data.userEmail);
      if (!selectedUser) {
        toast.error('User not found');
        return;
      }

      await addMember.mutateAsync({
        orgId: organizationId,
        memberData: {
          user_id: selectedUser.id,
          role: data.role,
        },
      });

      toast.success('Member added successfully');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add member';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // istanbul ignore next - Select component interactions tested in E2E (admin-organization-members.spec.ts)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add a user to this organization and assign them a role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* User Email Select */}
          <div className="space-y-2">
            <Label htmlFor="userEmail">User Email *</Label>
            <Select value={selectedEmail} onValueChange={(value) => setValue('userEmail', value)}>
              <SelectTrigger id="userEmail">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.email}>
                    {user.email} ({user.first_name} {user.last_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userEmail && (
              <p className="text-sm text-destructive">{errors.userEmail.message}</p>
            )}
          </div>

          {/* Role Select */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setValue('role', value as 'owner' | 'admin' | 'member' | 'guest')
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
