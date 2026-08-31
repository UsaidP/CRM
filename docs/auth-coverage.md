# API Auth Coverage

Invariant (enforced by `test/api-auth-coverage.test.ts`): every route under
`src/app/api/v1` must call `requireSession` / `requireRole` /
`requireSuperAdmin`, **or** be on the public allow-list below (in which case
it must verify its own credential — webhook signature, portal token, etc.).

## Public by design (allow-listed)

| Route | Credential |
|---|---|
| `auth/*` | Issues credentials itself |
| `health` | None (liveness probe) |
| `webhooks/telephony`, `webhooks/whatsapp`, `webhooks/instagram` | Provider webhook signature |
| `portals/[token]`, `portals/[token]/telemetry` | Portal token |
| `track/[slug]` | Campaign slug (public pixel) |

## Regenerate this list

```sh
for f in $(find src/app/api/v1 -name 'route.ts'); do
  grep -q 'requireSession\|requireRole\|requireSuperAdmin' "$f" \
    && echo "GUARDED   $f" || echo "UNGUARDED $f"
done | sort
```

## History

- 2026-08: baseline — 37 guarded, 25 unguarded (incl. `inventory/scrape`,
  removed with the scraper). Unguarded-but-must-protect routes fixed in the
  auth-seam remediation: `media/*`, `inventory/media`, `inventory/calculator`,
  `inventory/rera/verify`, `inventory/units/[id]/verify`,
  `inventory/template.csv`, `leads/template.csv`, `matching/*`,
  `communications/[id]`, `mobile/call-events`.
- 2026-08: `leads/next-connect` deleted (unreferenced). `webhooks/telephony`
  now requires the `x-webhook-secret` header matching
  `TELEPHONY_WEBHOOK_SECRET` (timing-safe; fails closed in production).
  WhatsApp/Instagram already verified Meta X-Hub signatures.
