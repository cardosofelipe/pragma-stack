/**
 * Session Management Page
 * View and manage active sessions across devices
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';

/* istanbul ignore next - Next.js metadata, not executable code */
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
