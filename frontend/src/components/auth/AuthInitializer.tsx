/**
 * AuthInitializer Component
 * Loads authentication state from storage on app initialization
 * Must be a client component within the Providers tree
 */

'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * AuthInitializer - Initializes auth state from encrypted storage on mount
 *
 * This component should be included in the app's Providers to ensure
 * authentication state is restored from storage when the app loads.
 *
 * IMPORTANT: Uses useAuth() to respect dependency injection for testability.
 * Do NOT import useAuthStore directly - it bypasses the Context wrapper.
 *
 * @example
 * ```tsx
 * // In app/providers.tsx
 * export function Providers({ children }) {
 *   return (
 *     <QueryClientProvider>
 *       <AuthInitializer />
 *       {children}
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export function AuthInitializer() {
  const loadAuthFromStorage = useAuth((state) => state.loadAuthFromStorage);

  useEffect(() => {
    // Skip loading from storage in E2E tests - test store is already injected
    if (typeof window !== 'undefined' && (window as any).__E2E_TEST__) {
      return;
    }

    // Load auth state from encrypted storage on mount
    loadAuthFromStorage();
  }, [loadAuthFromStorage]);

  // This component doesn't render anything
  return null;
}
