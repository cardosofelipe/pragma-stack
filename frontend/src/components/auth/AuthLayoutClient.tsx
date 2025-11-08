/**
 * AuthLayoutClient Component
 * Client-side wrapper for auth layout with theme toggle
 */

'use client';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface AuthLayoutClientProps {
  children: React.ReactNode;
}

export function AuthLayoutClient({ children }: AuthLayoutClientProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      {/* Theme toggle in top-right corner */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Auth card */}
      <div className="w-full max-w-md">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
