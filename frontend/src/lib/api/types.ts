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
  return (
    typeof token === 'object' &&
    token !== null &&
    'access_token' in token &&
    'user' in token &&
    typeof (token as any).access_token === 'string' &&
    typeof (token as any).user === 'object' &&
    (token as any).user !== null &&
    !Array.isArray((token as any).user)
  );
}

/**
 * Type guard to check if response is a success message
 */
export function isSuccessResponse(response: unknown): response is SuccessResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    'message' in response &&
    (response as any).success === true &&
    typeof (response as any).message === 'string'
  );
}
