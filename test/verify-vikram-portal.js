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

async function verifyVikramPortal() {
  console.log('🚀 Verifying Vikram Mehta Client Portal in Brave Browser...');

  const braveProcess = spawn(BRAVE_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1440,1200',
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

  console.log('⏳ Navigating to http://localhost:3000/p/vikram-mehta-2bhk-plfk...');
  await client.send('Page.navigate', { url: 'http://localhost:3000/p/vikram-mehta-2bhk-plfk' });
  await new Promise((r) => setTimeout(r, 3000));

  // 1. Capture Main Portal View (Photo Gallery & Real Media)
  console.log('📸 Capturing Main Portal View (HD Photos & Real Units)...');
  await client.screenshot(`${ARTIFACTS_DIR}/vikram_portal_photos.png`);

  // 2. Switch to Host Video Reel Tab
  console.log('🎥 Clicking "Host Video Reel" Tab...');
  await client.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Host Video Reel'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await client.screenshot(`${ARTIFACTS_DIR}/vikram_portal_video_tab.png`);

  // 3. Open Video Modal Player
  console.log('▶️ Opening Interactive Video Player Modal...');
  await client.evaluate(`
    (() => {
      const playBtn = document.querySelector('button[aria-label="Play Host Video Walkthrough"]');
      if (playBtn) playBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1500));
  await client.screenshot(`${ARTIFACTS_DIR}/vikram_portal_video_modal.png`);

  // Close video modal
  await client.evaluate(`
    (() => {
      const closeBtn = document.querySelector('button[aria-label="Close video player"]');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  // 4. Switch to Floor Plan Tab
  console.log('📐 Clicking "Floor Plan" Tab...');
  await client.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Floor Plan'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await client.screenshot(`${ARTIFACTS_DIR}/vikram_portal_floorplan_tab.png`);

  client.close();
  braveProcess.kill();
  console.log('🎉 All Vikram Mehta client portal screenshots successfully captured!');
}

verifyVikramPortal().catch((err) => {
  console.error('❌ Verification Error:', err);
  process.exit(1);
});
