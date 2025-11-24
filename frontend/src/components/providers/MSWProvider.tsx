/**
 * MSW Provider Component
 *
 * Initializes Mock Service Worker for demo mode
 * This component handles MSW setup in a Next.js-compatible way
 *
 * IMPORTANT: This is a client component that runs in the browser only
 * SAFE: Will not interfere with tests or development mode
 */

'use client';

import { useEffect, useState } from 'react';

/**
 * MSW initialization promise (cached)
 * Ensures MSW is only initialized once
 */
let mswInitPromise: Promise<void> | null = null;

function initMSW(): Promise<void> {
  // Return cached promise if already initialized
  if (mswInitPromise) {
    return mswInitPromise;
  }

  // Check if MSW should start
  const shouldStart =
    typeof window !== 'undefined' &&
    process.env.NODE_ENV !== 'test' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !(window as any).__PLAYWRIGHT_TEST__ &&
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!shouldStart) {
    // Return resolved promise, no-op
    mswInitPromise = Promise.resolve();
    return mswInitPromise;
  }

  // Initialize MSW (lazy import to avoid loading in non-demo mode)
  mswInitPromise = import('@/mocks')
    .then(({ initMocks }) => initMocks())
    .catch((error) => {
      console.error('[MSW] Failed to initialize:', error);
      // Reset promise so it can be retried
      mswInitPromise = null;
      throw error;
    });

  return mswInitPromise;
}

/**
 * MSW Provider Component
 *
 * Wraps children and ensures MSW is initialized before rendering
 * Uses React 19's `use()` hook for suspense-compatible async initialization
 */
export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize MSW on mount
    initMSW()
      .then(() => {
        setIsReady(true);
      })
      .catch((error) => {
        console.error('[MSW] Initialization failed:', error);
        // Still render children even if MSW fails (graceful degradation)
        setIsReady(true);
      });
  }, []);

  // Wait for MSW to be ready before rendering children
  // This prevents race conditions where API calls happen before MSW is ready
  if (!isReady) {
    return null; // or a loading spinner if you prefer
  }

  return <>{children}</>;
}
