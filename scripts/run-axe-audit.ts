import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  { path: '/login', requiresAuth: false },
  { path: '/', requiresAuth: true },
  { path: '/leads', requiresAuth: true },
  { path: '/calendar', requiresAuth: true },
  { path: '/inventory', requiresAuth: true },
  { path: '/matching', requiresAuth: true },
  { path: '/portals', requiresAuth: true },
  { path: '/visits', requiresAuth: true },
  { path: '/deals', requiresAuth: true },
  { path: '/calculator', requiresAuth: true },
  { path: '/attribution', requiresAuth: true },
  { path: '/analytics', requiresAuth: true },
  { path: '/admin/users', requiresAuth: true }
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('=== AXE-CORE RAW AUDIT RUN START ===\n');

  // 1. Audit /login before logging in
  console.log('--- ROUTE: /login ---');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
  const loginResults = await new AxeBuilder({ page }).analyze();
  console.log(JSON.stringify({
    route: '/login',
    url: page.url(),
    violationCount: loginResults.violations.length,
    violations: loginResults.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map(n => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary
      }))
    }))
  }, null, 2));

  // 2. Perform Login to obtain authenticated session
  console.log('\nAuthenticating as Super Admin...');
  await page.fill('input[type="email"], input[name="email"]', 'usaid@zamzamproperties.in');
  await page.fill('input[type="password"], input[name="password"]', 'ZamZam@2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  console.log('Authentication successful. Current URL:', page.url());

  // 3. Audit all internal navigation routes
  for (const item of ROUTES) {
    if (item.path === '/login') continue;

    console.log(`\n--- ROUTE: ${item.path} ---`);
    try {
      await page.goto(`http://localhost:5173${item.path}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
      // Wait 2.5s for client hydration and render to settle
      await page.waitForTimeout(2500);

      const auditResults = await new AxeBuilder({ page }).analyze();
      console.log(JSON.stringify({
        route: item.path,
        url: page.url(),
        violationCount: auditResults.violations.length,
        violations: auditResults.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.map(n => ({
            html: n.html,
            target: n.target,
            failureSummary: n.failureSummary
          }))
        }))
      }, null, 2));
    } catch (err: any) {
      console.log(JSON.stringify({
        route: item.path,
        error: err?.message || String(err)
      }, null, 2));
    }
  }

  await browser.close();
  console.log('\n=== AXE-CORE RAW AUDIT RUN COMPLETE ===');
}

main().catch(err => {
  console.error('Fatal error during axe audit:', err);
  process.exit(1);
});
