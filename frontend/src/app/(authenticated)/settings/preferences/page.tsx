/**
 * User Preferences Page
 * Theme, notifications, and other preferences
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata} from 'next';

/* istanbul ignore next - Next.js metadata, not executable code */
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
