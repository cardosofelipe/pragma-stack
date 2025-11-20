/**
 * Admin Organizations Page
 * Displays and manages all organizations
 * Protected by AuthGuard in layout with requireAdmin=true
 */

import { Link } from '@/lib/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrganizationManagementContent } from '@/components/admin/organizations/OrganizationManagementContent';

// Re-export server-only metadata from separate, ignored file
export { metadata } from './metadata';

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
