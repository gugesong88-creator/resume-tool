const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const children = new Set();
let stopping = false;

function start(command, args, env) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit'
  });
  children.add(child);
  child.once('exit', code => {
    children.delete(child);
    if (!stopping) stop(typeof code === 'number' ? code : 1);
  });
  return child;
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 100).unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

start(process.execPath, ['server.js'], { NO_OPEN: '1' });
const viteArgs = [viteBin];
if (process.env.NO_OPEN !== '1') viteArgs.push('--open');
start(process.execPath, viteArgs, {});
