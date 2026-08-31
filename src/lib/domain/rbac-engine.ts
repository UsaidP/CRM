/**
 * Dynamic Role-Based Access Control (RBAC) & Granular Permission Engine
 *
 * Architecture: ROLE → PERMISSION → SCOPE
 *   Role   = what you CAN do  (e.g. "leads:create")
 *   Scope  = which records you can do it TO  (e.g. OWN, TEAM, ORGANIZATION)
 *
 * Allows SUPER_ADMIN to grant or revoke specific granular capabilities
 * at any time with immediate effect.
 */

import { CrmRole, PermissionKey, PermissionScope, ScopedPermission } from '@/types/crm';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: 'Leads & Pipeline' | 'Inventory & MahaRERA' | 'Deals & Financials' | 'Site Visits & Tours' | 'Portals & Analytics' | 'System Administration';
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Leads & Pipeline
  {
    key: 'leads:view_all',
    label: 'View Leads',
    category: 'Leads & Pipeline',
    description: 'View leads within your data scope (own, team, or organization-wide).',
  },
  {
    key: 'leads:create',
    label: 'Create & Ingest Leads',
    category: 'Leads & Pipeline',
    description: 'Add new buyer prospects and speed-to-lead inquiries.',
  },
  {
    key: 'leads:edit_all',
    label: 'Edit Lead Data',
    category: 'Leads & Pipeline',
    description: 'Edit buyer details, budgets, BHK preferences, stages, and contact info within scope.',
  },
  {
    key: 'leads:delete',
    label: 'Delete / Drop Leads',
    category: 'Leads & Pipeline',
    description: 'Permanently remove or archive lead records from the firm database.',
  },
  {
    key: 'leads:reassign',
    label: 'Reassign Leads',
    category: 'Leads & Pipeline',
    description: 'Change assigned agent/telecaller on leads within scope.',
  },
  {
    key: 'leads:bulk_import',
    label: 'Bulk Import Spreadsheets (Excel/CSV)',
    category: 'Leads & Pipeline',
    description: 'Upload and auto-adjust lead datasets via Excel, CSV, TSV, or JSON.',
  },
  {
    key: 'leads:merge',
    label: 'Merge & Deduplicate Contacts',
    category: 'Leads & Pipeline',
    description: 'Audit and consolidate duplicate buyer phone numbers and inquiries.',
  },

  // Inventory & MahaRERA
  {
    key: 'inventory:view',
    label: 'View Inventory Catalogue',
    category: 'Inventory & MahaRERA',
    description: 'Browse active marketable projects, unit inventories, and cost sheets.',
  },
  {
    key: 'inventory:edit',
    label: 'Create & Edit Projects / Units',
    category: 'Inventory & MahaRERA',
    description: 'Add new developer projects, towers, unit numbers, and pricing slabs.',
  },
  {
    key: 'inventory:verify_rera',
    label: 'MahaRERA Audit & 14-Day Physical Certification',
    category: 'Inventory & MahaRERA',
    description: 'Perform physical site audits, verify OC/RERA registration, and refresh verification timestamps.',
  },

  // Deals & Financials
  {
    key: 'deals:view_all',
    label: 'View Deal Transactions',
    category: 'Deals & Financials',
    description: 'View deal transactions, booking slips, and closing pipeline within scope.',
  },
  {
    key: 'deals:create',
    label: 'Register New Deal Bookings',
    category: 'Deals & Financials',
    description: 'Book token advances and initiate deal transactions.',
  },
  {
    key: 'deals:advance_stage',
    label: 'Advance Deal Milestones',
    category: 'Deals & Financials',
    description: 'Move deals from Token -> Agreement Registered -> Invoice Sent -> Payment Cleared.',
  },
  {
    key: 'deals:view_financials',
    label: 'View Brokerage & Commission Splits',
    category: 'Deals & Financials',
    description: 'Inspect brokerage percentages, firm revenues, and co-broker payouts.',
  },
  {
    key: 'deals:rtgs_payout',
    label: 'Approve RTGS Commission Payouts',
    category: 'Deals & Financials',
    description: 'Clear financial liabilities and authorize rep bank payouts.',
  },

  // Site Visits & Tours
  {
    key: 'visits:schedule',
    label: 'Schedule Site Visits',
    category: 'Site Visits & Tours',
    description: 'Book Saturday multi-project property inspections and pickup times.',
  },
  {
    key: 'visits:dispatch_cab',
    label: 'Dispatch Cab Logistics',
    category: 'Site Visits & Tours',
    description: 'Coordinate transportation and driver allocation for buyer property visits.',
  },
  {
    key: 'visits:record_outcome',
    label: 'Record Post-Tour Outcomes',
    category: 'Site Visits & Tours',
    description: 'Log enthusiasm rating, buyer objections, and move to negotiation.',
  },

  // Portals & Analytics
  {
    key: 'portals:create',
    label: 'Generate Tokenized Client Portals',
    category: 'Portals & Analytics',
    description: 'Create customized property shortlist portals and WhatsApp share links.',
  },
  {
    key: 'portals:view_telemetry',
    label: 'View Real-Time Visitor Telemetry',
    category: 'Portals & Analytics',
    description: 'Track buyer dwell time, video engagement, and high-intent alerts.',
  },
  {
    key: 'analytics:view_firm',
    label: 'View Firm-Wide Analytics & Leaderboards',
    category: 'Portals & Analytics',
    description: 'Inspect broker performance metrics, channel ROI, and revenue forecasts.',
  },

  // System Administration
  {
    key: 'admin:manage_rbac',
    label: 'Manage Team RBAC & Permissions',
    category: 'System Administration',
    description: 'Grant or revoke permissions, change user roles, and manage system access.',
  },
  {
    key: 'admin:manage_teams',
    label: 'Manage Teams',
    category: 'System Administration',
    description: 'Create, edit, and delete teams. Add or remove team members.',
  },
];

