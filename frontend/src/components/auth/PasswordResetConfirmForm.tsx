/**
 * PasswordResetConfirmForm Component
 * Handles password reset with token from email
 * Integrates with backend API password reset confirm flow
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { usePasswordResetConfirm } from '@/lib/api/hooks/useAuth';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';

// ============================================================================
// Validation Schema
// ============================================================================

const resetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    new_password: z
      .string()
      .min(1, 'New password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ResetConfirmFormData = z.infer<typeof resetConfirmSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate password strength based on requirements
 */
function calculatePasswordStrength(password: string): {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
  strength: number;
} {
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);

  const strength =
    (hasMinLength ? 33 : 0) + (hasNumber ? 33 : 0) + (hasUppercase ? 34 : 0);

  return { hasMinLength, hasNumber, hasUppercase, strength };
}

// ============================================================================
// Component
// ============================================================================

interface PasswordResetConfirmFormProps {
  /** Reset token from URL query parameter */
  token: string;
  /** Optional callback after successful reset */
  onSuccess?: () => void;
  /** Show login link */
  showLoginLink?: boolean;
  /** Custom className for form container */
  className?: string;
}

/**
 * PasswordResetConfirmForm - Reset password with token
 *
 * Features:
 * - Token validation
 * - New password validation with strength indicator
 * - Password confirmation matching
 * - Loading states
 * - Server error display
 * - Success message
 * - Link back to login
 *
 * @example
 * ```tsx
 * <PasswordResetConfirmForm
 *   token={searchParams.token}
 *   showLoginLink
 *   onSuccess={() => router.push('/login')}
 * />
 * ```
 */
export function PasswordResetConfirmForm({
  token,
  onSuccess,
  showLoginLink = true,
  className,
}: PasswordResetConfirmFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const resetMutation = usePasswordResetConfirm();

  const form = useForm<ResetConfirmFormData>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: {
      token,
      new_password: '',
      confirm_password: '',
    },
  });

  const watchPassword = form.watch('new_password');
  const passwordStrength = calculatePasswordStrength(watchPassword);

  const onSubmit = async (data: ResetConfirmFormData) => {
    try {
      // Clear previous errors and success message
      setServerError(null);
      setSuccessMessage(null);
      form.clearErrors();

      // Confirm password reset
      await resetMutation.mutateAsync({
        token: data.token,
        new_password: data.new_password,
      });

      // Show success message
      setSuccessMessage(
        'Your password has been successfully reset. You can now log in with your new password.'
      );

      // Reset form
      form.reset({ token, new_password: '', confirm_password: '' });

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
          if (field === 'token' || field === 'new_password') {
            form.setError(field, { message });
          }
        });
      } else {
        // Unexpected error format
        setServerError('An unexpected error occurred. Please try again.');
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
        <p className="text-sm text-muted-foreground">
          Enter your new password below. Make sure it meets all security requirements.
        </p>

        {/* Hidden Token Field (for form submission) */}
        <input type="hidden" {...form.register('token')} />

        {/* New Password Field */}
        <div className="space-y-2">
          <Label htmlFor="new_password">
            New Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="new_password"
            type="password"
            placeholder="Enter new password"
            autoComplete="new-password"
            disabled={isSubmitting}
            {...form.register('new_password')}
            aria-invalid={!!form.formState.errors.new_password}
            aria-describedby={
              form.formState.errors.new_password
                ? 'new-password-error'
                : 'password-requirements'
            }
            aria-required="true"
          />
          {form.formState.errors.new_password && (
            <p id="new-password-error" className="text-sm text-destructive">
              {form.formState.errors.new_password.message}
            </p>
          )}

          {/* Password Strength Indicator */}
          {watchPassword && (
            <div className="space-y-2" id="password-requirements">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength.strength === 100
                      ? 'bg-green-500'
                      : passwordStrength.strength >= 66
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${passwordStrength.strength}%` }}
                />
              </div>
              <ul className="text-xs space-y-1">
                <li
                  className={
                    passwordStrength.hasMinLength
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground'
                  }
                >
                  {passwordStrength.hasMinLength ? '✓' : '○'} At least 8 characters
                </li>
                <li
                  className={
                    passwordStrength.hasNumber
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground'
                  }
                >
                  {passwordStrength.hasNumber ? '✓' : '○'} Contains a number
                </li>
                <li
                  className={
                    passwordStrength.hasUppercase
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground'
                  }
                >
                  {passwordStrength.hasUppercase ? '✓' : '○'} Contains an uppercase
                  letter
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirm_password">
            Confirm Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="confirm_password"
            type="password"
            placeholder="Re-enter new password"
            autoComplete="new-password"
            disabled={isSubmitting}
            {...form.register('confirm_password')}
            aria-invalid={!!form.formState.errors.confirm_password}
            aria-describedby={
              form.formState.errors.confirm_password
                ? 'confirm-password-error'
                : undefined
            }
            aria-required="true"
          />
          {form.formState.errors.confirm_password && (
            <p id="confirm-password-error" className="text-sm text-destructive">
              {form.formState.errors.confirm_password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
        </Button>

        {/* Login Link */}
        {showLoginLink && (
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link
              href="/login"
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              Back to login
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
