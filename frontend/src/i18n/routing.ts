// src/i18n/routing.ts
/**
 * Internationalization routing configuration for next-intl.
 *
 * This file defines:
 * - Supported locales (en, it)
 * - Default locale (en)
 * - Routing strategy (subdirectory pattern: /[locale]/path)
 *
 * Architecture Decision:
 * - Using subdirectory pattern (/en/about, /it/about) for best SEO
 * - Only 2 languages (EN, IT) as template showcase
 * - Users can extend by adding more locales to this configuration
 */

import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

/**
 * Routing configuration for next-intl.
 *
 * Pattern: /[locale]/[pathname]
 * Examples:
 * - /en/about
 * - /it/about
 * - /en/auth/login
 * - /it/auth/login
 */
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'it'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Locale prefix strategy
  // - "always": Always show locale in URL (/en/about, /it/about)
  // - "as-needed": Only show non-default locales (/about for en, /it/about for it)
  // We use "always" for clarity and consistency
  localePrefix: 'always',
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);

export type Locale = (typeof routing.locales)[number];
