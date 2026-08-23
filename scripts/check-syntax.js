const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = ['server.js', 'src', 'lib', 'scripts', 'test', 'e2e'];

function collectJavaScript(target) {
  const absolute = path.join(ROOT, target);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return absolute.endsWith('.js') ? [absolute] : [];

  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const child = path.join(absolute, entry.name);
    return entry.isDirectory()
      ? collectJavaScript(path.relative(ROOT, child))
      : child.endsWith('.js') ? [child] : [];
  });
}

const files = TARGETS.flatMap(collectJavaScript);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`Syntax check passed (${files.length} files).`);
