// scripts/ego-test-suite.js
// Autonomous Full App Browser QA Suite powered by ego-browser

const screenshotsDir = "/Users/usaidpatel/Desktop/CRM/output/qa-reports/ego-screenshots";

console.log("🚀 Starting Full App Ego-Browser Testing Suite...");

const task = await taskSpace(2);
const page = task.page("p1");

const results = [];

async function recordStep(moduleName, url, actionFn) {
  const start = Date.now();
  console.log(`\n▶ [${moduleName}] Navigating to: ${url}`);
  try {
    await page.goto(url, { timeout: 30000 });
    await page.waitForLoadState("load");
    
    // Check page title and evaluate error state
    const title = await page.title();
    const currentUrl = await page.url();
    
    // Evaluate if there are visible crash error boundaries
    const pageErrors = await page.evaluate(() => {
      const errorHeading = document.querySelector('h2, h1');
      const bodyText = document.body.innerText || '';
      const hasCrash = bodyText.includes('Application error') || bodyText.includes('Internal Server Error') || bodyText.includes('Unhandled Runtime Error');
      return hasCrash ? bodyText.slice(0, 300) : null;
    });

    if (pageErrors) {
      throw new Error(`Page crash detected: ${pageErrors}`);
    }

    // Run custom interactions if provided
    let interactionResult = null;
    if (actionFn) {
      interactionResult = await actionFn(page);
    }

    const duration = Date.now() - start;
    const screenshotName = `${moduleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
    const screenshotPath = `${screenshotsDir}/${screenshotName}`;
    
    try {
      await page.screenshot({ path: screenshotPath });
    } catch (shotErr) {
      console.warn(`Screenshot warning: ${shotErr.message}`);
    }

    results.push({
      module: moduleName,
      url: currentUrl,
      title,
      durationMs: duration,
      status: "PASS",
      details: interactionResult || "Rendered successfully",
      screenshot: screenshotName,
    });
    console.log(`  ✓ ${moduleName} PASSED (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - start;
    results.push({
      module: moduleName,
      url,
      durationMs: duration,
      status: "FAIL",
      error: err.message,
    });
    console.error(`  ✗ ${moduleName} FAILED: ${err.message}`);
  }
}

// 1. Dashboard Module
await recordStep("01-Dashboard", "http://localhost:3000/", async (p) => {
  // Test telemetry buttons
  const snapshot = await p.snapshot();
  const summary = {
    hasSpeedTarget: snapshot.includes("Speed-to-Lead"),
    hasKpiCockpit: snapshot.includes("Executive Brokerage Cockpit"),
    hasFunnelGeometry: snapshot.includes("ANIMATED FUNNEL GEOMETRY"),
  };
  return `Telemetry verified: Speed Target (${summary.hasSpeedTarget}), Cockpit (${summary.hasKpiCockpit}), Funnel (${summary.hasFunnelGeometry})`;
});

// 2. Leads Module & Kanban / Table views
await recordStep("02-Leads-Overview", "http://localhost:3000/leads", async (p) => {
  const snapshot = await p.snapshot();
  return `Leads module active: snapshot length ${snapshot.length} chars`;
});

// 3. Telecaller View
await recordStep("03-Leads-Telecaller-Desk", "http://localhost:3000/leads?view=telecaller", async (p) => {
  const snapshot = await p.snapshot();
  return `Telecaller desk active: ${snapshot.includes("Speed-to-Lead") || snapshot.includes("Telecaller") || snapshot.includes("Quick Call")}`;
});

// 4. Projects & Units Inventory
await recordStep("04-Inventory", "http://localhost:3000/inventory", async (p) => {
  const snapshot = await p.snapshot();
  const hasProjects = snapshot.includes("Developer") || snapshot.includes("Projects") || snapshot.includes("RERA");
  return `Inventory grid loaded: ${hasProjects}`;
});

// 5. AI Matchmaker
await recordStep("05-Matching", "http://localhost:3000/matching", async (p) => {
  const snapshot = await p.snapshot();
  const hasPitch = snapshot.includes("Pitch") || snapshot.includes("Matchmaker") || snapshot.includes("Gemini");
  return `Matchmaker & AI Pitch loaded: ${hasPitch}`;
});

// 6. Calendar & Site Visits Agenda
await recordStep("06-Calendar", "http://localhost:3000/calendar", async (p) => {
  const snapshot = await p.snapshot();
  return `Calendar / Reminders loaded: snapshot length ${snapshot.length} chars`;
});

// 7. Site Visits Coordination
await recordStep("07-Visits", "http://localhost:3000/visits", async (p) => {
  const snapshot = await p.snapshot();
  return `Site Visits scheduling loaded: snapshot length ${snapshot.length} chars`;
});

// 8. Deals & Invoices
await recordStep("08-Deals", "http://localhost:3000/deals", async (p) => {
  const snapshot = await p.snapshot();
  return `Deals & Invoices ledger loaded: snapshot length ${snapshot.length} chars`;
});

// 9. Cost Calculator
await recordStep("09-Calculator", "http://localhost:3000/calculator", async (p) => {
  const snapshot = await p.snapshot();
  return `MahaRERA Cost Calculator loaded: snapshot length ${snapshot.length} chars`;
});

// 10. Campaigns & Attribution
await recordStep("10-Attribution", "http://localhost:3000/attribution", async (p) => {
  const snapshot = await p.snapshot();
  return `Inbound Attribution loaded: snapshot length ${snapshot.length} chars`;
});

// 11. Analytics
await recordStep("11-Analytics", "http://localhost:3000/analytics", async (p) => {
  const snapshot = await p.snapshot();
  return `Analytics & Insights loaded: snapshot length ${snapshot.length} chars`;
});

// 12. Admin & User Management
await recordStep("12-Admin-Users", "http://localhost:3000/admin/users", async (p) => {
  const snapshot = await p.snapshot();
  return `Admin Users management loaded: snapshot length ${snapshot.length} chars`;
});

// Summary Report Output
console.log("\n================================================================");
console.log("📊 EGO-BROWSER FULL APP TESTING SUMMARY");
console.log("================================================================");
const passed = results.filter(r => r.status === "PASS").length;
const failed = results.filter(r => r.status === "FAIL").length;
console.log(`Total Modules Tested: ${results.length}`);
console.log(`Passed: ${passed} | Failed: ${failed}`);

// Output JSON for reporting
console.log("\n--- JSON_REPORT_START ---");
console.log(JSON.stringify(results, null, 2));
console.log("--- JSON_REPORT_END ---");
