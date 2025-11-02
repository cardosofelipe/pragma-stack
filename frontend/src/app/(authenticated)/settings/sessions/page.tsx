/**
 * Session Management Page
 * View and manage active sessions across devices
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Active Sessions',
};

export default function SessionsPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-4">
        Active Sessions
      </h2>
      <p className="text-muted-foreground">
        Manage your active sessions (Coming in Task 3.4)
      </p>
    </div>
  );
}
