import { describe, it, expect } from 'bun:test';
import {
  resolveReminderLeadName,
  resolveReminderPhone,
  type ReminderListItem,
} from '@/lib/client/calendar';

/**
 * Regression guard for the reminder display resolvers.
 *
 * Shapes below mirror real payloads verified against the live database: a lead
 * carries a denormalised `fullName`/`phoneE164`, while its contact carries
 * `primaryName` and stores phones as `PHONE_E164` ContactIdentity rows.
 * Contacts have NO `fullName` and NO `phoneE164` — an earlier revision invented
 * both names, which type-checked cleanly and silently resolved to undefined, so
 * a contact-only lead rendered as "Lead" with no call button.
 */

function reminder(lead: ReminderListItem['lead']): ReminderListItem {
  return {
    id: 'rem_1',
    leadId: 'lead_1',
    title: 'Retry call',
    reminderType: 'CALL',
    dueAt: '2026-09-15T10:30:00.000Z',
    priority: 'URGENT',
    status: 'PENDING',
    lead,
  };
}

describe('Reminder display resolvers', () => {
  describe('resolveReminderLeadName', () => {
    it('prefers the denormalised lead fullName', () => {
      expect(resolveReminderLeadName(reminder({ fullName: 'Wasim' }))).toBe('Wasim');
    });

    it('falls back to the contact primaryName, never a fabricated fullName', () => {
      const item = reminder({ fullName: null, contact: { primaryName: 'Usaid' } });
      expect(resolveReminderLeadName(item)).toBe('Usaid');
    });

    it('falls back to the contact companyName when there is no person name', () => {
      const item = reminder({
        fullName: null,
        contact: { primaryName: null, companyName: 'Zamzam Properties' },
      });
      expect(resolveReminderLeadName(item)).toBe('Zamzam Properties');
    });

    it('treats a whitespace-only name as missing', () => {
      const item = reminder({ fullName: '   ', contact: { primaryName: 'Fallback' } });
      expect(resolveReminderLeadName(item)).toBe('Fallback');
    });

    it('never renders an empty string — degrades to the literal "Lead"', () => {
      expect(resolveReminderLeadName(reminder({ fullName: '   ' }))).toBe('Lead');
      expect(resolveReminderLeadName(reminder(null))).toBe('Lead');
      expect(resolveReminderLeadName(reminder(undefined))).toBe('Lead');
      expect(resolveReminderLeadName(reminder({}))).toBe('Lead');
    });

    it('trims surrounding whitespace so rows never render ragged', () => {
      expect(resolveReminderLeadName(reminder({ fullName: '  Wasim  ' }))).toBe('Wasim');
    });
  });

  describe('resolveReminderPhone', () => {
    it('prefers the denormalised lead phone over any contact identity', () => {
      const item = reminder({
        phoneE164: '+917977434475',
        contact: {
          identities: [{ identityType: 'PHONE_E164', identityValue: '+919999999999' }],
        },
      });
      expect(resolveReminderPhone(item)).toBe('+917977434475');
    });

    it('falls back to a PHONE_E164 identity when the lead phone is null', () => {
      const item = reminder({
        phoneE164: null,
        contact: { identities: [{ identityType: 'PHONE_E164', identityValue: '+917977552011' }] },
      });
      expect(resolveReminderPhone(item)).toBe('+917977552011');
    });

    it('prefers the primary identity when several phones are on file', () => {
      const item = reminder({
        phoneE164: null,
        contact: {
          identities: [
            { identityType: 'PHONE_E164', identityValue: '+911111111111', isPrimary: false },
            { identityType: 'PHONE_E164', identityValue: '+912222222222', isPrimary: true },
          ],
        },
      });
      expect(resolveReminderPhone(item)).toBe('+912222222222');
    });

    it('ignores non-phone identities instead of dialling an Instagram id', () => {
      const item = reminder({
        phoneE164: null,
        contact: {
          identities: [
            { identityType: 'INSTAGRAM_IGID', identityValue: 'ig_178414' },
            { identityType: 'EMAIL', identityValue: 'buyer@example.com' },
          ],
        },
      });
      expect(resolveReminderPhone(item)).toBeNull();
    });

    it('returns null rather than an empty string when nothing is on file', () => {
      expect(resolveReminderPhone(reminder(null))).toBeNull();
      expect(resolveReminderPhone(reminder({ phoneE164: '  ' }))).toBeNull();
      expect(resolveReminderPhone(reminder({ contact: { identities: [] } }))).toBeNull();
      expect(resolveReminderPhone(reminder({ contact: { identities: null } }))).toBeNull();
    });
  });
});
