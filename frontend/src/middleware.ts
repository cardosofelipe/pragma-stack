import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block access to /dev routes in production
  if (pathname.startsWith('/dev')) {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Return 404 in production
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/dev/:path*',
};
