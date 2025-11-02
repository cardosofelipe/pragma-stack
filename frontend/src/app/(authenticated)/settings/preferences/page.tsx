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
      <h2 className="text-2xl font-semibold text-foreground mb-4">
        Preferences
      </h2>
      <p className="text-muted-foreground">
        Configure your preferences (Coming in Task 3.5)
      </p>
    </div>
  );
}
