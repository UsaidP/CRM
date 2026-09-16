import { describe, test, expect } from 'bun:test';
import {
  getUserLeadWhere,
  getUserVisitWhere,
  getUserDealWhere,
  getUserPortalWhere,
  getUserReminderWhere,
} from '../src/lib/services/user-scope';
import type { SessionPayload } from '../src/lib/services/auth-service';

describe('Per-User CRM Data Scoping Suite', () => {
  const agentSession: SessionPayload = {
    userId: 'usr-agent-101',
    email: 'agent@zamzam.internal',
    fullName: 'Test Agent',
    role: 'AGENT',
    organizationId: 'org-test-123',
    isSuperAdmin: false,
  };

  const telecallerSession: SessionPayload = {
    userId: 'usr-telecaller-202',
    email: 'telecaller@zamzam.internal',
    fullName: 'Test Telecaller',
    role: 'TELECALLER',
    organizationId: 'org-test-123',
    isSuperAdmin: false,
  };

  const adminSession: SessionPayload = {
    userId: 'usr-admin-303',
    email: 'admin@zamzam.internal',
    fullName: 'Admin User',
    role: 'ADMIN',
    organizationId: 'org-test-123',
    isSuperAdmin: false,
  };

  const superAdminSession: SessionPayload = {
    userId: 'usr-super-999',
    email: 'super@zamzam.internal',
    fullName: 'Super Admin',
    role: 'SUPER_ADMIN',
    organizationId: 'org-test-123',
    isSuperAdmin: true,
  };

  test('Lead scoping defaults to personal pipeline for all roles', () => {
    // Agent
    const agentWhere = getUserLeadWhere(agentSession);
    expect(agentWhere.organizationId).toBe('org-test-123');
    expect(agentWhere.OR).toBeDefined();
    expect(agentWhere.OR).toEqual([
      { assignedBrokerId: 'usr-agent-101' },
      { assignments: { some: { userId: 'usr-agent-101', unassignedAt: null } } },
    ]);

    // Telecaller
    const teleWhere = getUserLeadWhere(telecallerSession);
    expect(teleWhere.organizationId).toBe('org-test-123');
    expect(teleWhere.OR).toEqual([
      { assignedBrokerId: 'usr-telecaller-202' },
      { assignments: { some: { userId: 'usr-telecaller-202', unassignedAt: null } } },
    ]);

    // Admin in default ('mine') view
    const adminWhere = getUserLeadWhere(adminSession, 'mine');
    expect(adminWhere.organizationId).toBe('org-test-123');
    expect(adminWhere.OR).toBeDefined();

    // Super Admin in default ('mine') view
    const superWhere = getUserLeadWhere(superAdminSession, 'mine');
    expect(superWhere.organizationId).toBe('org-test-123');
    expect(superWhere.OR).toBeDefined();
  });

  test('Non-admins cannot bypass personal scoping even if requesting firm view', () => {
    const agentFirm = getUserLeadWhere(agentSession, 'firm');
    expect(agentFirm.OR).toBeDefined();
    expect((agentFirm.OR as any)[0].assignedBrokerId).toBe('usr-agent-101');

    const teleFirm = getUserLeadWhere(telecallerSession, 'firm');
    expect(teleFirm.OR).toBeDefined();
    expect((teleFirm.OR as any)[0].assignedBrokerId).toBe('usr-telecaller-202');
  });

  test('Admins can view firm-wide leads when explicitly toggling firm view', () => {
    const adminFirm = getUserLeadWhere(adminSession, 'firm');
    expect(adminFirm.organizationId).toBe('org-test-123');
    expect(adminFirm.OR).toBeUndefined();

    const superFirm = getUserLeadWhere(superAdminSession, 'firm');
    expect(superFirm.organizationId).toBe('org-test-123');
    expect(superFirm.OR).toBeUndefined();
  });

  test('Deals scoping restricts to closing broker or lead owner in personal view', () => {
    const dealWhere = getUserDealWhere(agentSession, 'mine');
    expect(dealWhere.organizationId).toBe('org-test-123');
    expect(dealWhere.OR).toEqual([
      { closingBrokerId: 'usr-agent-101' },
      { lead: { assignedBrokerId: 'usr-agent-101' } },
      { lead: { assignments: { some: { userId: 'usr-agent-101', unassignedAt: null } } } },
    ]);

    const adminDealFirm = getUserDealWhere(adminSession, 'firm');
    expect(adminDealFirm.OR).toBeUndefined();
  });

  test('Site visit scoping restricts to assigned visits in personal view', () => {
    const visitWhere = getUserVisitWhere(telecallerSession, 'mine');
    expect(visitWhere.organizationId).toBe('org-test-123');
    expect(visitWhere.OR).toEqual([
      { assignedBrokerId: 'usr-telecaller-202' },
      { lead: { assignedBrokerId: 'usr-telecaller-202' } },
      { lead: { assignments: { some: { userId: 'usr-telecaller-202', unassignedAt: null } } } },
    ]);
  });

  test('Client portal scoping restricts to creator or assigned lead owner', () => {
    const portalWhere = getUserPortalWhere(agentSession, 'mine');
    expect(portalWhere.organizationId).toBe('org-test-123');
    expect(portalWhere.OR).toEqual([
      { createdById: 'usr-agent-101' },
      { lead: { assignedBrokerId: 'usr-agent-101' } },
      { lead: { assignments: { some: { userId: 'usr-agent-101', unassignedAt: null } } } },
    ]);
  });

  test('Reminder scoping restricts to reminders on user assigned leads', () => {
    const reminderWhere = getUserReminderWhere(agentSession, 'mine');
    expect(reminderWhere.organizationId).toBe('org-test-123');
    expect(reminderWhere.status).toEqual({ in: ['PENDING', 'SNOOZED'] });
    expect(reminderWhere.lead).toEqual({
      OR: [
        { assignedBrokerId: 'usr-agent-101' },
        { assignments: { some: { userId: 'usr-agent-101', unassignedAt: null } } },
      ],
    });
  });
});
