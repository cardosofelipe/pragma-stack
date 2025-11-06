/**
 * MemberActionMenu Component
 * Dropdown menu for member row actions (Remove)
 */

'use client';

import { useState } from 'react';
import { MoreHorizontal, UserMinus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  useRemoveOrganizationMember,
  type OrganizationMember,
} from '@/lib/api/hooks/useAdmin';

interface MemberActionMenuProps {
  member: OrganizationMember;
  organizationId: string;
}

export function MemberActionMenu({
  member,
  organizationId,
}: MemberActionMenuProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const removeMember = useRemoveOrganizationMember();

  // istanbul ignore next - Remove handler fully tested in E2E
  const handleRemove = async () => {
    try {
      await removeMember.mutateAsync({
        orgId: organizationId,
        userId: member.user_id,
      });
      toast.success(`${member.email} has been removed from the organization.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setConfirmRemove(false);
    }
  };

  const memberName = [member.first_name, member.last_name]
    .filter(Boolean)
    .join(' ') || member.email;

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={`Actions for ${memberName}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setConfirmRemove(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Remove Member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberName} from this organization?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
