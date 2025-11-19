/**
 * LocaleSwitcher Component
 *
 * Allows users to switch between available locales (EN, IT).
 * Maintains the current pathname when switching languages.
 *
 * Features:
 * - Dropdown menu with available locales
 * - Shows current locale with visual indicator
 * - Preserves pathname when switching
 * - Accessible with proper ARIA labels
 * - Translated labels using next-intl
 */

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, type Locale } from '@/lib/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Languages } from 'lucide-react';
import { routing } from '@/lib/i18n/routing';
import { useTransition } from 'react';

export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(() => {
      // Navigate to the same pathname with the new locale
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={isPending}
          aria-label={t('switchLanguage')}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="uppercase text-xs font-semibold">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className="cursor-pointer gap-2"
          >
            <Check
              className={`h-4 w-4 ${locale === loc ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden="true"
            />
            <span>{t(loc)}</span>
            <span className="ml-auto text-xs text-muted-foreground uppercase">{loc}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
