const { chromium } = require('/Users/usaidpatel/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core');

const executablePath = '/Users/usaidpatel/Library/Caches/ms-playwright/chromium-1234/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const routes = ['/', '/leads', '/inventory', '/matching', '/portals', '/visits', '/deals', '/attribution', '/analytics', '/calculator'];
const widths = [320, 375, 414, 768, 1440];

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 1000 } });
  const results = [];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      results.push(await page.evaluate(() => ({
        path: location.pathname,
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        mainWidth: document.querySelector('.app-main')?.scrollWidth ?? null,
        activeRoute: document.querySelector('[aria-current="page"]')?.textContent?.trim() ?? null,
        mobileHeader: getComputedStyle(document.querySelector('.app-mobile-header')).display,
      })));
    }
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
