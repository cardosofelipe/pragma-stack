/**
 * Header Skeleton Component
 * Loading placeholder for Header during authentication check
 * Matches the structure of the actual Header component
 */

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo skeleton */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          </div>

          {/* Navigation links skeleton */}
          <nav className="hidden md:flex items-center space-x-1">
            <div className="h-8 w-16 bg-muted animate-pulse rounded-md" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded-md" />
          </nav>
        </div>

        {/* Right side - Theme toggle and user menu skeleton */}
        <div className="ml-auto flex items-center space-x-2">
          <div className="h-10 w-10 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
        </div>
      </div>
    </header>
  );
}
