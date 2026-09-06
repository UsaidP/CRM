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

  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    consoleMessages.push(`[Page Error] ${err.message}\n${err.stack}`);
  });

  console.log('Navigating directly to http://localhost:5173/leads with auth cookie...');
  const res = await page.goto('http://localhost:5173/leads', { waitUntil: 'networkidle' });
  console.log('Page response status:', res?.status());
  console.log('Current URL:', page.url());

  await page.waitForTimeout(1500);

  // Check which view mode button is pressed
  const viewButtons = await page.locator('button[aria-pressed]').all();
  for (const btn of viewButtons) {
    const text = await btn.textContent();
    const pressed = await btn.getAttribute('aria-pressed');
    console.log(`View button: "${text?.trim()}" aria-pressed=${pressed}`);
  }

  // Click on Kanban if not already selected
  const kanbanBtn = page.locator('button:has-text("Kanban")');
  if (await kanbanBtn.isVisible()) {
    console.log('Clicking Kanban view button...');
    await kanbanBtn.click();
    await page.waitForTimeout(1000);
  }

  // Take full-page screenshot
  await page.screenshot({ path: 'scratch/kanban-leads-view.png', fullPage: true });
  console.log('Saved screenshot to scratch/kanban-leads-view.png');

  // Check columns rendered
  const columnHeaders = await page.locator('h3').allTextContents();
  console.log('Kanban Column Headers:', columnHeaders);

  // Check total cards
  const cards = page.locator('[draggable="true"]');
  const cardCount = await cards.count();
  console.log(`Total Draggable Cards Rendered: ${cardCount}`);

  // Inspect stage filters / selects
  const stageSelect = page.locator('select, [role="combobox"]');
  console.log('Combobox/Select count:', await stageSelect.count());

  // Test dragging a card to another stage
  if (cardCount > 0) {
    const firstCard = cards.first();
    const cardText = await firstCard.textContent();
    console.log('First card text preview:', cardText?.slice(0, 100));

    // Try moving stage via the in-card stage mover dropdown
    console.log('Testing in-card stage mover dropdown...');
    // Look for CustomSelect on the card
    const cardMover = firstCard.locator('button').last();
    if (await cardMover.isVisible()) {
      console.log('Clicking in-card stage mover button:', await cardMover.textContent());
      await cardMover.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'scratch/kanban-dropdown-open.png' });
    }
  }

  console.log('\n--- Console Logs Collected ---');
  consoleMessages.forEach((m) => console.log(m));

  await browser.close();
}

main().catch(console.error);
