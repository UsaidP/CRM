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

  async screenshot(filePath, clip = null) {
    const params = { format: 'png', captureBeyondViewport: true };
    if (clip) params.clip = clip;
    const res = await this.send('Page.captureScreenshot', params);
    const buffer = Buffer.from(res.data, 'base64');
    await Bun.write(filePath, buffer);
  }

  close() {
    this.ws.close();
  }
}

async function captureFullPortal() {
  const braveProcess = spawn(BRAVE_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1440,1600',
    'about:blank',
  ]);

  let version = null;
  for (let i = 0; i < 25; i++) {
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

  const newPageRes = await fetch('http://localhost:9222/json/new?http://localhost:3000/p/vikram-mehta-2bhk-plfk', { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  await client.send('Page.navigate', { url: 'http://localhost:3000/p/vikram-mehta-2bhk-plfk' });
  await new Promise((r) => setTimeout(r, 2500));

  // Expand cost sheet for Option 1
  await client.evaluate(`
    (() => {
      const costBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Itemized All-In Statutory'));
      if (costBtn) costBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 800));

  console.log('📸 Capturing Full View of Vikram Portal with Cost Breakdown Expanded...');
  await client.screenshot(`${ARTIFACTS_DIR}/vikram_portal_details_and_cost.png`);

  client.close();
  braveProcess.kill();
  console.log('✅ Captured vikram_portal_details_and_cost.png');
}

captureFullPortal().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
