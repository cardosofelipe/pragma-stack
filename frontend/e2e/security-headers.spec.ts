/**
 * E2E Tests for Security Headers
 * Verifies that security headers are properly configured per OWASP 2025 recommendations
 *
 * References:
 * - https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
 * - https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
 */

import { test, expect } from '@playwright/test';

test.describe('Security Headers', () => {
  test('should include all required security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // X-Frame-Options: Prevents clickjacking attacks
    expect(headers['x-frame-options']).toBe('DENY');

    // X-Content-Type-Options: Prevents MIME type sniffing
    expect(headers['x-content-type-options']).toBe('nosniff');

    // Referrer-Policy: Controls referrer information leakage
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // Permissions-Policy: Restricts browser features
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['permissions-policy']).toContain('microphone=()');
    expect(headers['permissions-policy']).toContain('geolocation=()');

    // Content-Security-Policy: Mitigates XSS and injection attacks
    const csp = headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  test('should NOT include deprecated security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // X-XSS-Protection is deprecated and should not be set
    // (Modern browsers have removed support, can cause security issues)
    expect(headers['x-xss-protection']).toBeUndefined();
  });

  test('security headers should be present on all routes', async ({ request }) => {
    const routes = ['/', '/en', '/en/login', '/en/register'];

    for (const route of routes) {
      const response = await request.get(route);
      const headers = response.headers();

      expect(headers['x-frame-options'], `Missing X-Frame-Options on ${route}`).toBe('DENY');
      expect(headers['x-content-type-options'], `Missing X-Content-Type-Options on ${route}`).toBe(
        'nosniff'
      );
    }
  });
});
