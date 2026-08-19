export const MATCHING_SIMULATION_ENDPOINT = '/api/v1/matching/simulate';

export function isPublicPortalPath(pathname: string): boolean {
  return pathname === '/p' || pathname.startsWith('/p/');
}

export function buildPublicPortalPath(token: string): string {
  return `/p/${encodeURIComponent(token)}`;
}

export function buildPublicPortalUrl(origin: string, token: string): string {
  return new URL(buildPublicPortalPath(token), origin).toString();
}
