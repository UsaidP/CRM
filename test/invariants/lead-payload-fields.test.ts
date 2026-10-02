import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Payload-shape ratchet for the telecaller-console response interfaces.
 *
 * Companion to reminder-payload-fields.test.ts. Same failure mode: an interface
 * naming a field the API never returns type-checks cleanly and then resolves to
 * `undefined` at runtime.
 *
 * Two real instances, both verified against the live database:
 *
 *  1. `LeadItem.requirements` was read as `requirements[0].maxBudget` and
 *     `requirements[0].preferredMicroMarket`. Neither exists on BuyerRequirement
 *     (real columns: `budgetMax`, `targetLocationsJson`). Combined with
 *     /api/v1/leads returning raw requirement rows and never computing the
 *     flattened `budgetCeiling` / `preferredBhk` aliases, all three preference
 *     tiles in the console fell through to hardcoded defaults ("1 & 2 BHK",
 *     "Kharghar / Taloja", "₹45L - ₹85L") for 6 real leads that had data.
 *
 *  2. `ProjectMatchItem.elevationsJson` does not exist; the column is
 *     `elevationImagesJson`. The inventory route already selected the correct
 *     field, so the elevation cover-image fallback simply never fired.
 *
 * Fields listed in API_COMPOSED_FIELDS are not model columns: they are either
 * flattened aliases computed by a route, or relations pulled in via `include`.
 * They are allowlisted by name so the ratchet still catches everything else.
 */

const SCHEMA = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
const CONSOLE = readFileSync(
  join(process.cwd(), 'src', 'components', 'leads', 'TelecallerConsoleView.tsx'),
  'utf8'
);
const INVENTORY = readFileSync(
  join(process.cwd(), 'src', 'components', 'leads', 'telecaller', 'LiveInventoryMatcher.tsx'),
  'utf8'
);

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

/**
 * Strip comments so call-site assertions scan code, not prose. A regression note
 * that *names* the bad field ("previously read `maxBudget`") would otherwise trip
 * the very ratchet that documents it. Quote- and template-literal-aware, so
 * `http://` inside a string survives.
 */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      out += c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          out += src[i] + (src[i + 1] ?? '');
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function interfaceBlock(source: string, name: string): string {
  return nestedBlock(source, name);
}

describe('LeadItem.requirements mirrors BuyerRequirement', () => {
  const requirements = declaredFields(
    nestedBlock(interfaceBlock(CONSOLE, 'LeadItem'), 'requirements')
  );
  const actual = modelFields('BuyerRequirement');

  it('declares only real BuyerRequirement columns', () => {
    const fabricated = requirements.filter((f) => !actual.has(f));
    expect(fabricated).toEqual([]);
  });

  it('uses the real column names', () => {
    expect(requirements).toContain('budgetMax');
    expect(requirements).toContain('bhkPreferencesJson');
    expect(requirements).toContain('targetLocationsJson');
  });

  it('does not resurrect the fields that caused the silent defaults', () => {
    expect(requirements).not.toContain('maxBudget');
    expect(requirements).not.toContain('preferredMicroMarket');
  });
});

describe('ProjectMatchItem mirrors DeveloperProject', () => {
  // `units` is an `include`d relation, not a DeveloperProject column.
  const API_COMPOSED_FIELDS = new Set(['units']);
  const declared = declaredFields(interfaceBlock(INVENTORY, 'ProjectMatchItem'));
  const actual = modelFields('DeveloperProject');

  it('declares only real DeveloperProject columns (plus include-d relations)', () => {
    const fabricated = declared.filter(
      (f) => !actual.has(f) && !API_COMPOSED_FIELDS.has(f)
    );
    expect(fabricated).toEqual([]);
  });

  it('spells the elevation column as elevationImagesJson', () => {
    expect(declared).toContain('elevationImagesJson');
    expect(declared).not.toContain('elevationsJson');
  });

  it('is not read under the non-existent name at any call site', () => {
    expect(stripComments(INVENTORY)).not.toMatch(/\belevationsJson\b/);
  });
});

describe('no fabricated BuyerRequirement field reads remain', () => {
  it('does not read requirements[0].maxBudget', () => {
    const code = stripComments(CONSOLE);
    expect(code).not.toMatch(/requirements\s*\??\.\s*\[\s*0\s*\]\s*\??\.\s*maxBudget/);
    expect(code).not.toMatch(/requirements\s*\[\s*0\s*\]\s*\??\.\s*maxBudget/);
  });

  it('does not read a preferredMicroMarket off a requirement row', () => {
    expect(stripComments(CONSOLE)).not.toMatch(
      /requirements\s*\??\.\s*\[\s*0\s*\]\s*\??\.\s*preferredMicroMarket/
    );
  });

  it('resolves the preference through the shared decoder instead', () => {
    expect(stripComments(CONSOLE)).toContain('resolveBuyerPreference(selectedLead)');
  });
});
