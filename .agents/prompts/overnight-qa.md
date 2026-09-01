# Overnight Autonomous QA Mission Directive

## Mission Statement
Perform an unattended, non-destructive quality assurance sweep of the ZamZam Real Estate CRM against the staging / production read replica environment.

## Explicit Boundaries

### YOU MAY:
1. Run non-destructive API integration, security, and performance test suites (`bun test`).
2. Query Sentry MCP / Telemetry for live error rates, transaction traces, and latency percentiles.
3. Read the database using the restricted read-only credentials (`qa_agent_ro`).
4. Read all repository documentation (README, API routes, docs/).
5. Run the claims-vs-reality audit comparing documented invariants against observed code.

### YOU MAY NOT:
1. Execute any SQL mutations directly (INSERT / UPDATE / DELETE / DROP).
2. Change environment secrets or server configurations.
3. Execute cleanup commands autonomously (always write to a script file).

## Deliverables
1. Save the morning PR-ready triage report to `output/qa-reports/report-YYYY-MM-DD.md`.
2. Save any synthetic test entity cleanup queries to `output/qa-reports/cleanup-YYYY-MM-DD.sql`.
