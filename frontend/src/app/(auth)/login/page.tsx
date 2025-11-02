'use client';

import dynamic from 'next/dynamic';

// Code-split LoginForm - heavy with react-hook-form + validation
const LoginForm = dynamic(
  () => import('@/components/auth/LoginForm').then((mod) => ({ default: mod.LoginForm })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-muted rounded" />
        <div className="animate-pulse h-10 bg-muted rounded" />
        <div className="animate-pulse h-10 bg-primary/20 rounded" />
      </div>
    ),
  }
);

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
