<!--
Keep this short. A template that takes 10 minutes to fill in gets deleted.
The goal is to make the *reviewer's* job mechanical, not to create paperwork.
-->

## What changed

<!-- One or two sentences. Link the spec in .scratch/ or the issue if there is one. -->

## Mode

<!-- See docs/agents/SDLC-PIPELINE.md §1 -->
- [ ] **Engineer** — ships to users; spec, tests and review required
- [ ] **Vibe** — prototype / spike / exploration; not intended for production

## Red Zone

<!-- See docs/agents/RED-ZONE.md -->

- [ ] This PR does **not** touch Red Zone files
- [ ] This PR touches Red Zone files — and a human has reviewed the boundary logic

Red Zone files touched (list them if any):

```
```

## Verification

<!-- Paste the command you actually ran. Do not tick a box you did not run. -->

- [ ] `bun run lint`
- [ ] `bunx tsc --noEmit`
- [ ] `bun run test:invariants`
- [ ] `bun run test:security`
- [ ] `bun test/run-all-tests.js` (or the relevant subset: `bun run test:unit` / `test:api`)

## Migrations

- [ ] No schema change
- [ ] Schema change — `prisma/schema.prisma` diff reviewed, migration path understood,
      and the change is safe to apply to a database that already has live rows

## Risk

<!--
What is the worst thing this could break in production? If the answer is
"nothing, it's a CSS tweak", say that. If the answer is "it could widen a tenant
query", say that too — that is the single most useful sentence in this PR.
-->

## Rollback

<!-- How do we undo this if it goes wrong? -->
