# Agent Memory Guidelines (`agentmemory`)

You have persistent long-term memory across sessions via the agentmemory MCP server and REST daemon.

## Architecture & Ports
- **Memory Server**: `http://localhost:3111`
- **Interactive Viewer**: `http://localhost:3113`
- **Engine**: Local `iii-engine` (state stored in `~/.agentmemory/data/state_store.db`)
- **Semantic Search**: Hybrid BM25 keyword matching + Gemini vector embeddings.

## Core Memory Tools
- `memory_recall`: Query past decisions, architectural patterns, Gotchas, and context for the current task.
- `memory_smart_search`: Deep hybrid search across previous sessions, code discussions, and stored knowledge.
- `memory_save`: Persist durable facts, architectural decisions, Gotchas, user preferences, and solutions.
- `memory_sessions`: Inspect past agent sessions and timeline interactions.
- `memory_forget`: Remove outdated, obsolete, or contradicted memories.

## Operational Discipline
1. **At Task Start**:
   - Check memory with `memory_recall` or `memory_smart_search` when working on architecture, integrations, configurations, or complex bug diagnoses before re-asking the user or re-deriving solutions from scratch.
2. **When Solving Non-Trivial Problems or Learning User Preferences**:
   - Persist durable lessons with `memory_save`.
   - Categories to save:
     - Project-specific quirks / gotchas (e.g. Supabase pooler connections, Prisma migrations, Next.js routing patterns).
     - User preferences for UI styling, naming, or conventions.
     - Key architectural decisions made during development.
3. **Quality & Conciseness**:
   - Save concise, reusable, structured facts rather than huge raw chat transcripts.
