import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { generatePageMetadata, type Locale } from '@/lib/i18n/metadata';
import { getTranslations } from 'next-intl/server';

// Code-split LoginForm - heavy with react-hook-form + validation
const LoginForm = dynamic(
  /* istanbul ignore next - Next.js dynamic import, tested via component */
  () => import('@/components/auth/LoginForm').then((mod) => ({ default: mod.LoginForm })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-muted rounded" />
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
  const t = await getTranslations({ locale, namespace: 'auth.login' });

  return generatePageMetadata(locale as Locale, t('title'), t('subtitle'), '/login');
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Sign in to your account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Access your dashboard and manage your account
        </p>
      </div>

      <LoginForm showRegisterLink showPasswordResetLink />
    </div>
  );
}
