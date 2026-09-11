# ZamZam Real Estate CRM — Domain Glossary

This document defines canonical domain terms for the CRM codebase. Implementation details belong in code and ADRs; this is the glossary of record.

---

### Core Domain

- **Organization**: The top-level tenant entity. Every broker, lead, property, and deal belongs to an Organization.
- **Lead**: A potential property buyer or investor inquiry entering the CRM from digital campaigns (WhatsApp, Instagram, YouTube) or direct broker contacts.
- **Developer Project**: A statutory real estate development project registered under MahaRERA (Maharashtra Real Estate Regulatory Authority).
- **Property Unit**: An inventory unit (e.g. 2 BHK, 3 BHK) within a Developer Project, with carpet area, pricing breakdown, and verification status.
- **Deal Transaction**: A commercial transaction representing an agreed sale, tracking brokerage percentage, firm net commission, and deal status (token received, registered, invoice paid).
- **Client Portal**: A customized, authenticated web link generated for a buyer containing curated property recommendations and telemetry tracking.

---

### Autonomous QA & Safety Domain

- **Autonomous QA Agent**: An unattended AI agent operating on a scheduled cadence (e.g. nightly) to audit system health, latency, security, and document veracity.
- **Structural Guardrail**: A restriction enforced by operating system, database engine, or network permissions rather than prompt instructions. Prompts are wishes; grants are guarantees.
- **Read-Only Database Role (`qa_agent_ro`)**: A PostgreSQL role with `SELECT` privileges only, explicitly revoked from `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, and schema changes.
- **Cleanup Script (`cleanup-YYYY-MM-DD.sql`)**: An unexecuted, transaction-wrapped SQL file containing teardown statements for synthetic test entities created during testing, written for human review rather than autonomous execution.
- **Claims vs. Reality Audit**: An automated comparison verifying that public documentation, UI marketing, and declared SLAs match actual production traces, configurations, and running code.
- **Observability Telemetry**: Real performance percentiles (p50, p95), unhandled exception traces, and failure rates gathered from an APM (Sentry) rather than guessed or simulated in-memory.
