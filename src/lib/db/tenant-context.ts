import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Tenant context: the organization bound to the current request.
 *
 * `bindTenant` is called by `requireSession` after a session is verified;
 * the Prisma tenant guard (tenant-guard.ts) reads it to auto-scope every
 * query and reject cross-tenant mutations. Scripts outside a request
 * (seed, backup) have no context and pass through untouched.
 */
export const ORG_SCOPED_MODELS = new Set([
  'User',
  'BrokerPhoneNumber',
  'Contact',
  'ContactMergeAudit',
  'DealTransaction',
  'DeveloperProject',
  'InboundCampaign',
  'Lead',
  'LeadReminder',
  'SiteVisit',
  'ClientPortal',
  'Team',
  'RolePermission',
]);

/**
 * Models with no direct organizationId column whose tenant is reached through
 * a parent relation. Each entry declares:
 *  - readFilter:   relation-field path from this model to organizationId,
 *                  used to force the org into read/bulk where clauses.
 *  - verifyDelegate / verifyIdField / verifyFilter: how to check that the
 *                  record's parent belongs to the caller's organization on
 *                  single-record mutations (update/delete/upsert/create).
 */
export const PARENT_SCOPED_MODELS: Record<
  string,
  {
    readFilter: string[];
    verifyDelegate: string;
    verifyIdField: string;
    verifyFilter: string[];
  }
> = {
  ContactIdentity: {
    readFilter: ['contact'],
    verifyDelegate: 'contact',
    verifyIdField: 'contactId',
    verifyFilter: [],
  },
  CommunicationLog: {
    readFilter: ['lead'],
    verifyDelegate: 'lead',
    verifyIdField: 'leadId',
    verifyFilter: [],
  },
  BuyerRequirement: {
    readFilter: ['lead'],
    verifyDelegate: 'lead',
    verifyIdField: 'leadId',
    verifyFilter: [],
  },
  ClientPortalUnit: {
    readFilter: ['portal'],
    verifyDelegate: 'clientPortal',
    verifyIdField: 'portalId',
    verifyFilter: [],
  },
  PortalTelemetryLog: {
    readFilter: ['portal'],
    verifyDelegate: 'clientPortal',
    verifyIdField: 'portalId',
    verifyFilter: [],
  },
  PropertyUnit: {
    readFilter: ['project'],
    verifyDelegate: 'developerProject',
    verifyIdField: 'projectId',
    verifyFilter: [],
  },
  InventoryAuditLog: {
    readFilter: ['propertyUnit', 'project'],
    verifyDelegate: 'propertyUnit',
    verifyIdField: 'propertyUnitId',
    verifyFilter: ['project'],
  },
  LeadAssignment: {
    readFilter: ['lead'],
    verifyDelegate: 'lead',
    verifyIdField: 'leadId',
    verifyFilter: [],
  },
};

/** True when the tenant guard auto-scopes this model (direct or via parent). */
export function isTenantScopedModel(model: string): boolean {
  return ORG_SCOPED_MODELS.has(model) || model in PARENT_SCOPED_MODELS;
}

/**
 * Build a nested Prisma where fragment from a relation-field path, e.g.
 * ['propertyUnit', 'project'] → { propertyUnit: { project: { organizationId } } }.
 */
export function nestedOrgFilter(
  path: string[],
  organizationId: string
): Record<string, unknown> {
  let filter: Record<string, unknown> = { organizationId };
  for (let i = path.length - 1; i >= 0; i--) {
    filter = { [path[i]]: filter };
  }
  return filter;
}

export interface TenantContext {
  organizationId: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Run `fn` with a tenant bound (useful for tests and scripts). */
export function runWithTenant<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ organizationId }, fn);
}

/** Bind a tenant to the remainder of the current async execution context. */
export function bindTenant(organizationId: string): void {
  storage.enterWith({ organizationId });
}

/** The tenant bound to this async context, if any. */
export function currentTenant(): TenantContext | null {
  return storage.getStore() ?? null;
}
