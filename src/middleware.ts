import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/lib/routes';

export function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Check for the session token cookie (NextAuth v5 uses authjs prefix)
  // In development: authjs.session-token
  // In production (HTTPS): __Secure-authjs.session-token
  const sessionToken =
    req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  const isLoggedIn = !!sessionToken;

  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  const isAuthRoute = nextUrl.pathname === ROUTES.AUTH.LOGIN;

  // Redirect logged-in users away from login page
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(ROUTES.ADMIN.HOME, nextUrl));
  }

  // Protect admin routes - redirect to login if not authenticated
  if (isAdminRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(
      new URL(`${ROUTES.AUTH.LOGIN}?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  // Set pathname header for route permission checking in layout
  const response = NextResponse.next();
  response.headers.set('x-pathname', nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    // Match admin routes
    '/admin/:path*',
    // Match auth routes
    '/login',
  ],
};
