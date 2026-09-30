# App Isolation

How this repository stays isolated from other projects on the same machine, and
how to keep it that way.

## Why this document exists

`~/.claude/` is shared by every project on the machine. Most of that sharing is
harmless (a plugin cache, a marketplace index), but three things genuinely leak
state between projects if left alone:

| Layer | Where | Leaks how |
|---|---|---|
| **agentmemory** | `~/.agentmemory/standalone.json` | One flat store, one daemon on `:3111`. Memory objects carry no project field, so a second project's memories are indistinguishable from this one's. |
| **Project-scoped plugins** | `~/.claude/plugins/installed_plugins.json` | Each record stores a `projectPath`. A plugin shown as "Scope: project" may belong to a *different* project entirely. |
| **User-scope plugins / MCP** | `~/.claude/settings.json`, `~/.claude.json` | Injected into every project, including ones that must not see them. |

## What is configured here

### MCP servers — `.mcp.json` (project scope, committed)

Project scope takes precedence over user scope, so this file is authoritative for
this repository:

- **sentry** — scoped to `https://mcp.sentry.dev/mcp/zamzam-crm/crm-web`. Scoping
  hides the org-discovery tools, so the agent cannot reach another Sentry org.
- **context7** — key from `${CONTEXT7_API_KEY}`, never committed.
- **agentmemory** — pointed at `http://localhost:3211`, a **dedicated daemon**
  (see below), not the shared `:3111` instance.

### agentmemory — separate daemon and store

Start it with:

```bash
bun run memory:crm          # scripts/agent-memory/start.sh
```

That runs `agentmemory --instance 1 --data-dir ~/.agentmemory/lucky-crm`, giving:

| | Shared (other projects) | This project |
|---|---|---|
| REST | 3111 | **3211** |
| streams | 3112 | **3212** |
| viewer | 3113 | **3213** |
| engine | 49134 | **49234** |
| data | `~/.agentmemory/standalone.json` | **`~/.agentmemory/lucky-crm/`** |

The shared `:3111` daemon is deliberately left running for other repositories —
this project simply stops using it.

### Secrets

`.claude/settings.local.json` is **gitignored** and holds `CONTEXT7_API_KEY` in an
`env` block.

> **Gotcha worth knowing:** Claude Code expands `${VAR}` in `.mcp.json` from the
> **process environment**, and it does **not** read `.env`. Putting the key only
> in `.env` (which Next.js reads at runtime) will leave the MCP header empty. That
> is why the key lives in the local settings `env` block as well.

## Things intentionally NOT changed

- **`~/.claude/skills/`** — 23 user-scope skills (ego-browser, chatfire, blaxel,
  firecrawl, …). These are generic tooling, not project-specific, so they are left
  shared.
- **User-scope `enabledPlugins` in `~/.claude/settings.json`** — 17 plugins ≈
  **10,471 always-on tokens** injected into every project. Several are dead weight
  here (`expo`, `stripe`, `qdrant-skills`, `redis-development`), but removing them
  from *user* scope would change other projects too. Demote them to project scope
  per-project instead, or leave them.
- **`~/.claude/plugins/marketplaces/`** — read-only cache, safe to share.
- **Other repositories** — not read, not written.

## Verifying isolation

```bash
# This project's MCP servers
cat .mcp.json

# Is the dedicated memory daemon up?
curl -fsS http://localhost:3211/agentmemory/livez

# Which plugins are project-scoped, and to which path?
node -e "const j=require(process.env.HOME+'/.claude/plugins/installed_plugins.json');\
for(const [k,a] of Object.entries(j.plugins||j)) if(Array.isArray(a)) \
for(const e of a) console.log((e.scope||'?').padEnd(9), (e.projectPath||'(user)').padEnd(42), k)"

# Confirm no secret is staged
bash .githooks/pre-commit
```
