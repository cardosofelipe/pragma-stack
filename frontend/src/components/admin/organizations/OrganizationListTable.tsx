/**
 * OrganizationListTable Component
 * Displays paginated list of organizations with basic info and actions
 */

'use client';

import { format } from 'date-fns';
import { Users } from 'lucide-react';
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
import { OrganizationActionMenu } from './OrganizationActionMenu';
import type { Organization, PaginationMeta } from '@/lib/api/hooks/useAdmin';

interface OrganizationListTableProps {
  organizations: Organization[];
  pagination: PaginationMeta;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEditOrganization?: (organization: Organization) => void;
  onViewMembers?: (organizationId: string) => void;
}

export function OrganizationListTable({
  organizations,
  pagination,
  isLoading,
  onPageChange,
  onEditOrganization,
  onViewMembers,
}: OrganizationListTableProps) {
  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead className="text-center">Status</TableHead>
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
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[250px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[40px] mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[60px] mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : organizations.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No organizations found.
                </TableCell>
              </TableRow>
            ) : (
              // Organization rows
              organizations.map((org) => {
                return (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {org.description || (
                        <span className="text-muted-foreground italic">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => onViewMembers?.(org.id)}
                        className="inline-flex items-center gap-1 hover:text-primary"
                      >
                        <Users className="h-4 w-4" />
                        <span>{org.member_count}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={org.is_active ? 'default' : 'secondary'}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(org.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <OrganizationActionMenu
                        organization={org}
                        onEdit={onEditOrganization}
                        onViewMembers={onViewMembers}
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
      {!isLoading && organizations.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.page_size + 1} to{' '}
            {Math.min(
              pagination.page * pagination.page_size,
              pagination.total
            )}{' '}
            of {pagination.total} organizations
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
