/**
 * OrganizationActionMenu Component
 * Dropdown menu for organization row actions (Edit, View Members, Delete)
 */

'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Users, Trash } from 'lucide-react';
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
import { useDeleteOrganization, type Organization } from '@/lib/api/hooks/useAdmin';

interface OrganizationActionMenuProps {
  organization: Organization;
  onEdit?: (organization: Organization) => void;
  onViewMembers?: (organizationId: string) => void;
}

export function OrganizationActionMenu({
  organization,
  onEdit,
  onViewMembers,
}: OrganizationActionMenuProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const deleteOrganization = useDeleteOrganization();

  // istanbul ignore next - Delete handler fully tested in E2E (admin-organizations.spec.ts)
  const handleDelete = async () => {
    try {
      await deleteOrganization.mutateAsync(organization.id);
      toast.success(`${organization.name} has been deleted successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleEdit = () => {
    setDropdownOpen(false);
    if (onEdit) {
      onEdit(organization);
    }
  };

  const handleViewMembers = () => {
    setDropdownOpen(false);
    if (onViewMembers) {
      onViewMembers(organization.id);
    }
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={`Actions for ${organization.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Organization
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleViewMembers}>
            <Users className="mr-2 h-4 w-4" />
            View Members
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setConfirmDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {organization.name}? This action cannot be undone and
              will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
