import { chromium } from 'playwright';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Starting Multi-Viewport Responsive Headless Dashboard Audit...');

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

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const overflowIssues: string[] = [];

  const viewports = [
    { name: 'mobile', width: 390, height: 844, isMobile: true },
    { name: 'tablet', width: 768, height: 1024, isMobile: false },
    { name: 'desktop', width: 1440, height: 900, isMobile: false },
  ];

  for (const vp of viewports) {
    console.log(`\n📱 Auditing Viewport: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
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

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${vp.name}] ${msg.text()}`);
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(`[${vp.name}] ${err.message}`);
    });

    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('h1', { timeout: 10000 });

    // Check for horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);

    if (hasHorizontalOverflow) {
      const diff = scrollWidth - innerWidth;
      const msg = `Horizontal overflow detected on ${vp.name}: scrollWidth=${scrollWidth}px > innerWidth=${innerWidth}px (+${diff}px overflow)`;
      console.error(`❌ ${msg}`);
      overflowIssues.push(msg);
    } else {
      console.log(`✓ Zero horizontal overflow on ${vp.name} (scrollWidth=${scrollWidth}px, innerWidth=${innerWidth}px)`);
    }

    // Capture tab 1: Funnel
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, `dashboard-${vp.name}-funnel.png`),
      fullPage: true,
    });
    console.log(`📸 Captured: dashboard-${vp.name}-funnel.png`);

    // Tab 2: Cash Flow
    const cashflowBtn = page.locator('button', { hasText: 'Cash Flow Curve' });
    if (await cashflowBtn.count() > 0) {
      await cashflowBtn.scrollIntoViewIfNeeded();
      await cashflowBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(screenshotsDir, `dashboard-${vp.name}-cashflow.png`),
        fullPage: true,
      });
      console.log(`📸 Captured: dashboard-${vp.name}-cashflow.png`);
    }

    // Tab 3: Market Depth
    const marketBtn = page.locator('button', { hasText: 'Market Depth' });
    if (await marketBtn.count() > 0) {
      await marketBtn.scrollIntoViewIfNeeded();
      await marketBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(screenshotsDir, `dashboard-${vp.name}-market.png`),
        fullPage: true,
      });
      console.log(`📸 Captured: dashboard-${vp.name}-market.png`);
    }

    // Tab 4: Speed SLA
    const slaBtn = page.locator('button', { hasText: 'Speed SLA' });
    if (await slaBtn.count() > 0) {
      await slaBtn.scrollIntoViewIfNeeded();
      await slaBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(screenshotsDir, `dashboard-${vp.name}-sla.png`),
        fullPage: true,
      });
      console.log(`📸 Captured: dashboard-${vp.name}-sla.png`);
    }

    await context.close();
  }

  await browser.close();

  console.log('\n================ AUDIT SUMMARY ================');
  console.log(`Horizontal Overflow Issues: ${overflowIssues.length}`);
  if (overflowIssues.length > 0) {
    overflowIssues.forEach((issue) => console.error(`  ❌ ${issue}`));
  } else {
    console.log('✓ Zero horizontal overflow across ALL viewports (Mobile, Tablet, Desktop)!');
  }

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

  if (pageErrors.length > 0 || overflowIssues.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during headless audit:', err);
  process.exit(1);
});
