/**
 * Tests for i18n metadata utilities
 */

import { generateLocalizedMetadata, generatePageMetadata, siteConfig } from '@/lib/i18n/metadata';

// Mock next-intl/server
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn(),
}));

import { getTranslations } from 'next-intl/server';

describe('metadata utilities', () => {
  const mockGetTranslations = getTranslations as jest.MockedFunction<typeof getTranslations>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('siteConfig', () => {
    it('should have correct structure', () => {
      expect(siteConfig).toHaveProperty('name');
      expect(siteConfig).toHaveProperty('description');
      expect(siteConfig).toHaveProperty('url');
      expect(siteConfig).toHaveProperty('ogImage');
    });

    it('should have English and Italian names', () => {
      expect(siteConfig.name.en).toBe('FastNext Template');
      expect(siteConfig.name.it).toBe('FastNext Template');
    });

    it('should have English and Italian descriptions', () => {
      expect(siteConfig.description.en).toContain('FastAPI');
      expect(siteConfig.description.it).toContain('FastAPI');
    });

    it('should have valid URL', () => {
      expect(siteConfig.url).toBeDefined();
      expect(typeof siteConfig.url).toBe('string');
    });

    it('should have ogImage path', () => {
      expect(siteConfig.ogImage).toBe('/og-image.png');
    });
  });

  describe('generateLocalizedMetadata', () => {
    it('should generate metadata with default site config for English', async () => {
      const metadata = await generateLocalizedMetadata('en');

      expect(metadata.title).toBe(siteConfig.name.en);
      expect(metadata.description).toBe(siteConfig.description.en);
      expect(metadata.metadataBase).toEqual(new URL(siteConfig.url));
    });

    it('should generate metadata with default site config for Italian', async () => {
      const metadata = await generateLocalizedMetadata('it');

      expect(metadata.title).toBe(siteConfig.name.it);
      expect(metadata.description).toBe(siteConfig.description.it);
    });

    it('should generate metadata with custom title from translations', async () => {
      const mockT = jest.fn((key: string) => {
        if (key === 'title') return 'Custom Title';
        return key;
      });
      mockGetTranslations.mockResolvedValue(mockT as any);

      const metadata = await generateLocalizedMetadata('en', {
        titleKey: 'title',
        namespace: 'home',
      });

      expect(metadata.title).toBe('Custom Title');
      expect(mockGetTranslations).toHaveBeenCalledWith({ locale: 'en', namespace: 'home' });
    });

    it('should generate metadata with custom description from translations', async () => {
      const mockT = jest.fn((key: string) => {
        if (key === 'description') return 'Custom Description';
        return key;
      });
      mockGetTranslations.mockResolvedValue(mockT as any);

      const metadata = await generateLocalizedMetadata('en', {
        descriptionKey: 'description',
        namespace: 'about',
      });

      expect(metadata.description).toBe('Custom Description');
      expect(mockGetTranslations).toHaveBeenCalledWith({ locale: 'en', namespace: 'about' });
    });

    it('should generate metadata with both custom title and description', async () => {
      const mockT = jest.fn((key: string) => {
        if (key === 'title') return 'Custom Title';
        if (key === 'description') return 'Custom Description';
        return key;
      });
      mockGetTranslations.mockResolvedValue(mockT as any);

      const metadata = await generateLocalizedMetadata('en', {
        titleKey: 'title',
        descriptionKey: 'description',
        namespace: 'page',
      });

      expect(metadata.title).toBe('Custom Title');
      expect(metadata.description).toBe('Custom Description');
    });

    it('should generate correct canonical URL with path', async () => {
      const metadata = await generateLocalizedMetadata('en', {
        path: '/about',
      });

      expect(metadata.alternates?.canonical).toBe(`${siteConfig.url}/en/about`);
    });

    it('should generate correct canonical URL without path', async () => {
      const metadata = await generateLocalizedMetadata('en');

      expect(metadata.alternates?.canonical).toBe(`${siteConfig.url}/en`);
    });

    it('should generate correct language alternates', async () => {
      const metadata = await generateLocalizedMetadata('en', {
        path: '/about',
      });

      expect(metadata.alternates?.languages).toEqual({
        en: '/about',
        it: '/it/about',
        'x-default': '/about',
      });
    });

    it('should generate Open Graph metadata for English', async () => {
      const metadata = await generateLocalizedMetadata('en', {
        path: '/test',
      });

      expect(metadata.openGraph).toMatchObject({
        title: siteConfig.name.en,
        description: siteConfig.description.en,
        url: `${siteConfig.url}/en/test`,
        siteName: siteConfig.name.en,
        locale: 'en_US',
        type: 'website',
      });

      expect(metadata.openGraph?.images).toEqual([
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.name.en,
        },
      ]);
    });

    it('should generate Open Graph metadata for Italian', async () => {
      const metadata = await generateLocalizedMetadata('it', {
        path: '/test',
      });

      expect(metadata.openGraph).toMatchObject({
        locale: 'it_IT',
        siteName: siteConfig.name.it,
      });
    });

    it('should generate Twitter card metadata', async () => {
      const metadata = await generateLocalizedMetadata('en');

      expect(metadata.twitter).toEqual({
        card: 'summary_large_image',
        title: siteConfig.name.en,
        description: siteConfig.description.en,
        images: [siteConfig.ogImage],
      });
    });

    it('should generate robots metadata', async () => {
      const metadata = await generateLocalizedMetadata('en');

      expect(metadata.robots).toEqual({
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      });
    });

    it('should use default namespace when not provided', async () => {
      const mockT = jest.fn((key: string) => key);
      mockGetTranslations.mockResolvedValue(mockT as any);

      await generateLocalizedMetadata('en', {
        titleKey: 'title',
      });

      expect(mockGetTranslations).toHaveBeenCalledWith({ locale: 'en', namespace: 'common' });
    });

    it('should handle empty options object', async () => {
      const metadata = await generateLocalizedMetadata('en', {});

      expect(metadata.title).toBe(siteConfig.name.en);
      expect(metadata.description).toBe(siteConfig.description.en);
    });
  });

  describe('generatePageMetadata', () => {
    it('should generate metadata with provided title and description', async () => {
      const metadata = await generatePageMetadata('en', 'Custom Title', 'Custom Description');

      expect(metadata.title).toBe('Custom Title');
      expect(metadata.description).toBe('Custom Description');
    });

    it('should generate metadata for English locale', async () => {
      const metadata = await generatePageMetadata('en', 'Title', 'Description', '/page');

      expect(metadata.metadataBase).toEqual(new URL(siteConfig.url));
      expect(metadata.alternates?.canonical).toBe(`${siteConfig.url}/en/page`);
    });

    it('should generate metadata for Italian locale', async () => {
      const metadata = await generatePageMetadata('it', 'Titolo', 'Descrizione', '/pagina');

      expect(metadata.alternates?.canonical).toBe(`${siteConfig.url}/it/pagina`);
    });

    it('should generate correct language alternates with path', async () => {
      const metadata = await generatePageMetadata('en', 'Title', 'Description', '/about');

      expect(metadata.alternates?.languages).toEqual({
        en: '/about',
        it: '/it/about',
        'x-default': '/about',
      });
    });

    it('should generate correct language alternates without path', async () => {
      const metadata = await generatePageMetadata('en', 'Title', 'Description');

      expect(metadata.alternates?.languages).toEqual({
        en: '/',
        it: '/it/',
        'x-default': '/',
      });
    });

    it('should handle undefined path', async () => {
      const metadata = await generatePageMetadata('en', 'Title', 'Description', undefined);

      expect(metadata.alternates?.canonical).toBe(`${siteConfig.url}/en`);
    });

    it('should generate Open Graph metadata for English', async () => {
      const metadata = await generatePageMetadata('en', 'Test Title', 'Test Description', '/test');

      expect(metadata.openGraph).toMatchObject({
        title: 'Test Title',
        description: 'Test Description',
        url: `${siteConfig.url}/en/test`,
        siteName: siteConfig.name.en,
        locale: 'en_US',
        type: 'website',
      });

      expect(metadata.openGraph?.images).toEqual([
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: 'Test Title',
        },
      ]);
    });

    it('should generate Open Graph metadata for Italian', async () => {
      const metadata = await generatePageMetadata('it', 'Titolo Test', 'Descrizione Test', '/test');

      expect(metadata.openGraph).toMatchObject({
        title: 'Titolo Test',
        description: 'Descrizione Test',
        locale: 'it_IT',
        siteName: siteConfig.name.it,
      });
    });

    it('should generate Twitter card metadata', async () => {
      const metadata = await generatePageMetadata('en', 'Twitter Title', 'Twitter Description');

      expect(metadata.twitter).toEqual({
        card: 'summary_large_image',
        title: 'Twitter Title',
        description: 'Twitter Description',
        images: [siteConfig.ogImage],
      });
    });

    it('should generate robots metadata', async () => {
      const metadata = await generatePageMetadata('en', 'Title', 'Description');

      expect(metadata.robots).toEqual({
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      });
    });

    it('should handle empty string path', async () => {
      const metadata = await generatePageMetadata('en', 'Title', 'Description', '');

      expect(metadata.alternates?.canonical).toBe(`${siteConfig.url}/en`);
      expect(metadata.alternates?.languages).toEqual({
        en: '/',
        it: '/it/',
        'x-default': '/',
      });
    });

    it('should properly construct URLs with slashes', async () => {
      const metadata1 = await generatePageMetadata('en', 'Title', 'Description', '/path');
      const metadata2 = await generatePageMetadata('en', 'Title', 'Description', 'path');

      // Both should work, with or without leading slash
      expect(metadata1.alternates?.canonical).toContain('/en/path');
      expect(metadata2.alternates?.canonical).toContain('/enpath');
    });
  });
});
