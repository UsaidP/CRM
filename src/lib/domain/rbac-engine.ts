/**
 * Dynamic Role-Based Access Control (RBAC) & Granular Permission Engine
 * Allows SUPER_ADMIN to grant or revoke specific granular capabilities (e.g. editing all leads for telecallers)
 * at any time with immediate effect.
 */

import { CrmRole, PermissionKey, User } from '@/types/crm';

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
    label: 'View All Firm Leads',
    category: 'Leads & Pipeline',
    description: 'View leads assigned to all brokers across the firm, not just own queue.',
  },
  {
    key: 'leads:create',
    label: 'Create & Ingest Leads',
    category: 'Leads & Pipeline',
    description: 'Add new buyer prospects and speed-to-lead inquiries.',
  },
  {
    key: 'leads:edit_all',
    label: 'Edit Any Lead Data',
    category: 'Leads & Pipeline',
    description: 'Allows editing buyer details, budgets, BHK preferences, stages, and contact info for ANY lead (including telecallers).',
  },
  {
    key: 'leads:delete',
    label: 'Delete / Drop Leads',
    category: 'Leads & Pipeline',
    description: 'Permanently remove or archive lead records from the firm database.',
  },
  {
    key: 'leads:reassign',
    label: 'Reassign Leads to Brokers',
    category: 'Leads & Pipeline',
    description: 'Change assigned broker/telecaller on any lead prospect.',
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
  {
    key: 'inventory:scraper',
    label: 'Manage Web Scraper & Developer Feeds',
    category: 'Inventory & MahaRERA',
    description: 'Trigger inventory scrapers and auto-sync external project feeds.',
  },

  // Deals & Financials
  {
    key: 'deals:view_all',
    label: 'View All Deal Transactions',
    category: 'Deals & Financials',
    description: 'View full firm transactions, booking slips, and closing pipeline.',
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
];

/**
 * Standard default baseline permissions for each role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<CrmRole, PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => p.key),
  BROKER_MANAGER: [
    'leads:view_all',
    'leads:create',
    'leads:edit_all',
    'leads:reassign',
    'leads:bulk_import',
    'leads:merge',
    'inventory:view',
    'inventory:edit',
    'inventory:verify_rera',
    'inventory:scraper',
    'deals:view_all',
    'deals:create',
    'deals:advance_stage',
    'deals:view_financials',
    'visits:schedule',
    'visits:dispatch_cab',
    'visits:record_outcome',
    'portals:create',
    'portals:view_telemetry',
    'analytics:view_firm',
  ],
  SALES_EXECUTIVE: [
    'leads:create',
    'leads:merge',
    'inventory:view',
    'deals:create',
    'visits:schedule',
    'visits:record_outcome',
    'portals:create',
    'portals:view_telemetry',
  ],
  TELECALLER: [
    'leads:create',
    'inventory:view',
    'visits:schedule',
    'portals:create',
  ],
};

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
 * Computes the complete set of effective permissions for a user
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
