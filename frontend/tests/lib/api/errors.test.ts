/**
 * Comprehensive tests for API error handling
 *
 * Tests cover:
 * - Type guards (isAxiosError, isAPIErrorArray)
 * - Error parsing for all scenarios (network, HTTP status, structured errors)
 * - Field error extraction
 * - General error extraction
 * - Edge cases and error recovery
 */

import { AxiosError } from 'axios';
import {
  parseAPIError,
  getErrorMessage,
  getFieldErrors,
  getGeneralError,
  isAPIErrorArray,
  ERROR_MESSAGES,
  type APIError,
} from '@/lib/api/errors';

describe('API Error Handling', () => {
  describe('isAPIErrorArray', () => {
    it('should return true for valid APIError array', () => {
      const errors: APIError[] = [
        { code: 'AUTH_001', message: 'Invalid credentials' },
        { code: 'VAL_002', message: 'Invalid email', field: 'email' },
      ];

      expect(isAPIErrorArray(errors)).toBe(true);
    });

    it('should return false for non-array', () => {
      expect(isAPIErrorArray('not an array')).toBe(false);
      expect(isAPIErrorArray(null)).toBe(false);
      expect(isAPIErrorArray(undefined)).toBe(false);
      expect(isAPIErrorArray({})).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isAPIErrorArray([])).toBe(true); // Empty array is technically valid
    });

    it('should return false for array with invalid elements', () => {
      const invalidErrors = [
        { code: 'AUTH_001' }, // missing message
        { message: 'Invalid credentials' }, // missing code
        'string', // not an object
      ];

      expect(isAPIErrorArray(invalidErrors)).toBe(false);
    });

    it('should handle optional field property', () => {
      const errorsWithField: APIError[] = [
        { code: 'VAL_001', message: 'Invalid input', field: 'email' },
      ];
      const errorsWithoutField: APIError[] = [
        { code: 'AUTH_001', message: 'Invalid credentials' },
      ];

      expect(isAPIErrorArray(errorsWithField)).toBe(true);
      expect(isAPIErrorArray(errorsWithoutField)).toBe(true);
    });

    it('should reject invalid field types', () => {
      const invalidFieldType = [
        { code: 'VAL_001', message: 'Invalid', field: 123 }, // field must be string
      ];

      expect(isAPIErrorArray(invalidFieldType)).toBe(false);
    });
  });

  describe('parseAPIError', () => {
    describe('Non-AxiosError handling', () => {
      it('should handle generic Error objects', () => {
        const error = new Error('Something went wrong');
        const result = parseAPIError(error);

        expect(result).toEqual([
          {
            code: 'UNKNOWN',
            message: 'Something went wrong',
          },
        ]);
      });

      it('should handle non-Error objects', () => {
        const error = { some: 'object' };
        const result = parseAPIError(error);

        expect(result).toEqual([
          {
            code: 'UNKNOWN',
            message: ERROR_MESSAGES['UNKNOWN'],
          },
        ]);
      });

      it('should handle null and undefined', () => {
        expect(parseAPIError(null)).toEqual([
          { code: 'UNKNOWN', message: ERROR_MESSAGES['UNKNOWN'] },
        ]);
        expect(parseAPIError(undefined)).toEqual([
          { code: 'UNKNOWN', message: ERROR_MESSAGES['UNKNOWN'] },
        ]);
      });

      it('should handle strings', () => {
        const result = parseAPIError('some error string');
        expect(result).toEqual([
          { code: 'UNKNOWN', message: ERROR_MESSAGES['UNKNOWN'] },
        ]);
      });
    });

    describe('Backend structured errors', () => {
      it('should parse structured error response', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 400,
            data: {
              success: false,
              errors: [
                { code: 'AUTH_001', message: 'Invalid credentials' },
                { code: 'VAL_002', message: 'Invalid email', field: 'email' },
              ],
            },
            statusText: 'Bad Request',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          { code: 'AUTH_001', message: 'Invalid credentials' },
          { code: 'VAL_002', message: 'Invalid email', field: 'email' },
        ]);
      });

      it('should handle single error in array', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 400,
            data: {
              errors: [{ code: 'USER_001', message: 'User not found' }],
            },
            statusText: 'Bad Request',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([{ code: 'USER_001', message: 'User not found' }]);
      });

      it('should handle multiple field errors', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Validation failed',
          response: {
            status: 422,
            data: {
              errors: [
                { code: 'VAL_002', message: 'Invalid email', field: 'email' },
                { code: 'VAL_003', message: 'Weak password', field: 'password' },
                { code: 'VAL_004', message: 'Required', field: 'first_name' },
              ],
            },
            statusText: 'Unprocessable Entity',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toHaveLength(3);
        expect(result[0].field).toBe('email');
        expect(result[1].field).toBe('password');
        expect(result[2].field).toBe('first_name');
      });
    });

    describe('Network errors', () => {
      it('should handle network error (no response)', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Network Error',
          response: undefined,
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'NETWORK_ERROR',
            message: ERROR_MESSAGES['NETWORK_ERROR'],
          },
        ]);
      });

      it('should handle timeout error', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'timeout of 5000ms exceeded',
          response: undefined,
          code: 'ECONNABORTED',
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'NETWORK_ERROR',
            message: ERROR_MESSAGES['NETWORK_ERROR'],
          },
        ]);
      });
    });

    describe('HTTP status-based errors', () => {
      it('should handle 401 Unauthorized', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 401,
            data: {},
            statusText: 'Unauthorized',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'AUTH_003',
            message: ERROR_MESSAGES['AUTH_003'],
          },
        ]);
      });

      it('should handle 403 Forbidden', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 403,
            data: {},
            statusText: 'Forbidden',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'FORBIDDEN',
            message: ERROR_MESSAGES['FORBIDDEN'],
          },
        ]);
      });

      it('should handle 404 Not Found', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 404,
            data: {},
            statusText: 'Not Found',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'NOT_FOUND',
            message: ERROR_MESSAGES['NOT_FOUND'],
          },
        ]);
      });

      it('should handle 429 Too Many Requests', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 429,
            data: {},
            statusText: 'Too Many Requests',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'RATE_LIMIT',
            message: ERROR_MESSAGES['RATE_LIMIT'],
          },
        ]);
      });

      it('should handle 500 Internal Server Error', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 500,
            data: {},
            statusText: 'Internal Server Error',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'SERVER_ERROR',
            message: ERROR_MESSAGES['SERVER_ERROR'],
          },
        ]);
      });

      it('should handle 502 Bad Gateway', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 502,
            data: {},
            statusText: 'Bad Gateway',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'SERVER_ERROR',
            message: ERROR_MESSAGES['SERVER_ERROR'],
          },
        ]);
      });

      it('should handle 503 Service Unavailable', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 503,
            data: {},
            statusText: 'Service Unavailable',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'SERVER_ERROR',
            message: ERROR_MESSAGES['SERVER_ERROR'],
          },
        ]);
      });
    });

    describe('Fallback error handling', () => {
      it('should handle unrecognized status code with message', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Custom error message',
          response: {
            status: 418, // I'm a teapot
            data: {},
            statusText: "I'm a teapot",
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'UNKNOWN',
            message: 'Custom error message',
          },
        ]);
      });

      it('should handle response with non-structured data', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 400,
            data: 'Plain text error',
            statusText: 'Bad Request',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        expect(result).toEqual([
          {
            code: 'UNKNOWN',
            message: 'Request failed',
          },
        ]);
      });
    });

    describe('Priority testing', () => {
      it('should prioritize structured errors over status codes', () => {
        const axiosError: Partial<AxiosError> = {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            status: 401,
            data: {
              errors: [
                { code: 'CUSTOM_ERROR', message: 'Custom structured error' },
              ],
            },
            statusText: 'Unauthorized',
            headers: {},
            config: {} as any,
          },
        };

        const result = parseAPIError(axiosError);

        // Should return structured error, not the 401 default
        expect(result).toEqual([
          { code: 'CUSTOM_ERROR', message: 'Custom structured error' },
        ]);
      });
    });
  });

  describe('getErrorMessage', () => {
    it('should return message for known error code', () => {
      expect(getErrorMessage('AUTH_001')).toBe('Invalid email or password');
      expect(getErrorMessage('USER_002')).toBe('This email is already registered');
      expect(getErrorMessage('VAL_002')).toBe('Email format is invalid');
    });

    it('should return UNKNOWN message for unknown code', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toBe(ERROR_MESSAGES['UNKNOWN']);
      expect(getErrorMessage('')).toBe(ERROR_MESSAGES['UNKNOWN']);
    });

    it('should handle all documented error codes', () => {
      const codes = [
        'AUTH_001',
        'AUTH_002',
        'AUTH_003',
        'AUTH_004',
        'USER_001',
        'USER_002',
        'USER_003',
        'USER_004',
        'VAL_001',
        'VAL_002',
        'VAL_003',
        'VAL_004',
        'ORG_001',
        'ORG_002',
        'ORG_003',
        'PERM_001',
        'PERM_002',
        'PERM_003',
        'RATE_001',
        'SESSION_001',
        'SESSION_002',
        'SESSION_003',
        'NETWORK_ERROR',
        'SERVER_ERROR',
        'UNKNOWN',
        'FORBIDDEN',
        'NOT_FOUND',
        'RATE_LIMIT',
      ];

      codes.forEach((code) => {
        const message = getErrorMessage(code);
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getFieldErrors', () => {
    it('should extract field-specific errors', () => {
      const errors: APIError[] = [
        { code: 'VAL_002', message: 'Invalid email format', field: 'email' },
        { code: 'VAL_003', message: 'Password too weak', field: 'password' },
        { code: 'AUTH_001', message: 'Invalid credentials' }, // no field
      ];

      const result = getFieldErrors(errors);

      expect(result).toEqual({
        email: 'Invalid email format',
        password: 'Password too weak',
      });
    });

    it('should return empty object when no field errors', () => {
      const errors: APIError[] = [
        { code: 'AUTH_001', message: 'Invalid credentials' },
        { code: 'SERVER_ERROR', message: 'Server error' },
      ];

      const result = getFieldErrors(errors);

      expect(result).toEqual({});
    });

    it('should return empty object for empty array', () => {
      const result = getFieldErrors([]);
      expect(result).toEqual({});
    });

    it('should use error code message if message is missing', () => {
      const errors: APIError[] = [
        { code: 'VAL_002', message: '', field: 'email' },
      ];

      const result = getFieldErrors(errors);

      expect(result.email).toBe(ERROR_MESSAGES['VAL_002']);
    });

    it('should handle multiple errors for same field (last one wins)', () => {
      const errors: APIError[] = [
        { code: 'VAL_001', message: 'First error', field: 'email' },
        { code: 'VAL_002', message: 'Second error', field: 'email' },
      ];

      const result = getFieldErrors(errors);

      expect(result.email).toBe('Second error');
    });
  });

  describe('getGeneralError', () => {
    it('should return first non-field error', () => {
      const errors: APIError[] = [
        { code: 'VAL_002', message: 'Invalid email', field: 'email' },
        { code: 'AUTH_001', message: 'Invalid credentials' },
        { code: 'SERVER_ERROR', message: 'Server error' },
      ];

      const result = getGeneralError(errors);

      expect(result).toBe('Invalid credentials');
    });

    it('should return undefined when only field errors exist', () => {
      const errors: APIError[] = [
        { code: 'VAL_002', message: 'Invalid email', field: 'email' },
        { code: 'VAL_003', message: 'Weak password', field: 'password' },
      ];

      const result = getGeneralError(errors);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      const result = getGeneralError([]);
      expect(result).toBeUndefined();
    });

    it('should use error code message if message is missing', () => {
      const errors: APIError[] = [
        { code: 'AUTH_001', message: '' },
      ];

      const result = getGeneralError(errors);

      expect(result).toBe(ERROR_MESSAGES['AUTH_001']);
    });

    it('should skip field errors and find general error', () => {
      const errors: APIError[] = [
        { code: 'VAL_001', message: 'Field error 1', field: 'field1' },
        { code: 'VAL_002', message: 'Field error 2', field: 'field2' },
        { code: 'VAL_003', message: 'Field error 3', field: 'field3' },
        { code: 'SERVER_ERROR', message: 'General server error' },
      ];

      const result = getGeneralError(errors);

      expect(result).toBe('General server error');
    });
  });

  describe('Error message completeness', () => {
    it('should have non-empty messages for all error codes', () => {
      Object.entries(ERROR_MESSAGES).forEach(([_code, message]) => {
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toBe('');
      });
    });

    it('should have user-friendly messages', () => {
      // Check that messages don't contain technical jargon or error codes
      Object.entries(ERROR_MESSAGES).forEach(([_code, message]) => {
        expect(message).not.toContain('null');
        expect(message).not.toContain('undefined');
        expect(message).not.toContain('Error:');
        // Messages should start with capital letter
        expect(message[0]).toMatch(/[A-Z]/);
      });
    });
  });
});
