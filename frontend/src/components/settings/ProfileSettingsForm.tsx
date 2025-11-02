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

const profileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  last_name: z
    .string()
    .max(50, 'Last name must not exceed 50 characters')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Invalid email address'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

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
export function ProfileSettingsForm({
  onSuccess,
  className,
}: ProfileSettingsFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const currentUser = useCurrentUser();
  const updateProfileMutation = useUpdateProfile((message) => {
    toast.success(message);
    onSuccess?.();
  });

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
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting || updateProfileMutation.isPending;
  const isDirty = form.formState.isDirty;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal information. Your email address is read-only.
        </CardDescription>
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
            label="First Name"
            type="text"
            placeholder="John"
            autoComplete="given-name"
            disabled={isSubmitting}
            required
            error={form.formState.errors.first_name}
            {...form.register('first_name')}
          />

          {/* Last Name Field */}
          <FormField
            label="Last Name"
            type="text"
            placeholder="Doe"
            autoComplete="family-name"
            disabled={isSubmitting}
            error={form.formState.errors.last_name}
            {...form.register('last_name')}
          />

          {/* Email Field (Read-only) */}
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            disabled
            description="Your email address cannot be changed from this form"
            error={form.formState.errors.email}
            {...form.register('email')}
          />

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {isDirty && !isSubmitting && (
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Reset
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
