const { execSync } = require('child_process');

console.log('================================================================');
console.log('🚀 Running Complete Master Test Suite for ZamZam Real Estate CRM');
console.log('================================================================\n');

const testSuites = [
  // 1. Core Invariants & Tenant Safety
  { category: 'Invariants', name: 'Tenant Context & Isolation Coverage', file: 'test/tenant-context.test.ts' },
  { category: 'Invariants', name: 'API Auth Guard Coverage Invariant', file: 'test/api-auth-coverage.test.ts' },
  { category: 'Invariants', name: 'Session Route Auth Bypass Regression', file: 'test/session-route.test.ts' },

  // 2. Unit Tests
  { category: 'Unit', name: 'RBAC Engine & Dynamic Overrides', file: 'test/unit/rbac-engine.test.ts' },
  { category: 'Unit', name: 'Zod Schemas & Request Validators', file: 'test/unit/validators.test.ts' },
  { category: 'Unit', name: 'Universal Lead File Parser (CSV/XLSX/TSV)', file: 'test/unit/lead-file-parser.test.ts' },
  { category: 'Unit', name: 'Lead Auto-Adjuster & Stage Normalizer', file: 'test/unit/lead-auto-adjuster.test.ts' },
  { category: 'Unit', name: 'Prioritization & Connect Next Algorithm', file: 'test/unit/prioritization-engine.test.ts' },
  { category: 'Unit', name: 'Domain Models & Real Estate Calculations', file: 'test/crm.test.js' },
  { category: 'Unit', name: 'Indian Rupee & Financial Currency Formats', file: 'test/money-format.test.ts' },
  { category: 'Unit', name: 'Gooey Toast Notification System Presets', file: 'test/toast.test.ts' },

  // 3. Security Tests
  { category: 'Security', name: 'OWASP Security Headers Audit', file: 'test/security/header-audit.test.ts' },
  { category: 'Security', name: 'Auth Bypass & Signature Tampering Defense', file: 'test/security/auth-bypass.test.ts' },
  { category: 'Security', name: 'SQL Injection & XSS Payload Prevention', file: 'test/security/injection-prevention.test.ts' },
  { category: 'Security', name: 'RBAC Privilege Escalation Bounds', file: 'test/security/rbac-escalation.test.ts' },

  // 4. Overnight QA & Claims vs Reality
  { category: 'Overnight', name: 'Claims vs Reality Architectural Audit', file: 'test/overnight/claims-vs-reality.test.ts' },
  { category: 'Overnight', name: 'Overnight Autonomous QA & Triage Generator', file: 'test/overnight/overnight-qa-suite.test.ts' },

  // 5. Phase Feature Integration Suites
  { category: 'Integration', name: 'Phase 1: Inventory & Statutory Cost Engine', file: 'test/run-all-tests-unit.js' },
  { category: 'Integration', name: 'Phase 1: Cloud Media & Brochure Extractor', file: 'test/test-cloud-media-brochure-engine.js' },
  { category: 'Integration', name: 'MahaRERA: Autonomous Registry Lookup', file: 'test/test-maharera-automation.js' },
  { category: 'Integration', name: 'Phase 2: Organic Lead Attribution & Ingestion', file: 'test/run-phase2-tests.js' },
  { category: 'Integration', name: 'Phase 2: Bulk Stage Normalization', file: 'test/run-lead-auto-adjuster-tests.js' },
  { category: 'Integration', name: 'Phase 2: Universal Multi-Format Lead Capture', file: 'test/run-universal-lead-capture-tests.js' },
  { category: 'Integration', name: 'Phase 3: Requirements-to-Property Matchmaker', file: 'test/run-phase3-tests.js' },
  { category: 'Integration', name: 'Phase 4: Client Presentation Portals & Telemetry', file: 'test/run-phase4-tests.js' },
  { category: 'Integration', name: 'Phase 5 & 6: Site Visits & Deal Closing Ledger', file: 'test/run-phase5-tests.js' },
  { category: 'Integration', name: 'Phase 7: Content ROI & Conversion Analytics', file: 'test/run-phase7-tests.js' },
];

let passedCount = 0;
let failedCount = 0;

for (const suite of testSuites) {
  try {
    console.log(`▶ [${suite.category}] Executing ${suite.name} (${suite.file})...`);
    const isBunTest = suite.file.endsWith('.test.ts') || suite.file.endsWith('.test.js');
    execSync(isBunTest ? `bun test ${suite.file}` : `bun ${suite.file}`, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`❌ Suite failed: ${suite.name} (${suite.file})`);
    failedCount++;
    break;
  }
}

console.log('\n================================================================');
if (failedCount === 0) {
  console.log(`🎉 ALL ${passedCount} TEST SUITES PASSED CLEANLY (100% SUCCESS)`);
} else {
  console.log(`❌ TEST SUITE FAILURE: ${passedCount} passed, ${failedCount} failed`);
}
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
