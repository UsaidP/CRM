/**
 * Canonical registry of public routes across the CRM application.
 * Shared between proxy.ts (edge/request routing) and test/api-auth-coverage.test.ts.
 */

/** Page and asset paths that never require user session authentication. */
export const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/set-password',
  '/robots.txt',
  '/sitemap.xml',
  '/sitemap',
  '/llms.txt',
  '/llms-full.txt',
  '/manifest.json',
  '/manifest.webmanifest',
] as const;

/** API route prefixes exempt from proxy edge session validation. */
export const PUBLIC_API_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/webhooks',
  '/api/v1/track',
  '/api/v1/health',
  '/api/v1/inventory/rera/certificate-view',
] as const;

/**
 * Route paths that are public BY DESIGN (each must verify its own credential or token).
 * Subpaths relative to `src/app/api/` or `src/app/api/v1/`.
 */
export const PUBLIC_API_ALLOW_LIST = [
  // Auth endpoints are the credential issuers themselves
  'auth/login',
  'auth/logout',
  'auth/session',
  'auth/forgot-password',
  'auth/reset-password',
  'auth/set-password',
  // Liveness probe
  'health',
  // Inbound webhooks (must verify provider signatures or HMAC in-handler)
  'webhooks/telephony',
  'webhooks/whatsapp',
  'webhooks/instagram',
  // Public client portals + tracking pixels (token-authenticated in-handler)
  'portals/[token]',
  'portals/[token]/telemetry',
  'track/[slug]',
] as const;
