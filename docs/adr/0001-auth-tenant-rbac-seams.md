# ADR-0001: API authentication, tenant scoping, and permission seams

Date: 2026-08-28 · Status: Accepted

## Context

The CRM is multi-tenant (organizations) with a Next.js edge middleware, an
in-handler guard module (`src/lib/services/api-auth.ts`), and an RBAC matrix
(`src/lib/domain/rbac-engine.ts`). A historical dev fallback in
`requireSession` silently issued a Super Admin session to any cookie-less
request, and ~25 route handlers relied on middleware alone.

## Decisions

1. **`requireSession` never fabricates identity.** No cookie or stale
   organization ⇒ 401. Dev sessions are minted like real ones via
   `bun scripts/dev-login.ts <email>`.
2. **Every route handler verifies auth.** Middleware is coarse routing, not
   the security boundary. Enforced by `test/api-auth-coverage.test.ts`;
   public-by-design routes are allow-listed in that test and documented in
   `docs/auth-coverage.md`.
3. **Tenant scoping is structural, not convention.** `requireSession` binds
   the request's organization into an `AsyncLocalStorage` context
   (`src/lib/db/tenant-context.ts`); the Prisma extension
   (`src/lib/db/tenant-guard.ts`) auto-injects `organizationId` into queries
   and rejects cross-tenant mutations. Scripts outside a request scope
   themselves explicitly.
4. **`requirePermission` is the only permission seam in routes.** It
   delegates to the rbac-engine matrix (role defaults + per-user overrides).
   `requireRole` remains for coarse role checks; routes never import
   rbac-engine directly.

## Consequences

- New org-scoped Prisma models must be added to `ORG_SCOPED_MODELS`
  (enforced by `test/tenant-context.test.ts`, which parses schema.prisma).
- New public endpoints must be added to the coverage test's allow-list with
  their own in-handler credential check.
- Domain pipelines (e.g. lead creation, `src/lib/domain/lead-creation.ts`)
  live in `src/lib/domain` and are called by every entry point (manual POST,
  CSV import, call events) — routes stay thin adapters.
