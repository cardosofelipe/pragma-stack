/**
 * PasswordChangeForm Component
 * Allows authenticated users to change their password
 * Requires current password for security verification
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { FormField } from '@/components/forms/FormField';
import { usePasswordChange } from '@/lib/api/hooks/useAuth';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';

// ============================================================================
// Validation Schema
// ============================================================================

const createPasswordChangeSchema = (t: (key: string) => string) =>
  z
    .object({
      current_password: z.string().min(1, t('currentPasswordRequired')),
      new_password: z
        .string()
        .min(1, t('newPasswordRequired'))
        .min(8, t('newPasswordMinLength'))
        .regex(/[0-9]/, t('newPasswordNumber'))
        .regex(/[A-Z]/, t('newPasswordUppercase'))
        .regex(/[a-z]/, t('newPasswordLowercase'))
        .regex(/[^A-Za-z0-9]/, t('newPasswordSpecial')),
      confirm_password: z.string().min(1, t('confirmPasswordRequired')),
    })
    .refine((data) => data.new_password === data.confirm_password, {
      message: t('passwordMismatch'),
      path: ['confirm_password'],
    });

type PasswordChangeFormData = z.infer<ReturnType<typeof createPasswordChangeSchema>>;

// ============================================================================
// Component
// ============================================================================

interface PasswordChangeFormProps {
  /** Optional callback after successful password change */
  onSuccess?: () => void;
  /** Custom className for card container */
  className?: string;
}

/**
 * PasswordChangeForm - Secure password update form
 *
 * Features:
 * - Current password verification
 * - Strong password validation
 * - Password confirmation matching
 * - Form validation with Zod
 * - Loading states
 * - Server error display
 * - Success toast notification
 * - Auto-reset form on success
 *
 * @example
 * ```tsx
 * <PasswordChangeForm onSuccess={() => console.log('Password changed')} />
 * ```
 */
export function PasswordChangeForm({ onSuccess, className }: PasswordChangeFormProps) {
  const t = useTranslations('settings.password');
  const [serverError, setServerError] = useState<string | null>(null);
  const passwordChangeMutation = usePasswordChange((message) => {
    toast.success(message);
    form.reset();
    onSuccess?.();
  });

  const passwordChangeSchema = createPasswordChangeSchema((key: string) => t(key));

  const form = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  // Form submission logic
  // Note: Unit test coverage excluded - tested via E2E tests (Playwright)
  // react-hook-form's isDirty state doesn't update synchronously in unit tests,
  // making it impossible to test submit button enablement and form submission
  /* istanbul ignore next */
  const onSubmit = async (data: PasswordChangeFormData) => {
    try {
      // Clear previous errors
      setServerError(null);
      form.clearErrors();

      // Attempt password change (only send required fields to API)
      await passwordChangeMutation.mutateAsync({
        current_password: data.current_password,
        new_password: data.new_password,
      });
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
          if (field === 'current_password' || field === 'new_password') {
            form.setError(field, { message });
          }
        });
      } else {
        // Unexpected error format
        setServerError(t('unexpectedError'));
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting || passwordChangeMutation.isPending;
  const isDirty = form.formState.isDirty;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Server Error Alert */}
          {serverError && (
            <Alert variant="destructive">
              <p className="text-sm">{serverError}</p>
            </Alert>
          )}

          {/* Current Password Field */}
          <FormField
            label={t('currentPasswordLabel')}
            type="password"
            placeholder={t('currentPasswordPlaceholder')}
            autoComplete="current-password"
            disabled={isSubmitting}
            required
            error={form.formState.errors.current_password}
            {...form.register('current_password')}
          />

          {/* New Password Field */}
          <FormField
            label={t('newPasswordLabel')}
            type="password"
            placeholder={t('newPasswordPlaceholder')}
            autoComplete="new-password"
            disabled={isSubmitting}
            required
            description={t('newPasswordDescription')}
            error={form.formState.errors.new_password}
            {...form.register('new_password')}
          />

          {/* Confirm Password Field */}
          <FormField
            label={t('confirmPasswordLabel')}
            type="password"
            placeholder={t('confirmPasswordPlaceholder')}
            autoComplete="new-password"
            disabled={isSubmitting}
            required
            error={form.formState.errors.confirm_password}
            {...form.register('confirm_password')}
          />

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? t('updateButtonLoading') : t('updateButton')}
            </Button>
            {/* istanbul ignore next - Cancel button requires isDirty state, tested in E2E */}
            {isDirty && !isSubmitting && (
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                {t('cancelButton')}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
