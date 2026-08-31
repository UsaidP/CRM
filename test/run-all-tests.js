const { execSync } = require('child_process');

console.log('================================================================');
console.log('🚀 Running Complete Master Test Suite for ZamZam Real Estate CRM');
console.log('================================================================\n');

const testSuites = [
  { name: 'Tenant Context & Isolation Coverage', file: 'test/tenant-context.test.ts' },
  { name: 'API Auth Coverage', file: 'test/api-auth-coverage.test.ts' },
  { name: 'Session Route Auth Bypass Regression', file: 'test/session-route.test.ts' },
  { name: 'Money Format', file: 'test/money-format.test.ts' },
  { name: 'Phase 1: Inventory & Cost Engine', file: 'test/run-all-tests-unit.js' },
  { name: 'Phase 1: Cloud Media, Cloudinary & Brochure Elevation/Floor Plan Extractor', file: 'test/test-cloud-media-brochure-engine.js' },
  { name: 'MahaRERA: Autonomous Registry Lookup & Certificate Engine', file: 'test/test-maharera-automation.js' },
  { name: 'Phase 2: Organic Lead Attribution & Ingestion', file: 'test/run-phase2-tests.js' },
  { name: 'Phase 2: Bulk Lead Ingestion & Stage Normalization Engine', file: 'test/run-lead-auto-adjuster-tests.js' },
  { name: 'Phase 2: Universal Multi-Format Lead Capture & Parser Engine', file: 'test/run-universal-lead-capture-tests.js' },
  { name: 'Phase 3: Requirements-to-Property Matchmaker', file: 'test/run-phase3-tests.js' },
  { name: 'Phase 4: Client Presentation Portals & Telemetry', file: 'test/run-phase4-tests.js' },
  { name: 'Phase 5 & 6: Site Visits & Deal Closing Ledger', file: 'test/run-phase5-tests.js' },
  { name: 'Phase 7: Content ROI & Conversion Analytics', file: 'test/run-phase7-tests.js' },
  { name: 'Gooey Toast Notification System & Domain Presets', file: 'test/toast.test.ts' },
];

let allPassed = true;

for (const suite of testSuites) {
  try {
    console.log(`▶ Executing ${suite.name} (${suite.file})...`);
    const isBunTest = suite.file.endsWith('.test.ts') || suite.file.endsWith('.test.js');
    execSync(isBunTest ? `bun test ${suite.file}` : `bun ${suite.file}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Suite failed: ${suite.name}`);
    allPassed = false;
    break;
  }
}

if (allPassed) {
  console.log('================================================================');
  console.log('🎉 ALL 8 TEST SUITES & NOTIFICATION PRESETS PASSED CLEANLY');
  console.log('================================================================\n');
} else {
  process.exit(1);
}
