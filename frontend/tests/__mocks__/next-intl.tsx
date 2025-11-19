/**
 * Mock for next-intl
 */

export const useLocale = jest.fn(() => 'en');
export const useTranslations = jest.fn(() => (key: string) => key);
export const NextIntlClientProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const useFormatter = jest.fn(() => ({}));
export const useMessages = jest.fn(() => ({}));
export const useNow = jest.fn(() => new Date());
export const useTimeZone = jest.fn(() => 'UTC');
