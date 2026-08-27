import { 
  hasPermission, 
  getUserEffectivePermissions, 
  ALL_PERMISSIONS, 
  DEFAULT_ROLE_PERMISSIONS 
} from '../src/lib/domain/rbac-engine.ts';

console.log('🧪 Running Suite: Dynamic RBAC & Granular Super Admin Authority Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// Test 1: Super Admin has unconditional full access to all 23 permissions
const superAdminUser = {
  id: 'usr-admin-1',
  fullName: 'Usaid Patel (MD)',
  role: 'SUPER_ADMIN',
  customPermissionsJson: '[]',
};

const allGrantedForAdmin = ALL_PERMISSIONS.every((p) => hasPermission(superAdminUser, p.key));
assert(allGrantedForAdmin, 'Test 1.1: Super Admin has unconditional access across all 23 permissions');
assert(
  getUserEffectivePermissions(superAdminUser).length === ALL_PERMISSIONS.length,
  `Test 1.2: Effective permissions for Super Admin returns all ${ALL_PERMISSIONS.length} capabilities`
);

// Test 2: Standard Telecaller baseline behavior
const baselineTelecaller = {
  id: 'usr-tele-1',
  fullName: 'Aisha Siddiqui',
  role: 'TELECALLER',
  customPermissionsJson: '[]',
};

assert(
  hasPermission(baselineTelecaller, 'leads:create') === true,
  'Test 2.1: Telecaller default role can create leads'
);
assert(
  hasPermission(baselineTelecaller, 'leads:edit_all') === false,
  'Test 2.2: Telecaller default role is RESTRICTED from editing all lead data'
);
assert(
  hasPermission(baselineTelecaller, 'deals:view_financials') === false,
  'Test 2.3: Telecaller default role cannot view financial deals'
);

// Test 3: Super Admin dynamically grants "leads:edit_all" to Telecaller
const elevatedTelecaller = {
  id: 'usr-tele-1',
  fullName: 'Aisha Siddiqui',
  role: 'TELECALLER',
  customPermissionsJson: JSON.stringify(['leads:edit_all']),
};

assert(
  hasPermission(elevatedTelecaller, 'leads:edit_all') === true,
  'Test 3.1: Super Admin can grant "leads:edit_all" to a Telecaller with immediate effect'
);
assert(
  hasPermission(elevatedTelecaller, 'inventory:verify_rera') === false,
  'Test 3.2: Un-granted permissions remain securely restricted for the elevated Telecaller'
);

// Test 4: Super Admin grants multiple custom permissions (Inventory + Deals + Leads)
const powerTelecaller = {
  id: 'usr-tele-2',
  fullName: 'Zaid Khan',
  role: 'TELECALLER',
  customPermissionsJson: JSON.stringify([
    'leads:edit_all',
    'leads:delete',
    'inventory:verify_rera',
    'deals:create',
  ]),
};

const effective = getUserEffectivePermissions(powerTelecaller);
assert(
  effective.includes('leads:edit_all') &&
  effective.includes('leads:delete') &&
  effective.includes('inventory:verify_rera') &&
  effective.includes('deals:create'),
  'Test 4.1: Multiple custom overrides combine correctly with role baseline'
);

// Test 5: Sales Executive custom override test
const executiveWithFinancials = {
  id: 'usr-exec-1',
  fullName: 'Rahul Sharma',
  role: 'SALES_EXECUTIVE',
  customPermissionsJson: JSON.stringify(['deals:view_financials', 'leads:bulk_import']),
};

assert(
  hasPermission(executiveWithFinancials, 'deals:view_financials') === true,
  'Test 5.1: Sales Executive can be granted financial inspection privileges by Super Admin'
);
assert(
  hasPermission(executiveWithFinancials, 'leads:bulk_import') === true,
  'Test 5.2: Sales Executive can be granted spreadsheet bulk import permissions'
);

console.log('\n================================');
console.log(`RBAC Test Results: ${passed} Passed, ${failed} Failed`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
