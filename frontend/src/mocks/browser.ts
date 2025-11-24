/**
 * MSW Browser Setup
 *
 * Configures Mock Service Worker for browser environment.
 * This intercepts network requests at the network layer, making it transparent to the app.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Create MSW worker with all handlers
 * This worker intercepts fetch/XHR requests in the browser
 */
export const worker = setupWorker(...handlers);

/**
 * Check if MSW should be started
 * Only runs when ALL conditions are met:
 * - In browser (not SSR)
 * - NOT in Jest test environment
 * - NOT in Playwright E2E tests
 * - Demo mode explicitly enabled
 */
function shouldStartMSW(): boolean {
  if (typeof window === 'undefined') {
    return false; // SSR, skip
  }

  // Skip Jest unit tests
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  // Skip Playwright E2E tests (uses your existing __PLAYWRIGHT_TEST__ flag)
  if ((window as any).__PLAYWRIGHT_TEST__) {
    return false;
  }

  // Only start if demo mode is explicitly enabled
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Start MSW for demo mode
 * SAFE: Will not interfere with unit tests or E2E tests
 */
export async function startMockServiceWorker() {
  if (!shouldStartMSW()) {
    // Silently skip - this is normal for dev/test environments
    return;
  }

  try {
    await worker.start({
      onUnhandledRequest: 'warn', // Warn about unmocked requests
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });

    console.log('%c[MSW] Demo Mode Active', 'color: #00bfa5; font-weight: bold;');
    console.log('[MSW] All API calls are mocked (no backend required)');
    console.log('[MSW] Demo credentials:');
    console.log('  Regular user: demo@example.com / DemoPass123');
    console.log('  Admin user: admin@example.com / AdminPass123');
  } catch (error) {
    console.error('[MSW] Failed to start Mock Service Worker:', error);
    console.error('[MSW] Demo mode will not work correctly');
  }
}
