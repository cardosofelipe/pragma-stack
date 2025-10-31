'use client';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Access your dashboard and manage your account
        </p>
      </div>

      <LoginForm
        showRegisterLink
        showPasswordResetLink
      />
    </div>
  );
}
