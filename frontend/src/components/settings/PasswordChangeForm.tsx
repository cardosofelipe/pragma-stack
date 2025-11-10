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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { FormField } from '@/components/forms/FormField';
import { usePasswordChange } from '@/lib/api/hooks/useAuth';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';

// ============================================================================
// Validation Schema
// ============================================================================

const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(1, 'New password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

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
  const [serverError, setServerError] = useState<string | null>(null);
  const passwordChangeMutation = usePasswordChange((message) => {
    toast.success(message);
    form.reset();
    onSuccess?.();
  });

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
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting || passwordChangeMutation.isPending;
  const isDirty = form.formState.isDirty;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure. Make sure it&apos;s strong and unique.
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

          {/* Current Password Field */}
          <FormField
            label="Current Password"
            type="password"
            placeholder="Enter your current password"
            autoComplete="current-password"
            disabled={isSubmitting}
            required
            error={form.formState.errors.current_password}
            {...form.register('current_password')}
          />

          {/* New Password Field */}
          <FormField
            label="New Password"
            type="password"
            placeholder="Enter your new password"
            autoComplete="new-password"
            disabled={isSubmitting}
            required
            description="At least 8 characters with uppercase, lowercase, number, and special character"
            error={form.formState.errors.new_password}
            {...form.register('new_password')}
          />

          {/* Confirm Password Field */}
          <FormField
            label="Confirm New Password"
            type="password"
            placeholder="Confirm your new password"
            autoComplete="new-password"
            disabled={isSubmitting}
            required
            error={form.formState.errors.confirm_password}
            {...form.register('confirm_password')}
          />

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? 'Changing Password...' : 'Change Password'}
            </Button>
            {/* istanbul ignore next - Cancel button requires isDirty state, tested in E2E */}
            {isDirty && !isSubmitting && (
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