/**
 * Role hierarchy level — higher number = more authority.
 * Used for checking "can user X manage user Y" type checks.
 */
export const ROLE_HIERARCHY: Record<CrmRole, number> = {
  TELECALLER: 0,
  AGENT: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/**
 * Default scoped permissions per role.
 * Each role gets permissions paired with a data-visibility scope.
 */
export const DEFAULT_ROLE_SCOPED_PERMISSIONS: Record<CrmRole, ScopedPermission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => ({ permission: p.key, scope: 'GLOBAL' as PermissionScope })),

  ADMIN: [
    { permission: 'leads:view_all', scope: 'ORGANIZATION' },
    { permission: 'leads:create', scope: 'ORGANIZATION' },
    { permission: 'leads:edit_all', scope: 'ORGANIZATION' },
    { permission: 'leads:delete', scope: 'ORGANIZATION' },
    { permission: 'leads:reassign', scope: 'ORGANIZATION' },
    { permission: 'leads:bulk_import', scope: 'ORGANIZATION' },
    { permission: 'leads:merge', scope: 'ORGANIZATION' },
    { permission: 'inventory:view', scope: 'ORGANIZATION' },
    { permission: 'inventory:edit', scope: 'ORGANIZATION' },
    { permission: 'inventory:verify_rera', scope: 'ORGANIZATION' },
    { permission: 'deals:view_all', scope: 'ORGANIZATION' },
    { permission: 'deals:create', scope: 'ORGANIZATION' },
    { permission: 'deals:advance_stage', scope: 'ORGANIZATION' },
    { permission: 'deals:view_financials', scope: 'ORGANIZATION' },
    { permission: 'deals:rtgs_payout', scope: 'ORGANIZATION' },
    { permission: 'visits:schedule', scope: 'ORGANIZATION' },
    { permission: 'visits:dispatch_cab', scope: 'ORGANIZATION' },
    { permission: 'visits:record_outcome', scope: 'ORGANIZATION' },
    { permission: 'portals:create', scope: 'ORGANIZATION' },
    { permission: 'portals:view_telemetry', scope: 'ORGANIZATION' },
    { permission: 'analytics:view_firm', scope: 'ORGANIZATION' },
    { permission: 'admin:manage_rbac', scope: 'ORGANIZATION' },
    { permission: 'admin:manage_teams', scope: 'ORGANIZATION' },
  ],

  MANAGER: [
    { permission: 'leads:view_all', scope: 'TEAM' },
    { permission: 'leads:create', scope: 'TEAM' },
    { permission: 'leads:edit_all', scope: 'TEAM' },
    { permission: 'leads:reassign', scope: 'TEAM' },
    { permission: 'leads:bulk_import', scope: 'TEAM' },
    { permission: 'leads:merge', scope: 'TEAM' },
    { permission: 'inventory:view', scope: 'ORGANIZATION' },
    { permission: 'inventory:edit', scope: 'ORGANIZATION' },
    { permission: 'inventory:verify_rera', scope: 'ORGANIZATION' },
    { permission: 'deals:view_all', scope: 'TEAM' },
    { permission: 'deals:create', scope: 'TEAM' },
    { permission: 'deals:advance_stage', scope: 'TEAM' },
    { permission: 'deals:view_financials', scope: 'TEAM' },
    { permission: 'visits:schedule', scope: 'TEAM' },
    { permission: 'visits:dispatch_cab', scope: 'TEAM' },
    { permission: 'visits:record_outcome', scope: 'TEAM' },
    { permission: 'portals:create', scope: 'TEAM' },
    { permission: 'portals:view_telemetry', scope: 'TEAM' },
    { permission: 'analytics:view_firm', scope: 'TEAM' },
  ],

  AGENT: [
    { permission: 'leads:view_all', scope: 'OWN_AND_ASSIGNED' },
    { permission: 'leads:create', scope: 'OWN' },
    { permission: 'leads:edit_all', scope: 'OWN_AND_ASSIGNED' },
    { permission: 'leads:merge', scope: 'OWN_AND_ASSIGNED' },
    { permission: 'inventory:view', scope: 'ORGANIZATION' },
    { permission: 'deals:view_all', scope: 'OWN_AND_ASSIGNED' },
    { permission: 'deals:create', scope: 'OWN' },
    { permission: 'visits:schedule', scope: 'OWN_AND_ASSIGNED' },
    { permission: 'visits:record_outcome', scope: 'OWN_AND_ASSIGNED' },
    { permission: 'portals:create', scope: 'OWN_AND_ASSIGNED' },
    { permission: 'portals:view_telemetry', scope: 'OWN_AND_ASSIGNED' },
  ],

  TELECALLER: [
    { permission: 'leads:view_all', scope: 'OWN' },
    { permission: 'leads:create', scope: 'OWN' },
    { permission: 'inventory:view', scope: 'ORGANIZATION' },
    { permission: 'visits:schedule', scope: 'OWN' },
    { permission: 'portals:create', scope: 'OWN' },
  ],
};

