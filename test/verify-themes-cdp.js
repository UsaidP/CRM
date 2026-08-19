import { spawn } from 'child_process';

const BRAVE_BIN = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const ARTIFACTS_DIR = '/Users/usaidpatel/.gemini/antigravity-ide/brain/b1e8d293-ff3e-4f34-b845-69349c4dfb96';

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    await Bun.write(filePath, buffer);
  }

  close() {
    this.ws.close();
  }
}

async function runThemeVerification() {
  console.log('🚀 Starting Automated Theme Verification via Brave Browser CDP...');

  // 1. Launch Brave with Remote Debugging
  const braveProcess = spawn(BRAVE_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1440,1080',
    'about:blank',
  ]);

  // Wait for CDP to be up
  let version = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:9222/json/version');
      if (res.ok) {
        version = await res.json();
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (!version) {
    throw new Error('Failed to connect to Brave CDP port 9222');
  }

  // Create a new target page
  const newPageRes = await fetch('http://localhost:9222/json/new?http://localhost:3000', { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  const client = new CDPClient(wsUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');
  await client.send('CSS.enable');

  // Wait for page load
  console.log('⏳ Navigating to http://localhost:3000...');
  await client.send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise((r) => setTimeout(r, 3000));

  // Check 1: Verify theme toggle buttons exist
  console.log('\n🔍 [CHECK 1] Verifying Theme Toggle Buttons (Gold, Mono, Cobalt)...');
  const toggleButtons = await client.evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('.theme-toggle button, .theme-toggle__button'));
      return buttons.map(b => ({
        text: b.textContent.trim(),
        ariaPressed: b.getAttribute('aria-pressed'),
        className: b.className,
        title: b.getAttribute('title')
      }));
    })()
  `);
  console.log('Found buttons:', JSON.stringify(toggleButtons, null, 2));

  const hasGold = toggleButtons.some(b => b.text.includes('Gold'));
  const hasMono = toggleButtons.some(b => b.text.includes('Mono'));
  const hasCobalt = toggleButtons.some(b => b.text.includes('Cobalt'));

  console.log(`✅ Gold Button Present: ${hasGold}`);
  console.log(`✅ Mono Button Present: ${hasMono}`);
  console.log(`✅ Cobalt Button Present: ${hasCobalt}`);

  // Check 2: Click 'Cobalt' and verify styles
  console.log('\n🎨 [CHECK 2] Clicking "Cobalt" Theme...');
  await client.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cobalt'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  const cobaltStyles = await client.evaluate(`
    (() => {
      const root = document.documentElement;
      const themeRoot = document.querySelector('.theme-root');
      const activeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cobalt'));
      const card = document.querySelector('.kpi-card, .metric-card, table, aside') || document.body;
      const comp = getComputedStyle(document.body);
      return {
        htmlClass: root.className,
        dataTheme: root.getAttribute('data-theme') || themeRoot?.getAttribute('data-theme'),
        localStorage: localStorage.getItem('zamzam-theme'),
        btnAriaPressed: activeBtn?.getAttribute('aria-pressed'),
        canvasBg: comp.getPropertyValue('--color-canvas'),
        accentColor: comp.getPropertyValue('--color-accent'),
        fontDisplay: comp.getPropertyValue('--font-display')
      };
    })()
  `);
  console.log('Cobalt state:', cobaltStyles);
  await client.screenshot(`${ARTIFACTS_DIR}/theme_cobalt_applied.png`);
  console.log('📸 Captured screenshot: theme_cobalt_applied.png');

  // Check 3: Click 'Mono' and verify styles
  console.log('\n🎨 [CHECK 3] Clicking "Mono" Theme...');
  await client.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mono'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  const monoStyles = await client.evaluate(`
    (() => {
      const root = document.documentElement;
      const themeRoot = document.querySelector('.theme-root');
      const activeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mono'));
      const comp = getComputedStyle(document.body);
      return {
        htmlClass: root.className,
        dataTheme: root.getAttribute('data-theme') || themeRoot?.getAttribute('data-theme'),
        localStorage: localStorage.getItem('zamzam-theme'),
        btnAriaPressed: activeBtn?.getAttribute('aria-pressed'),
        canvasBg: comp.getPropertyValue('--color-canvas'),
        fontDisplay: comp.getPropertyValue('--font-display')
      };
    })()
  `);
  console.log('Mono state:', monoStyles);
  await client.screenshot(`${ARTIFACTS_DIR}/theme_mono_applied.png`);
  console.log('📸 Captured screenshot: theme_mono_applied.png');

  // Check 4: Click 'Gold' and verify styles
  console.log('\n🎨 [CHECK 4] Clicking "Gold" Theme...');
  await client.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Gold'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  const goldStyles = await client.evaluate(`
    (() => {
      const root = document.documentElement;
      const themeRoot = document.querySelector('.theme-root');
      const activeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Gold'));
      const comp = getComputedStyle(document.body);
      return {
        htmlClass: root.className,
        dataTheme: root.getAttribute('data-theme') || themeRoot?.getAttribute('data-theme'),
        localStorage: localStorage.getItem('zamzam-theme'),
        btnAriaPressed: activeBtn?.getAttribute('aria-pressed'),
        canvasBg: comp.getPropertyValue('--color-canvas'),
        fontDisplay: comp.getPropertyValue('--font-display')
      };
    })()
  `);
  console.log('Gold state:', goldStyles);
  await client.screenshot(`${ARTIFACTS_DIR}/theme_gold_applied.png`);
  console.log('📸 Captured screenshot: theme_gold_applied.png');

  // Check 5: Click 'Cobalt' again to keep active
  console.log('\n🎨 [CHECK 5] Clicking "Cobalt" again to keep active...');
  await client.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cobalt'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  const finalCobalt = await client.evaluate(`
    (() => {
      const root = document.documentElement;
      const themeRoot = document.querySelector('.theme-root');
      return {
        htmlClass: root.className,
        dataTheme: root.getAttribute('data-theme') || themeRoot?.getAttribute('data-theme'),
        localStorage: localStorage.getItem('zamzam-theme')
      };
    })()
  `);
  console.log('Final active theme state:', finalCobalt);
  await client.screenshot(`${ARTIFACTS_DIR}/theme_cobalt_final_active.png`);
  console.log('📸 Captured screenshot: theme_cobalt_final_active.png');

  // Check 6: Inspect UI components under Cobalt for visual bugs
  console.log('\n🔍 [CHECK 6] Inspecting Cards, Sidebar, Tables, and Controls under Cobalt...');
  const inspection = await client.evaluate(`
    (() => {
      const sidebar = document.querySelector('aside, .app-sidebar');
      const tables = Array.from(document.querySelectorAll('table'));
      const cards = Array.from(document.querySelectorAll('.card, [class*="rounded-xl"], [class*="bg-[#12151f]"]'));
      const buttons = Array.from(document.querySelectorAll('button, input, select'));
      
      return {
        sidebarPresent: !!sidebar,
        tableCount: tables.length,
        cardCount: cards.length,
        interactiveElementsCount: buttons.length,
        themeRootClass: document.querySelector('.theme-root')?.className,
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        sidebarBg: sidebar ? window.getComputedStyle(sidebar).backgroundColor : null
      };
    })()
  `);
  console.log('UI Element Inspection under Cobalt:', inspection);

  client.close();
  braveProcess.kill();
  console.log('\n🎉 Theme Verification Checklist Completed Successfully!');
}

runThemeVerification().catch((err) => {
  console.error('❌ Verification Error:', err);
  process.exit(1);
});
