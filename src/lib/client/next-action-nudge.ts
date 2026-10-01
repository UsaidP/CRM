/**
 * "Don't let the lead go cold" — post-call next-action logic (Phase 1).
 *
 * Pure decision helpers, kept out of the modal component so the follow-up
 * cadence rules are unit-testable and stay consistent across the app.
 */

export type NudgePresetKey = 'IN_2H' | 'TOMORROW_1030' | 'IN_3D' | 'NEXT_WEEK';

export interface NudgePreset {
  key: NudgePresetKey;
  label: string;
  shortLabel: string;
}

export const NUDGE_PRESETS: NudgePreset[] = [
  { key: 'IN_2H', label: 'Retry in 2 hours', shortLabel: '⏱ +2h' },
  { key: 'TOMORROW_1030', label: 'Tomorrow, 10:30 AM', shortLabel: '🌅 Tomorrow' },
  { key: 'IN_3D', label: 'In 3 days', shortLabel: '📅 +3d' },
  { key: 'NEXT_WEEK', label: 'Next week', shortLabel: '🗓 Next week' },
];

/** Outcomes where an immediate retry call is the correct next action. */
export const RETRY_OUTCOMES = new Set(['RINGING_NO_ANSWER', 'BUSY_CALL_LATER']);

/** Outcomes that close a lead out or are internal-only — never nag for a callback. */
export const NO_FOLLOW_UP_OUTCOMES = new Set(['NOT_INTERESTED', 'NOTE_LOGGED']);

/** Plain-language outcome labels for the Next Action card. */
export const OUTCOME_TEXT: Record<string, string> = {
  CONNECTED_INTERESTED: 'Connected & interested',
  VISIT_REQUESTED: 'Site visit requested',
  BUDGET_DISCUSSED: 'Budget / price discussed',
  TOKEN_OFFER: 'Token / booking offer',
  RINGING_NO_ANSWER: 'Ringing / no answer',
  BUSY_CALL_LATER: 'Busy / call back later',
  NOTE_LOGGED: 'General remark',
  NOT_INTERESTED: 'Not interested',
};

/** Resolve a preset key into a concrete future timestamp. */
export function resolveNudgePresetDate(key: NudgePresetKey, now: Date = new Date()): Date {
  const target = new Date(now);
  if (key === 'IN_2H') {
    target.setTime(now.getTime() + 2 * 60 * 60 * 1000);
  } else if (key === 'TOMORROW_1030') {
    target.setDate(target.getDate() + 1);
    target.setHours(10, 30, 0, 0);
  } else if (key === 'IN_3D') {
    target.setDate(target.getDate() + 3);
    target.setHours(11, 0, 0, 0);
  } else {
    target.setDate(target.getDate() + 7);
    target.setHours(11, 0, 0, 0);
  }
  return target;
}

/** Zero-input default: silence the "when do I call back?" decision for the agent. */
export function recommendedPresetFor(outcome: string): NudgePresetKey {
  return RETRY_OUTCOMES.has(outcome) ? 'IN_2H' : 'TOMORROW_1030';
}

/** Priority for the generated follow-up: unreachable clients get escalated. */
export function nudgePriorityFor(outcome: string): 'URGENT' | 'HIGH' {
  return RETRY_OUTCOMES.has(outcome) ? 'URGENT' : 'HIGH';
}

/** Human title for the reminder created from this call outcome. */
export function buildNudgeTitle(outcome: string, channel: string): string {
  switch (outcome) {
    case 'RINGING_NO_ANSWER':
      return 'Retry call — client did not answer';
    case 'BUSY_CALL_LATER':
      return 'Call back — client was busy';
    case 'VISIT_REQUESTED':
      return 'Confirm site visit slot & logistics';
    case 'BUDGET_DISCUSSED':
      return 'Continue price negotiation discussion';
    case 'TOKEN_OFFER':
      return 'Token / booking decision follow-up';
    case 'CONNECTED_INTERESTED':
      return 'Share shortlisted options & next steps';
    default:
      return channel === 'WHATSAPP' ? 'WhatsApp follow-up' : 'Follow-up call';
  }
}

/**
 * Should the post-call nudge appear at all?
 * A logged interaction with no follow-up is a lead worth chasing — except when
 * the agent already booked one, only left an internal note, or closed the lead out.
 */
export function shouldPromptNextAction(params: {
  channel: string;
  outcome: string;
  hasFollowUpDate: boolean;
}): boolean {
  if (params.hasFollowUpDate) return false;
  if (params.channel === 'NOTE') return false;
  return !NO_FOLLOW_UP_OUTCOMES.has(params.outcome);
}

/** `datetime-local` input value (local wall-clock, no timezone suffix). */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Short clock label, e.g. "10:30 AM". */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
