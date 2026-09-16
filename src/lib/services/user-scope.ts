import type { SessionPayload } from '@/lib/services/auth-service';

export type UserScopeView = 'mine' | 'firm';

/**
 * Builds Prisma where clause for Leads based on per-user scoping.
 * - 'mine' (default): only leads assigned to the user or with an active assignment.
 * - 'firm': all leads in the organization (only allowed for ADMIN or SUPER_ADMIN).
 */
export function getUserLeadWhere(
  session: SessionPayload,
  view: UserScopeView = 'mine'
): Record<string, unknown> {
  const base: Record<string, unknown> = { organizationId: session.organizationId };
  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN' || session.isSuperAdmin;

  if (view === 'firm' && isAdmin) {
    return base;
  }

  return {
    ...base,
    OR: [
      { assignedBrokerId: session.userId },
      { assignments: { some: { userId: session.userId, unassignedAt: null } } },
    ],
  };
}

/**
 * Builds Prisma where clause for Site Visits based on per-user scoping.
 * - 'mine' (default): visits assigned to the user or on the user's assigned leads.
 * - 'firm': all visits in the organization (admins only).
 */
export function getUserVisitWhere(
  session: SessionPayload,
  view: UserScopeView = 'mine'
): Record<string, unknown> {
  const base: Record<string, unknown> = { organizationId: session.organizationId };
  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN' || session.isSuperAdmin;

  if (view === 'firm' && isAdmin) {
    return base;
  }

  return {
    ...base,
    OR: [
      { assignedBrokerId: session.userId },
      { lead: { assignedBrokerId: session.userId } },
      { lead: { assignments: { some: { userId: session.userId, unassignedAt: null } } } },
    ],
  };
}

/**
 * Builds Prisma where clause for Deal Transactions based on per-user scoping.
 * - 'mine' (default): deals closed by the user or on the user's assigned leads.
 * - 'firm': all deals in the organization (admins only).
 */
export function getUserDealWhere(
  session: SessionPayload,
  view: UserScopeView = 'mine'
): Record<string, unknown> {
  const base: Record<string, unknown> = { organizationId: session.organizationId };
  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN' || session.isSuperAdmin;

  if (view === 'firm' && isAdmin) {
    return base;
  }

  return {
    ...base,
    OR: [
      { closingBrokerId: session.userId },
      { lead: { assignedBrokerId: session.userId } },
      { lead: { assignments: { some: { userId: session.userId, unassignedAt: null } } } },
    ],
  };
}

/**
 * Builds Prisma where clause for Client Portals based on per-user scoping.
 * - 'mine' (default): portals created by the user or on the user's assigned leads.
 * - 'firm': all portals in the organization (admins only).
 */
export function getUserPortalWhere(
  session: SessionPayload,
  view: UserScopeView = 'mine'
): Record<string, unknown> {
  const base: Record<string, unknown> = { organizationId: session.organizationId };
  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN' || session.isSuperAdmin;

  if (view === 'firm' && isAdmin) {
    return base;
  }

  return {
    ...base,
    OR: [
      { createdById: session.userId },
      { lead: { assignedBrokerId: session.userId } },
      { lead: { assignments: { some: { userId: session.userId, unassignedAt: null } } } },
    ],
  };
}

/**
 * Builds Prisma where clause for Lead Reminders based on per-user scoping.
 * - 'mine' (default): reminders on the user's assigned leads.
 * - 'firm': all reminders in the organization (admins only).
 */
export function getUserReminderWhere(
  session: SessionPayload,
  view: UserScopeView = 'mine'
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    organizationId: session.organizationId,
    status: { in: ['PENDING', 'SNOOZED'] },
  };
  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN' || session.isSuperAdmin;

  if (view === 'firm' && isAdmin) {
    return base;
  }

  return {
    ...base,
    lead: {
      OR: [
        { assignedBrokerId: session.userId },
        { assignments: { some: { userId: session.userId, unassignedAt: null } } },
      ],
    },
  };
}
