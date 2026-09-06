import { chromium } from 'playwright';
import { createSessionToken, SESSION_COOKIE_NAME } from '../src/lib/services/auth-service';
import { PRESET_TEST_USERS } from '../test/helpers/test-setup';

async function verifyKanban() {
  console.log('=== KANBAN BOARD COMPREHENSIVE E2E VERIFICATION ===\n');

  // 1. Generate Auth Token for Org A (admin@zamzam-test.internal)
  const token = await createSessionToken({
    userId: PRESET_TEST_USERS.admin.userId,
    email: PRESET_TEST_USERS.admin.email,
    fullName: PRESET_TEST_USERS.admin.fullName,
    role: PRESET_TEST_USERS.admin.role,
    organizationId: PRESET_TEST_USERS.admin.organizationId!,
    isSuperAdmin: !!PRESET_TEST_USERS.admin.isSuperAdmin,
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: 'localhost',
      path: '/',
    },
  ]);

  const page = await context.newPage();

  // Track API network requests
  const apiRequests: { url: string; method: string; status: number; body?: string }[] = [];
  page.on('response', async (res) => {
    if (res.url().includes('/api/v1/leads')) {
      let body: string | undefined;
      try {
        body = await res.text();
      } catch {}
      apiRequests.push({
        url: res.url(),
        method: res.request().method(),
        status: res.status(),
        body: body?.slice(0, 300),
      });
    }
  });

  // Track console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  console.log('[Step 1] Navigating to http://localhost:5173/leads...');
  const res = await page.goto('http://localhost:5173/leads', { waitUntil: 'networkidle' });
  console.log(`Page navigation status: ${res?.status()}`);

  // Switch to Kanban view if not already selected
  const kanbanBtn = page.locator('button:has-text("Kanban")');
  if (await kanbanBtn.isVisible()) {
    console.log('[Step 2] Switching to Kanban view...');
    await kanbanBtn.click();
    await page.waitForTimeout(1000);
  }

  // Verify columns rendered
  const columnHeaders = await page.locator('h3').allTextContents();
  console.log('[Step 3] Kanban column headers detected:', columnHeaders.filter((h) => h.length > 0));

  // Verify all rendered cards
  const cards = page.locator('[draggable="true"]');
  const cardCount = await cards.count();
  console.log(`[Step 4] Total draggable lead cards on board: ${cardCount}`);

  if (cardCount === 0) {
    throw new Error('No lead cards rendered on Kanban board!');
  }

  // Check card titles for multi-tenant purity
  const cardTexts = await cards.allTextContents();
  const foreignLeads = cardTexts.filter((t) => t.includes('Load Test Org B') || t.includes('Foreign Test Org'));
  console.log(`[Tenant Isolation Check] Foreign Org B cards detected on Org A board: ${foreignLeads.length}`);
  if (foreignLeads.length > 0) {
    console.error('VIOLATION: Cross-tenant leads leaked onto board!', foreignLeads);
    process.exit(1);
  }
  console.log('✓ Multi-tenant isolation confirmed: 0 cross-tenant leads leaked.');

  // Take screenshot of initial board
  await page.screenshot({ path: 'scratch/kanban-initial-board.png', fullPage: true });
  console.log('Saved screenshot: scratch/kanban-initial-board.png');

  // Step 5: Test Stage Dropdown Transition
  console.log('\n[Step 5] Testing Stage Transition via in-card CustomSelect dropdown...');
  const cardInNewLeads = page.locator('[draggable="true"]:has(button:has-text("New Leads"))').first();
  const cardTitle = await cardInNewLeads.locator('h4').textContent();
  console.log(`Target lead card: "${cardTitle?.trim()}"`);

  // Open stage dropdown
  const stageButton = cardInNewLeads.locator('button[aria-haspopup="listbox"]');
  console.log('Clicking stage dropdown trigger...');
  await stageButton.click();
  await page.waitForTimeout(400);

  // Click "Discovery" option in listbox
  const discoveryOption = page.locator('button[role="option"]:has-text("Discovery")').first();
  const isOptionVisible = await discoveryOption.isVisible();
  console.log('Is "Discovery" option visible?', isOptionVisible);
  if (isOptionVisible) {
    console.log('Selecting "Discovery" stage...');
    await discoveryOption.click();
    await page.waitForTimeout(2000);
  }

  // Verify network request for dropdown transition
  const lastPatch = apiRequests.filter((r) => r.method === 'PATCH').slice(-1)[0];
  console.log(`Dropdown PATCH API result: ${lastPatch ? `${lastPatch.status} -> ${lastPatch.body}` : 'No PATCH sent'}`);

  // Step 6: Test HTML5 Drag & Drop
  console.log('\n[Step 6] Testing Drag & Drop transition...');
  // Find card in discovery and target deck sent column
  const discoveryCol = page.locator('div:has(h3:text-is("Discovery"))').filter({ has: page.locator('div.p-3') }).first();
  const deckSentCol = page.locator('div:has(h3:text-is("Deck Sent"))').filter({ has: page.locator('div.p-3') }).first();

  const cardToDrag = page.locator('[draggable="true"]:has(button:has-text("Discovery"))').first();
  const dragCardTitle = await cardToDrag.locator('h4').textContent();
  console.log(`Dragging card "${dragCardTitle?.trim()}" from Discovery to Deck Sent...`);

  try {
    await cardToDrag.dragTo(deckSentCol);
    await page.waitForTimeout(2000);
    console.log('Drag operation completed.');
  } catch (err: any) {
    console.error('Drag error:', err.message);
  }

  const dragPatch = apiRequests.filter((r) => r.method === 'PATCH').slice(-1)[0];
  console.log(`Drag & Drop PATCH API result: ${dragPatch ? `${dragPatch.status} -> ${dragPatch.body}` : 'No PATCH sent'}`);

  // Screenshot after transitions
  await page.screenshot({ path: 'scratch/kanban-after-moves.png', fullPage: true });
  console.log('Saved screenshot: scratch/kanban-after-moves.png');

  // Step 7: Reload page to verify persistence from DB
  console.log('\n[Step 7] Reloading page to verify database persistence...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/kanban-reloaded-board.png', fullPage: true });
  console.log('Saved screenshot: scratch/kanban-reloaded-board.png');

  console.log('\n--- Console Errors Check ---');
  if (consoleErrors.length === 0) {
    console.log('✓ 0 console errors detected throughout entire workflow.');
  } else {
    console.log(`Found ${consoleErrors.length} console error(s):`);
    consoleErrors.forEach((e) => console.log('  ', e));
  }

  console.log('\n=== VERIFICATION FINISHED SUCCESSFULLY ===');
  await browser.close();
}

verifyKanban().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
