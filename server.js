const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { createStorage } = require('./lib/storage');

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_REQUEST_BYTES = Number(process.env.MAX_REQUEST_BYTES || 25 * 1024 * 1024);
const ROOT = __dirname;
const HTML_FILE = 'index.html';
const LEGACY_HTML_FILE = 'resume_chatgpt_stable_clean_v9.html';
const DIST_DIR = path.join(ROOT, 'dist');
const LEGACY_DATA_FILE = path.resolve(process.env.RESUME_LEGACY_DATA_FILE || path.join(ROOT, 'resume_local_data.json'));
const DATA_DIR = path.resolve(process.env.RESUME_DATA_DIR || path.join(ROOT, 'data'));
const IMAGE_DIR = path.join(DATA_DIR, 'images');
const STORE_FILE = path.join(DATA_DIR, 'resumes.json');
const storage = createStorage({
  root: ROOT,
  dataDir: DATA_DIR,
  imageDir: IMAGE_DIR,
  storeFile: STORE_FILE,
  legacyDataFile: LEGACY_DATA_FILE
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8'
};

const { sendFeishuWebhook } = require('./lib/feishu_webhook');

// Optional: server-side PDF export via Puppeteer.
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.warn('Puppeteer not installed. Server-side PDF export disabled. Run `npm install puppeteer` to enable.');
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readRequestBody(req, maxBytes = MAX_REQUEST_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    let rejected = false;

    req.on('data', (chunk) => {
      if (rejected) return;
      received += chunk.length;
      if (received > maxBytes) {
        rejected = true;
        const error = new Error(`请求体超过 ${maxBytes} 字节限制`);
        error.statusCode = 413;
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!rejected) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  const isImageRequest = requestPath.startsWith('/data/images/');
  const baseDirectory = isImageRequest ? IMAGE_DIR : DIST_DIR;
  const relativePath = requestPath === '/' || requestPath === `/${LEGACY_HTML_FILE}`
    ? HTML_FILE
    : isImageRequest
      ? requestPath.slice('/data/images/'.length)
      : requestPath.slice(1);
  const filePath = path.resolve(baseDirectory, relativePath);

  const pathFromRoot = path.relative(baseDirectory, filePath);
  const isOutsideRoot = pathFromRoot.startsWith('..') || path.isAbsolute(pathFromRoot);
  const normalizedRelativePath = pathFromRoot.split(path.sep).join('/');
  const isAllowedStaticPath = isImageRequest
    || normalizedRelativePath === HTML_FILE
    || normalizedRelativePath.startsWith('assets/');

  if (isOutsideRoot || !isAllowedStaticPath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/api/store') {
      sendJson(res, 200, storage.readStore());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/resume_local_data.json') {
      sendJson(res, 200, storage.readStore());
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/store' || url.pathname === '/api/save_to_disk')) {
      const raw = await readRequestBody(req);
      const incoming = JSON.parse(raw || '{}');
      const oldStore = storage.readStore();
      const saved = storage.writeStore(incoming);

      // 只通知“新增投递记录”以减少噪音
      const feishuWebhook = process.env.FEISHU_WEBHOOK;
      try {
        const oldRecords = Array.isArray(oldStore.deliveryRecords) ? oldStore.deliveryRecords : [];
        const newRecords = Array.isArray(saved.deliveryRecords) ? saved.deliveryRecords : [];

        function isSame(a, b) {
          if (!a || !b) return false;
          if (a.id && b.id) return String(a.id) === String(b.id);
          try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; }
        }

        const added = newRecords.filter(n => !oldRecords.some(o => isSame(o, n)));
        if (added.length && feishuWebhook) {
          // 构建 Feishu post 消息（中文）
          const contentBlocks = [];
          added.forEach((r) => {
            const company = r.company || r.target_company || r.org || '未知公司';
            const position = r.position || r.target_position || r.job || '';
            const date = r.date || r.time || r.created_at || r.createdAt || '';
            const status = r.status || r.result || '未知';
            const note = r.note || r.note_text || '';
            const text = `公司：${company}\n职位：${position}\n日期：${date}\n状态：${status}${note ? `\n备注：${note}` : ''}`;
            contentBlocks.push([{ tag: 'text', text }]);
          });

          const postPayload = {
            msg_type: 'post',
            content: {
              post: {
                zh_cn: {
                  title: '新增投递记录',
                  content: [
                    [ { tag: 'text', text: `简历工具：检测到 ${added.length} 条新增投递记录\n\n` } ],
                    ...contentBlocks
                  ]
                }
              }
            }
          };

          sendFeishuWebhook(feishuWebhook, postPayload).catch((e) => console.warn('Feishu webhook error:', e && e.message));
        }
      } catch (err) {
        console.warn('Feishu notify failed:', err && err.message);
      }

      sendJson(res, 200, { status: 'success', store: saved });
      return;
    }

      // Server-side PDF export endpoint
      if (req.method === 'POST' && url.pathname === '/api/export_pdf') {
        try {
          const raw = await readRequestBody(req);
          const payload = JSON.parse(raw || '{}');
          const html = payload.html;
          const targetUrl = payload.url;

          if (!puppeteer) {
            sendJson(res, 501, { status: 'error', message: 'Puppeteer not installed on server' });
            return;
          }

          const launchOptions = process.env.PUPPETEER_NO_SANDBOX === '1'
            ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
            : {};
          const browser = await puppeteer.launch(launchOptions);

          try {
            const page = await browser.newPage();

            if (html && typeof html === 'string' && html.trim().length > 0) {
              await page.setContent(html, { waitUntil: 'networkidle0' });
            } else if (targetUrl && typeof targetUrl === 'string') {
              const localOrigin = `http://${HOST}:${PORT}`;
              const absolute = new URL(targetUrl, `${localOrigin}/`);
              if (absolute.origin !== localOrigin) {
                sendJson(res, 400, { status: 'error', message: 'PDF 导出只允许访问本地页面' });
                return;
              }
              await page.goto(absolute.href, { waitUntil: 'networkidle0' });
            } else {
              sendJson(res, 400, { status: 'error', message: 'Provide either `html` or `url` in the POST body' });
              return;
            }

            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Length': pdfBuffer.length,
              'Content-Disposition': 'attachment; filename="resume.pdf"'
            });
            res.end(pdfBuffer);
            return;
          } finally {
            await browser.close();
          }
        } catch (err) {
          console.error('Export PDF error:', err && err.message);
          sendJson(res, 500, { status: 'error', message: err && err.message });
          return;
        }
      }

    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res);
      return;
    }

    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
  } catch (err) {
    console.error(err);
    sendJson(res, err.statusCode || 500, { status: 'error', message: err.message });
  }
}

storage.ensureStorage();

http.createServer(handleRequest).listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`;
  console.log(`简历制作工具已启动: ${url}`);
  if (process.env.NO_OPEN !== '1') {
    let startCmd;
    if (process.platform === 'win32') {
      startCmd = `start "" "${url}"`;
    } else if (process.platform === 'darwin') {
      startCmd = `open "${url}"`;
    } else {
      startCmd = `xdg-open "${url}"`;
    }
    exec(startCmd);
  }
});
