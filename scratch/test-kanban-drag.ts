import { chromium } from 'playwright';
import { createSessionToken, SESSION_COOKIE_NAME } from '../src/lib/services/auth-service';
import { PRESET_TEST_USERS } from '../test/helpers/test-setup';

async function main() {
  const token = await createSessionToken({
    userId: PRESET_TEST_USERS.admin.userId,
    email: PRESET_TEST_USERS.admin.email,
    fullName: PRESET_TEST_USERS.admin.fullName,
    role: PRESET_TEST_USERS.admin.role,
    organizationId: PRESET_TEST_USERS.admin.organizationId!,
    isSuperAdmin: PRESET_TEST_USERS.admin.isSuperAdmin,
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

  const networkRequests: { url: string; method: string; status: number; body?: string }[] = [];
  page.on('response', async (res) => {
    if (res.url().includes('/api/v1/leads')) {
      let body: string | undefined;
      try {
        body = await res.text();
      } catch {}
      networkRequests.push({
        url: res.url(),
        method: res.request().method(),
        status: res.status(),
        body: body?.slice(0, 200),
      });
    }
  });

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:5173/leads', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('--- Testing Stage Mover Dropdown on First Card ---');
  const firstCard = page.locator('[draggable="true"]').first();
  const cardTitle = await firstCard.locator('h4').textContent();
  console.log(`First card buyer: ${cardTitle}`);

  // Open CustomSelect on first card
  const stageButton = firstCard.locator('button:has-text("New Leads")');
  console.log('Clicking stage dropdown button...');
  await stageButton.click();
  await page.waitForTimeout(500);

  // Look for dropdown options
  const optionDiscovery = page.locator('div[role="menuitem"]:has-text("Discovery"), button:has-text("Discovery"), [role="option"]:has-text("Discovery")').first();
  const isOptionVisible = await optionDiscovery.isVisible();
  console.log('Is "Discovery" option visible in dropdown?', isOptionVisible);

  if (isOptionVisible) {
    console.log('Clicking "Discovery" option...');
    await optionDiscovery.click();
    await page.waitForTimeout(2000);
  }

  console.log('--- Testing Drag & Drop using locator.dragTo() ---');
  const cardToDrag = page.locator('[draggable="true"]').first();
  // Target the Discovery column (column 2)
  const discoveryCol = page.locator('div:has(> div > div > h3:has-text("Discovery"))').first();
  console.log('Discovery column visible?', await discoveryCol.isVisible());

  try {
    console.log('Executing cardToDrag.dragTo(discoveryCol)...');
    await cardToDrag.dragTo(discoveryCol);
    await page.waitForTimeout(2000);
    console.log('dragTo completed.');
  } catch (err: any) {
    console.error('dragTo threw error:', err.message);
  }

  console.log('\n--- Relevant API Network Requests ---');
  networkRequests.forEach((req) => {
    console.log(`  ${req.method} ${req.url} -> Status ${req.status}`);
    if (req.body) console.log(`    Body preview: ${req.body.slice(0, 120)}`);
  });

  console.log('\n--- Console Warnings / Errors ---');
  consoleErrors.forEach((e) => console.log('  ', e));

  await browser.close();
}

main().catch(console.error);
