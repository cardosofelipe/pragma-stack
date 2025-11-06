/**
 * DashboardStats Component
 * Displays admin dashboard statistics in stat cards
 */

'use client';

import { useAdminStats } from '@/lib/api/hooks/useAdmin';
import { StatCard } from './StatCard';
import { Users, UserCheck, Building2, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function DashboardStats() {
  const { data: stats, isLoading, isError, error } = useAdminStats();

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>
          Failed to load dashboard statistics: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      data-testid="dashboard-stats"
    >
      <StatCard
        title="Total Users"
        value={stats?.totalUsers ?? 0}
        icon={Users}
        description="All registered users"
        loading={isLoading}
      />
      <StatCard
        title="Active Users"
        value={stats?.activeUsers ?? 0}
        icon={UserCheck}
        description="Users with active status"
        loading={isLoading}
      />
      <StatCard
        title="Organizations"
        value={stats?.totalOrganizations ?? 0}
        icon={Building2}
        description="Total organizations"
        loading={isLoading}
      />
      <StatCard
        title="Active Sessions"
        value={stats?.totalSessions ?? 0}
        icon={Activity}
        description="Current active sessions"
        loading={isLoading}
      />
    </div>
  );
}
