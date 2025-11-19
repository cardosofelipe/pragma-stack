/**
 * Password Reset Request Page
 * Users enter their email to receive reset instructions
 */

import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { generatePageMetadata, type Locale } from '@/lib/i18n/metadata';
import { getTranslations } from 'next-intl/server';

// Code-split PasswordResetRequestForm
const PasswordResetRequestForm = dynamic(
  /* istanbul ignore next - Next.js dynamic import, tested via component */
  () =>
    import('@/components/auth/PasswordResetRequestForm').then((mod) => ({
      default: mod.PasswordResetRequestForm,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-muted rounded" />
        <div className="animate-pulse h-10 bg-primary/20 rounded" />
      </div>
    ),
  }
);

/* istanbul ignore next - Next.js metadata generation covered by e2e tests */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.passwordReset' });

  return generatePageMetadata(locale as Locale, t('title'), t('subtitle'), '/password-reset');
}

export default function PasswordResetPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Reset your password</h2>
        <p className="mt-2 text-muted-foreground">
          We&apos;ll send you an email with instructions to reset your password
        </p>
      </div>

      <PasswordResetRequestForm showLoginLink />
    </div>
  );
}
