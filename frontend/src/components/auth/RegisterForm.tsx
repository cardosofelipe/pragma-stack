/**
 * RegisterForm Component
 * Handles user registration with validation
 * Integrates with backend API and auth store
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
import { useRegister } from '@/lib/api/hooks/useAuth';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';
import config from '@/config/app.config';

// ============================================================================
// Validation Schema
// ============================================================================

const registerSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    first_name: z
      .string()
      .min(1, 'First name is required')
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must not exceed 50 characters'),
    last_name: z
      .string()
      .max(50, 'Last name must not exceed 50 characters')
      .optional()
      .or(z.literal('')), // Allow empty string
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================================
// Component
// ============================================================================

interface RegisterFormProps {
  /** Optional callback after successful registration */
  onSuccess?: () => void;
  /** Show login link */
  showLoginLink?: boolean;
  /** Custom className for form container */
  className?: string;
}

/**
 * RegisterForm - User registration form
 *
 * Features:
 * - Email, name, and password validation
 * - Password confirmation matching
 * - Password strength requirements display
 * - Loading states
 * - Server error display
 * - Link to login page
 *
 * @example
 * ```tsx
 * <RegisterForm
 *   showLoginLink
 *   onSuccess={() => router.push('/dashboard')}
 * />
 * ```
 */
export function RegisterForm({ onSuccess, showLoginLink = true, className }: RegisterFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const registerMutation = useRegister();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Clear previous errors
      setServerError(null);
      form.clearErrors();

      // Prepare data for API (exclude confirmPassword)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registerData } = data;

      // Attempt registration
      await registerMutation.mutateAsync(registerData);

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
          if (field in form.getValues()) {
            form.setError(field as keyof RegisterFormData, { message });
          }
        });
      } else {
        // Unexpected error format
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting || registerMutation.isPending;

  // Watch password to show strength requirements
  const password = form.watch('password');
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);

  return (
    <div className={className}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Server Error Alert */}
        {serverError && (
          <Alert variant="destructive">
            <p className="text-sm">{serverError}</p>
          </Alert>
        )}

        {/* First Name Field */}
        <div className="space-y-2">
          <Label htmlFor="first_name">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="first_name"
            type="text"
            placeholder="John"
            autoComplete="given-name"
            disabled={isSubmitting}
            {...form.register('first_name')}
            aria-invalid={!!form.formState.errors.first_name}
            aria-describedby={form.formState.errors.first_name ? 'first_name-error' : undefined}
          />
          {form.formState.errors.first_name && (
            <p id="first_name-error" className="text-sm text-destructive">
              {form.formState.errors.first_name.message}
            </p>
          )}
        </div>

        {/* Last Name Field */}
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            type="text"
            placeholder="Doe (optional)"
            autoComplete="family-name"
            disabled={isSubmitting}
            {...form.register('last_name')}
            aria-invalid={!!form.formState.errors.last_name}
            aria-describedby={form.formState.errors.last_name ? 'last_name-error' : undefined}
          />
          {form.formState.errors.last_name && (
            <p id="last_name-error" className="text-sm text-destructive">
              {form.formState.errors.last_name.message}
            </p>
          )}
        </div>

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
          />
          {form.formState.errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">
            Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            disabled={isSubmitting}
            {...form.register('password')}
            aria-invalid={!!form.formState.errors.password}
            aria-describedby={
              form.formState.errors.password
                ? 'password-error password-requirements'
                : 'password-requirements'
            }
          />
          {form.formState.errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}

          {/* Password Strength Indicator */}
          {password.length > 0 && !form.formState.errors.password && (
            <div id="password-requirements" className="space-y-1 text-xs">
              <p
                className={
                  hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                }
              >
                {hasMinLength ? '✓' : '○'} At least 8 characters
              </p>
              <p
                className={
                  hasNumber ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                }
              >
                {hasNumber ? '✓' : '○'} Contains a number
              </p>
              <p
                className={
                  hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                }
              >
                {hasUppercase ? '✓' : '○'} Contains an uppercase letter
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            Confirm Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            disabled={isSubmitting}
            {...form.register('confirmPassword')}
            aria-invalid={!!form.formState.errors.confirmPassword}
            aria-describedby={
              form.formState.errors.confirmPassword ? 'confirmPassword-error' : undefined
            }
          />
          {form.formState.errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>

        {/* Login Link */}
        {showLoginLink && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href={config.routes.login}
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
