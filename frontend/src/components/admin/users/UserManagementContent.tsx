/**
 * UserManagementContent Component
 * Client-side content for the user management page
 */

'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminUsers, type User, type PaginationMeta } from '@/lib/api/hooks/useAdmin';
import { UserListTable } from './UserListTable';
import { UserFormDialog } from './UserFormDialog';
import { BulkActionToolbar } from './BulkActionToolbar';

export function UserManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  // URL state
  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';
  const filterActive = searchParams.get('active') || null;
  const filterSuperuser = searchParams.get('superuser') || null;

  // Convert filter strings to booleans for API
  const isActiveFilter = filterActive === 'true' ? true : filterActive === 'false' ? false : null;
  const isSuperuserFilter =
    filterSuperuser === 'true' ? true : filterSuperuser === 'false' ? false : null;

  // Local state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Fetch users with query params
  const { data, isLoading } = useAdminUsers(
    page,
    20,
    searchQuery || null,
    isActiveFilter,
    isSuperuserFilter
  );

  const users: User[] = data?.data || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  // istanbul ignore next - URL update helper fully tested in E2E (admin-users.spec.ts)
  // URL update helper
  const updateURL = useCallback(
    (params: Record<string, string | number | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });

      router.push(`?${newParams.toString()}`);
    },
    [searchParams, router]
  );

  // istanbul ignore next - Event handlers fully tested in E2E (admin-users.spec.ts)
  // Handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // istanbul ignore next - Event handlers fully tested in E2E (admin-users.spec.ts)
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const selectableUsers = users.filter((u) => u.id !== currentUser?.id).map((u) => u.id);
      setSelectedUsers(selectableUsers);
    } else {
      setSelectedUsers([]);
    }
  };

  // istanbul ignore next - Event handlers fully tested in E2E (admin-users.spec.ts)
  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage });
    setSelectedUsers([]); // Clear selection on page change
  };

  // istanbul ignore next - Event handlers fully tested in E2E (admin-users.spec.ts)
  const handleSearch = (search: string) => {
    updateURL({ search, page: 1 }); // Reset to page 1 on search
    setSelectedUsers([]);
  };

  // istanbul ignore next - Event handlers fully tested in E2E (admin-users.spec.ts)
  const handleFilterActive = (filter: string | null) => {
    updateURL({ active: filter === 'all' ? null : filter, page: 1 });
    setSelectedUsers([]);
  };

  // istanbul ignore next - Event handlers fully tested in E2E (admin-users.spec.ts)
  const handleFilterSuperuser = (filter: string | null) => {
    updateURL({ superuser: filter === 'all' ? null : filter, page: 1 });
    setSelectedUsers([]);
  };

  const handleCreateUser = () => {
    setDialogMode('create');
    setEditingUser(null);
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setDialogMode('edit');
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">All Users</h2>
            <p className="text-muted-foreground">Manage user accounts and permissions</p>
          </div>
          <Button onClick={handleCreateUser}>
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>

        {/* User List Table */}
        <UserListTable
          users={users}
          pagination={pagination}
          isLoading={isLoading}
          selectedUsers={selectedUsers}
          onSelectUser={handleSelectUser}
          onSelectAll={handleSelectAll}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          onFilterActive={handleFilterActive}
          onFilterSuperuser={handleFilterSuperuser}
          onEditUser={handleEditUser}
          currentUserId={currentUser?.id}
        />
      </div>

      {/* User Form Dialog */}
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
        mode={dialogMode}
      />

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedUsers.length}
        onClearSelection={handleClearSelection}
        selectedUserIds={selectedUsers}
      />
    </>
  );
}
