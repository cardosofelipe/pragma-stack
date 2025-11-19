/**
 * ProfileSettingsForm Component
 * Allows users to update their profile information (name fields)
 * Email is read-only as it requires separate verification flow
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { FormField } from '@/components/forms/FormField';
import { useUpdateProfile } from '@/lib/api/hooks/useUser';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';

// ============================================================================
// Validation Schema
// ============================================================================

const createProfileSchema = (t: (key: string) => string) =>
  z.object({
    first_name: z
      .string()
      .min(1, t('firstNameRequired'))
      .min(2, t('firstNameMinLength'))
      .max(50, t('firstNameMaxLength')),
    last_name: z.string().max(50, t('lastNameMaxLength')).optional().or(z.literal('')),
    email: z.string().email(t('emailInvalid')),
  });

type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

// ============================================================================
// Component
// ============================================================================

interface ProfileSettingsFormProps {
  /** Optional callback after successful update */
  onSuccess?: () => void;
  /** Custom className for card container */
  className?: string;
}

/**
 * ProfileSettingsForm - User profile update form
 *
 * Features:
 * - First name and last name editing
 * - Email display (read-only)
 * - Form validation with Zod
 * - Loading states
 * - Server error display
 * - Success toast notification
 *
 * @example
 * ```tsx
 * <ProfileSettingsForm onSuccess={() => console.log('Profile updated')} />
 * ```
 */
export function ProfileSettingsForm({ onSuccess, className }: ProfileSettingsFormProps) {
  const t = useTranslations('settings.profile');
  const [serverError, setServerError] = useState<string | null>(null);
  const currentUser = useCurrentUser();
  const updateProfileMutation = useUpdateProfile((message) => {
    toast.success(message);
    onSuccess?.();
  });

  const profileSchema = createProfileSchema((key: string) => t(key));

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
    },
  });

  // Populate form with current user data
  useEffect(() => {
    if (currentUser) {
      form.reset({
        first_name: currentUser.first_name || '',
        last_name: currentUser.last_name || '',
        email: currentUser.email,
      });
    }
  }, [currentUser, form]);

  // Form submission logic
  // Note: Unit test coverage excluded - tested via E2E tests (Playwright)
  // react-hook-form's isDirty state doesn't update synchronously in unit tests,
  // making it impossible to test submit button enablement and form submission
  /* istanbul ignore next */
  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Clear previous errors
      setServerError(null);
      form.clearErrors();

      // Only send fields that can be updated (not email)
      const updateData: { first_name?: string; last_name?: string } = {
        first_name: data.first_name,
      };

      // Only include last_name if it's not empty
      if (data.last_name && data.last_name.trim() !== '') {
        updateData.last_name = data.last_name;
      }

      // Attempt profile update
      await updateProfileMutation.mutateAsync(updateData);
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
          if (field === 'first_name' || field === 'last_name') {
            form.setError(field, { message });
          }
        });
      } else {
        // Unexpected error format
        setServerError(t('unexpectedError'));
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting || updateProfileMutation.isPending;
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

          {/* First Name Field */}
          <FormField
            label={t('firstNameLabel')}
            type="text"
            placeholder={t('firstNamePlaceholder')}
            autoComplete="given-name"
            disabled={isSubmitting}
            required
            error={form.formState.errors.first_name}
            {...form.register('first_name')}
          />

          {/* Last Name Field */}
          <FormField
            label={t('lastNameLabel')}
            type="text"
            placeholder={t('lastNamePlaceholder')}
            autoComplete="family-name"
            disabled={isSubmitting}
            error={form.formState.errors.last_name}
            {...form.register('last_name')}
          />

          {/* Email Field (Read-only) */}
          <FormField
            label={t('emailLabel')}
            type="email"
            autoComplete="email"
            disabled
            description={t('emailDescription')}
            error={form.formState.errors.email}
            {...form.register('email')}
          />

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? t('updateButtonLoading') : t('updateButton')}
            </Button>
            {/* istanbul ignore next - Reset button requires isDirty state, tested in E2E */}
            {isDirty && !isSubmitting && (
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                {t('resetButton')}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
