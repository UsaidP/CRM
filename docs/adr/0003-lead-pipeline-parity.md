# ADR-0003: Lead Pipeline Parity & Single-Writer Invariant

Date: 2026-09-16 · Status: Accepted

## Context

Prior to this decision, 7 raw `prisma.lead.create` calls existed across 5 entry points (WhatsApp Cloud API webhooks, Instagram Messaging webhooks, Exotel Telephony webhooks, Android Companion call-events, and CSV bulk imports). Each entry point partially reimplemented contact resolution, broker assignment, attribution parsing, SLA calculation, and reminder creation.

This led to severe semantic divergence:
- WhatsApp leads skipped proper SLA minutes.
- Telephony leads skipped contact identity resolution and initial LeadAssignment audit records.
- CSV imports bypassed rep auto-assignment logic.

## Decisions

1. **`createLead` and `upsertOrCreateLead` are the single lead writers.** All inbound channels (manual entry, WhatsApp, Instagram, Telephony, mobile companion, CSV imports) MUST delegate to `src/lib/domain/lead-creation.ts`.
2. **Channel-specific enrichment fields** (`channel`, `whatsappWaId`, `instagramId`, `sourceContentId`, `requirements`, `firstResponseAt`, `firstResponseSlaMinutes`) are first-class properties on `CreateLeadInput`.
3. **Pipeline parity ratchet invariant.** Enforced by `test/invariants/lead-pipeline-parity.test.ts`, which scans all source files and asserts that `prisma.lead.create` is only ever invoked inside `src/lib/domain/lead-creation.ts`.

## Consequences

- Every lead across all channels uniformly receives durable contact identity linking, campaign counter tracking, speed-to-lead SLA reminders, and initial `LeadAssignment` audit trails.
- Any future inbound channels must add an adapter in `src/app/api/` that delegates to `createLead` or `upsertOrCreateLead`.
