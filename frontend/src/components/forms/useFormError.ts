/**
 * useFormError Hook
 * Handles server error state and API error parsing for forms
 * Standardizes error handling across all form components
 */

import { useState, useCallback } from 'react';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { getGeneralError, getFieldErrors, isAPIErrorArray } from '@/lib/api/errors';

export interface UseFormErrorReturn {
  /** Current server error message */
  serverError: string | null;
  /** Set server error manually */
  setServerError: (error: string | null) => void;
  /** Handle API error and update form with field-specific errors */
  handleFormError: (error: unknown) => void;
  /** Clear all errors */
  clearErrors: () => void;
}

/**
 * useFormError - Standardized form error handling
 *
 * Features:
 * - Server error state management
 * - API error parsing with type guards
 * - Automatic field error mapping to react-hook-form
 * - General error message extraction
 *
 * @param form - react-hook-form instance
 * @returns Error handling utilities
 *
 * @example
 * ```tsx
 * const form = useForm<LoginFormData>({...});
 * const { serverError, handleFormError, clearErrors } = useFormError(form);
 *
 * const onSubmit = async (data: LoginFormData) => {
 *   try {
 *     clearErrors();
 *     await loginMutation.mutateAsync(data);
 *   } catch (error) {
 *     handleFormError(error);
 *   }
 * };
 * ```
 */
export function useFormError<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>
): UseFormErrorReturn {
  const [serverError, setServerError] = useState<string | null>(null);

  const handleFormError = useCallback(
    (error: unknown) => {
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
          // Check if field exists in form values to avoid setting invalid fields
          if (field in form.getValues()) {
            form.setError(field as Path<TFieldValues>, { message });
          }
        });
      } else {
        // Unexpected error format
        setServerError('An unexpected error occurred. Please try again.');
      }
    },
    [form]
  );

  const clearErrors = useCallback(() => {
    setServerError(null);
    form.clearErrors();
  }, [form]);

  return {
    serverError,
    setServerError,
    handleFormError,
    clearErrors,
  };
}
