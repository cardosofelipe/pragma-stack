import { MetadataRoute } from 'next';

/**
 * Generate robots.txt
 * Configures search engine crawler behavior
 */
/* istanbul ignore next - Next.js metadata route covered by e2e tests */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Disallow authenticated routes
        disallow: ['/admin/', '/settings/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
