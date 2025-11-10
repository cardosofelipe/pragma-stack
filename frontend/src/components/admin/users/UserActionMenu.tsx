/**
 * UserActionMenu Component
 * Dropdown menu for user row actions (Edit, Activate/Deactivate, Delete)
 */

'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, CheckCircle, XCircle, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  useActivateUser,
  useDeactivateUser,
  useDeleteUser,
  type User,
} from '@/lib/api/hooks/useAdmin';

interface UserActionMenuProps {
  user: User;
  isCurrentUser: boolean;
  onEdit?: (user: User) => void;
}

type ConfirmAction = 'delete' | 'deactivate' | null;

export function UserActionMenu({ user, isCurrentUser, onEdit }: UserActionMenuProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const deleteUser = useDeleteUser();

  const fullName = user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;

  // Handle activate action
  const handleActivate = async () => {
    try {
      await activateUser.mutateAsync(user.id);
      toast.success(`${fullName} has been activated successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to activate user');
    }
  };

  // istanbul ignore next - User action handlers fully tested in E2E (admin-users.spec.ts)
  // Handle deactivate action
  const handleDeactivate = async () => {
    try {
      await deactivateUser.mutateAsync(user.id);
      toast.success(`${fullName} has been deactivated successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user');
    } finally {
      setConfirmAction(null);
    }
  };

  // Handle delete action
  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync(user.id);
      toast.success(`${fullName} has been deleted successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setConfirmAction(null);
    }
  };

  // Handle edit action
  const handleEdit = () => {
    setDropdownOpen(false);
    if (onEdit) {
      onEdit(user);
    }
  };

  // Render confirmation dialog
  const renderConfirmDialog = () => {
    if (!confirmAction) return null;

    const isDelete = confirmAction === 'delete';
    const title = isDelete ? 'Delete User' : 'Deactivate User';
    const description = isDelete
      ? `Are you sure you want to delete ${fullName}? This action cannot be undone.`
      : `Are you sure you want to deactivate ${fullName}? They will not be able to log in until reactivated.`;
    const action = isDelete ? handleDelete : handleDeactivate;
    const actionLabel = isDelete ? 'Delete' : 'Deactivate';

    return (
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={action}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={`Actions for ${fullName}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {user.is_active ? (
            <DropdownMenuItem
              onClick={() => setConfirmAction('deactivate')}
              disabled={isCurrentUser}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleActivate}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Activate
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setConfirmAction('delete')}
            disabled={isCurrentUser}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {renderConfirmDialog()}
    </>
  );
}
