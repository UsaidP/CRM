#!/usr/bin/env node
/**
 * Claude Code PreToolUse guard for Bash commands.
 *
 * Contract (verified against the Claude Code CLI):
 *   - Receives hook JSON on stdin: { tool_name, tool_input: { command }, ... }
 *   - Exit 0 -> allow the tool call.
 *   - Exit 2 -> block the tool call; stderr is shown to the model.
 *   - Any other exit code is a non-blocking error.
 *
 * This encodes the "Prompts are wishes; grants are guarantees" doctrine from
 * CONTEXT.md: instead of *asking* the agent not to wipe production, we make it
 * structurally impossible for the agent to run the command at all.
 *
 * Deliberately narrow: it blocks only commands that are irreversible against a
 * remote/production database or that bypass the verification gates. Routine
 * local `db:push` / `db:seed` / `migrate dev` are explicitly allowed.
 */

import { readFileSync } from 'node:fs';

/** Read and parse the hook payload from stdin. */
function readPayload() {
  try {
    const raw = readFileSync(0, 'utf8');
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Normalise a command for matching: collapse whitespace and strip the quoting
 * characters that agents habitually wrap around flags. We match on the
 * *unstripped* string too, so a quoted payload still trips the rule.
 */
function normalize(cmd) {
  return cmd.replace(/\s+/g, ' ').trim();
}

const RULES = [
  {
    id: 'destructive-db',
    // Irreversible operations aimed at a remote / production database.
    patterns: [
      /\breset-production\b/i,
      /\bdb:fresh:remote\b/i,
      /prisma\s+migrate\s+reset/i,
      /prisma\s+db\s+push[^|;&]*--force-reset/i,
      /--accept-data-loss/i,
      /\bDROP\s+DATABASE\b/i,
      /\bDROP\s+SCHEMA\b[^;]*\bCASCADE\b/i,
    ],
    message:
      'BLOCKED: destructive database command.\n\n' +
      'This command can irreversibly destroy remote/production data and is disabled\n' +
      'for agents in this repository. See scripts/reset-production.js and\n' +
      'docs/adr/0002-overnight-agent-qa-guardrails.md.\n\n' +
      'If this is genuinely intended, a human must run it manually. For local\n' +
      'development use `bun run db:push` or `bun run db:seed` instead.',
  },
  {
    id: 'verify-bypass',
    // Skipping the hooks/checks that make agent output trustworthy.
    patterns: [/\s--no-verify\b/, /\s--no-gpg-sign\b/],
    message:
      'BLOCKED: verification bypass is disabled for agents in this repository.\n\n' +
      '`--no-verify` skips the pre-commit checks that catch lint, type and secret\n' +
      'errors before they reach CI. Fix the underlying failure instead.\n\n' +
      'If a check is genuinely wrong, a human should fix the check itself rather\n' +
      'than route around it per-commit.',
  },
  {
    id: 'force-push',
    // `--force-with-lease` is intentionally NOT blocked: it refuses to clobber
    // work that landed since your last fetch, which is the safe variant.
    patterns: [/\bgit\s+push\b[^|;&]*(?:--force\b(?!-with-lease)|\s-f\b)/],
    message:
      'BLOCKED: force-push is disabled for agents in this repository.\n\n' +
      'A force-push can silently discard commits that a teammate or another agent\n' +
      'already pushed to the shared branch.\n\n' +
      'Use `git push --force-with-lease` if you must rewrite history, or open a\n' +
      'normal PR. A human can force-push manually when warranted.',
  },
];

function main() {
  const payload = readPayload();
  const toolName = payload?.tool_name;

  // Only Bash is inspected; other tools fall through to the normal permission flow.
  if (toolName !== 'Bash') process.exit(0);

  const rawCommand = payload?.tool_input?.command;
  if (typeof rawCommand !== 'string' || !rawCommand.trim()) process.exit(0);

  const command = normalize(rawCommand);

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(command) || p.test(rawCommand))) {
      process.stderr.write(`${rule.message}\n\n[guard-bash:${rule.id}]\n`);
      process.stderr.write(`\nOffending command: ${command}\n`);
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
