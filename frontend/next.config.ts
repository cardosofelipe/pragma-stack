import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Initialize next-intl plugin with i18n request config path
const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
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
