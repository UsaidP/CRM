# ADR-0004: Multi-Org Webhook Routing & Deterministic Tenant Resolution

Date: 2026-09-16 · Status: Accepted

## Context

The CRM architecture was updated to support multi-organization isolation. However, 12 occurrences of `organization.findFirst()` existed across the codebase. On public sessionless webhook endpoints (WhatsApp, Instagram, Telephony), resolving the organization by selecting the first database row was a critical multi-tenant vulnerability once more than one organization exists.

## Decisions

1. **`WebhookCredential` model.** Introduced an org-scoped model in Prisma schema mapping `[provider, providerIdentifier]` (e.g. `WHATSAPP` + phone number ID, `INSTAGRAM` + Page ID, `TELEPHONY` + Virtual DID number) to a specific `Organization`. Added to `ORG_SCOPED_MODELS` in `src/lib/db/tenant-context.ts`.
2. **Deterministic `resolveWebhookOrg`.** Implemented in `src/lib/domain/webhook-org-resolver.ts`:
   - Matches active `WebhookCredential` for the inbound provider and identifier.
   - If no credential is found and exactly 1 organization exists in the database, falls back to that organization for backward compatibility.
   - If multiple organizations exist and no credential matches, fails CLOSED with a 404/400 error rather than leaking leads into an arbitrary tenant.
3. **No `organization.findFirst` invariant.** All authenticated endpoints resolve tenant strictly from `auth.session.organizationId`. Enforced by `test/invariants/no-findFirst-org.test.ts`.

## Consequences

- Each tenant organization must register their provider credentials / virtual numbers in the `WebhookCredential` table.
- Multi-organization tenant bleed across public webhooks is strictly prevented.
