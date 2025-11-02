/**
 * AuthInitializer Component
 * Loads authentication state from storage on app initialization
 * Must be a client component within the Providers tree
 */

'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

/**
 * AuthInitializer - Initializes auth state from encrypted storage on mount
 *
 * This component should be included in the app's Providers to ensure
 * authentication state is restored from storage when the app loads.
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
  const loadAuthFromStorage = useAuthStore((state) => state.loadAuthFromStorage);

  useEffect(() => {
    // Load auth state from encrypted storage on mount
    loadAuthFromStorage();
  }, [loadAuthFromStorage]);

  // This component doesn't render anything
  return null;
}
