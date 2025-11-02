/**
 * FormField Component
 * Reusable form field with integrated label, input, and error display
 * Designed for react-hook-form with proper accessibility attributes
 */

'use client';

import { ComponentProps, ReactNode } from 'react';
import { FieldError } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface FormFieldProps extends Omit<ComponentProps<typeof Input>, 'children'> {
  /** Field label text */
  label: string;
  /** Field name/id - optional if provided via register() */
  name?: string;
  /** Is field required? Shows asterisk if true */
  required?: boolean;
  /** Form error object from react-hook-form */
  error?: FieldError;
  /** Label description or helper text */
  description?: string;
  /** Additional content after input (e.g., password requirements) */
  children?: ReactNode;
}

/**
 * FormField - Standardized form field with label and error handling
 *
 * Features:
 * - Automatic error ID generation for accessibility
 * - Required indicator
 * - Error message display
 * - Helper text/description support
 * - Full ARIA attribute support
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Email"
 *   name="email"
 *   type="email"
 *   required
 *   error={form.formState.errors.email}
 *   disabled={isSubmitting}
 *   {...form.register('email')}
 * />
 * ```
 */
export function FormField({
  label,
  name: explicitName,
  required = false,
  error,
  description,
  children,
  ...inputProps
}: FormFieldProps) {
  // Extract name from inputProps (from register()) or use explicit name
  // register() adds a name property that may not be in the type
  const registerName = ('name' in inputProps) ? (inputProps as { name: string }).name : undefined;
  const name = explicitName || registerName;

  if (!name) {
    throw new Error('FormField: name must be provided either explicitly or via register()');
  }

  const errorId = error ? `${name}-error` : undefined;
  const descriptionId = description ? `${name}-description` : undefined;
  const ariaDescribedBy = [errorId, descriptionId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <Input
        id={name}
        aria-invalid={!!error}
        aria-describedby={ariaDescribedBy}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      )}
      {children}
    </div>
  );
}
