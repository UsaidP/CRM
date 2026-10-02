/**
 * Buyer-preference parsing shared by the server routes and the telecaller console.
 *
 * Why this module exists: buyer preferences live in JSON-encoded string columns
 * (`bhkPreferencesJson`, `targetLocationsJson`) on BuyerRequirement. Several call
 * sites each re-implemented the decode inline and drifted — one read `maxBudget`
 * and `preferredMicroMarket`, neither of which exists on the model (the real
 * fields are `budgetMax` and `targetLocationsJson`). Those reads type-check
 * against a hand-written interface and then silently resolve to undefined, so the
 * console rendered hardcoded fallbacks for real buyers. One parser, one shape.
 *
 * Pure and dependency-free so both server and client code can import it.
 */

/** Parse a JSON array column, tolerating null/malformed values. Never throws. */
export function parseJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** All BHK preferences, e.g. `"[2,3]"` -> `[2, 3]`. Non-numeric entries dropped. */
export function parseBhkPreferences(raw: string | null | undefined): number[] {
  return parseJsonArray(raw)
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v) && v > 0);
}

/**
 * Primary BHK preference, e.g. `"[2,3]"` -> `2`.
 * Returns null for missing or non-positive values (a "0 BHK" is not meaningful,
 * so callers fall back to their default label rather than rendering "0 BHK").
 */
export function parsePreferredBhk(raw: string | null | undefined): number | null {
  const [first] = parseBhkPreferences(raw);
  return first ?? null;
}

/** All target locations, e.g. `"[\"Taloja Phase 1\"]"` -> `["Taloja Phase 1"]`. */
export function parseTargetLocations(raw: string | null | undefined): string[] {
  return parseJsonArray(raw)
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Primary target location, e.g. `"[\"Taloja Phase 1\"]"` -> `"Taloja Phase 1"`. */
export function parsePreferredMicroMarket(raw: string | null | undefined): string | null {
  const [first] = parseTargetLocations(raw);
  return first ?? null;
}

/** The three preference values every consumer actually needs. */
export interface BuyerPreferenceView {
  preferredBhk: number | null;
  budgetCeiling: number | null;
  preferredMicroMarket: string | null;
}

/**
 * Shape accepted from either data path:
 *  - `/api/v1/search` returns flattened aliases on the lead
 *  - `/api/v1/leads` returns the raw `requirements[]` rows
 * Aliases win when present so a route that already decoded values isn't re-decoded.
 */
export interface BuyerPreferenceSource {
  preferredBhk?: number | string | null;
  budgetCeiling?: number | null;
  preferredMicroMarket?: string | null;
  city?: string | null;
  requirements?: {
    budgetMax?: number | null;
    bhkPreferencesJson?: string | null;
    targetLocationsJson?: string | null;
    isActive?: boolean;
  }[] | null;
}

/**
 * Resolve a lead's buyer preference into one consistent shape.
 *
 * Field names mirror prisma/schema.prisma: `budgetMax`, `bhkPreferencesJson`,
 * `targetLocationsJson`. Do not reference `maxBudget` or a contact/requirement
 * `preferredMicroMarket` — those columns do not exist.
 */
export function resolveBuyerPreference(
  source: BuyerPreferenceSource | null | undefined
): BuyerPreferenceView {
  const requirement = source?.requirements?.find((r) => r?.isActive !== false) ?? source?.requirements?.[0];

  const aliasBhk = Number(source?.preferredBhk);
  const preferredBhk =
    Number.isFinite(aliasBhk) && aliasBhk > 0
      ? aliasBhk
      : parsePreferredBhk(requirement?.bhkPreferencesJson);

  const aliasBudget = source?.budgetCeiling;
  const budgetCeiling =
    typeof aliasBudget === 'number' && Number.isFinite(aliasBudget)
      ? aliasBudget
      : typeof requirement?.budgetMax === 'number' && Number.isFinite(requirement.budgetMax)
        ? requirement.budgetMax
        : null;

  const preferredMicroMarket =
    source?.preferredMicroMarket?.trim() ||
    parsePreferredMicroMarket(requirement?.targetLocationsJson) ||
    source?.city?.trim() ||
    null;

  return { preferredBhk, budgetCeiling, preferredMicroMarket };
}
