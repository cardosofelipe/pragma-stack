import type { AxiosError } from 'axios';

// Backend error format
export interface APIError {
  code: string;
  message: string;
  field?: string;
}

export interface APIErrorResponse {
  success: false;
  errors: APIError[];
}

// Error code to user-friendly message mapping
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors (AUTH_xxx)
  'AUTH_001': 'Invalid email or password',
  'AUTH_002': 'Account is inactive',
  'AUTH_003': 'Invalid or expired token',
  'AUTH_004': 'Session expired. Please login again',

  // User errors (USER_xxx)
  'USER_001': 'User not found',
  'USER_002': 'This email is already registered',
  'USER_003': 'Invalid user data',
  'USER_004': 'Cannot delete your own account',

  // Validation errors (VAL_xxx)
  'VAL_001': 'Invalid input. Please check your data',
  'VAL_002': 'Email format is invalid',
  'VAL_003': 'Password does not meet requirements',
  'VAL_004': 'Required field is missing',

  // Organization errors (ORG_xxx)
  'ORG_001': 'Organization name already exists',
  'ORG_002': 'Organization not found',
  'ORG_003': 'Cannot delete organization with members',

  // Permission errors (PERM_xxx)
  'PERM_001': 'Insufficient permissions',
  'PERM_002': 'Admin access required',
  'PERM_003': 'Cannot perform this action',

  // Rate limiting (RATE_xxx)
  'RATE_001': 'Too many requests. Please try again later',

  // Session errors (SESSION_xxx)
  'SESSION_001': 'Session not found',
  'SESSION_002': 'Cannot revoke current session',
  'SESSION_003': 'Session expired',

  // Generic errors
  'NETWORK_ERROR': 'Network error. Please check your connection',
  'SERVER_ERROR': 'A server error occurred. Please try again later',
  'UNKNOWN': 'An unexpected error occurred',
  'FORBIDDEN': "You don't have permission to perform this action",
  'NOT_FOUND': 'The requested resource was not found',
  'RATE_LIMIT': 'Too many requests. Please slow down',
};

/**
 * Parse API error response
 * @param error AxiosError from API request
 * @returns Array of structured APIError objects
 */
export function parseAPIError(error: AxiosError<APIErrorResponse>): APIError[] {
  // Backend structured errors
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    return error.response.data.errors;
  }

  // Network errors (no response)
  if (!error.response) {
    return [
      {
        code: 'NETWORK_ERROR',
        message: ERROR_MESSAGES['NETWORK_ERROR'] || 'Network error. Please check your connection',
      },
    ];
  }

  // HTTP status-based errors
  const status = error.response.status;

  if (status === 401) {
    return [
      {
        code: 'AUTH_003',
        message: ERROR_MESSAGES['AUTH_003'] || 'Invalid or expired token',
      },
    ];
  }

  if (status === 403) {
    return [
      {
        code: 'FORBIDDEN',
        message: ERROR_MESSAGES['FORBIDDEN'] || "You don't have permission to perform this action",
      },
    ];
  }

  if (status === 404) {
    return [
      {
        code: 'NOT_FOUND',
        message: ERROR_MESSAGES['NOT_FOUND'] || 'The requested resource was not found',
      },
    ];
  }

  if (status === 429) {
    return [
      {
        code: 'RATE_LIMIT',
        message: ERROR_MESSAGES['RATE_LIMIT'] || 'Too many requests. Please slow down',
      },
    ];
  }

  if (status >= 500) {
    return [
      {
        code: 'SERVER_ERROR',
        message: ERROR_MESSAGES['SERVER_ERROR'] || 'A server error occurred. Please try again later',
      },
    ];
  }

  // Fallback error
  return [
    {
      code: 'UNKNOWN',
      message: error.message || ERROR_MESSAGES['UNKNOWN'] || 'An unexpected error occurred',
    },
  ];
}

/**
 * Get user-friendly error message from error code
 * @param code Error code from backend
 * @returns User-friendly error message
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES['UNKNOWN'];
}

/**
 * Extract field-specific errors for forms
 * @param errors Array of APIError objects
 * @returns Map of field names to error messages
 */
export function getFieldErrors(errors: APIError[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  errors.forEach((error) => {
    if (error.field) {
      fieldErrors[error.field] = error.message || getErrorMessage(error.code);
    }
  });

  return fieldErrors;
}

/**
 * Get first non-field error message (general error)
 * @param errors Array of APIError objects
 * @returns First general error message or undefined
 */
export function getGeneralError(errors: APIError[]): string | undefined {
  const generalError = errors.find((error) => !error.field);
  return generalError ? generalError.message || getErrorMessage(generalError.code) : undefined;
}

/**
 * Type guard to check if error is an APIError array
 * Provides runtime type safety instead of type assertions
 * @param error Unknown error object
 * @returns true if error is APIError[]
 */
export function isAPIErrorArray(error: unknown): error is APIError[] {
  if (!Array.isArray(error)) {
    return false;
  }

  // Check if all elements match APIError structure
  return error.every(
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      'message' in e &&
      typeof e.code === 'string' &&
      typeof e.message === 'string' &&
      // field is optional
      (!('field' in e) || typeof e.field === 'string')
  );
}
