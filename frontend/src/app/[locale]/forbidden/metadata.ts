/* istanbul ignore file - Server-only Next.js metadata generation covered by E2E */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generatePageMetadata, type Locale } from '@/lib/i18n/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'errors' });

  return generatePageMetadata(
    locale as Locale,
    t('unauthorized'),
    t('unauthorizedDescription'),
    '/forbidden'
  );
}
