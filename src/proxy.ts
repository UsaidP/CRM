import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/services/auth-service';
import { PUBLIC_PATHS, PUBLIC_API_PREFIXES } from '@/lib/constants/public-routes';

const CORS_ALLOWED_METHODS = 'GET,OPTIONS,PATCH,DELETE,POST,PUT';
const CORS_ALLOWED_HEADERS =
  'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization';

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  if (origin === request.nextUrl.origin) {
    return origin;
  }

  const isDev = process.env.NODE_ENV === 'development';
  if (
    isDev &&
    (/^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
  ) {
    return origin;
  }

  const allowLan = isDev && process.env.ALLOW_LAN_CORS === 'true';
  if (
    allowLan &&
    (/^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
      /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin))
  ) {
    return origin;
  }

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);

  if (allowedOrigins.includes(origin.toLowerCase())) {
    return origin;
  }

  return null;
}

function getCorsHeaders(allowedOrigin: string | null): Record<string, string> {
  if (!allowedOrigin) return {};
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next.js internals, static assets, images, icons, and metadata files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/.well-known') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/llms.txt' ||
    pathname === '/llms-full.txt' ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|pdf|mp4|webm|css|js|woff|woff2|ttf|txt|xml|json|webmanifest)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Allow Public Client Presentation Portals (/p and /p/:token)
  if (pathname === '/p' || pathname.startsWith('/p/')) {
    return NextResponse.next();
  }

  // 3. API endpoints: require a valid session EXCEPT for public prefixes
  //    (/api/v1/auth, /api/v1/portals, /api/v1/webhooks, /api/v1/track, /api/v1/health).
  if (pathname.startsWith('/api/')) {
    const allowedOrigin = getAllowedOrigin(request);
    const corsHeaders = getCorsHeaders(allowedOrigin);

    // 3a. Handle CORS Preflight OPTIONS requests for mobile and web cross-origin clients
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const isPublicApi = PUBLIC_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    // Public portal token routes stay token-authenticated (/api/v1/portals/[token])
    const isPortalTokenRoute =
      pathname.startsWith('/api/v1/portals/') && !pathname.startsWith('/api/v1/portals/create');

    if (isPublicApi || isPortalTokenRoute) {
      return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader && /^Bearer /i.test(authHeader)
      ? authHeader.substring(7).trim()
      : null;
    const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const token = bearerToken || cookieToken;

    const apiSession = await verifySessionToken(token);
    if (!apiSession) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }
    return NextResponse.next();
  }

  // 4. Check Session Cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = await verifySessionToken(sessionCookie);
  const isAuthenticated = !!sessionUser;

  // 5. If user is on a guest-only Auth page (/login, /forgot-password, etc.)
  const isGuestOnlyAuthPath = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/set-password',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isGuestOnlyAuthPath) {
    if (isAuthenticated) {
      // Already logged in -> redirect to home dashboard
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // 6. Public marketing & landing pages allowed for everyone
  if (
    pathname === '/' ||
    pathname === '/landing' ||
    pathname.startsWith('/landing/') ||
    pathname === '/register' ||
    pathname.startsWith('/register/')
  ) {
    return NextResponse.next();
  }

  // 7. If user is accessing protected routes without authentication
  if (!isAuthenticated) {
    // If it's a page request -> redirect to /login with redirect query param
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
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
