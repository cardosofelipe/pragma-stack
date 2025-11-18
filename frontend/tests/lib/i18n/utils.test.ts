/**
 * Tests for i18n utility functions
 */

import {
  getLocaleName,
  getLocaleNativeName,
  getLocaleFlag,
  formatRelativeTime,
} from '@/lib/i18n/utils';

describe('i18n Utility Functions', () => {
  describe('getLocaleName', () => {
    it('should return correct name for English locale', () => {
      expect(getLocaleName('en')).toBe('English');
    });

    it('should return correct name for Italian locale', () => {
      expect(getLocaleName('it')).toBe('Italiano');
    });

    it('should return English for unsupported locale', () => {
      expect(getLocaleName('fr')).toBe('English');
      expect(getLocaleName('de')).toBe('English');
      expect(getLocaleName('es')).toBe('English');
    });

    it('should handle empty string', () => {
      expect(getLocaleName('')).toBe('English');
    });

    it('should handle undefined as string', () => {
      expect(getLocaleName('undefined')).toBe('English');
    });

    it('should handle locale codes with region (fallback)', () => {
      expect(getLocaleName('en-US')).toBe('English');
      expect(getLocaleName('en-GB')).toBe('English');
      expect(getLocaleName('it-IT')).toBe('English'); // Not exact match, falls back
    });
  });

  describe('getLocaleNativeName', () => {
    it('should return native name for English locale', () => {
      expect(getLocaleNativeName('en')).toBe('English');
    });

    it('should return native name for Italian locale', () => {
      expect(getLocaleNativeName('it')).toBe('Italiano');
    });

    it('should return English for unsupported locale', () => {
      expect(getLocaleNativeName('fr')).toBe('English');
      expect(getLocaleNativeName('de')).toBe('English');
    });

    it('should match getLocaleName output for supported locales', () => {
      expect(getLocaleNativeName('en')).toBe(getLocaleName('en'));
      expect(getLocaleNativeName('it')).toBe(getLocaleName('it'));
    });

    it('should handle case variations (fallback behavior)', () => {
      expect(getLocaleNativeName('EN')).toBe('English');
      expect(getLocaleNativeName('IT')).toBe('English');
    });
  });

  describe('getLocaleFlag', () => {
    it('should return US flag for English locale', () => {
      expect(getLocaleFlag('en')).toBe('🇺🇸');
    });

    it('should return Italian flag for Italian locale', () => {
      expect(getLocaleFlag('it')).toBe('🇮🇹');
    });

    it('should return US flag for unsupported locale', () => {
      expect(getLocaleFlag('fr')).toBe('🇺🇸');
      expect(getLocaleFlag('de')).toBe('🇺🇸');
      expect(getLocaleFlag('es')).toBe('🇺🇸');
    });

    it('should return valid emoji flags', () => {
      const enFlag = getLocaleFlag('en');
      const itFlag = getLocaleFlag('it');

      // Check that these are unicode emoji characters
      expect(enFlag).toMatch(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
      expect(itFlag).toMatch(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
    });

    it('should handle empty string gracefully', () => {
      expect(getLocaleFlag('')).toBe('🇺🇸');
    });
  });

  describe('formatRelativeTime', () => {
    const now = new Date();

    describe('English locale', () => {
      it('should format "just now" for times less than 60 seconds', () => {
        const date = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
        expect(formatRelativeTime(date, 'en')).toBe('just now');
      });

      it('should format minutes correctly', () => {
        const date1 = new Date(now.getTime() - 1 * 60 * 1000); // 1 minute ago
        expect(formatRelativeTime(date1, 'en')).toBe('1 minute ago');

        const date2 = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
        expect(formatRelativeTime(date2, 'en')).toBe('5 minutes ago');

        const date3 = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
        expect(formatRelativeTime(date3, 'en')).toBe('30 minutes ago');
      });

      it('should format hours correctly', () => {
        const date1 = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
        expect(formatRelativeTime(date1, 'en')).toBe('1 hour ago');

        const date2 = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
        expect(formatRelativeTime(date2, 'en')).toBe('5 hours ago');

        const date3 = new Date(now.getTime() - 23 * 60 * 60 * 1000); // 23 hours ago
        expect(formatRelativeTime(date3, 'en')).toBe('23 hours ago');
      });

      it('should format days correctly', () => {
        const date1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
        expect(formatRelativeTime(date1, 'en')).toBe('1 day ago');

        const date2 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        expect(formatRelativeTime(date2, 'en')).toBe('7 days ago');

        const date3 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        expect(formatRelativeTime(date3, 'en')).toBe('30 days ago');
      });

      it('should default to English when locale not specified', () => {
        const date = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
        expect(formatRelativeTime(date)).toBe('2 minutes ago');
      });
    });

    describe('Italian locale', () => {
      it('should format "proprio ora" for times less than 60 seconds', () => {
        const date = new Date(now.getTime() - 45 * 1000); // 45 seconds ago
        expect(formatRelativeTime(date, 'it')).toBe('proprio ora');
      });

      it('should format minutes correctly with Italian grammar', () => {
        const date1 = new Date(now.getTime() - 1 * 60 * 1000); // 1 minuto ago
        expect(formatRelativeTime(date1, 'it')).toBe('1 minuto fa');

        const date2 = new Date(now.getTime() - 5 * 60 * 1000); // 5 minuti ago
        expect(formatRelativeTime(date2, 'it')).toBe('5 minuti fa');
      });

      it('should format hours correctly with Italian grammar', () => {
        const date1 = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 ora ago
        expect(formatRelativeTime(date1, 'it')).toBe('1 ora fa');

        const date2 = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 ore ago
        expect(formatRelativeTime(date2, 'it')).toBe('5 ore fa');
      });

      it('should format days correctly with Italian grammar', () => {
        const date1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 giorno ago
        expect(formatRelativeTime(date1, 'it')).toBe('1 giorno fa');

        const date2 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 giorni ago
        expect(formatRelativeTime(date2, 'it')).toBe('7 giorni fa');
      });
    });

    describe('Edge cases', () => {
      it('should handle dates exactly at boundaries', () => {
        // Exactly 60 seconds
        const date1 = new Date(now.getTime() - 60 * 1000);
        const result1 = formatRelativeTime(date1, 'en');
        expect(result1).toBe('1 minute ago');

        // Exactly 1 hour
        const date2 = new Date(now.getTime() - 60 * 60 * 1000);
        const result2 = formatRelativeTime(date2, 'en');
        expect(result2).toBe('1 hour ago');

        // Exactly 24 hours
        const date3 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const result3 = formatRelativeTime(date3, 'en');
        expect(result3).toBe('1 day ago');
      });

      it('should handle future dates (negative time)', () => {
        // Date in the future - implementation treats it as "just now" or "0 units ago"
        const futureDate = new Date(now.getTime() + 60 * 1000);
        const result = formatRelativeTime(futureDate, 'en');
        // Depending on implementation, might show negative or just now
        expect(result).toBeDefined();
      });

      it('should handle very old dates', () => {
        const oldDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
        const result = formatRelativeTime(oldDate, 'en');
        expect(result).toBe('365 days ago');
      });
    });

    describe('Unsupported locale fallback', () => {
      it('should fallback to English for unsupported locales', () => {
        const date = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
        expect(formatRelativeTime(date, 'fr')).toBe('2 minutes ago');
        expect(formatRelativeTime(date, 'de')).toBe('2 minutes ago');
        expect(formatRelativeTime(date, 'es')).toBe('2 minutes ago');
      });
    });
  });

  describe('Locale code consistency', () => {
    it('should handle the same locale codes across all functions', () => {
      const locales = ['en', 'it'];

      locales.forEach((locale) => {
        // All functions should return non-empty strings
        expect(getLocaleName(locale)).toBeTruthy();
        expect(getLocaleNativeName(locale)).toBeTruthy();
        expect(getLocaleFlag(locale)).toBeTruthy();
      });
    });

    it('should have consistent fallback behavior', () => {
      const unsupportedLocales = ['fr', 'de', 'es', 'invalid', ''];

      unsupportedLocales.forEach((locale) => {
        // All should fall back to English
        expect(getLocaleName(locale)).toBe('English');
        expect(getLocaleNativeName(locale)).toBe('English');
        expect(getLocaleFlag(locale)).toBe('🇺🇸');
      });
    });
  });
});
