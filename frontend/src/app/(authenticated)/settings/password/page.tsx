/**
 * Password Settings Page
 * Change password functionality
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Password Settings',
};

export default function PasswordSettingsPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        Password Settings
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Change your password (Coming in Task 3.3)
      </p>
    </div>
  );
}
