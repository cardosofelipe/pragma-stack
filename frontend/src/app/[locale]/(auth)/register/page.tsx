import dynamic from 'next/dynamic';

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

// Re-export server-only metadata from separate, ignored file
export { generateMetadata } from './metadata';

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
