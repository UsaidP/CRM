# Red Zone

## The idea

Not all code carries the same risk. A misplaced Tailwind class produces an ugly
page; a misplaced tenant filter produces a cross-tenant data leak.

**Red Zone** is code where a subtle error causes a breach, a financial loss, or a
compliance problem rather than a visible bug. In the Red Zone, a human owns the
decisions and reviews the diffs. Everywhere else — **Green Zone** — agents move
fast, and that is the entire point of having them.

This is not a judgement about code quality. It is about blast radius.

## Red Zone files in this repository

| File | Why it is Red |
|---|---|
| `src/lib/db/tenant-guard.ts` | Enforces organisation isolation at the data layer. A bug here leaks one org's leads into another's queries. |
| `src/lib/db/tenant-context.ts` | Carries the request's tenant identity. If it silently degrades to `undefined`, queries widen to every organisation. |
| `src/lib/domain/rbac-engine.ts` | Resolves role → permission. A bug here is privilege escalation. |
| `src/lib/services/api-auth.ts` | Per-route auth and org scoping. Sits in front of every API route. |
| `src/lib/services/server-auth.ts` | Server-side session verification. |
| `src/lib/money.ts` | Currency and formatting primitives. Silent rounding becomes a wrong invoice. |
| `src/lib/domain/commission-calculator.ts` | Computes what people are paid. |
| `prisma/schema.prisma` | A changed default or relaxed constraint is a silent migration. Existing invariants (`test/invariants/`, `test/security/`) depend on this shape. |

Adjacent files become Red Zone by inheritance. A new `src/lib/services/*-auth.ts`
or any module that constructs a `where` clause against an org-scoped model is Red
Zone even if it is not listed above.

## The rules

1. **A human authors or reviews the decision logic.** An agent may draft it, may
   explain it, may test it — but the boundary decision is not delegated.
2. **Agents may propose diffs; those diffs are not merged unreviewed.**
3. **Both suites must pass:** `bun run test:invariants` and
   `bun run test:security`.
4. **A change to a boundary warrants an ADR** in `docs/adr/`. Follow the pattern
   of `0001-auth-tenant-rbac-seams.md`.

## How it is enforced

Red Zone policy is enforced in three places, deliberately layered — because a
policy that exists only in a document is a wish.

| Layer | Mechanism | What it catches |
|---|---|---|
| Agent | `permissions.ask` in `.claude/settings.json` | An agent editing a Red Zone file must get confirmation first |
| Tests | `test/invariants/` + `test/security/` in CI | Tenant leaks, auth bypass, RBAC escalation, injection |
| Review | This document + PR template | Boundary changes that tests are not yet written for |

The invariant suite is the load-bearing part. `test/invariants/no-findFirst-org.test.ts`
exists specifically to stop the `findFirst`-without-org-filter class of bug, and
`test/security/rbac-escalation.test.ts` covers privilege escalation. These run in
CI on every push.

## Green Zone

Everything else: UI components, styling, copy, docs, scripts, test helpers,
internal tooling, analytics queries.

Move fast here. Use the fast path in `docs/agents/SDLC-PIPELINE.md` §1. The
existence of a Red Zone is not a reason to slow down the 90% of work that is not
in it — that trade is the whole design.
