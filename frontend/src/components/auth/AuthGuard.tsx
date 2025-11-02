/**
 * AuthGuard Component
 * Protects routes by ensuring user is authenticated
 * Redirects to login if not authenticated, preserving return URL
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMe } from '@/lib/api/hooks/useAuth';
import config from '@/config/app.config';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * AuthGuard - Client component for route protection
 *
 * @param children - Protected content to render if authenticated
 * @param requireAdmin - If true, requires user to be admin (is_superuser)
 * @param fallback - Optional fallback component while loading
 *
 * @example
 * ```tsx
 * // In app/(authenticated)/layout.tsx
 * export default function AuthenticatedLayout({ children }) {
 *   return (
 *     <AuthGuard>
 *       {children}
 *     </AuthGuard>
 *   );
 * }
 *
 * // For admin routes
 * export default function AdminLayout({ children }) {
 *   return (
 *     <AuthGuard requireAdmin>
 *       {children}
 *     </AuthGuard>
 *   );
 * }
 * ```
 */
export function AuthGuard({ children, requireAdmin = false, fallback }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();

  // Fetch user data if authenticated but user not loaded
  const { isLoading: userLoading } = useMe();

  // Determine overall loading state
  const isLoading = authLoading || (isAuthenticated && !user && userLoading);

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      // Preserve intended destination
      const returnUrl = pathname !== config.routes.login
        ? `?returnUrl=${encodeURIComponent(pathname)}`
        : '';

      router.push(`${config.routes.login}${returnUrl}`);
    }
    // Note: 401 errors are handled by API interceptor which clears auth and redirects
  }, [isLoading, isAuthenticated, pathname, router]);

  // Check admin requirement
  useEffect(() => {
    if (requireAdmin && isAuthenticated && user && !user.is_superuser) {
      // User is authenticated but not admin
      console.warn('Access denied: Admin privileges required');
      // TODO: Create dedicated 403 Forbidden page in Phase 4
      router.push(config.routes.home);
    }
  }, [requireAdmin, isAuthenticated, user, router]);

  // Show loading state
  if (isLoading) {
    return fallback ? <>{fallback}</> : <LoadingSpinner />;
  }

  // Show nothing if redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Check admin requirement
  if (requireAdmin && !user?.is_superuser) {
    return null; // Will redirect via useEffect
  }

  // Render protected content
  return <>{children}</>;
}
