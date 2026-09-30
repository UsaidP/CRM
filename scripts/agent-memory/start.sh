#!/usr/bin/env bash
#
# Start a Lucky CRM–dedicated agentmemory daemon.
#
# WHY THIS EXISTS
#   agentmemory has no per-project namespace. A memory object carries content,
#   concepts, files, sessions and timestamps — but no project or cwd field — and
#   the store is a single flat file. So one daemon on :3111 is shared by every
#   repository on this machine, which means this CRM and any other app (e.g.
#   vakil-ai) would read and write each other's memories.
#
#   Isolation therefore means a *separate daemon with a separate data dir*, not a
#   separate namespace.
#
# PORT BLOCK
#   agentmemory derives four ports from one number:
#     REST = N, streams = N+1, viewer = N+2, iii-engine = N+46023
#   `--instance 1` is shorthand for --port 3211, giving:
#     REST 3211 · streams 3212 · viewer 3213 · engine 49234
#
#   The default instance (no flag) stays on 3111 for other repositories, so this
#   script never disturbs them.
#
# USAGE
#   scripts/agent-memory/start.sh          # foreground
#   scripts/agent-memory/start.sh &        # background
#
#   Then confirm:  curl -fsS http://localhost:3211/agentmemory/livez

set -euo pipefail

INSTANCE=1
DATA_DIR="${AGENTMEMORY_DATA_DIR:-$HOME/.agentmemory/lucky-crm}"

mkdir -p "$DATA_DIR"

if ! command -v agentmemory >/dev/null 2>&1; then
  echo "agentmemory CLI not found on PATH." >&2
  echo "Try: npx @agentmemory/agentmemory --instance $INSTANCE --data-dir \"$DATA_DIR\"" >&2
  exit 1
fi

echo "Lucky CRM agentmemory"
echo "  REST      http://localhost:3211"
echo "  viewer    http://localhost:3213"
echo "  data dir  $DATA_DIR"
echo "  (shared 3111 instance is left untouched for other projects)"
echo

exec agentmemory --instance "$INSTANCE" --data-dir "$DATA_DIR" "$@"
