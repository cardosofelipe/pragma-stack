/**
 * Password Reset Confirm Page
 * Users set a new password using the token from their email
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { generatePageMetadata, type Locale } from '@/lib/i18n/metadata';
import { getTranslations } from 'next-intl/server';
import PasswordResetConfirmContent from './PasswordResetConfirmContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.passwordResetConfirm' });

  return generatePageMetadata(
    locale as Locale,
    t('title'),
    t('instructions'),
    '/password-reset/confirm'
  );
}

export default function PasswordResetConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Set new password</h2>
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <PasswordResetConfirmContent />
    </Suspense>
  );
}
