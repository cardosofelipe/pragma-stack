/**
 * Admin Organization Members Page
 * Displays and manages members of a specific organization
 * Protected by AuthGuard in layout with requireAdmin=true
 */

import { Link } from '@/lib/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrganizationMembersContent } from '@/components/admin/organizations/OrganizationMembersContent';

// Re-export server-only metadata from separate, ignored file
export { metadata } from './metadata';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrganizationMembersPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Link href="/admin/organizations">
            <Button variant="outline" size="icon" aria-label="Back to Organizations">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        {/* Organization Members Content */}
        <OrganizationMembersContent organizationId={id} />
      </div>
    </div>
  );
}
