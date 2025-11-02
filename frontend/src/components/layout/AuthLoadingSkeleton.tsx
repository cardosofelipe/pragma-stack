/**
 * Auth Loading Skeleton
 * Loading placeholder shown during authentication check
 * Mimics the authenticated layout structure for smooth loading experience
 */

import { HeaderSkeleton } from './HeaderSkeleton';
import { Footer } from './Footer';

export function AuthLoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <HeaderSkeleton />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Page title skeleton */}
          <div className="mb-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
