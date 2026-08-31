import { describe, it, expect } from 'bun:test';
import {
  ORG_SCOPED_MODELS,
  PARENT_SCOPED_MODELS,
  isTenantScopedModel,
  nestedOrgFilter,
  runWithTenant,
  currentTenant,
} from '../src/lib/db/tenant-context';

describe('tenant context', () => {
  it('has no tenant outside a request', () => {
    expect(currentTenant()).toBeNull();
  });

  it('binds and restores tenant inside runWithTenant', async () => {
    expect(currentTenant()).toBeNull();
    await runWithTenant('org-1', async () => {
      expect(currentTenant()?.organizationId).toBe('org-1');
      await runWithTenant('org-2', async () => {
        expect(currentTenant()?.organizationId).toBe('org-2');
      });
      expect(currentTenant()?.organizationId).toBe('org-1');
    });
    expect(currentTenant()).toBeNull();
  });

  it('scopes every model that carries organizationId in the schema', () => {
    // Guards against new org-scoped models being added to schema.prisma
    // without being added to the tenant guard's allow-list.
    const fs = require('fs');
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
    const orgScoped = models.filter((m) => {
      const body = schema.split(`model ${m} `)[1]?.split('}')[0] ?? '';
      return /\borganizationId\s+String\b/.test(body);
    });
    for (const m of orgScoped) {
      if (m === 'Organization') continue;
      expect(ORG_SCOPED_MODELS.has(m)).toBe(true);
    }
  });

  it('does not misclassify direct-org models as parent-scoped', () => {
    // A model listed in PARENT_SCOPED_MODELS must NOT have its own
    // organizationId column — the guard would build a broken where clause.
    const fs = require('fs');
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    for (const model of Object.keys(PARENT_SCOPED_MODELS)) {
      const body = schema.split(`model ${model} `)[1]?.split('}')[0] ?? '';
      expect(/\borganizationId\s+String\b/.test(body)).toBe(false);
    }
  });

  it('covers every schema model: direct, parent-scoped, or intentionally unscoped', () => {
    // Every model in the schema must be either tenant-scoped or explicitly
    // unscoped (e.g. WebhookEventInbox — raw provider intake with no owner).
    const fs = require('fs');
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
    const intentionallyUnscoped = new Set(['Organization', 'WebhookEventInbox']);
    for (const m of models) {
      if (intentionallyUnscoped.has(m)) continue;
      expect(isTenantScopedModel(m)).toBe(true);
    }
  });

  it('builds nested org filters from relation paths', () => {
    expect(nestedOrgFilter([], 'org-1')).toEqual({ organizationId: 'org-1' });
    expect(nestedOrgFilter(['lead'], 'org-1')).toEqual({
      lead: { organizationId: 'org-1' },
    });
    expect(nestedOrgFilter(['propertyUnit', 'project'], 'org-1')).toEqual({
      propertyUnit: { project: { organizationId: 'org-1' } },
    });
  });
});
