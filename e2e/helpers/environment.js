const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer');
const { createStorage } = require('../../lib/storage');

const ROOT = path.resolve(__dirname, '../..');
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('本地服务启动超时')), 15000);
    let stderr = '';

    child.stdout.on('data', chunk => {
      if (chunk.toString().includes('简历制作工具已启动')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`本地服务提前退出 (${code}): ${stderr}`));
    });
  });
}

function waitForExit(child) {
  return new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    const timeout = setTimeout(resolve, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function closeBrowser(browser) {
  if (!browser) return;
  let timeoutId;
  const closed = await Promise.race([
    browser.close().then(() => true, () => true),
    new Promise(resolve => {
      timeoutId = setTimeout(() => resolve(false), 5000);
    })
  ]);
  clearTimeout(timeoutId);
  if (closed) return;

  const process = browser.process();
  if (process && process.exitCode === null && process.signalCode === null) {
    process.kill('SIGTERM');
  }
  browser.disconnect();
}

class E2EEnvironment {
  constructor({ dataDir, port, server, browser }) {
    this.dataDir = dataDir;
    this.port = port;
    this.origin = `http://127.0.0.1:${port}`;
    this.server = server;
    this.browser = browser;
    this.storage = createStorage({ root: ROOT, dataDir });
  }

  resetStore(store) {
    return this.storage.writeStore(store, { backup: false });
  }

  readStore() {
    return this.storage.readStore();
  }

  async waitForStore(predicate, options = {}) {
    const timeout = options.timeout ?? (process.env.CI ? 15000 : 5000);
    const interval = options.interval ?? 25;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const store = this.readStore();
      if (predicate(store)) return store;
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(options.message || '等待测试数据写入超时');
  }

  async newPage(pathname = '/') {
    const page = await this.browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`${this.origin}${pathname}`, { waitUntil: 'networkidle0' });
    return { page, pageErrors };
  }

  async close() {
    if (this.browser) await closeBrowser(this.browser);
    if (this.server && !this.server.killed) {
      this.server.kill('SIGTERM');
      await waitForExit(this.server);
    }
    fs.rmSync(this.dataDir, { recursive: true, force: true });
  }
}

async function createE2EEnvironment() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-e2e-'));
  const port = await getFreePort();
  let server;
  let browser;

  try {
    server = spawn(process.execPath, ['server.js'], {
      cwd: ROOT,
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port),
        NO_OPEN: '1',
        RESUME_DATA_DIR: dataDir
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await waitForServer(server);

    const browserOptions = { headless: 'new' };
    if (process.env.PUPPETEER_NO_SANDBOX === '1') {
      browserOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
    }
    const configuredChrome = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;
    if (configuredChrome && fs.existsSync(configuredChrome)) {
      browserOptions.executablePath = configuredChrome;
    } else if (process.platform === 'darwin' && fs.existsSync(MAC_CHROME)) {
      browserOptions.executablePath = MAC_CHROME;
    }
    browser = await puppeteer.launch(browserOptions);

    return new E2EEnvironment({ dataDir, port, server, browser });
  } catch (error) {
    if (browser) await closeBrowser(browser);
    if (server && !server.killed) {
      server.kill('SIGTERM');
      await waitForExit(server);
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
    throw error;
  }
}

module.exports = {
  ROOT,
  createE2EEnvironment
};
