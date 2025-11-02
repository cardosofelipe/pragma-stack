/**
 * Tests for useFormError Hook
 * Verifies form error handling and API error integration
 */

import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useFormError } from '@/components/forms/useFormError';

interface TestFormData {
  email: string;
  password: string;
  username: string;
}

// Helper to render both hooks together in one scope
function useTestForm(defaultValues?: Partial<TestFormData>) {
  const form = useForm<TestFormData>({
    defaultValues: defaultValues || {},
  });
  const formError = useFormError(form);

  return { form, formError };
}

describe('useFormError', () => {
  describe('Initial State', () => {
    it('initializes with null serverError', () => {
      const { result } = renderHook(() => useTestForm());

      expect(result.current.formError.serverError).toBeNull();
    });

    it('provides all expected functions', () => {
      const { result } = renderHook(() => useTestForm());

      expect(typeof result.current.formError.setServerError).toBe('function');
      expect(typeof result.current.formError.handleFormError).toBe('function');
      expect(typeof result.current.formError.clearErrors).toBe('function');
    });
  });

  describe('setServerError', () => {
    it('sets server error message', () => {
      const { result } = renderHook(() => useTestForm());

      act(() => {
        result.current.formError.setServerError('Custom error message');
      });

      expect(result.current.formError.serverError).toBe('Custom error message');
    });

    it('clears server error when set to null', () => {
      const { result } = renderHook(() => useTestForm());

      act(() => {
        result.current.formError.setServerError('Error message');
      });

      act(() => {
        result.current.formError.setServerError(null);
      });

      expect(result.current.formError.serverError).toBeNull();
    });
  });

  describe('handleFormError - API Error Array', () => {
    it('handles API error with general error message', () => {
      const { result } = renderHook(() => useTestForm());

      const apiError = [
        { code: 'AUTH_001', message: 'Invalid credentials' },
      ];

      act(() => {
        result.current.formError.handleFormError(apiError);
      });

      expect(result.current.formError.serverError).toBe('Invalid credentials');
    });

    it('handles multiple general errors (takes first non-field error)', () => {
      const { result } = renderHook(() => useTestForm());

      const apiError = [
        { code: 'AUTH_001', message: 'Authentication failed' },
        { code: 'AUTH_002', message: 'Account is inactive' },
      ];

      act(() => {
        result.current.formError.handleFormError(apiError);
      });

      // Should take the first general error
      expect(result.current.formError.serverError).toBe('Authentication failed');
    });

    it('handles API errors with field-specific errors without crashing', () => {
      const { result } = renderHook(() =>
        useTestForm({ email: '', password: '', username: '' })
      );

      const apiError = [
        { code: 'VAL_004', message: 'Email is required', field: 'email' },
        { code: 'VAL_003', message: 'Password too short', field: 'password' },
      ];

      // Should not throw even though fields aren't registered
      expect(() => {
        act(() => {
          result.current.formError.handleFormError(apiError);
        });
      }).not.toThrow();

      // No general error should be set (all are field errors)
      expect(result.current.formError.serverError).toBeNull();
    });
  });

  describe('handleFormError - Non-API Errors', () => {
    it('handles unexpected error format', () => {
      const { result } = renderHook(() => useTestForm());

      const unexpectedError = new Error('Network error');

      act(() => {
        result.current.formError.handleFormError(unexpectedError);
      });

      expect(result.current.formError.serverError).toBe('An unexpected error occurred. Please try again.');
    });

    it('handles string errors', () => {
      const { result } = renderHook(() => useTestForm());

      act(() => {
        result.current.formError.handleFormError('Some error string');
      });

      expect(result.current.formError.serverError).toBe('An unexpected error occurred. Please try again.');
    });

    it('handles null errors', () => {
      const { result } = renderHook(() => useTestForm());

      act(() => {
        result.current.formError.handleFormError(null);
      });

      expect(result.current.formError.serverError).toBe('An unexpected error occurred. Please try again.');
    });

    it('handles undefined errors', () => {
      const { result } = renderHook(() => useTestForm());

      act(() => {
        result.current.formError.handleFormError(undefined);
      });

      expect(result.current.formError.serverError).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('clearErrors', () => {
    it('clears server error', () => {
      const { result } = renderHook(() => useTestForm());

      act(() => {
        result.current.formError.setServerError('Some error');
      });

      act(() => {
        result.current.formError.clearErrors();
      });

      expect(result.current.formError.serverError).toBeNull();
    });

    it('clears form errors', () => {
      const { result } = renderHook(() =>
        useTestForm({ email: '', password: '', username: '' })
      );

      // Set field errors
      act(() => {
        result.current.form.setError('email', { message: 'Email error' });
        result.current.form.setError('password', { message: 'Password error' });
      });

      // Clear all errors
      act(() => {
        result.current.formError.clearErrors();
      });

      expect(result.current.form.formState.errors.email).toBeUndefined();
      expect(result.current.form.formState.errors.password).toBeUndefined();
    });

    it('clears both server and form errors', () => {
      const { result } = renderHook(() =>
        useTestForm({ email: '', password: '', username: '' })
      );

      act(() => {
        result.current.formError.setServerError('Server error');
        result.current.form.setError('email', { message: 'Email error' });
      });

      act(() => {
        result.current.formError.clearErrors();
      });

      expect(result.current.formError.serverError).toBeNull();
      expect(result.current.form.formState.errors.email).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('handles typical login flow with API error', () => {
      const { result } = renderHook(() =>
        useTestForm({ email: '', password: '', username: '' })
      );

      // Simulate API error response
      const apiError = [
        { code: 'AUTH_001', message: 'Invalid email or password' },
      ];

      act(() => {
        result.current.formError.handleFormError(apiError);
      });

      expect(result.current.formError.serverError).toBe('Invalid email or password');
    });

    it('clears error state on retry', () => {
      const { result } = renderHook(() => useTestForm());

      // First attempt - error
      act(() => {
        result.current.formError.setServerError('First error');
      });

      expect(result.current.formError.serverError).toBe('First error');

      // Clear before retry
      act(() => {
        result.current.formError.clearErrors();
      });

      expect(result.current.formError.serverError).toBeNull();

      // Second attempt - different error
      act(() => {
        result.current.formError.setServerError('Second error');
      });

      expect(result.current.formError.serverError).toBe('Second error');
    });
  });
});
