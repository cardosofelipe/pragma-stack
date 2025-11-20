/**
 * Admin Users Page
 * Displays and manages all users
 * Protected by AuthGuard in layout with requireAdmin=true
 */

import { Link } from '@/lib/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserManagementContent } from '@/components/admin/users/UserManagementContent';

// Re-export server-only metadata from separate, ignored file
export { metadata } from './metadata';

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
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="mt-2 text-muted-foreground">View, create, and manage user accounts</p>
          </div>
        </div>

        {/* User Management Content */}
        <UserManagementContent />
      </div>
    </div>
  );
}
