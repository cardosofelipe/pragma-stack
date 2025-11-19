/**
 * PasswordResetRequestForm Component
 * Handles password reset email request
 * Integrates with backend API password reset flow
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
import { usePasswordResetRequest } from '@/lib/api/hooks/useAuth';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';

// ============================================================================
// Validation Schema
// ============================================================================

const createResetRequestSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.email')),
  });

type ResetRequestFormData = z.infer<ReturnType<typeof createResetRequestSchema>>;

// ============================================================================
// Component
// ============================================================================

interface PasswordResetRequestFormProps {
  /** Optional callback after successful request */
  onSuccess?: () => void;
  /** Show login link */
  showLoginLink?: boolean;
  /** Custom className for form container */
  className?: string;
}

/**
 * PasswordResetRequestForm - Request password reset email
 *
 * Features:
 * - Email validation
 * - Loading states
 * - Server error display
 * - Success message
 * - Link back to login
 *
 * @example
 * ```tsx
 * <PasswordResetRequestForm
 *   showLoginLink
 *   onSuccess={() => setEmailSent(true)}
 * />
 * ```
 */
export function PasswordResetRequestForm({
  onSuccess,
  showLoginLink = true,
  className,
}: PasswordResetRequestFormProps) {
  const t = useTranslations('auth.passwordReset');
  const tValidation = useTranslations('validation');
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const resetMutation = usePasswordResetRequest();

  const resetRequestSchema = createResetRequestSchema((key: string) => {
    if (key.startsWith('validation.')) {
      return tValidation(key.replace('validation.', ''));
    }
    return t(key);
  });

  const form = useForm<ResetRequestFormData>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetRequestFormData) => {
    try {
      // Clear previous errors and success message
      setServerError(null);
      setSuccessMessage(null);
      form.clearErrors();

      // Request password reset
      await resetMutation.mutateAsync({ email: data.email });

      // Show success message
      setSuccessMessage(t('success'));

      // Reset form
      form.reset();

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
          if (field === 'email') {
            form.setError(field, { message });
          }
        });
      } else {
        // Unexpected error format
        setServerError(t('unexpectedError'));
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting || resetMutation.isPending;

  return (
    <div className={className}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Success Alert */}
        {successMessage && (
          <Alert>
            <p className="text-sm">{successMessage}</p>
          </Alert>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <Alert variant="destructive">
            <p className="text-sm">{serverError}</p>
          </Alert>
        )}

        {/* Instructions */}
        <p className="text-sm text-muted-foreground">{t('instructions')}</p>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">
            {t('emailLabel')} <span className="text-destructive">{t('required')}</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            disabled={isSubmitting}
            {...form.register('email')}
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
            aria-required="true"
          />
          {form.formState.errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('sendButtonLoading') : t('sendButton')}
        </Button>

        {/* Login Link */}
        {showLoginLink && (
          <p className="text-center text-sm text-muted-foreground">
            {t('rememberPassword')}{' '}
            <Link
              href="/login"
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              {t('backToLogin')}
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
