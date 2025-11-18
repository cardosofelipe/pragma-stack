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

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
});

type LoginFormData = z.infer<typeof loginSchema>;

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
  const [serverError, setServerError] = useState<string | null>(null);
  const loginMutation = useLogin();

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
        setServerError('An unexpected error occurred. Please try again.');
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
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
            <Label htmlFor="password">Password</Label>
            {showPasswordResetLink && (
              <Link
                href="/password-reset"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
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
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>

        {/* Registration Link */}
        {showRegisterLink && config.features.enableRegistration && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href={config.routes.register}
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
