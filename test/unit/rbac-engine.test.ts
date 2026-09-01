import { describe, it, expect } from 'bun:test';
import {
  hasPermission,
  getUserEffectivePermissions,
  getPermissionScope,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/domain/rbac-engine';

describe('RBAC Engine Unit Tests', () => {
  const superAdminUser = {
    id: 'usr-admin-1',
    fullName: 'Usaid Patel (MD)',
    role: 'SUPER_ADMIN' as const,
    customPermissionsJson: '[]',
  };

  const telecallerUser = {
    id: 'usr-tele-1',
    fullName: 'Aisha Siddiqui',
    role: 'TELECALLER' as const,
    customPermissionsJson: '[]',
  };

  const agentUser = {
    id: 'usr-agent-1',
    fullName: 'Safwan Diwan',
    role: 'AGENT' as const,
    customPermissionsJson: '[]',
  };

  const managerUser = {
    id: 'usr-mgr-1',
    fullName: 'Team Manager',
    role: 'MANAGER' as const,
    customPermissionsJson: '[]',
  };

  describe('Super Admin Unconditional Access', () => {
    it('Super Admin has unconditional access across all permissions', () => {
      const allGranted = ALL_PERMISSIONS.every((p) => hasPermission(superAdminUser, p.key));
      expect(allGranted).toBe(true);
    });

    it('Super Admin effective permissions include all capabilities', () => {
      const effective = getUserEffectivePermissions(superAdminUser);
      expect(effective.length).toBe(ALL_PERMISSIONS.length);
    });

    it('Super Admin always resolves to GLOBAL scope', () => {
      expect(getPermissionScope(superAdminUser, 'leads:view_all')).toBe('GLOBAL');
      expect(getPermissionScope(superAdminUser, 'deals:view_financials')).toBe('GLOBAL');
    });
  });

  describe('Default Role Baseline Restrictions', () => {
    it('Telecaller can create leads by default', () => {
      expect(hasPermission(telecallerUser, 'leads:create')).toBe(true);
    });

    it('Telecaller is restricted from editing all leads and viewing financials', () => {
      expect(hasPermission(telecallerUser, 'leads:edit_all')).toBe(false);
      expect(hasPermission(telecallerUser, 'deals:view_financials')).toBe(false);
    });

    it('Agent can create portals and schedule site visits by default', () => {
      expect(hasPermission(agentUser, 'portals:create')).toBe(true);
      expect(hasPermission(agentUser, 'visits:schedule')).toBe(true);
    });

    it('Agent default scope for viewing leads is OWN_AND_ASSIGNED', () => {
      const scope = getPermissionScope(agentUser, 'leads:view_all');
      expect(scope).toBe('OWN_AND_ASSIGNED');
    });

    it('Manager scope for viewing leads is TEAM', () => {
      const scope = getPermissionScope(managerUser, 'leads:view_all');
      expect(scope).toBe('TEAM');
    });
  });

  describe('Dynamic Custom Permission Overrides', () => {
    it('Super Admin can grant custom permission override to Telecaller', () => {
      const elevatedTelecaller = {
        ...telecallerUser,
        customPermissionsJson: JSON.stringify(['leads:edit_all']),
      };
      expect(hasPermission(elevatedTelecaller, 'leads:edit_all')).toBe(true);
      expect(hasPermission(elevatedTelecaller, 'inventory:verify_rera')).toBe(false);
    });

    it('Multiple custom overrides combine cleanly with role defaults', () => {
      const powerTelecaller = {
        ...telecallerUser,
        customPermissionsJson: JSON.stringify([
          'leads:edit_all',
          'leads:delete',
          'inventory:verify_rera',
          'deals:create',
        ]),
      };
      const effective = getUserEffectivePermissions(powerTelecaller);
      expect(effective).toContain('leads:edit_all');
      expect(effective).toContain('leads:delete');
      expect(effective).toContain('inventory:verify_rera');
      expect(effective).toContain('deals:create');
    });

    it('Malformed customPermissionsJson falls back gracefully without throwing', () => {
      const corruptedUser = {
        ...telecallerUser,
        customPermissionsJson: 'INVALID_JSON{[[',
      };
      expect(hasPermission(corruptedUser, 'leads:create')).toBe(true);
      expect(hasPermission(corruptedUser, 'leads:edit_all')).toBe(false);
    });
  });
});
