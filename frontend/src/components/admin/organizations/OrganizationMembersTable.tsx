/**
 * OrganizationMembersTable Component
 * Displays paginated list of organization members with roles and actions
 */

'use client';

import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MemberActionMenu } from './MemberActionMenu';
import type { OrganizationMember, PaginationMeta } from '@/lib/api/hooks/useAdmin';

interface OrganizationMembersTableProps {
  members: OrganizationMember[];
  organizationId: string;
  pagination: PaginationMeta;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Role badge variant mapping
 */
const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (role) {
    case 'owner':
      return 'default';
    case 'admin':
      return 'secondary';
    case 'member':
      return 'outline';
    case 'guest':
      return 'destructive';
    default:
      return 'outline';
  }
};

/**
 * Capitalize first letter of role
 */
const formatRole = (role: string): string => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export function OrganizationMembersTable({
  members,
  organizationId,
  pagination,
  isLoading,
  onPageChange,
}: OrganizationMembersTableProps) {
  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[80px] mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : members.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              // Member rows
              members.map((member) => {
                const fullName = [member.first_name, member.last_name]
                  .filter(Boolean)
                  .join(' ') || <span className="text-muted-foreground italic">No name</span>;

                return (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell>{fullName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {formatRole(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(member.joined_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <MemberActionMenu member={member} organizationId={organizationId} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && members.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.page_size + 1} to{' '}
            {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
            {pagination.total} members
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
                      {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                      <Button
                        variant={page === pagination.page ? 'default' : 'outline'}
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
