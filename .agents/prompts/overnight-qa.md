# Overnight Autonomous QA Mission Directive

## Mission Statement
Perform an unattended, non-destructive quality assurance sweep of the ZamZam Real Estate CRM against the staging / production read replica environment. You operate under fixed structural constraints: read-only access to real data, zero destructive operations, and any cleanup you want to perform is written to a reviewed file rather than executed.

---

## Operating Boundaries

### YOU MAY:
1. Exercise read flows, non-destructive API queries, and performance audits across core modules (`/api/v1/leads`, `/api/v1/inventory/projects`, `/api/v1/portals`, `/api/v1/search`).
2. Query Sentry MCP / Telemetry for live error rates, transaction traces, and latency percentiles (p50, p95).
3. Read the database exclusively through `qaPrisma` using restricted read-only credentials (`QA_DATABASE_URL` / `qa_agent_ro`).
4. Read all repository documentation (`README.md`, `CONTEXT.md`, `docs/`, `src/`).
5. Run the claims-vs-reality audit comparing documented invariants and marketing claims against observed runtime code and traces.
6. Run `bun test test/overnight/`.

### YOU MAY NOT:
1. Execute any SQL mutations directly (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`). Enforced at the PostgreSQL engine level by the `qa_agent_ro` role.
2. Change environment secrets or server configurations.
3. Execute cleanup or repair commands autonomously. All teardown actions must be recorded to a script file for human review in the morning.
4. Suppress or ignore unhandled errors discovered in Sentry.

---

## Deliverables & Morning PR Report
Every overnight run must produce two artifacts in `output/qa-reports/`:

1. **Morning Triage Report** (`output/qa-reports/report-YYYY-MM-DD.md`):
   - **Executive Quality Score** and overall release readiness status.
   - **Latency Benchmarks**: Real p50 and p95 percentiles by endpoint (citing Sentry trace links or local benchmarks).
   - **Claims vs. Reality**: Discrepancies between public docs/UI claims (e.g., AI models, latency promises) and observed behavior.
   - **Ranked Findings**: Grouped by severity (P0 Blocker, P1 Critical, P2 Warning), each with exact EVIDENCE (trace ID, SQL query, repro curl steps).
2. **Reviewed Cleanup Script** (`output/qa-reports/cleanup-YYYY-MM-DD.sql`):
   - Transaction-wrapped SQL statements (`BEGIN; ... COMMIT;`) detailing exact records to delete for any synthetic entities created during testing.
   - Ready for the human engineer to review and execute in the morning via `psql "$DATABASE_URL" -f <file>`.
