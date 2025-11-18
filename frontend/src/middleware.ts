import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';

// Create next-intl middleware for locale handling
const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block access to /dev routes in production (before locale handling)
  if (pathname.startsWith('/dev')) {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Return 404 in production
      return new NextResponse(null, { status: 404 });
    }
  }

  // Handle locale routing with next-intl
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/*)
  // - Static files (/_next/*, /favicon.ico, etc.)
  // - Files in public folder (images, fonts, etc.)
  matcher: [
    // Match all pathnames except for
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // However, match all pathnames within /api/
    // that don't end with a file extension
    '/api/(.*)',
  ],
};
