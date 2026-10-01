import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Payload-shape ratchet for client response interfaces.
 *
 * An interface that names a field the API never returns type-checks perfectly
 * and then resolves to `undefined` at runtime — a silent, invisible bug. An
 * earlier revision of `ReminderListItem` declared `contact.fullName` and
 * `contact.phoneE164`. Neither exists on the Contact model (the real fields are
 * `primaryName` and a `PHONE_E164` ContactIdentity row), so every contact-only
 * lead rendered as "Lead" with no call button, and nothing failed.
 *
 * This test parses the interface and asserts that every declared field exists on
 * the Prisma model that actually produces it. Nested blocks are checked against
 * their own model, not a union — `fullName` is a valid Lead field but NOT a
 * valid Contact field, and the union check would have missed the bug.
 */

const SCHEMA = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
const CALENDAR = readFileSync(join(process.cwd(), 'src', 'lib', 'client', 'calendar.ts'), 'utf8');

/** Field names declared on a Prisma model (excludes @@index/@relation blocks). */
function modelFields(modelName: string): Set<string> {
  const match = SCHEMA.match(new RegExp(`^model ${modelName} \\{([\\s\\S]*?)^\\}`, 'm'));
  if (!match) throw new Error(`Model ${modelName} not found in prisma/schema.prisma`);

  const fields = new Set<string>();
  for (const line of match[1].split('\n')) {
    const field = line.match(/^\s{2}(\w+)\s+\S/);
    if (field) fields.add(field[1]);
  }
  return fields;
}

/** Property names declared directly at depth 0 of a TS object-type body. */
function declaredFields(body: string): string[] {
  const names: string[] = [];
  let depth = 0;
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (depth === 0) {
      const prop = line.match(/^(\w+)\??\s*:/);
      if (prop) names.push(prop[1]);
    }
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
  }
  return names;
}

/** Extract the balanced `{ ... }` body that follows `key:` or `interface key`. */
function nestedBlock(outer: string, key: string): string {
  const idx = outer.search(new RegExp(`(?:interface\\s+)?\\b${key}\\b[^{]*\\{`));
  if (idx === -1) throw new Error(`No nested object block for "${key}"`);

  const open = outer.indexOf('{', idx);
  let depth = 0;
  for (let i = open; i < outer.length; i++) {
    if (outer[i] === '{') depth++;
    else if (outer[i] === '}') {
      depth--;
      if (depth === 0) return outer.slice(open + 1, i);
    }
  }
  throw new Error(`Unbalanced braces for "${key}"`);
}

function assertFieldsExist(
  label: string,
  declared: string[],
  model: string,
  fields: Set<string>
) {
  const unknown = declared.filter((name) => !fields.has(name));
  expect(
    unknown,
    `${label} declares field(s) ${unknown.join(', ')} that do not exist on model ${model}. ` +
      `Fix the interface in src/lib/client/calendar.ts to match prisma/schema.prisma — ` +
      `invented names type-check and then resolve to undefined at runtime.`
  ).toEqual([]);
}

describe('ReminderListItem payload shape matches the Prisma schema', () => {
  const interfaceBody = nestedBlock(CALENDAR, 'ReminderListItem');

  it('parses a plausible number of declared fields', () => {
    expect(declaredFields(interfaceBody).length).toBeGreaterThan(5);
  });

  it('root fields all exist on LeadReminder', () => {
    assertFieldsExist(
      'ReminderListItem',
      declaredFields(interfaceBody),
      'LeadReminder',
      modelFields('LeadReminder')
    );
  });

  it('lead.* fields all exist on Lead', () => {
    assertFieldsExist(
      'ReminderListItem.lead',
      declaredFields(nestedBlock(interfaceBody, 'lead')),
      'Lead',
      modelFields('Lead')
    );
  });

  it('lead.contact.* fields all exist on Contact', () => {
    const contactBlock = nestedBlock(nestedBlock(interfaceBody, 'lead'), 'contact');
    assertFieldsExist(
      'ReminderListItem.lead.contact',
      declaredFields(contactBlock),
      'Contact',
      modelFields('Contact')
    );
  });

  it('lead.contact.identities[] fields all exist on ContactIdentity', () => {
    const identitiesBlock = nestedBlock(
      nestedBlock(nestedBlock(interfaceBody, 'lead'), 'contact'),
      'identities'
    );
    assertFieldsExist(
      'ReminderListItem.lead.contact.identities',
      declaredFields(identitiesBlock),
      'ContactIdentity',
      modelFields('ContactIdentity')
    );
  });

  it('rejects the exact regression: a contact must not claim fullName/phoneE164', () => {
    const contactFields = modelFields('Contact');
    expect(contactFields.has('primaryName')).toBe(true);
    expect(contactFields.has('fullName')).toBe(false);
    expect(contactFields.has('phoneE164')).toBe(false);
  });

  it('contact phones are reachable via a PHONE_E164 identity', () => {
    expect(modelFields('ContactIdentity').has('identityType')).toBe(true);
    expect(modelFields('ContactIdentity').has('identityValue')).toBe(true);
    expect(modelFields('Contact').has('identities')).toBe(true);
  });
});