/**
 * Backward-compatible flat permission list per role (for existing code).
 * Maps the scoped permissions back to a simple list of permission keys.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<CrmRole, PermissionKey[]> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_SCOPED_PERMISSIONS).map(([role, perms]) => [
    role,
    perms.map((p) => p.permission),
  ])
) as Record<CrmRole, PermissionKey[]>;

/**
 * Evaluates whether a user has a specific permission.
 * - SUPER_ADMIN always has full access.
 * - Checks custom permissions explicitly granted or revoked by Super Admin.
 * - Falls back to role default baseline.
 */
export function hasPermission(
  user: { role?: string; customPermissionsJson?: string | null } | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;

  const role = (user.role || 'TELECALLER') as CrmRole;

  // Super Admin always has full access to everything
  if (role === 'SUPER_ADMIN') {
    return true;
  }

  // Parse custom overrides if present
  let customPermissions: string[] = [];
  if (user.customPermissionsJson) {
    try {
      customPermissions = JSON.parse(user.customPermissionsJson);
    } catch {
      customPermissions = [];
    }
  }

  // If explicitly granted in custom overrides
  if (customPermissions.includes(permission)) {
    return true;
  }

  // Check default baseline for this role
  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
  return roleDefaults.includes(permission);
}

/**
 * Returns the data visibility scope for a user's permission.
 * Falls back to 'OWN' if the user doesn't have the permission at all.
 */
