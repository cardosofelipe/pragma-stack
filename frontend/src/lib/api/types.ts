/**
 * Extended API Types
 *
 * This file contains type extensions for the auto-generated types when the OpenAPI
 * spec doesn't fully capture the actual backend response structure.
 *
 * @module lib/api/types
 */

import type { Token, UserResponse } from './generated/types.gen';

/**
 * Extended Token Response
 *
 * The actual backend response includes additional fields not captured in OpenAPI spec:
 * - user: UserResponse object
 * - expires_in: Token expiration in seconds
 *
 * TODO: Update backend OpenAPI spec to include these fields
 */
export interface TokenWithUser extends Token {
  user: UserResponse;
  expires_in?: number;
}

/**
 * Success Response (for operations that return success messages)
 */
export interface SuccessResponse {
  success: true;
  message: string;
}

/**
 * Type guard to check if response includes user data
 */
export function isTokenWithUser(token: unknown): token is TokenWithUser {
  const obj = token as Record<string, unknown>;
  return (
    typeof token === 'object' &&
    token !== null &&
    'access_token' in token &&
    'user' in token &&
    typeof obj.access_token === 'string' &&
    typeof obj.user === 'object' &&
    obj.user !== null &&
    !Array.isArray(obj.user)
  );
}

/**
 * Type guard to check if response is a success message
 */
export function isSuccessResponse(response: unknown): response is SuccessResponse {
  const obj = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    'message' in response &&
    obj.success === true &&
    typeof obj.message === 'string'
  );
}
