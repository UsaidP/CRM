import { createSessionToken, SESSION_COOKIE_NAME, type SessionPayload, type CrmRole } from '@/lib/services/auth-service';
import type { PermissionKey } from '@/types/crm';
import { ALL_PERMISSIONS } from '@/lib/domain/rbac-engine';

export const TEST_ORG_ID = 'org-test-zamzam-001';
export const TEST_ORG_B_ID = 'org-test-zamzam-002';

export interface TestUserConfig {
  userId: string;
  email: string;
  fullName: string;
  role: CrmRole;
  organizationId?: string;
  teamId?: string | null;
  isSuperAdmin?: boolean;
}

export const PRESET_TEST_USERS: Record<string, TestUserConfig> = {
  superAdmin: {
    userId: 'usr-test-super-admin',
    email: 'superadmin@zamzam-test.internal',
    fullName: 'Test Super Admin',
    role: 'SUPER_ADMIN',
    organizationId: TEST_ORG_ID,
    isSuperAdmin: true,
  },
  admin: {
    userId: 'usr-test-admin',
    email: 'admin@zamzam-test.internal',
    fullName: 'Test Admin',
    role: 'ADMIN',
    organizationId: TEST_ORG_ID,
    isSuperAdmin: false,
  },
  manager: {
    userId: 'usr-test-manager',
    email: 'manager@zamzam-test.internal',
    fullName: 'Test Team Manager',
    role: 'MANAGER',
    organizationId: TEST_ORG_ID,
    teamId: 'team-test-alpha',
    isSuperAdmin: false,
  },
  agent: {
    userId: 'usr-test-agent',
    email: 'agent@zamzam-test.internal',
    fullName: 'Test Broker Agent',
    role: 'AGENT',
    organizationId: TEST_ORG_ID,
    teamId: 'team-test-alpha',
    isSuperAdmin: false,
  },
  telecaller: {
    userId: 'usr-test-telecaller',
    email: 'telecaller@zamzam-test.internal',
    fullName: 'Test Telecaller Rep',
    role: 'TELECALLER',
    organizationId: TEST_ORG_ID,
    isSuperAdmin: false,
  },
  foreignOrgAgent: {
    userId: 'usr-test-foreign-agent',
    email: 'foreign@other-org.internal',
    fullName: 'Foreign Org User',
    role: 'AGENT',
    organizationId: TEST_ORG_B_ID,
    isSuperAdmin: false,
  },
};

/**
 * Creates a signed JWT session cookie string for testing.
 */
export async function createTestSessionCookie(userKey: keyof typeof PRESET_TEST_USERS | TestUserConfig): Promise<string> {
  const config = typeof userKey === 'string' ? PRESET_TEST_USERS[userKey] : userKey;
  const token = await createSessionToken({
    userId: config.userId,
    email: config.email,
    fullName: config.fullName,
    role: config.role,
    organizationId: config.organizationId || TEST_ORG_ID,
    teamId: config.teamId || null,
    isSuperAdmin: !!config.isSuperAdmin,
  });

  return `${SESSION_COOKIE_NAME}=${token}`;
}

/**
 * Creates a signed session token.
 */
export async function createTestSessionToken(userKey: keyof typeof PRESET_TEST_USERS | TestUserConfig): Promise<string> {
  const config = typeof userKey === 'string' ? PRESET_TEST_USERS[userKey] : userKey;
  return createSessionToken({
    userId: config.userId,
    email: config.email,
    fullName: config.fullName,
    role: config.role,
    organizationId: config.organizationId || TEST_ORG_ID,
    teamId: config.teamId || null,
    isSuperAdmin: !!config.isSuperAdmin,
  });
}

/**
 * Model Factories for generating consistent, valid mock objects.
 */
export const TestFactories = {
  createLeadData(overrides: Record<string, any> = {}) {
    const timestamp = Date.now();
    return {
      fullName: `Test Lead ${timestamp}`,
      phoneE164: '+919967731071',
      email: `lead.${timestamp}@zamzam-test.internal`,
      city: 'Navi Mumbai',
      leadSource: 'MANUAL_ENTRY',
      sourceConfidence: 'EXACT',
      currentStage: 'new_uncontacted',
      notes: 'QA Automated Test Lead',
      ...overrides,
    };
  },

  createProjectData(overrides: Record<string, any> = {}) {
    const timestamp = Date.now();
    return {
      developerName: 'Godrej Properties',
      projectName: `Godrej Kharghar Highland ${timestamp}`,
      reraNumber: 'P52000018920',
      microMarket: 'Kharghar Sector 35',
      subLocality: 'Valley View',
      basePricePerSqft: 11500,
      totalTowers: 3,
      totalFloors: 24,
      hasOccupancyCertificate: false,
      standardCommissionPercent: 2.5,
      amenitiesJson: JSON.stringify(['Clubhouse', 'Swimming Pool', 'Gymnasium']),
      ...overrides,
    };
  },

  createUnitData(projectId: string, overrides: Record<string, any> = {}) {
    return {
      projectId,
      unitNumber: 'Tower A - 1204',
      bhk: 2,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 12,
      totalFloors: 24,
      carpetAreaSqft: 720,
      facing: 'EAST',
      possessionStatus: 'UNDER_CONSTRUCTION',
      agreementValue: 8280000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 5.0,
      parkingCharges: 250000,
      societyDevelopmentCharges: 150000,
      allInTotalCost: 9626800,
      verificationStatus: 'VERIFIED',
      ...overrides,
    };
  },

  createDealData(leadId: string, projectId: string, propertyUnitId: string, overrides: Record<string, any> = {}) {
    return {
      leadId,
      developerProjectId: projectId,
      propertyUnitId,
      agreementValue: 8500000,
      brokeragePercent: 2.5,
      grossBrokerageAmount: 212500,
      repCommissionAmount: 106250,
      firmNetBrokerageAmount: 106250,
      dealStatus: 'TOKEN_RECEIVED',
      ...overrides,
    };
  },
};

/**
 * Cleanup Registry to track created database records for deterministic teardown.
 */
class CleanupRegistry {
  private leadIds: Set<string> = new Set();
  private contactIds: Set<string> = new Set();
  private projectIds: Set<string> = new Set();
  private dealIds: Set<string> = new Set();
  private portalIds: Set<string> = new Set();

  register(type: 'lead' | 'contact' | 'project' | 'deal' | 'portal', id: string) {
    if (type === 'lead') this.leadIds.add(id);
    if (type === 'contact') this.contactIds.add(id);
    if (type === 'project') this.projectIds.add(id);
    if (type === 'deal') this.dealIds.add(id);
    if (type === 'portal') this.portalIds.add(id);
  }

  getRegistered(type: 'lead' | 'contact' | 'project' | 'deal' | 'portal'): string[] {
    if (type === 'lead') return Array.from(this.leadIds);
    if (type === 'contact') return Array.from(this.contactIds);
    if (type === 'project') return Array.from(this.projectIds);
    if (type === 'deal') return Array.from(this.dealIds);
    if (type === 'portal') return Array.from(this.portalIds);
    return [];
  }

  clear() {
    this.leadIds.clear();
    this.contactIds.clear();
    this.projectIds.clear();
    this.dealIds.clear();
    this.portalIds.clear();
  }
}

export const testCleanup = new CleanupRegistry();
