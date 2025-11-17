// src/types/i18n.d.ts
/**
 * TypeScript type definitions for i18n with next-intl.
 *
 * This file configures TypeScript autocomplete for translation keys.
 * By importing the English messages as the reference type, we get:
 * - Full autocomplete for all translation keys
 * - Type safety when using t() function
 * - Compile-time errors for missing or incorrect keys
 *
 * Usage:
 * ```tsx
 * const t = useTranslations('auth.login');
 * t('title'); // ✅ Autocomplete shows available keys
 * t('invalid'); // ❌ TypeScript error
 * ```
 */

type Messages = typeof import('../../messages/en.json');

declare global {
  // Use type safe message keys with `next-intl`
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}
