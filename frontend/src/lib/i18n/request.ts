/* istanbul ignore file - Server-only next-intl middleware covered by E2E */
// src/i18n/request.ts
/**
 * Server-side i18n request configuration for next-intl.
 *
 * This file handles:
 * - Loading translation messages for the requested locale
 * - Server-side locale detection
 * - Time zone configuration
 *
 * Important:
 * - This runs on the server only (Next.js App Router)
 * - Translation files are NOT sent to the client (zero bundle overhead)
 * - Messages are loaded on-demand per request
 */

import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';

/* istanbul ignore next - Server-side middleware configuration covered by e2e tests */
export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  // Type assertion: we know locale will be a string from the URL parameter
  const requestedLocale = locale as 'en' | 'it';

  // Check if the requested locale is supported, otherwise use default
  const validLocale = routing.locales.includes(requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  return {
    // Return the validated locale
    locale: validLocale,

    // Load messages for the requested locale
    // Dynamic import ensures only the requested locale is loaded
    messages: (await import(`../../../messages/${validLocale}.json`)).default,

    // Optional: Configure time zone
    // This will be used for date/time formatting
    // timeZone: 'Europe/Rome', // Example for Italian users

    // Optional: Configure now (for relative time formatting)
    // now: new Date(),
  };
});
