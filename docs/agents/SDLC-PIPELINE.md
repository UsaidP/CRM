# SDLC Pipeline

How work moves from idea to production in this repository, and which gates are
enforced where.

This document exists because of a specific failure mode, not as process for its
own sake. AI-assisted development makes the *typing* cheap and leaves the
*decisions* expensive: if an agent gets each decision right 80% of the time and a
feature involves 20 decisions, the odds of getting all of them right are roughly
1%. Vibe-coded projects therefore tend to hit a wall around the three-month mark
— one change breaks four things, the fixes break something else, and nobody
(including the agent) understands the system any more.

The antidote is not discipline. It is structure: context the agent can read,
gates that fail loudly, and guardrails that are enforced by tooling rather than
by good intentions. `CONTEXT.md` already states the principle — **"Prompts are
wishes; grants are guarantees"** — this document describes where each grant
lives.

---

## 1. Two modes — pick deliberately

Vibe coding is not a mistake; using it for everything is. The mode is a property
of the *task*, not of the developer.

| | **Vibe** | **Engineer** |
|---|---|---|
| Use for | Prototypes, spikes, throwaway scripts, exploration, UI experiments | Anything shipped to users |
| Spec | Skipped — the sketch *is* the spec | Written first, reviewed before code |
| Tests | Optional | Required (see gates) |
| Review | None | Required |
| Examples here | A one-off `scripts/*.js` probe, a design exploration in `.scratch/` | Any route under `src/app/api/`, tenant logic, billing, auth |

**Vibe to explore. Engineer to ship.** If a "prototype" acquires real users, it
has silently changed mode — stop and backfill the spec and tests.

### The ceiling signals

Stop vibing and switch to the engineered path when any of these appear:

- You are in a debugging loop that does not converge.
- The codebase contains two conflicting patterns for the same concern.
- You cannot explain what the code does in plain language.
- The task touches auth, tenant isolation, money, or PII (see `RED-ZONE.md`).
- Real users with real data will be affected.

---

## 2. Model + Harness

Agentic engineering splits cleanly into two layers. This repository is strong on
the first and was thin on the second.

**The Model** — everything that tells an agent *what good looks like*:

| Asset | Location | Notes |
|---|---|---|
| Agent instructions | `AGENTS.md`, `CONTEXT.md` | Includes the Next.js 16 "this is NOT the Next.js you know" block |
| Skill library | `.agents/skills/` | 86 skills, hash-locked via `skills-lock.json` to `mattpocock/skills`, `rohitg00/agentmemory`, `benjitaylor/agentation` |
| Domain docs | `docs/agents/domain.md`, `issue-tracker.md`, `triage-labels.md` | |
| Decisions | `docs/adr/` | 4 ADRs; add one per irreversible choice |
| Memory | `agentmemory` MCP + `.agents/rules/agentmemory.md` | Cross-session recall |
| Roadmap / specs | `.planning/` | Milestone docs and requirements |
| Active specs | `.scratch/<feature>/spec.md` | Working area for in-flight work |

**The Harness** — everything that *enforces* it without asking:

| Mechanism | Location | Blocks what |
|---|---|---|
| PreToolUse guard | `scripts/agent-hooks/guard-bash.mjs` wired in `.claude/settings.json` | Agents running `reset-production`, `db:fresh:remote`, `prisma migrate reset`, `--no-verify`, or force-push |
| Permission asks | `.claude/settings.json` → `permissions.ask` | Silent edits to Red Zone files (see §5) |
| Secret read denial | `.claude/settings.json` → `permissions.deny` | Agents reading `.env*` into context |
| Pre-commit hook | `.githooks/pre-commit` | Committing secrets or lint-failing TS |
| CI: quality | `.github/workflows/test.yml` | Lint, `tsc --noEmit`, tests, coverage |
| CI: security | `.github/workflows/security.yml` | Leaked secrets, HIGH/CRITICAL CVEs, Semgrep ERROR findings |
| CI: overnight QA | `.github/workflows/overnight-qa.yml` | Scheduled deep checks with artifact upload |
| CodeRabbit review | `.coderabbit.yaml` + `coderabbit review --uncommitted` | AI architectural & Red Zone boundary review pre-commit/PR |
| Ralph iteration loop | `ralph-loop@claude-plugins-official` (`/ralph-loop`) | Autonomous iteration until build/invariants promise is met |
| Plugin set | `.claude/settings.json` → `enabledPlugins` + `extraKnownMarketplaces` | Declares the shared toolchain; install with `claude plugin install <p> -s project` |

> **Harness gotcha.** `claude plugin install -s project` writes to
> `~/.claude/plugins/installed_plugins.json` — *not* to this repo. Committing
> `enabledPlugins` in `.claude/settings.json` is what makes the toolchain
> reproducible; the install command is what makes it present on a machine. You
> need both. A project-scoped plugin can silently point at a *different*
> project's path, so verify with `claude plugin list` after cloning.

---

## 3. The pipeline

