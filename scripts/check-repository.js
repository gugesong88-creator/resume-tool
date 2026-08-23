const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const forbiddenPaths = [
  { label: 'npm 本地缓存', test: file => file.startsWith('.npm_cache/') },
  { label: '真实简历数据库', test: file => file === 'data/resumes.json' },
  { label: '个人照片', test: file => file.startsWith('data/images/') },
  { label: '本地备份', test: file => file.startsWith('data/backups/') },
  { label: '旧版本地数据', test: file => file === 'resume_local_data.json' },
  { label: '环境变量', test: file => /^\.env(?:\.|$)/.test(file) && file !== '.env.example' },
  { label: '导出文件', test: file => /\.(?:pdf|zip)$/i.test(file) }
];
const secretPatterns = [
  { label: '飞书 Webhook', pattern: /open-apis\/bot\/v2\/hook\/[A-Za-z0-9_-]{16,}/ },
  { label: '私钥', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'API 密钥', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ }
];
const textExtensions = new Set([
  '.bat', '.command', '.css', '.env', '.html', '.js', '.json', '.md', '.mjs',
  '.py', '.ts', '.txt', '.yaml', '.yml'
]);

function trackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return result.stdout.split('\0').filter(Boolean);
}

function isTextFile(file) {
  return textExtensions.has(path.extname(file).toLowerCase()) || path.basename(file) === '.env.example';
}

const files = trackedFiles();
if (!files) {
  console.log('Repository hygiene check skipped outside a Git worktree.');
  process.exit(0);
}

const pathViolations = [];
for (const file of files) {
  for (const rule of forbiddenPaths) {
    if (rule.test(file)) pathViolations.push(`${rule.label}: ${file}`);
  }
}

const secretViolations = [];
for (const file of files.filter(isTextFile)) {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size > 5 * 1024 * 1024) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  for (const rule of secretPatterns) {
    if (rule.pattern.test(content)) secretViolations.push(`${rule.label}: ${file}`);
  }
}

const violations = [...pathViolations, ...secretViolations];
if (violations.length) {
  console.error('Repository hygiene check failed:');
  violations.forEach(violation => console.error(`- ${violation}`));
  process.exit(1);
}

console.log(`Repository hygiene check passed (${files.length} tracked files).`);
