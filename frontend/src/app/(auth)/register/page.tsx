'use client';

import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started with your free account today
        </p>
      </div>

      <RegisterForm showLoginLink />
    </div>
  );
}
