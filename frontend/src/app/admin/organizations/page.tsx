/**
 * Admin Organizations Page
 * Displays and manages all organizations
 * Protected by AuthGuard in layout with requireAdmin=true
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrganizationManagementContent } from '@/components/admin/organizations/OrganizationManagementContent';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: 'Organizations',
};

export default function AdminOrganizationsPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon" aria-label="Back to Admin Dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        {/* Organization Management Content */}
        <OrganizationManagementContent />
      </div>
    </div>
  );
}
