/**
 * Password Settings Page
 * Change password functionality
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: 'Password Settings',
};

export default function PasswordSettingsPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-4">
        Password Settings
      </h2>
      <p className="text-muted-foreground">
        Change your password (Coming in Task 3.3)
      </p>
    </div>
  );
}
