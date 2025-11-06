/**
 * UserListTable Component
 * Displays paginated list of users with search, filters, sorting, and bulk selection
 */

'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserActionMenu } from './UserActionMenu';
import type { User, PaginationMeta } from '@/lib/api/hooks/useAdmin';

interface UserListTableProps {
  users: User[];
  pagination: PaginationMeta;
  isLoading: boolean;
  selectedUsers: string[];
  onSelectUser: (userId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onFilterActive: (filter: string | null) => void;
  onFilterSuperuser: (filter: string | null) => void;
  onEditUser?: (user: User) => void;
  currentUserId?: string;
}

export function UserListTable({
  users,
  pagination,
  isLoading,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onPageChange,
  onSearch,
  onFilterActive,
  onFilterSuperuser,
  onEditUser,
  currentUserId,
}: UserListTableProps) {
  const [searchValue, setSearchValue] = useState('');

  // Debounce search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const timeoutId = setTimeout(() => {
        onSearch(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [onSearch]
  );

  const allSelected =
    users.length > 0 && users.every((user) => selectedUsers.includes(user.id));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Search by name or email..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-sm"
          />
          <Select onValueChange={onFilterActive}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={onFilterSuperuser}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="true">Superusers</SelectItem>
              <SelectItem value="false">Regular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all users"
                  disabled={isLoading || users.length === 0}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Superuser</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[60px] mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-4 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No users found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              // User rows
              users.map((user) => {
                const isCurrentUser = currentUserId === user.id;
                const fullName = user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.first_name;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => onSelectUser(user.id)}
                        aria-label={`Select ${fullName}`}
                        disabled={isCurrentUser}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {fullName}
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={user.is_active ? 'default' : 'secondary'}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.is_superuser ? (
                        <Check
                          className="h-4 w-4 mx-auto text-green-600"
                          aria-label="Yes"
                        />
                      ) : (
                        <X
                          className="h-4 w-4 mx-auto text-muted-foreground"
                          aria-label="No"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <UserActionMenu
                        user={user}
                        isCurrentUser={isCurrentUser}
                        onEdit={onEditUser}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && users.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.page_size + 1} to{' '}
            {Math.min(
              pagination.page * pagination.page_size,
              pagination.total
            )}{' '}
            of {pagination.total} users
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.has_prev}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === pagination.total_pages ||
                    Math.abs(page - pagination.page) <= 1
                )
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={
                          page === pagination.page ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className="w-9"
                      >
                        {page}
                      </Button>
                    </div>
                  );
                })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.has_next}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
