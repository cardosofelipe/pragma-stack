/**
 * Admin Dashboard Page
 * Placeholder for future admin functionality
 * Protected by AuthGuard in layout with requireAdmin=true
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage users, organizations, and system settings
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold text-lg mb-2">Users</h3>
            <p className="text-sm text-muted-foreground">
              Manage user accounts and permissions
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Coming soon...
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold text-lg mb-2">Organizations</h3>
            <p className="text-sm text-muted-foreground">
              View and manage organizations
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Coming soon...
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold text-lg mb-2">System</h3>
            <p className="text-sm text-muted-foreground">
              System settings and configuration
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
