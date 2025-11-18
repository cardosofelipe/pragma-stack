/**
 * AuthGuard Component
 * Protects routes by ensuring user is authenticated
 * Redirects to login if not authenticated, preserving return URL
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from '@/lib/i18n/routing';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMe } from '@/lib/api/hooks/useAuth';
import { AuthLoadingSkeleton } from '@/components/layout';
import config from '@/config/app.config';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
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
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // Delayed loading state - only show skeleton after 150ms to avoid flicker on fast loads
  const [showLoading, setShowLoading] = useState(false);

  // Fetch user data if authenticated but user not loaded
  const { isLoading: userLoading } = useMe();

  // Determine overall loading state
  const isLoading = authLoading || (isAuthenticated && !user && userLoading);

  // Delayed loading effect - wait 150ms before showing skeleton
  useEffect(() => {
    if (!isLoading) {
      // Reset immediately when loading completes
      setShowLoading(false);
      return;
    }

    // Set a timer to show loading skeleton after 150ms
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowLoading(true);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      // Preserve intended destination
      const returnUrl =
        pathname !== config.routes.login ? `?returnUrl=${encodeURIComponent(pathname)}` : '';

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

  // Show loading skeleton only after delay (prevents flicker on fast loads)
  if (isLoading && showLoading) {
    return fallback ? <>{fallback}</> : <AuthLoadingSkeleton />;
  }

  // Show nothing while loading but before delay threshold (prevents flicker)
  if (isLoading) {
    return null;
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
