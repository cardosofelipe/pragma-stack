/**
 * Mock Service Worker (MSW) Setup
 *
 * Initializes MSW for demo mode when NEXT_PUBLIC_DEMO_MODE=true
 * SAFE: Will not run during tests or development mode
 *
 * Usage:
 * - Development (default): Uses real backend at localhost:8000
 * - Demo mode: Set NEXT_PUBLIC_DEMO_MODE=true to use MSW
 * - Tests: MSW never initializes (Jest uses existing mocks, Playwright uses page.route())
 */

export { startMockServiceWorker as initMocks } from './browser';
export { handlers } from './handlers';
export { worker } from './browser';

// Export mock data for testing purposes
export * from './data/users';
export * from './data/organizations';
export * from './data/stats';
