import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const BRAVE_BIN = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const ARTIFACTS_DIR = '/Users/usaidpatel/.gemini/antigravity-ide/brain/03952f81-c408-4223-af28-d92673cc8d6d';

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

  async setViewport(width, height, isMobile = true, deviceScaleFactor = 2) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: isMobile,
    });
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

async function runMobileAudit() {
  console.log('🚀 Launching headless browser for Mobile Responsiveness Testing...');
  
  const browserProcess = spawn(BRAVE_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=390,844',
    'about:blank',
  ]);

  let version = null;
  for (let i = 0; i < 30; i++) {
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
    console.error('❌ Failed to connect to browser CDP on port 9222.');
    browserProcess.kill();
    process.exit(1);
  }

  console.log('✅ Connected to Browser CDP:', version.Browser);

  const newPageRes = await fetch('http://localhost:9222/json/new?http://localhost:3000/leads', { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  const testViewports = [
    { name: 'iPhone_SE_320px', width: 320, height: 568 },
    { name: 'iPhone_13_390px', width: 390, height: 844 },
    { name: 'iPhone_15_Pro_Max_430px', width: 430, height: 932 },
  ];

  const testPages = [
    { url: 'http://localhost:3000/leads', name: 'leads_matrix', title: 'Leads Matrix & Workstation' },
    { url: 'http://localhost:3000/inventory', name: 'inventory_units', title: 'Inventory & Units' },
    { url: 'http://localhost:3000/calculator', name: 'cost_calculator', title: 'Statutory Cost Sheet' },
    { url: 'http://localhost:3000/deals', name: 'deals_ledger', title: 'Deals & Commission Pipeline' },
    { url: 'http://localhost:3000/matching', name: 'matching_console', title: 'Property Matchmaker' },
    { url: 'http://localhost:3000/visits', name: 'site_visits', title: 'Site Visit Tours' },
    { url: 'http://localhost:3000/calendar', name: 'calendar_agenda', title: 'Calendar & Schedule Desk' },
  ];

  const auditResults = [];

  for (const vp of testViewports) {
    console.log(`\n📱 --- TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) ---`);
    await client.setViewport(vp.width, vp.height);

    for (const p of testPages) {
      console.log(`  🌐 Navigating to ${p.title} (${p.url})...`);
      await client.send('Page.navigate', { url: p.url });
      await new Promise((r) => setTimeout(r, 2000));

      // Measure layout metrics
      const metrics = await client.evaluate(`
        (() => {
          const body = document.body;
          const docEl = document.documentElement;
          const scrollWidth = Math.max(body.scrollWidth, docEl.scrollWidth);
          const clientWidth = docEl.clientWidth;
          const hasHorizontalOverflow = scrollWidth > clientWidth + 2;
          const touchTargets = Array.from(document.querySelectorAll('button, a, input, select, textarea'));
          const smallTargets = touchTargets.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32);
          }).length;
          
          return {
            scrollWidth,
            clientWidth,
            hasHorizontalOverflow,
            totalTouchTargets: touchTargets.length,
            smallTargets,
            pageTitle: document.title,
          };
        })()
      `);

      const screenshotName = `mobile_${vp.name}_${p.name}.png`;
      const screenshotPath = `${ARTIFACTS_DIR}/${screenshotName}`;
      await client.screenshot(screenshotPath);

      const passed = !metrics.hasHorizontalOverflow;
      console.log(`    ${passed ? '✅ PASS' : '⚠️ OVERFLOW'}: ScrollWidth=${metrics.scrollWidth}px vs ClientWidth=${metrics.clientWidth}px | Overflow=${metrics.hasHorizontalOverflow}`);
      console.log(`    📸 Saved: ${screenshotName}`);

      auditResults.push({
        viewport: vp.name,
        width: vp.width,
        page: p.name,
        title: p.title,
        metrics,
        screenshot: screenshotName,
        passed,
      });
    }
  }

  // Interactive Test: Telecaller Console Mode on Mobile
  console.log('\n📱 --- TESTING INTERACTIVE MOBILE TELECALLER CONSOLE ---');
  await client.setViewport(390, 844);
  await client.send('Page.navigate', { url: 'http://localhost:3000/leads' });
  await new Promise((r) => setTimeout(r, 2000));

  // Switch to Telecaller Console
  await client.evaluate(`
    (() => {
      const consoleBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Calling Desk') || b.textContent.includes('Console'));
      if (consoleBtn) consoleBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1500));
  await client.screenshot(`${ARTIFACTS_DIR}/mobile_interactive_telecaller_console.png`);
  console.log('    📸 Saved: mobile_interactive_telecaller_console.png');

  // Interactive Test: Calculator Sticky Bar on Mobile
  console.log('\n📱 --- TESTING INTERACTIVE CALCULATOR STICKY BAR ---');
  await client.send('Page.navigate', { url: 'http://localhost:3000/calculator' });
  await new Promise((r) => setTimeout(r, 2000));
  await client.screenshot(`${ARTIFACTS_DIR}/mobile_interactive_calculator_sticky_bar.png`);
  console.log('    📸 Saved: mobile_interactive_calculator_sticky_bar.png');

  // Interactive Test: Deals Pipeline Stage Pills
  console.log('\n📱 --- TESTING INTERACTIVE DEALS PIPELINE MOBILE PILLS ---');
  await client.send('Page.navigate', { url: 'http://localhost:3000/deals' });
  await new Promise((r) => setTimeout(r, 2000));
  await client.screenshot(`${ARTIFACTS_DIR}/mobile_interactive_deals_pipeline.png`);
  console.log('    📸 Saved: mobile_interactive_deals_pipeline.png');

  client.close();
  browserProcess.kill();

  console.log('\n======================================================');
  console.log(`🎉 Mobile Audit Completed! ${auditResults.filter(r => r.passed).length}/${auditResults.length} checks passed with ZERO horizontal overflow.`);
  console.log('======================================================');
}

runMobileAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
