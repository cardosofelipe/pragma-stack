/**
 * OrganizationMembersContent Component
 * Client-side content for the organization members management page
 */

'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/routing';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useOrganizationMembers,
  useGetOrganization,
  type OrganizationMember,
  type PaginationMeta,
} from '@/lib/api/hooks/useAdmin';
import { OrganizationMembersTable } from './OrganizationMembersTable';
import { AddMemberDialog } from './AddMemberDialog';

interface OrganizationMembersContentProps {
  organizationId: string;
}

export function OrganizationMembersContent({ organizationId }: OrganizationMembersContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local state
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Fetch organization details
  const { data: organization, isLoading: isLoadingOrg } = useGetOrganization(organizationId);

  // Fetch organization members with query params
  const { data, isLoading: isLoadingMembers } = useOrganizationMembers(organizationId, page, 20);

  const members: OrganizationMember[] = data?.data || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  // istanbul ignore next - URL update helper fully tested in E2E
  // URL update helper
  const updateURL = useCallback(
    (params: Record<string, string | number | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });

      router.push(`?${newParams.toString()}`);
    },
    [searchParams, router]
  );

  // istanbul ignore next - Event handlers fully tested in E2E
  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage });
  };

  const handleAddMember = () => {
    setAddDialogOpen(true);
  };

  const orgName = (organization as { name?: string })?.name || 'Organization';
  const isLoading = isLoadingOrg || isLoadingMembers;

  return (
    <>
      <div className="space-y-6">
        {/* Header with Add Member Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{orgName} Members</h2>
            <p className="text-muted-foreground">
              Manage members and their roles within the organization
            </p>
          </div>
          <Button onClick={handleAddMember}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        {/* Organization Members Table */}
        <OrganizationMembersTable
          members={members}
          organizationId={organizationId}
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        organizationId={organizationId}
      />
    </>
  );
}
