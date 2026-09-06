import { chromium } from 'playwright';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Starting Headless Playwright Dashboard Audit...');

  const user = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    include: { organization: true },
  });

  if (!user) {
    throw new Error('No SUPER_ADMIN user found in database.');
  }

  console.log(`👤 Using user: ${user.email} (Org: ${user.organizationId})`);

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as any,
    organizationId: user.organizationId,
    teamId: user.teamId,
    isSuperAdmin: true,
  });

  const screenshotsDir = path.join(process.cwd(), 'public', 'qa-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  console.log('🌐 Navigating to http://localhost:3000 ...');
  const response = await page.goto('http://localhost:3000', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  console.log(`HTTP Status: ${response?.status()}`);
  console.log(`Current URL: ${page.url()}`);

  if (page.url().includes('/login')) {
    throw new Error('Session cookie not accepted, redirected to /login');
  }

  // 1. Check title & headers
  await page.waitForSelector('h1', { timeout: 10000 });
  const title = await page.locator('h1').textContent();
  console.log(`✓ Dashboard H1: "${title?.trim()}"`);

  // 2. Take initial dashboard screenshot (Funnel Tab)
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-headless-funnel.png'), fullPage: true });
  console.log('📸 Captured: dashboard-headless-funnel.png');

  // 3. Test Tab: Cash Flow Curve
  console.log('🖱️ Switching to Cash Flow Curve tab...');
  const cashflowBtn = page.locator('button', { hasText: 'Cash Flow Curve' });
  await cashflowBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-headless-cashflow.png'), fullPage: true });
  console.log('📸 Captured: dashboard-headless-cashflow.png');

  // 4. Test Tab: Market Depth
  console.log('🖱️ Switching to Market Depth tab...');
  const marketBtn = page.locator('button', { hasText: 'Market Depth' });
  await marketBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-headless-market.png'), fullPage: true });
  console.log('📸 Captured: dashboard-headless-market.png');

  // 5. Test Tab: Speed SLA
  console.log('🖱️ Switching to Speed SLA tab...');
  const slaBtn = page.locator('button', { hasText: 'Speed SLA' });
  await slaBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-headless-sla.png'), fullPage: true });
  console.log('📸 Captured: dashboard-headless-sla.png');

  // 6. Test Micro-Market Filtering
  console.log('🖱️ Testing Micro-Market Selector...');
  const marketSelect = page.locator('select');
  if (await marketSelect.count() > 0) {
    await marketSelect.selectOption('KHARGHAR');
    await page.waitForTimeout(800);
    console.log('✓ Switched market to KHARGHAR');
    await marketSelect.selectOption('ALL');
    await page.waitForTimeout(500);
  }

  // 7. Test Time Range Filters (7D, 30D, Today, All)
  console.log('🖱️ Testing Time Range Filters...');
  await page.locator('button', { hasText: 'Last 7D' }).click();
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: 'Last 30D' }).click();
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: 'All Time' }).click();
  await page.waitForTimeout(500);

  // 7. Check if any errors occurred during interactions
  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`Page Errors: ${pageErrors.length}`);
  if (pageErrors.length > 0) {
    console.error('❌ Page Errors encountered:', pageErrors);
  } else {
    console.log('✓ Zero page errors!');
  }

  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.warn('⚠️ Console Errors encountered:', consoleErrors);
  } else {
    console.log('✓ Zero console errors!');
  }

  await browser.close();

  if (pageErrors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during headless audit:', err);
  process.exit(1);
});
