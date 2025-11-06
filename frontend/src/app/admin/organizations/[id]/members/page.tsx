/**
 * Admin Organization Members Page
 * Displays and manages members of a specific organization
 * Protected by AuthGuard in layout with requireAdmin=true
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrganizationMembersContent } from '@/components/admin/organizations/OrganizationMembersContent';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: 'Organization Members',
};

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
