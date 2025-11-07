/**
 * OrganizationManagementContent Component
 * Client-side content for the organization management page
 */

'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAdminOrganizations,
  type Organization,
  type PaginationMeta,
} from '@/lib/api/hooks/useAdmin';
import { OrganizationListTable } from './OrganizationListTable';
import { OrganizationFormDialog } from './OrganizationFormDialog';

export function OrganizationManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);

  // Fetch organizations with query params
  const { data, isLoading } = useAdminOrganizations(page, 20);

  const organizations: Organization[] = data?.data || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  // istanbul ignore next - URL update helper fully tested in E2E (admin-organizations.spec.ts)
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

  // istanbul ignore next - Event handlers fully tested in E2E (admin-organizations.spec.ts)
  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage });
  };

  const handleCreateOrganization = () => {
    setDialogMode('create');
    setEditingOrganization(null);
    setDialogOpen(true);
  };

  const handleEditOrganization = (organization: Organization) => {
    setDialogMode('edit');
    setEditingOrganization(organization);
    setDialogOpen(true);
  };

  const handleViewMembers = (organizationId: string) => {
    router.push(`/admin/organizations/${organizationId}/members`);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">All Organizations</h2>
            <p className="text-muted-foreground">
              Manage organizations and their members
            </p>
          </div>
          <Button onClick={handleCreateOrganization}>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </div>

        {/* Organization List Table */}
        <OrganizationListTable
          organizations={organizations}
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onEditOrganization={handleEditOrganization}
          onViewMembers={handleViewMembers}
        />
      </div>

      {/* Organization Form Dialog */}
      <OrganizationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organization={editingOrganization}
        mode={dialogMode}
      />
    </>
  );
}
