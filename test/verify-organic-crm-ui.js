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

async function verifyOrganicCrm() {
  console.log('🚀 Verifying ZamZam Organic Lead Capture & CRM UI in Brave Browser...');

  const braveProcess = spawn(BRAVE_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--user-data-dir=/tmp/brave-test-profile-organic',
    '--window-size=1440,1100',
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
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (!version) {
    console.error('❌ Could not connect to Brave CDP');
    braveProcess.kill();
    process.exit(1);
  }

  const newPageRes = await fetch('http://localhost:9222/json/new?http://localhost:3000/leads', { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  console.log('⏳ Navigating to http://localhost:3000/leads...');
  await client.send('Page.navigate', { url: 'http://localhost:3000/leads' });
  await new Promise((r) => setTimeout(r, 3000));

  // 1. Capture Main Leads Workstation View
  console.log('📸 Capturing Organic Leads Workstation (Desktop)...');
  await client.screenshot(`${ARTIFACTS_DIR}/organic_crm_leads_workstation.png`);

  // 2. Open Source Evidence Drawer
  console.log('🔍 Clicking on first lead to open Source Evidence Drawer...');
  await client.evaluate(`
    (() => {
      const eyeBtn = document.querySelector('button[title="View Source Evidence"]');
      if (eyeBtn) eyeBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1200));
  console.log('📸 Capturing Source Evidence Drawer...');
  await client.screenshot(`${ARTIFACTS_DIR}/organic_crm_source_evidence_drawer.png`);

  // 3. Close Drawer & Open Quick Call Log Modal
  console.log('📞 Opening Mobile Call Log Modal...');
  await client.evaluate(`
    (() => {
      const closeBtn = document.querySelector('div[class*="fixed inset-y-0"] button');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));
  await client.evaluate(`
    (() => {
      const logBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Log Call'));
      if (logBtn) logBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1200));
  console.log('📸 Capturing Mobile Call Log Modal...');
  await client.screenshot(`${ARTIFACTS_DIR}/organic_crm_quick_call_modal.png`);

  // 4. Navigate to Campaign Attribution View
  console.log('🔗 Navigating to http://localhost:3000/attribution...');
  await client.send('Page.navigate', { url: 'http://localhost:3000/attribution' });
  await new Promise((r) => setTimeout(r, 2500));
  console.log('📸 Capturing Campaign Attribution Manager...');
  await client.screenshot(`${ARTIFACTS_DIR}/organic_crm_attribution_manager.png`);

  // 5. Open QR Code Modal
  console.log('📱 Opening QR Code Modal...');
  await client.evaluate(`
    (() => {
      const qrBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Show QR Code'));
      if (qrBtn) qrBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));
  console.log('📸 Capturing QR Code Scanner Modal...');
  await client.screenshot(`${ARTIFACTS_DIR}/organic_crm_qr_modal.png`);

  // 6. Mobile Viewport Verification (375px)
  console.log('📱 Testing Mobile Viewport (375px iPhone)...');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.send('Page.navigate', { url: 'http://localhost:3000/leads' });
  await new Promise((r) => setTimeout(r, 2500));
  console.log('📸 Capturing Mobile Leads Workstation (375px)...');
  await client.screenshot(`${ARTIFACTS_DIR}/organic_crm_leads_mobile_375px.png`);

  client.close();
  braveProcess.kill();
  console.log('✅ Visual verification captures complete!');
}

verifyOrganicCrm().catch(console.error);
