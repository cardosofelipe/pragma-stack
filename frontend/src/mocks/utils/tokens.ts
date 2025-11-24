/**
 * MSW Token Generation Utilities
 *
 * Helper functions for generating mock JWT tokens in demo mode.
 * Tokens follow proper JWT format to pass client-side validation.
 */

/**
 * Generate a mock JWT-like token for demo mode
 * Format: header.payload.signature (3 parts separated by dots)
 *
 * @param type - Token type ('access' or 'refresh')
 * @param userId - User ID to include in the token payload
 * @returns JWT-formatted token string
 */
export function generateMockToken(type: 'access' | 'refresh', userId: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      type: type,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (type === 'access' ? 900 : 2592000),
    })
  );
  const signature = btoa(`demo-${type}-${userId}-${Date.now()}`);
  return `${header}.${payload}.${signature}`;
}
