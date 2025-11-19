/**
 * LoginForm Component
 * Handles user authentication with email and password
 * Integrates with backend API and auth store
 */

'use client';

import { useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useLogin } from '@/lib/api/hooks/useAuth';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';
import config from '@/config/app.config';

// ============================================================================
// Validation Schema
// ============================================================================

const createLoginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.email')),
    password: z
      .string()
      .min(1, t('validation.required'))
      .min(8, t('validation.minLength').replace('{count}', '8'))
      .regex(/[0-9]/, t('errors.validation.passwordWeak'))
      .regex(/[A-Z]/, t('errors.validation.passwordWeak')),
  });

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

// ============================================================================
// Component
// ============================================================================

interface LoginFormProps {
  /** Optional callback after successful login */
  onSuccess?: () => void;
  /** Show registration link */
  showRegisterLink?: boolean;
  /** Show password reset link */
  showPasswordResetLink?: boolean;
  /** Custom className for form container */
  className?: string;
}

/**
 * LoginForm - User authentication form
 *
 * Features:
 * - Email and password validation
 * - Loading states
 * - Server error display
 * - Links to registration and password reset
 *
 * @example
 * ```tsx
 * <LoginForm
 *   showRegisterLink
 *   showPasswordResetLink
 *   onSuccess={() => router.push('/dashboard')}
 * />
 * ```
 */
export function LoginForm({
  onSuccess,
  showRegisterLink = true,
  showPasswordResetLink = true,
  className,
}: LoginFormProps) {
  const t = useTranslations('auth.login');
  const tValidation = useTranslations('validation');
  const tErrors = useTranslations('errors.validation');
  const [serverError, setServerError] = useState<string | null>(null);
  const loginMutation = useLogin();

  const loginSchema = createLoginSchema((key: string) => {
    if (key.startsWith('validation.')) {
      return tValidation(key.replace('validation.', ''));
    }
    if (key.startsWith('errors.validation.')) {
      return tErrors(key.replace('errors.validation.', ''));
    }
    return key;
  });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Clear previous errors
      setServerError(null);
      form.clearErrors();

      // Attempt login
      await loginMutation.mutateAsync(data);

      // Success callback
      onSuccess?.();
    } catch (error) {
      // Handle API errors with type guard
      if (isAPIErrorArray(error)) {
        // Set general error message
        const generalError = getGeneralError(error);
        if (generalError) {
          setServerError(generalError);
        }

        // Set field-specific errors
        const fieldErrors = getFieldErrors(error);
        Object.entries(fieldErrors).forEach(([field, message]) => {
          if (field === 'email' || field === 'password') {
            form.setError(field, { message });
          }
        });
      } else {
        // Unexpected error format
        setServerError(t('unexpectedError'));
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting || loginMutation.isPending;

  return (
    <div className={className}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Server Error Alert */}
        {serverError && (
          <Alert variant="destructive">
            <p className="text-sm">{serverError}</p>
          </Alert>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            disabled={isSubmitting}
            {...form.register('email')}
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
          />
          {form.formState.errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('passwordLabel')}</Label>
            {showPasswordResetLink && (
              <Link
                href="/password-reset"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            placeholder={t('passwordPlaceholder')}
            autoComplete="current-password"
            disabled={isSubmitting}
            {...form.register('password')}
            aria-invalid={!!form.formState.errors.password}
            aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
          />
          {form.formState.errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('loginButtonLoading') : t('loginButton')}
        </Button>

        {/* Registration Link */}
        {showRegisterLink && config.features.enableRegistration && (
          <p className="text-center text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link
              href={config.routes.register}
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              {t('registerLink')}
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
