export const MATCHING_SIMULATION_ENDPOINT = '/api/v1/matching/simulate';

export function isPublicPortalPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/p' || pathname.startsWith('/p/');
}

export function isPublicAuthPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/forgot-password/') ||
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password/') ||
    pathname === '/set-password' ||
    pathname.startsWith('/set-password/')
  );
}

export function isPublicLayoutPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return isPublicPortalPath(pathname) || isPublicAuthPath(pathname);
}

export function buildPublicPortalPath(token: string): string {
  return `/p/${encodeURIComponent(token)}`;
}

export function buildPublicPortalUrl(origin: string, token: string): string {
  return new URL(buildPublicPortalPath(token), origin).toString();
}

