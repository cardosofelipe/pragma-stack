import { MetadataRoute } from 'next';
import { routing } from '@/lib/i18n/routing';

/**
 * Generate multilingual sitemap
 * Includes all public routes for each supported locale
 */
/* istanbul ignore next - Next.js metadata route covered by e2e tests */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Define public routes that should be in sitemap
  const publicRoutes = [
    '', // homepage
    '/login',
    '/register',
    '/password-reset',
    '/demos',
    '/dev',
    '/dev/components',
    '/dev/layouts',
    '/dev/forms',
    '/dev/docs',
  ];

  // Generate sitemap entries for each locale
  const sitemapEntries: MetadataRoute.Sitemap = [];

  routing.locales.forEach((locale) => {
    publicRoutes.forEach((route) => {
      const path = route === '' ? `/${locale}` : `/${locale}${route}`;

      sitemapEntries.push({
        url: `${baseUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
        // Language alternates for this URL
        alternates: {
          languages: {
            en: `${baseUrl}/en${route}`,
            it: `${baseUrl}/it${route}`,
          },
        },
      });
    });
  });

  return sitemapEntries;
}
