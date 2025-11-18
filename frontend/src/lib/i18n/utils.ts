// src/lib/i18n/utils.ts
/**
 * Utility functions for internationalization.
 *
 * This file provides pure utility functions for i18n without React dependencies.
 * For React hooks, see hooks.ts
 */

/**
 * Get the display name for a locale code.
 *
 * @param locale - The locale code ('en' or 'it')
 * @returns The human-readable locale name
 */
export function getLocaleName(locale: string): string {
  const names: Record<string, string> = {
    en: 'English',
    it: 'Italiano',
  };

  return names[locale] || names.en;
}

/**
 * Get the native display name for a locale code.
 * This shows the language name in its own language.
 *
 * @param locale - The locale code ('en' or 'it')
 * @returns The native language name
 */
export function getLocaleNativeName(locale: string): string {
  const names: Record<string, string> = {
    en: 'English',
    it: 'Italiano',
  };

  return names[locale] || names.en;
}

/**
 * Get the flag emoji for a locale.
 *
 * @param locale - The locale code ('en' or 'it')
 * @returns The flag emoji
 */
export function getLocaleFlag(locale: string): string {
  // Map to country flags (note: 'en' uses US flag, could be GB)
  const flags: Record<string, string> = {
    en: '🇺🇸', // or '🇬🇧' for British English
    it: '🇮🇹',
  };

  return flags[locale] || flags.en;
}

/**
 * Format a relative time string (e.g., "2 hours ago").
 * This is a placeholder for future implementation with next-intl's date/time formatting.
 *
 * @param date - The date to format
 * @param locale - The locale to use for formatting
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: Date, locale: string = 'en'): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return locale === 'it' ? 'proprio ora' : 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return locale === 'it'
      ? `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`
      : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return locale === 'it'
      ? `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`
      : `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return locale === 'it'
      ? `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`
      : `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
}
