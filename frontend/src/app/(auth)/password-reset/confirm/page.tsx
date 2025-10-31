/**
 * Password Reset Confirm Page
 * Users set a new password using the token from their email
 */

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { PasswordResetConfirmForm } from '@/components/auth/PasswordResetConfirmForm';
import { Alert } from '@/components/ui/alert';
import Link from 'next/link';

export default function PasswordResetConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  // Handle successful password reset
  const handleSuccess = () => {
    // Wait 3 seconds then redirect to login
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  };

  // If no token in URL, show error
  if (!token) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Invalid Reset Link
          </h2>
        </div>

        <Alert variant="destructive">
          <p className="text-sm">
            This password reset link is invalid or has expired. Please request a new
            password reset.
          </p>
        </Alert>

        <div className="text-center">
          <Link
            href="/password-reset"
            className="text-sm text-primary underline-offset-4 hover:underline font-medium"
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Set new password</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a strong password for your account
        </p>
      </div>

      <PasswordResetConfirmForm token={token} onSuccess={handleSuccess} showLoginLink />
    </div>
  );
}
