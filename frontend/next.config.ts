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
    // Exclude generated API client from ESLint
    eslint: {
        ignoreDuringBuilds: false,
        dirs: ['src', 'tests'],
    },
};

export default nextConfig;