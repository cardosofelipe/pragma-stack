/**
 * Password Settings Page
 * Secure password change functionality for authenticated users
 */

'use client';

import { PasswordChangeForm } from '@/components/settings';

export default function PasswordSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Password Settings
        </h2>
        <p className="text-muted-foreground mt-1">
          Change your password to keep your account secure
        </p>
      </div>

      <PasswordChangeForm />
    </div>
  );
}
