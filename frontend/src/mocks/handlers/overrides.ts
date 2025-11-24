/**
 * MSW Handler Overrides
 *
 * Custom handlers that override or extend auto-generated ones.
 * Use this file for complex logic that can't be auto-generated.
 *
 * Examples:
 * - Complex validation logic
 * - Stateful interactions
 * - Error simulation scenarios
 * - Special edge cases
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * Custom handler overrides
 *
 * These handlers take precedence over generated ones.
 * Add custom implementations here as needed.
 */
export const overrideHandlers = [
  // Example: Custom error simulation for testing
  // http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
  //   // Simulate rate limiting 10% of the time
  //   if (Math.random() < 0.1) {
  //     return HttpResponse.json(
  //       { detail: 'Too many login attempts' },
  //       { status: 429 }
  //     );
  //   }
  //   // Otherwise, use generated handler (by not returning anything)
  // }),

  // Add your custom handlers here...
];
