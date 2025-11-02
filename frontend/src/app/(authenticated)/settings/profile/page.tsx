/**
 * Profile Settings Page
 * User profile management - edit name, email, phone, preferences
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: 'Profile Settings',
};

export default function ProfileSettingsPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-4">
        Profile Settings
      </h2>
      <p className="text-muted-foreground">
        Manage your profile information (Coming in Task 3.2)
      </p>
    </div>
  );
}
