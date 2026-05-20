const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT || 8000);
const ROOT = __dirname;
const HTML_FILE = 'resume_chatgpt_stable_clean_v9.html';
const LEGACY_DATA_FILE = path.join(ROOT, 'resume_local_data.json');
const DATA_DIR = path.join(ROOT, 'data');
const IMAGE_DIR = path.join(DATA_DIR, 'images');
const STORE_FILE = path.join(DATA_DIR, 'resumes.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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

function ensureStorage() {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    const legacy = readJsonIfExists(LEGACY_DATA_FILE) || {};
    const migrated = normalizeStore(legacy);
    writeStore(migrated);
  }
}

function readJsonIfExists(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`Cannot read ${file}:`, err.message);
    return null;
  }
}

function normalizeStore(input) {
  const store = input && typeof input === 'object' ? input : {};
  const resumes = Array.isArray(store.resumes) ? store.resumes : [];
  resumes.forEach(resume => {
    if (resume && resume.modules) {
      delete resume.modules.campus;
      delete resume.modules.skills;
    }
  });
  return {
    source: 'node_local_file_store',
    updatedAt: new Date().toISOString(),
    resumes: resumes,
    deliveryRecords: Array.isArray(store.deliveryRecords) ? store.deliveryRecords : [],
    settings: store.settings && typeof store.settings === 'object' ? store.settings : {}
  };
}

function extractImage(dataUrl, resumeId) {
  const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return dataUrl;

  const ext = match[1].replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const safeResumeId = String(resumeId || 'resume').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeResumeId}_${hash}.${ext}`;
  fs.writeFileSync(path.join(IMAGE_DIR, filename), buffer);
  return `/data/images/${filename}`;
}

function stripLargeInlinePhotos(store) {
  const normalized = normalizeStore(store);
  normalized.resumes = normalized.resumes.map((resume) => {
    const photo = resume?.modules?.basic_info?.data?.photo;
    if (typeof photo === 'string' && photo.startsWith('data:image/')) {
      resume.modules.basic_info.data.photo = extractImage(photo, resume.id);
    }
    return resume;
  });
  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

function readStore() {
  ensureStorage();
  return normalizeStore(readJsonIfExists(STORE_FILE));
}

function writeStore(store) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const normalized = stripLargeInlinePhotos(store);
  fs.writeFileSync(STORE_FILE, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  const relativePath = requestPath === '/' ? HTML_FILE : requestPath.slice(1);
  const filePath = path.resolve(ROOT, relativePath);

  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
      sendJson(res, 200, readStore());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/resume_local_data.json') {
      sendJson(res, 200, readStore());
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/store' || url.pathname === '/api/save_to_disk')) {
      const raw = await readRequestBody(req);
      const incoming = JSON.parse(raw || '{}');
      const oldStore = readStore();
      const saved = writeStore(incoming);

      // 只通知“新增投递记录”以减少噪音
      const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK || 'https://open.feishu.cn/open-apis/bot/v2/hook/36dfa34a-3479-4b6f-8444-8634f3588afc';
      try {
        const oldRecords = Array.isArray(oldStore.deliveryRecords) ? oldStore.deliveryRecords : [];
        const newRecords = Array.isArray(saved.deliveryRecords) ? saved.deliveryRecords : [];

        function isSame(a, b) {
          if (!a || !b) return false;
          if (a.id && b.id) return String(a.id) === String(b.id);
          try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; }
        }

        const added = newRecords.filter(n => !oldRecords.some(o => isSame(o, n)));
        if (added.length) {
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

          sendFeishuWebhook(FEISHU_WEBHOOK, postPayload).catch((e) => console.warn('Feishu webhook error:', e && e.message));
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

          const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
          const page = await browser.newPage();

          if (html && typeof html === 'string' && html.trim().length > 0) {
            await page.setContent(html, { waitUntil: 'networkidle0' });
          } else if (targetUrl && typeof targetUrl === 'string') {
            const absolute = targetUrl.startsWith('http') ? targetUrl : `http://localhost:${PORT}/${targetUrl.replace(/^\//, '')}`;
            await page.goto(absolute, { waitUntil: 'networkidle0' });
          } else {
            await browser.close();
            sendJson(res, 400, { status: 'error', message: 'Provide either `html` or `url` in the POST body' });
            return;
          }

          const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
          await browser.close();

          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename="resume.pdf"'
          });
          res.end(pdfBuffer);
          return;
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
    sendJson(res, 500, { status: 'error', message: err.message });
  }
}

ensureStorage();

http.createServer(handleRequest).listen(PORT, () => {
  const url = `http://localhost:${PORT}/${HTML_FILE}`;
  console.log(`简历制作工具已启动: ${url}`);
  if (process.env.NO_OPEN !== '1') {
    exec(`open "${url}"`);
  }
});
