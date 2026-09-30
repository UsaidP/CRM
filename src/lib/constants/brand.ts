/**
 * Brand constants — single source of truth for the product name.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The product name was previously hardcoded as a string literal across ~120
 * files, which produced an inconsistent half-finished rename: some surfaces said
 * "Lucky CRM" while others still said "ZamZam CRM" or "ZamZam Properties".
 *
 * There are TWO different names in play, and conflating them is the bug this
 * module prevents:
 *
 *   1. PRODUCT name  — "Lucky CRM". The software itself. Constant. Lives here.
 *   2. TENANT name   — the customer's firm, e.g. "ZamZam Properties Real Estate
 *                      Advisory". This is DATA, read from `organization.name` on
 *                      the session, and varies per tenant.
 *
 * A tenant's name always wins for anything customer-facing (letterheads, CSV
 * exports, portal headers). The product name is only a fallback for the case
 * where no organisation is loaded yet — e.g. the marketing site, or first paint
 * before the session resolves.
 *
 * Never hardcode a firm name in a component or an export template. Use
 * `resolveFirmName()` so the software works for any tenant.
 */

/** The product name. Use for UI chrome, metadata titles, docs and marketing. */
export const PRODUCT_NAME = 'Lucky CRM';

/** Short descriptor used alongside the product name in titles and footers. */
export const PRODUCT_DESCRIPTOR = 'Real Estate OS';

/**
 * Neutral label for a user whose role is generic. Replaces a hardcoded firm name
 * that previously leaked into the UI as a fallback (e.g. "ZamZam Advisor").
 */
export const NEUTRAL_ADVISOR_LABEL = 'Advisor';

/**
 * Resolve the name to display for a given organisation.
 *
 * @param orgName - `organization.name` from the session, or null/undefined while
 *                  loading or when unauthenticated.
 * @returns the tenant's name when present and non-blank, otherwise the product
 *          name. Never returns an empty string.
 */
export function resolveFirmName(orgName?: string | null): string {
  const trimmed = typeof orgName === 'string' ? orgName.trim() : '';
  return trimmed.length > 0 ? trimmed : PRODUCT_NAME;
}

/**
 * Build a Next.js metadata title for a page.
 *
 * @example buildPageTitle('Sign In') // => 'Sign In | Lucky CRM'
 */
export function buildPageTitle(page: string): string {
  return `${page} | ${PRODUCT_NAME}`;
}
