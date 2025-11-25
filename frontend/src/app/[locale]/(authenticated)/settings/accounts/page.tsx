/**
 * Linked Accounts Settings Page
 * Manage linked OAuth provider accounts
 */

'use client';

import { useTranslations } from 'next-intl';
import { LinkedAccountsSettings } from '@/components/settings';

export default function LinkedAccountsPage() {
  const t = useTranslations('settings.linkedAccounts');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{t('pageTitle')}</h2>
        <p className="text-muted-foreground mt-1">{t('pageSubtitle')}</p>
      </div>

      <LinkedAccountsSettings />
    </div>
  );
}
