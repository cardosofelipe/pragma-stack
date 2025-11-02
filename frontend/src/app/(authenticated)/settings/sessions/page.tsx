/**
 * Session Management Page
 * View and manage active sessions across all devices
 */

'use client';

import { SessionsManager } from '@/components/settings';

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Active Sessions
        </h2>
        <p className="text-muted-foreground mt-1">
          View and manage devices signed in to your account
        </p>
      </div>

      <SessionsManager />
    </div>
  );
}
