import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Initialize next-intl plugin with i18n request config path
const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

/**
 * Security Headers Configuration (OWASP 2025 recommendations)
 *
 * References:
 * - https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
 * - https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
 *
 * Note: X-XSS-Protection is intentionally omitted (deprecated, removed from browsers)
 * Note: Strict CSP requires dynamic rendering with nonces - not implemented here
 */
const securityHeaders = [
  {
    // Prevents clickjacking by denying iframe embedding
    // Also handled by CSP frame-ancestors, but X-Frame-Options provides legacy browser support
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Prevents MIME type sniffing attacks
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Controls how much referrer information is sent with requests
    // 'strict-origin-when-cross-origin' is the recommended balance of privacy and functionality
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Disables browser features that aren't needed
    // Add features back as needed: camera=self, microphone=self, etc.
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    // Basic CSP that works with inline scripts/styles (required for theme init and Tailwind)
    // For strict CSP with nonces, use proxy.ts with dynamic rendering
    // frame-ancestors 'none' duplicates X-Frame-Options for modern browsers
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Required for theme init script
      "style-src 'self' 'unsafe-inline'", // Required for Tailwind and styled components
      "img-src 'self' blob: data: https:", // Allow images from HTTPS sources
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',

  // Security headers applied to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Ensure we can connect to the backend in Docker
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/:path*',
      },
    ];
  },

  // Production optimizations
  reactStrictMode: true,
  // Note: SWC minification is default in Next.js 16
};

// Wrap config with next-intl plugin
export default withNextIntl(nextConfig);
