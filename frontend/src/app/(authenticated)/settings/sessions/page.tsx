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
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        Active Sessions
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Manage your active sessions (Coming in Task 3.4)
      </p>
    </div>
  );
}
