/**
 * Admin Settings Page
 * System-wide settings and configuration
 * Protected by AuthGuard in layout with requireAdmin=true
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: 'System Settings',
};

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-6">
        {/* Back Button + Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon" aria-label="Back to Admin Dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Configure system-wide settings and preferences
            </p>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">System Settings Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This page will allow you to configure system-wide settings, preferences, and advanced
            options.
          </p>
          <p className="text-sm text-muted-foreground mt-4">Features will include:</p>
          <ul className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto text-left">
            <li>• General system configuration</li>
            <li>• Email and notification settings</li>
            <li>• Security and authentication options</li>
            <li>• API and integration settings</li>
            <li>• Maintenance and backup tools</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
