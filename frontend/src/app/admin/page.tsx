/**
 * Admin Dashboard Page
 * Displays admin statistics and management options
 * Protected by AuthGuard in layout with requireAdmin=true
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';
import Link from 'next/link';
import { DashboardStats } from '@/components/admin';
import {
  UserGrowthChart,
  OrganizationDistributionChart,
  SessionActivityChart,
  UserStatusChart,
} from '@/components/charts';
import { Users, Building2, Settings } from 'lucide-react';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

export default function AdminPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Manage users, organizations, and system settings
          </p>
        </div>

        {/* Stats Grid */}
        <DashboardStats />

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/admin/users" className="block">
              <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">User Management</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  View, create, and manage user accounts
                </p>
              </div>
            </Link>

            <Link href="/admin/organizations" className="block">
              <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">Organizations</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage organizations and their members
                </p>
              </div>
            </Link>

            <Link href="/admin/settings" className="block">
              <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">System Settings</h3>
                </div>
                <p className="text-sm text-muted-foreground">Configure system-wide settings</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Analytics Charts */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Analytics Overview</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <UserGrowthChart />
            <SessionActivityChart />
            <OrganizationDistributionChart />
            <UserStatusChart />
          </div>
        </div>
      </div>
    </div>
  );
}
