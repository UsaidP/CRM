# ADR-0002: Overnight autonomous QA guardrails, structural permissions, and observability seams

Date: 2026-09-11 · Status: Accepted

## Context

We run unattended AI agents and scheduled CI sweeps overnight to evaluate CRM performance, discover regressions, audit security invariants, and test user journeys. Previously, test runs executed using primary administrative credentials (`DATABASE_URL`), relied on verbal prompt instructions ("do not delete"), executed live database deletions during teardown, and approximated performance via local in-memory loops.

## Decisions

1. **Read-only database access is structural, never verbal.**
   The QA agent connects exclusively through `QA_DATABASE_URL` via the `qa_agent_ro` PostgreSQL role. The database engine structurally denies `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, and DDL with error code `42501` (`insufficient_privilege`). Prompts are wishes; grants are guarantees.
2. **Cleanup is written down, never executed.**
   The QA agent never executes destructive cleanup commands against the database. When synthetic test entities are created during user flow testing, the identifiers are captured in an unexecuted SQL script (`output/qa-reports/cleanup-YYYY-MM-DD.sql`) wrapped in a transaction (`BEGIN; ... COMMIT;`) for human review and manual execution.
3. **Observability is anchored in real APM telemetry (Sentry MCP).**
   Performance metrics (p50, p95 latencies) and endpoint error rates are sourced directly from Sentry telemetry and distributed traces rather than guessed or simulated in-memory. Sentry MCP (`@modelcontextprotocol/server-sentry`) provides interactive trace inspection for the agent.
4. **Continuous Claims-vs-Reality auditing.**
   The overnight suite includes an explicit audit comparing claims in docs/UI (e.g. AI models used, response latency thresholds, auth coverage) against observed runtime code and traces.
5. **Morning PR-ready reporting.**
   Every overnight sweep outputs a structured markdown report (`output/qa-reports/report-YYYY-MM-DD.md`) containing categorized findings ranked by severity, with attached evidence (trace IDs, repro curls, SQL queries) and a reference to the pending cleanup file.

## Consequences

- The database must have the `qa_agent_ro` role provisioned via `scripts/setup-qa-role.sql`.
- Overnight CI jobs and agent environments must use `QA_DATABASE_URL` instead of `DATABASE_URL`.
- Any new test suites added to the overnight sweep must register test entities with the cleanup collector instead of calling direct `deleteMany` operations.
- The repository requires Sentry credentials (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) to fetch live traces.
