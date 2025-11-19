import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { generatePageMetadata, type Locale } from '@/lib/i18n/metadata';
import { getTranslations } from 'next-intl/server';

// Code-split RegisterForm (313 lines)
const RegisterForm = dynamic(
  /* istanbul ignore next - Next.js dynamic import, tested via component */
  () => import('@/components/auth/RegisterForm').then((mod) => ({ default: mod.RegisterForm })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-muted rounded" />
        <div className="animate-pulse h-10 bg-muted rounded" />
        <div className="animate-pulse h-10 bg-muted rounded" />
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
  const t = await getTranslations({ locale, namespace: 'auth.register' });

  return generatePageMetadata(locale as Locale, t('title'), t('subtitle'), '/register');
}

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started with your free account today
        </p>
      </div>

      <RegisterForm showLoginLink />
    </div>
  );
}
