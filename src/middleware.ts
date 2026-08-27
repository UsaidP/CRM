import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/services/auth-service';

// Paths that NEVER require authentication
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/set-password',
];

const PUBLIC_API_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/portals',
  '/api/v1/webhooks',
  '/api/v1/track',
  '/api/v1/health',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next.js internals, static assets, images, icons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Allow Public Client Presentation Portals (/p and /p/:token)
  if (pathname === '/p' || pathname.startsWith('/p/')) {
    return NextResponse.next();
  }

  // 3. API endpoints: require a valid session EXCEPT for public prefixes
  //    (auth, public portals, webhooks, tracking, health).
  if (pathname.startsWith('/api/')) {
    const isPublicApi = PUBLIC_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    // Public portal token routes stay token-authenticated (/api/v1/portals/[token])
    const isPortalTokenRoute =
      pathname.startsWith('/api/v1/portals/') && !pathname.startsWith('/api/v1/portals/create');

    if (isPublicApi || isPortalTokenRoute) {
      return NextResponse.next();
    }

    const apiSession = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!apiSession) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 4. Check Session Cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = await verifySessionToken(sessionCookie);
  const isAuthenticated = !!sessionUser;

  // 5. If user is on an Auth page (/login, /forgot-password, etc.)
  const isAuthPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isAuthPath) {
    if (isAuthenticated) {
      // Already logged in -> redirect to home dashboard
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // 6. If user is accessing protected routes without authentication
  if (!isAuthenticated) {
    // If it's a page request -> redirect to /login with redirect query param
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
