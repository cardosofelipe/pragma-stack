import type { NextConfig } from "next";

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
    // ESLint configuration
    eslint: {
        ignoreDuringBuilds: false,
        dirs: ['src'],
    },
    // Production optimizations
    reactStrictMode: true,
    // Note: swcMinify is default in Next.js 15
};

// Enable bundle analyzer when ANALYZE=true
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);