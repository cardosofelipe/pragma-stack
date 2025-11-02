/**
 * Password Reset Request Page
 * Users enter their email to receive reset instructions
 */

'use client';

import dynamic from 'next/dynamic';

// Code-split PasswordResetRequestForm
const PasswordResetRequestForm = dynamic(
  () => import('@/components/auth/PasswordResetRequestForm').then((mod) => ({
    default: mod.PasswordResetRequestForm
  })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-muted rounded" />
        <div className="animate-pulse h-10 bg-primary/20 rounded" />
      </div>
    ),
  }
);

export default function PasswordResetPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Reset your password
        </h2>
        <p className="mt-2 text-muted-foreground">
          We&apos;ll send you an email with instructions to reset your password
        </p>
      </div>

      <PasswordResetRequestForm showLoginLink />
    </div>
  );
}
