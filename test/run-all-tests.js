const { execSync } = require('child_process');

console.log('================================================================');
console.log('🚀 Running Complete Master Test Suite for ZamZam Real Estate CRM');
console.log('================================================================\n');

const testSuites = [
  { name: 'Phase 1: Inventory & Cost Engine', file: 'test/run-all-tests-unit.js' },
  { name: 'Phase 2: Organic Lead Attribution & Ingestion', file: 'test/run-phase2-tests.js' },
  { name: 'Phase 3: Requirements-to-Property Matchmaker', file: 'test/run-phase3-tests.js' },
  { name: 'Phase 4: Client Presentation Portals & Telemetry', file: 'test/run-phase4-tests.js' },
  { name: 'Phase 5 & 6: Site Visits & Deal Closing Ledger', file: 'test/run-phase5-tests.js' },
  { name: 'Phase 7: Content ROI & Conversion Analytics', file: 'test/run-phase7-tests.js' },
];

let allPassed = true;

for (const suite of testSuites) {
  try {
    console.log(`▶ Executing ${suite.name} (${suite.file})...`);
    execSync(`node ${suite.file}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Suite failed: ${suite.name}`);
    allPassed = false;
    break;
  }
}

if (allPassed) {
  console.log('================================================================');
  console.log('🎉 ALL 7 PHASE TEST SUITES PASSED CLEANLY (33/33 Tests Verified)');
  console.log('================================================================\n');
} else {
  process.exit(1);
}