export function getPermissionScope(
  user: { role?: string; customPermissionsJson?: string | null } | null | undefined,
  permission: PermissionKey
): PermissionScope {
  if (!user) return 'OWN';

  const role = (user.role || 'TELECALLER') as CrmRole;

  if (role === 'SUPER_ADMIN') return 'GLOBAL';
  if (role === 'ADMIN') return 'ORGANIZATION';

  // Check if custom overrides exist — custom overrides use the role's default scope
  // (upgrading scope requires explicit RolePermission records via admin UI)
  const scopedPerms = DEFAULT_ROLE_SCOPED_PERMISSIONS[role] || [];
  const match = scopedPerms.find((sp) => sp.permission === permission);
  if (match) return match.scope;

  // Custom permission grant — defaults to OWN scope
  let customPermissions: string[] = [];
  if (user.customPermissionsJson) {
    try {
      customPermissions = JSON.parse(user.customPermissionsJson);
    } catch {
      customPermissions = [];
    }
  }
  if (customPermissions.includes(permission)) return 'OWN';

  return 'OWN';
}

/**
 * Computes the complete set of effective permissions with scopes for a user.
 */
export function getUserEffectivePermissions(
  user: { role?: string; customPermissionsJson?: string | null } | null | undefined
): PermissionKey[] {
  if (!user) return [];

  const role = (user.role || 'TELECALLER') as CrmRole;
  if (role === 'SUPER_ADMIN') {
    return ALL_PERMISSIONS.map((p) => p.key);
  }

  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[role] || [];

  let customOverrides: string[] = [];
  if (user.customPermissionsJson) {
    try {
      customOverrides = JSON.parse(user.customPermissionsJson);
    } catch {
      customOverrides = [];
    }
  }

  const combined = new Set<PermissionKey>([
    ...roleDefaults,
    ...(customOverrides as PermissionKey[]),
  ]);

  return Array.from(combined);
}

/**
 * Returns effective scoped permissions for a user (permission + scope pairs).
 */
export function getUserScopedPermissions(
  user: { role?: string; customPermissionsJson?: string | null } | null | undefined
): ScopedPermission[] {
  if (!user) return [];

  const role = (user.role || 'TELECALLER') as CrmRole;
  if (role === 'SUPER_ADMIN') {
    return ALL_PERMISSIONS.map((p) => ({ permission: p.key, scope: 'GLOBAL' as PermissionScope }));
  }

  const roleScoped = DEFAULT_ROLE_SCOPED_PERMISSIONS[role] || [];
  const result = new Map<PermissionKey, ScopedPermission>();

  for (const sp of roleScoped) {
    result.set(sp.permission, sp);
  }

  // Custom overrides get OWN scope by default
  let customOverrides: string[] = [];
  if (user.customPermissionsJson) {
    try {
      customOverrides = JSON.parse(user.customPermissionsJson);
    } catch {
      customOverrides = [];
    }
  }

  for (const perm of customOverrides) {
    if (!result.has(perm as PermissionKey)) {
      result.set(perm as PermissionKey, { permission: perm as PermissionKey, scope: 'OWN' });
    }
  }

  return Array.from(result.values());
}
