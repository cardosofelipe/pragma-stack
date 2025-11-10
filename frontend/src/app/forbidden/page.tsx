/**
 * 403 Forbidden Page
 * Displayed when users try to access resources they don't have permission for
 */

/* istanbul ignore next - Next.js type import for metadata */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* istanbul ignore next - Next.js metadata, not executable code */
export const metadata: Metadata = {
  title: '403 - Forbidden',
  description: 'You do not have permission to access this resource',
};

export default function ForbiddenPage() {
  return (
    <div className="container mx-auto px-6 py-16">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-8 rounded-full bg-destructive/10 p-6">
          <ShieldAlert className="h-16 w-16 text-destructive" aria-hidden="true" />
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight">403 - Access Forbidden</h1>

        <p className="mb-2 text-lg text-muted-foreground max-w-md">
          You don&apos;t have permission to access this resource.
        </p>

        <p className="mb-8 text-sm text-muted-foreground max-w-md">
          This page requires administrator privileges. If you believe you should have access, please
          contact your system administrator.
        </p>

        <div className="flex gap-4">
          <Button asChild variant="default">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
