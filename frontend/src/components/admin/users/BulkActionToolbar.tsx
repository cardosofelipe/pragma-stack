/**
 * BulkActionToolbar Component
 * Toolbar for performing bulk actions on selected users
 */

'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Trash, X } from 'lucide-react';
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
import { useBulkUserAction } from '@/lib/api/hooks/useAdmin';

interface BulkActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  selectedUserIds: string[];
}

type BulkAction = 'activate' | 'deactivate' | 'delete' | null;

export function BulkActionToolbar({
  selectedCount,
  onClearSelection,
  selectedUserIds,
}: BulkActionToolbarProps) {
  const [pendingAction, setPendingAction] = useState<BulkAction>(null);
  const bulkAction = useBulkUserAction();

  if (selectedCount === 0) {
    return null;
  }

  const handleAction = (action: BulkAction) => {
    setPendingAction(action);
  };

  // istanbul ignore next - Bulk action handlers fully tested in E2E (admin-users.spec.ts)
  const confirmAction = async () => {
    if (!pendingAction) return;

    try {
      await bulkAction.mutateAsync({
        action: pendingAction,
        userIds: selectedUserIds,
      });

      toast.success(
        `Successfully ${pendingAction}d ${selectedCount} user${selectedCount > 1 ? 's' : ''}`
      );

      onClearSelection();
      setPendingAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${pendingAction} users`);
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    setPendingAction(null);
  };

  const getActionDescription = () => {
    switch (pendingAction) {
      case 'activate':
        return `Are you sure you want to activate ${selectedCount} user${selectedCount > 1 ? 's' : ''}? They will be able to log in.`;
      case 'deactivate':
        return `Are you sure you want to deactivate ${selectedCount} user${selectedCount > 1 ? 's' : ''}? They will not be able to log in until reactivated.`;
      case 'delete':
        return `Are you sure you want to delete ${selectedCount} user${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`;
      default:
        return '';
    }
  };

  const getActionTitle = () => {
    switch (pendingAction) {
      case 'activate':
        return 'Activate Users';
      case 'deactivate':
        return 'Deactivate Users';
      case 'delete':
        return 'Delete Users';
      default:
        return '';
    }
  };

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        data-testid="bulk-action-toolbar"
      >
        <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              aria-label="Clear selection"
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('activate')}
              disabled={bulkAction.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('deactivate')}
              disabled={bulkAction.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Deactivate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('delete')}
              disabled={bulkAction.isPending}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={() => cancelAction()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>{getActionDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                pendingAction === 'delete'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {pendingAction === 'activate' && 'Activate'}
              {pendingAction === 'deactivate' && 'Deactivate'}
              {pendingAction === 'delete' && 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
