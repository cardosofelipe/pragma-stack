/**
 * Locale-aware metadata utilities
 * Generates SEO-optimized metadata with proper internationalization
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export type Locale = 'en' | 'it';

/**
 * Base site configuration for metadata
 */
export const siteConfig = {
  name: {
    en: 'FastNext Template',
    it: 'FastNext Template',
  },
  description: {
    en: 'Production-ready FastAPI + Next.js full-stack template with authentication, admin panel, and comprehensive testing',
    it: 'Template full-stack pronto per produzione con FastAPI + Next.js con autenticazione, pannello admin e test completi',
  },
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ogImage: '/og-image.png',
} as const;

/**
 * Generate locale-aware metadata for pages
 * Includes Open Graph, Twitter Cards, and language alternates
 */
export async function generateLocalizedMetadata(
  locale: Locale,
  options?: {
    titleKey?: string;
    descriptionKey?: string;
    namespace?: string;
    path?: string;
  }
): Promise<Metadata> {
  const { titleKey, descriptionKey, namespace = 'common', path = '' } = options || {};

  // Get translations if keys provided, otherwise use site defaults
  let title: string = siteConfig.name[locale];
  let description: string = siteConfig.description[locale];

  if (titleKey || descriptionKey) {
    const t = await getTranslations({ locale, namespace });
    if (titleKey) {
      title = t(titleKey);
    }
    if (descriptionKey) {
      description = t(descriptionKey);
    }
  }

  const url = `${siteConfig.url}/${locale}${path}`;

  return {
    title,
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
      languages: {
        en: path || '/',
        it: `/it${path || '/'}`,
        'x-default': path || '/',
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name[locale],
      locale: locale === 'en' ? 'en_US' : 'it_IT',
      type: 'website',
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generate metadata for a specific page with custom title and description
 */
export async function generatePageMetadata(
  locale: Locale,
  title: string,
  description: string,
  path?: string
): Promise<Metadata> {
  const url = `${siteConfig.url}/${locale}${path || ''}`;

  return {
    title,
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
      languages: {
        en: `${path || '/'}`,
        it: `/it${path || '/'}`,
        'x-default': `${path || '/'}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name[locale],
      locale: locale === 'en' ? 'en_US' : 'it_IT',
      type: 'website',
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
