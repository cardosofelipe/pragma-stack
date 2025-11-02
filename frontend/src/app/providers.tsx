'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { ThemeProvider } from '@/components/theme';
import { AuthInitializer } from '@/components/auth';

// Lazy load devtools - only in local development (not in Docker), never in production
// Set NEXT_PUBLIC_ENABLE_DEVTOOLS=true in .env.local to enable
/* istanbul ignore next - Dev-only devtools, not tested in production */
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((mod) => ({
          default: mod.ReactQueryDevtools,
        }))
      )
    : null;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false, // Disabled - use selective refetching per query
            refetchOnReconnect: true, // Keep for session data
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
        {children}
        {ReactQueryDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
