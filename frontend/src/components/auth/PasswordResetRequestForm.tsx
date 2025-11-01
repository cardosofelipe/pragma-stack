/**
 * PasswordResetRequestForm Component
 * Handles password reset email request
 * Integrates with backend API password reset flow
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
import { usePasswordResetRequest } from '@/lib/api/hooks/useAuth';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';

// ============================================================================
// Validation Schema
// ============================================================================

const resetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ResetRequestFormData = z.infer<typeof resetRequestSchema>;

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
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const resetMutation = usePasswordResetRequest();

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
      setSuccessMessage(
        'Password reset instructions have been sent to your email address. Please check your inbox.'
      );

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
          Enter your email address and we&apos;ll send you instructions to reset your password.
        </p>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
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
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Instructions'}
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
