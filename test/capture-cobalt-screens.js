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

async function captureCobaltScreens() {
  const braveProcess = spawn(BRAVE_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1440,1080',
    'about:blank',
  ]);

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

  const newPageRes = await fetch('http://localhost:9222/json/new?http://localhost:3000', { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  // Set Cobalt theme in localStorage and navigate
  await client.send('Page.navigate', { url: 'http://localhost:3000/inventory' });
  await new Promise((r) => setTimeout(r, 2000));
  await client.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cobalt'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await client.screenshot(`${ARTIFACTS_DIR}/theme_cobalt_inventory.png`);

  await client.send('Page.navigate', { url: 'http://localhost:3000/deals' });
  await new Promise((r) => setTimeout(r, 2000));
  await client.screenshot(`${ARTIFACTS_DIR}/theme_cobalt_deals_pipeline.png`);

  client.close();
  braveProcess.kill();
  console.log('✅ Cobalt inventory and deals screens captured.');
}

captureCobaltScreens().catch(console.error);
