/**
 * Profile Settings Page
 * User profile management - edit name, email, phone, preferences
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile Settings',
};

export default function ProfileSettingsPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        Profile Settings
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Manage your profile information (Coming in Task 3.2)
      </p>
    </div>
  );
}