Nine stages. The skills already exist in `.agents/skills/` — this is the order
they run in and the gate that closes each one.

```
interview-me            → requirements elicited, not assumed
      ↓
spec-driven-development → .scratch/<feature>/spec.md, reviewed before code
      ↓
to-tickets              → work broken up; labels per docs/agents/triage-labels.md
      ↓
implement-spec          → the build
      ↓
tdd                     → red/green/refactor against the spec
      ↓
code-review-and-quality → adversarial self-review (open-code-review, code-review)
      ↓
security-and-hardening  → OWASP pass on anything touching input/trust
      ↓
shipping-and-launch     → release checklist (shipping-and-launch)
      ↓
observability-and-instrumentation → Sentry + the overnight QA agent
```

### Gate table

| Stage | Gate | Enforced by | Blocking? |
|---|---|---|---|
| Spec | Spec exists in `.scratch/<feature>/` | Human / agent | Yes, by convention |
| Implement | Lint + types clean | `bun run lint`, `bunx tsc --noEmit`, CI `test.yml` | Yes |
| Implement | Invariants hold | `bun run test:invariants` | Yes |
| Self-Review | Automated AI & Red Zone review | `bun run review:cr` (`coderabbit`) | Highly recommended locally, required on PR |
| Commit | No secrets, staged TS lints | `.githooks/pre-commit` | Yes |
| Commit | No `--no-verify` / force-push | `guard-bash.mjs` | Yes (agent only) |
| Push | Tests + security scan | CI `test.yml` + `security.yml` | Yes |
| Push | Red Zone files flagged | `permissions.ask` + PR review | Yes, by review |
| Deploy | Migration reviewed | `docs/adr/0003-lead-pipeline-parity.md` pattern | Yes, by review |
| Runtime | Error rate / p95 within bounds | Sentry MCP + overnight QA | Reported |

### Enabling the local gates

```bash
bun run setup:hooks     # git config core.hooksPath .githooks
```

That is per-clone and one-time. Without it the pre-commit hook does not run —
CI still covers the same ground, just later.

---

### 3.1 Autonomous TDD Iteration Loop (`ralph-loop`)

For non-trivial feature implementations or refactors, use the official Ralph loop plugin (`ralph-loop@claude-plugins-official`).
Ralph creates an autonomous feedback loop that keeps iterating across implementation and test fixes until a defined completion promise is verified:

```bash
/ralph-loop "Implement the reviewed spec. Run bun run test:invariants and bunx tsc --noEmit after each iteration; fix all failures." --max-iterations 10 --completion-promise "bun run test:invariants && bunx tsc --noEmit pass cleanly with zero errors"
```

- **Loop invariant:** Each iteration edits code, executes the gating test suite, inspects failures, and refines until the promise is satisfied.
- **Safety guarantee:** PreToolUse hook (`scripts/agent-hooks/guard-bash.mjs`) remains active throughout all iterations, preventing runaway commands or destructive operations.
- **Cancel any time:** Use `/cancel-ralph` to halt the active iteration loop.

---

### 3.2 CodeRabbit Automated Review Gating (`coderabbit`)

CodeRabbit (`.coderabbit.yaml`) inspects every diff against repository-specific architectural rules and security standards:

1. **Local pre-commit / staging review:**
   ```bash
   bun run review:cr        # executes: coderabbit review --uncommitted
   ```
2. **Full branch review:**
   ```bash
   bun run review:cr:all    # executes: coderabbit review
   ```
3. **What CodeRabbit checks automatically:**
   - **Red Zone isolation:** Asserts that `organizationId` is never omitted in tenant queries (`tenant-guard.ts`, `tenant-context.ts`).
   - **Auth integrity:** Flags unauthenticated sessions, tampered tokens, or missing RBAC checks.
   - **React 19 / Next.js 16 Hook rules:** Detects conditional hook calls (hooks placed after early returns).
   - **Financial calculations:** Flags unsafe floating-point rounding in `src/lib/money.ts`.
   - **Mobile Companion standards:** Validates Expo SDK 52 compatibility, offline fallback, and permission management.

---

### 3.3 Multi-Platform Scope: Lucky CRM & Lucky Companion

Development in this repo spans both the Web application and the Mobile Companion:

- **Web CRM (`src/`)**: Next.js 16 App Router, Prisma ORM, Tailwind CSS, multi-tenant RBAC.
- **Mobile Companion (`mobile-companion/`)**: React Native / Expo SDK 52 with custom native Android modules (`expo-call-monitor` for SIM call logging, contact management, and WhatsApp deep links).
- **Companion Invariant**: Google Play limits `READ_CALL_LOG` on Expo Go. Use development builds (`bun run build:dev` or `bun run build:preview` via EAS) for native hardware testing, or use the built-in call simulation engine in Expo Go for rapid UI/flow validation.

---

## 4. Bug lane

Bugs skip the greenfield pipeline but not the gates:

