import { PrismaClient } from '@prisma/client';
import {
  currentTenant,
  ORG_SCOPED_MODELS,
  PARENT_SCOPED_MODELS,
  nestedOrgFilter,
} from './tenant-context';

/**
 * Prisma tenant guard.
 *
 * Auto-scopes every query on a tenant-scoped model to the organization bound
 * to the current request (see tenant-context.ts), injects organizationId on
 * creates, and rejects mutations that would touch another organization's rows.
 *
 * Two scoping kinds are supported:
 *  - Direct models (ORG_SCOPED_MODELS): carry their own organizationId column.
 *  - Parent-scoped models (PARENT_SCOPED_MODELS): tenant is reached via a
 *    parent relation (e.g. CommunicationLog → lead → organizationId).
 *
 * When no tenant is bound (scripts, seed, cron, public webhooks/portals)
 * queries pass through untouched — those paths must scope themselves
 * explicitly.
 */
export function withTenantGuard<T extends PrismaClient>(client: T): T {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const tenant = currentTenant();
          if (!tenant || !model) {
            return query(args);
          }

          const parentScope = PARENT_SCOPED_MODELS[model];
          const isDirect = ORG_SCOPED_MODELS.has(model);
          if (!isDirect && !parentScope) {
            return query(args);
          }

          const orgId = tenant.organizationId;
          // Where fragment restricting this model to the caller's org.
          const orgFilter = isDirect
            ? { organizationId: orgId }
            : nestedOrgFilter(parentScope.readFilter, orgId);

          // Verify the target record's parent belongs to the caller's org.
          const verifyOwnership = async (parentValue: unknown): Promise<void> => {
            if (isDirect || !parentScope || !parentValue) {
              if (!isDirect) throw new Error('FORBIDDEN_CROSS_TENANT');
              return;
            }
            const delegate = (client as any)[parentScope.verifyDelegate];
            const owned = await delegate.findFirst({
              where: {
                id: parentValue,
                ...nestedOrgFilter(parentScope.verifyFilter, orgId),
              },
              select: { id: true },
            });
            if (!owned) throw new Error('FORBIDDEN_CROSS_TENANT');
          };

          const a: any = { ...args };

          switch (operation) {
            // Reads: force the org into every where clause
            case 'findMany':
            case 'findFirst':
            case 'findFirstOrThrow':
            case 'count':
            case 'aggregate':
            case 'groupBy': {
              a.where = { AND: [orgFilter, a.where ?? {}] };
              break;
            }

            // Creates: inject org on direct models; verify the parent's org
            // on parent-scoped models.
            case 'create':
            case 'createMany': {
              if (isDirect) {
                const rows = Array.isArray(a.data) ? a.data : [a.data];
                for (const row of rows) {
                  if (row?.organizationId && row.organizationId !== orgId) {
                    throw new Error('FORBIDDEN_CROSS_TENANT');
                  }
                }
                a.data = Array.isArray(a.data)
                  ? a.data.map((d: any) => ({ ...d, organizationId: orgId }))
                  : { ...(a.data ?? {}), organizationId: orgId };
              } else {
                const rows = Array.isArray(a.data) ? a.data : [a.data];
                const parentIds = [
                  ...new Set(rows.map((r: any) => r?.[parentScope.verifyIdField])),
                ];
                for (const parentId of parentIds) {
                  await verifyOwnership(parentId);
                }
              }
              break;
            }

            // Upsert: where is unique-only (cannot AND the org in), so verify
            // ownership by id first. Inject org on the create path of direct
            // models.
            case 'upsert': {
              const targetId = a.where?.id;
              if (isDirect) {
                if (targetId) {
                  const delegate = (client as any)[
                    model.charAt(0).toLowerCase() + model.slice(1)
                  ];
                  const owned = await delegate.findFirst({
                    where: { id: targetId, ...orgFilter },
                    select: { id: true },
                  });
                  if (!owned) throw new Error('FORBIDDEN_CROSS_TENANT');
                }
                a.create = { ...(a.create ?? {}), organizationId: orgId };
              } else {
                // Resolve the parent id by fetching the record itself.
                if (targetId) {
                  const delegate = (client as any)[
                    model.charAt(0).toLowerCase() + model.slice(1)
                  ];
                  const row = await delegate.findFirst({
                    where: { id: targetId },
                    select: { [parentScope.verifyIdField]: true },
                  });
                  await verifyOwnership(row?.[parentScope.verifyIdField]);
                }
              }
              break;
            }

            // Single-record mutations: force the org into the where clause
            // (works for unique and non-unique lookups alike).
            case 'update':
            case 'delete': {
              a.where = { AND: [orgFilter, a.where ?? {}] };
              break;
            }

            // Bulk mutations: force the org into the where clause
            case 'updateMany':
            case 'deleteMany': {
              a.where = { AND: [orgFilter, a.where ?? {}] };
              break;
            }
          }

          return query(a);
        },
      },
    },
  }) as unknown as T;
}

