import { describe, it, expect } from 'bun:test';
import {
  NUDGE_PRESETS,
  OUTCOME_TEXT,
  RETRY_OUTCOMES,
  buildNudgeTitle,
  nudgePriorityFor,
  recommendedPresetFor,
  resolveNudgePresetDate,
  shouldPromptNextAction,
  toDateTimeLocalValue,
} from '@/lib/client/next-action-nudge';

describe('Next Action Nudge — post-call follow-up cadence', () => {
  // Local-time constructors keep assertions timezone-independent.
  const now = new Date(2026, 8, 15, 14, 5); // Tue Sep 15 2026, 14:05 local

  describe('resolveNudgePresetDate', () => {
    it('IN_2H adds exactly two hours', () => {
      const due = resolveNudgePresetDate('IN_2H', now);
      expect(due.getTime() - now.getTime()).toBe(2 * 60 * 60 * 1000);
      expect(due.getHours()).toBe(16);
      expect(due.getMinutes()).toBe(5);
    });

    it('TOMORROW_1030 lands the next day at 10:30 local', () => {
      const due = resolveNudgePresetDate('TOMORROW_1030', now);
      expect(due.getDate()).toBe(16);
      expect(due.getMonth()).toBe(8);
      expect(due.getHours()).toBe(10);
      expect(due.getMinutes()).toBe(30);
      expect(due.getSeconds()).toBe(0);
    });

    it('IN_3D lands three days out at 11:00 local', () => {
      const due = resolveNudgePresetDate('IN_3D', now);
      expect(due.getDate()).toBe(18);
      expect(due.getHours()).toBe(11);
      expect(due.getMinutes()).toBe(0);
    });

    it('NEXT_WEEK lands seven days out at 11:00 local', () => {
      const due = resolveNudgePresetDate('NEXT_WEEK', now);
      expect(due.getDate()).toBe(22);
      expect(due.getHours()).toBe(11);
    });

    it('rolls over month boundaries without drifting', () => {
      const endOfMonth = new Date(2026, 8, 30, 23, 30); // Sep 30 2026
      const due = resolveNudgePresetDate('TOMORROW_1030', endOfMonth);
      expect(due.getMonth()).toBe(9); // October
      expect(due.getDate()).toBe(1);
      expect(due.getHours()).toBe(10);
      expect(due.getMinutes()).toBe(30);
    });

    it('never returns a past time for any preset', () => {
      for (const preset of NUDGE_PRESETS) {
        expect(resolveNudgePresetDate(preset.key, now).getTime()).toBeGreaterThan(now.getTime());
      }
    });

    it('does not mutate the reference date', () => {
      const reference = new Date(2026, 8, 15, 14, 5);
      resolveNudgePresetDate('NEXT_WEEK', reference);
      expect(reference.getDate()).toBe(15);
      expect(reference.getHours()).toBe(14);
    });
  });

  describe('recommendedPresetFor', () => {
    it('pushes unreachable clients into a fast retry', () => {
      expect(recommendedPresetFor('RINGING_NO_ANSWER')).toBe('IN_2H');
      expect(recommendedPresetFor('BUSY_CALL_LATER')).toBe('IN_2H');
    });

    it('defaults genuine conversations to tomorrow morning', () => {
      expect(recommendedPresetFor('CONNECTED_INTERESTED')).toBe('TOMORROW_1030');
      expect(recommendedPresetFor('VISIT_REQUESTED')).toBe('TOMORROW_1030');
      expect(recommendedPresetFor('BUDGET_DISCUSSED')).toBe('TOMORROW_1030');
    });

    it('only ever returns a real preset key', () => {
      const validKeys = NUDGE_PRESETS.map((p) => p.key);
      expect(validKeys).toContain(recommendedPresetFor('ANY_UNKNOWN_OUTCOME'));
    });
  });

  describe('nudgePriorityFor', () => {
    it('escalates unreachable clients to URGENT', () => {
      for (const outcome of RETRY_OUTCOMES) {
        expect(nudgePriorityFor(outcome)).toBe('URGENT');
      }
    });

    it('keeps engaged conversations at HIGH', () => {
      expect(nudgePriorityFor('CONNECTED_INTERESTED')).toBe('HIGH');
      expect(nudgePriorityFor('VISIT_REQUESTED')).toBe('HIGH');
    });
  });

  describe('buildNudgeTitle', () => {
    it('produces an action-specific title per outcome', () => {
      expect(buildNudgeTitle('RINGING_NO_ANSWER', 'PHONE_CALL')).toContain('Retry');
      expect(buildNudgeTitle('BUSY_CALL_LATER', 'PHONE_CALL')).toContain('Call back');
      expect(buildNudgeTitle('VISIT_REQUESTED', 'SITE_VISIT')).toContain('visit');
      expect(buildNudgeTitle('BUDGET_DISCUSSED', 'PHONE_CALL')).toContain('negotiation');
      expect(buildNudgeTitle('TOKEN_OFFER', 'PHONE_CALL')).toContain('Token');
    });

    it('falls back to the channel name for unknown outcomes', () => {
      expect(buildNudgeTitle('SOMETHING_NEW', 'WHATSAPP')).toBe('WhatsApp follow-up');
      expect(buildNudgeTitle('SOMETHING_NEW', 'PHONE_CALL')).toBe('Follow-up call');
    });

    it('always returns a non-empty title', () => {
      for (const outcome of Object.keys(OUTCOME_TEXT)) {
        expect(buildNudgeTitle(outcome, 'PHONE_CALL').length).toBeGreaterThan(0);
      }
    });
  });

  describe('shouldPromptNextAction', () => {
    it('prompts after a connected call with no follow-up booked', () => {
      expect(
        shouldPromptNextAction({ channel: 'PHONE_CALL', outcome: 'CONNECTED_INTERESTED', hasFollowUpDate: false })
      ).toBe(true);
    });

    it('stays silent when the agent already booked a follow-up', () => {
      expect(
        shouldPromptNextAction({ channel: 'PHONE_CALL', outcome: 'CONNECTED_INTERESTED', hasFollowUpDate: true })
      ).toBe(false);
    });

    it('stays silent for internal-only remarks', () => {
      expect(shouldPromptNextAction({ channel: 'NOTE', outcome: 'NOTE_LOGGED', hasFollowUpDate: false })).toBe(false);
    });

    it('treats NOTE_LOGGED on any channel as internal-only', () => {
      expect(shouldPromptNextAction({ channel: 'WHATSAPP', outcome: 'NOTE_LOGGED', hasFollowUpDate: false })).toBe(false);
    });

    it('never nags about a lead that declined', () => {
      expect(
        shouldPromptNextAction({ channel: 'PHONE_CALL', outcome: 'NOT_INTERESTED', hasFollowUpDate: false })
      ).toBe(false);
    });

    it('prompts for every non-terminal outcome across channels', () => {
      const channels = ['PHONE_CALL', 'WHATSAPP', 'SITE_VISIT', 'MEETING'];
      const outcomes = [
        'CONNECTED_INTERESTED',
        'VISIT_REQUESTED',
        'BUDGET_DISCUSSED',
        'TOKEN_OFFER',
        'RINGING_NO_ANSWER',
        'BUSY_CALL_LATER',
      ];
      for (const channel of channels) {
        for (const outcome of outcomes) {
          expect(shouldPromptNextAction({ channel, outcome, hasFollowUpDate: false })).toBe(true);
        }
      }
    });
  });

  describe('toDateTimeLocalValue', () => {
    it('emits a datetime-local string with zero-padded parts', () => {
      expect(toDateTimeLocalValue(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07');
    });

    it('has no timezone suffix so the browser reads it as local wall-clock', () => {
      expect(toDateTimeLocalValue(now)).toBe('2026-09-15T14:05');
    });

    it('round-trips through new Date() to the same instant', () => {
      const parsed = new Date(toDateTimeLocalValue(now));
      expect(parsed.getTime()).toBe(now.getTime());
    });
  });
});
