/**
 * Password Reset Confirm Page
 * Users set a new password using the token from their email
 */

import { Suspense } from 'react';
import PasswordResetConfirmContent from './PasswordResetConfirmContent';

export default function PasswordResetConfirmPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Set new password</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    }>
      <PasswordResetConfirmContent />
    </Suspense>
  );
}
