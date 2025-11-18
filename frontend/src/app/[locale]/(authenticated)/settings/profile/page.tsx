/**
 * Profile Settings Page
 * User profile management - edit name, email, and other profile information
 */

'use client';

import { ProfileSettingsForm } from '@/components/settings';

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Profile Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your profile information</p>
      </div>

      <ProfileSettingsForm />
    </div>
  );
}
