/**
 * User Preferences Page
 * Theme, notifications, and other preferences
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preferences',
};

export default function PreferencesPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        Preferences
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Configure your preferences (Coming in Task 3.5)
      </p>
    </div>
  );
}
