/**
 * Admin Users Page
 * Displays and manages all users
 * Protected by AuthGuard in layout with requireAdmin=true
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: 'User Management',
};

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-6">
        {/* Back Button + Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="mt-2 text-muted-foreground">
              View, create, and manage user accounts
            </p>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">
            User Management Coming Soon
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This page will allow you to view all users, create new accounts,
            manage permissions, and perform bulk operations.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Features will include:
          </p>
          <ul className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto text-left">
            <li>• User list with search and filtering</li>
            <li>• Create/edit/delete user accounts</li>
            <li>• Activate/deactivate users</li>
            <li>• Role and permission management</li>
            <li>• Bulk operations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
