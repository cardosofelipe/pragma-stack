/**
 * Password Reset Request Page
 * Users enter their email to receive reset instructions
 */

'use client';

import { PasswordResetRequestForm } from '@/components/auth/PasswordResetRequestForm';

export default function PasswordResetPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll send you an email with instructions to reset your password
        </p>
      </div>

      <PasswordResetRequestForm showLoginLink />
    </div>
  );
}