```
diagnosing-bugs / debugging-and-error-recovery
      ↓
[write a failing test that reproduces it]     ← non-negotiable
      ↓
fix
      ↓
test passes + invariants hold (CI)
      ↓
security-and-hardening, if the bug was security-relevant
```

The reproduction test is the whole point. A bug fixed without one comes back.

---

## 5. Red Zone

Full policy in `docs/agents/RED-ZONE.md`. Summary:

The CRM holds real leads, phone numbers, and financial data, and is multi-tenant
— so the blast radius of a subtle logic error is a cross-tenant data leak, not a
broken page. Red Zone files require human authorship on the decisions and
explicit review on the diffs:

- `src/lib/db/tenant-guard.ts`, `src/lib/db/tenant-context.ts`
- `src/lib/domain/rbac-engine.ts`
- `src/lib/services/api-auth.ts`, `src/lib/services/server-auth.ts`
- `src/lib/money.ts`, `src/lib/domain/commission-calculator.ts`
- `prisma/schema.prisma`

These are listed in `.claude/settings.json` under `permissions.ask`, so edits
prompt for confirmation rather than proceeding silently.

---

## 6. The learning loop

The leverage in agentic engineering is compounding: every mistake should become a
permanent fix rather than a one-off correction. Concretely, when an agent does
something wrong:

1. **Fix the code.**
2. **Add the guard** — a rule in this document, a pattern in `guard-bash.mjs`, a
   test in `test/invariants/`, or a `permissions.ask` entry.
3. **Record it** — `memory_save` via the agentmemory MCP, and/or a new ADR if it
   was an architectural call.

Week one is rough. By week four the agent stops repeating itself. A guard that
lives only in a chat message is lost; a guard that lives in a file is permanent.

Version-control the agent configuration and review changes to it, exactly like
production code. Two teams with the same model and the same budget do not perform
the same — the difference is the quality of the committed configuration.

---

## 7. Tooling design notes (for agents, not just humans)

Agents consume build output token-by-token, cannot ask a colleague what a cryptic
error means, and pay for every line. That changes what "good tooling" means:

- **Crashes are tolerable; hangs are fatal.** A hang burns the whole context
  budget. Hence the `timeout` ceilings in `.githooks/pre-commit` and the `timeout`
  field on the PreToolUse hook.
- **Prefer structured errors over verbose logs.** Concise output leaves more
  context for actual reasoning.
- **Fail open on missing tooling, fail closed on findings.** The pre-commit hook
  skips if `eslint` is not installed (degraded, not broken) but blocks on a real
  secret.
- **Keep gates passable.** A check that always fails gets ignored, and ignored
  checks are worse than absent ones. Security gates here start at ERROR/HIGH and
  ratchet from there.

---

## 8. Known issues to be aware of

Recorded here rather than silently inherited:

- **`next` 16.3.3 vs `eslint-config-next` 15.1.7** — major-version mismatch. CI
  runs `bun run lint`, so this is a latent break worth resolving. Note the repo
  pins **ESLint 8.57.1**, so ESLint 9 flags (e.g. `--no-warn-ignored`) do not
  exist here — scripts must use the bare `eslint <paths>` form.
- **Conditional-hook bugs were failing `bun run lint` on `main`.** Two components
  called `useMemo` *after* an early return — `AddLeadModal.tsx` after
  `if (!isOpen) return null`, and `SourceEvidenceDrawer.tsx` after
  `if (!lead) return null`. That changes the hook count between renders, so React
  throws *"Rendered more hooks than during the previous render"* the moment the
  guard flips. Both hooks were moved above their guards. This class is easy to
  reintroduce: **put every hook above every early return**, and leave the
  explanatory comments in place so a future cleanup pass does not move them back.

- **`scripts/run-axe-audit.ts` targets `localhost:5173`** (a Vite port) while the
  app serves on `localhost:3000`. The script also needs a running server, seeded
  data, and an authenticated session, so it is **not** wired into CI. Fixing the
  port alone is not sufficient to make it a CI job.
- **No `playwright.config.ts`** — Playwright is used ad-hoc inside scripts, so
  trace-on-failure is unavailable. Adding it is a prerequisite for Playwright
  evidence in CI.
- **Browser automation uses `ego-browser`** (`.agents/skills/ego-browser/`), not
  `chrome-devtools-mcp`. The upstream `browser-testing-with-devtools` skill still
  documents a Chrome DevTools MCP install; ignore that and use ego-browser. That
  skill is hash-locked in `skills-lock.json`, so it is deliberately *not* edited
  locally — this note is the override.
- **`.agents/mcp_config.json` previously contained a live Context7 API key.** It
  now uses `${CONTEXT7_API_KEY}`. The old key is still in git history and must be
  rotated at https://context7.com/dashboard.
- **The Sentry MCP must be reachable** for `.agents/prompts/overnight-qa.md` to
  satisfy its own requirements (it mandates querying live error rates and latency
  percentiles). It is declared in `.mcp.json` as `https://mcp.sentry.dev/mcp`;
  the previously referenced `@modelcontextprotocol/server-sentry` package does
  not exist on npm.


