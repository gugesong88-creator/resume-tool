const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('serializes disk saves and keeps the newest in-memory revision', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/store.js'), 'utf8');
  const savedNames = [];
  let activeSaves = 0;
  let maxActiveSaves = 0;
  const sandbox = {
    console,
    Promise,
    setTimeout,
    clearTimeout,
    localStorage: { setItem() {}, getItem() { return null; } },
    apiClient: {
      async fetchStore() {
        return { resumes: [], deliveryRecords: [], settings: {} };
      },
      async saveStore(data) {
        activeSaves += 1;
        maxActiveSaves = Math.max(maxActiveSaves, activeSaves);
        await new Promise(resolve => setTimeout(resolve, 10));
        savedNames.push(data.resumes[0].name);
        activeSaves -= 1;
        return data;
      }
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'src/store.js' });

  const first = sandbox.appStore.saveStore({
    resumes: [{ id: 'resume-1', name: '第一版' }],
    deliveryRecords: [],
    settings: {}
  });
  const second = sandbox.appStore.saveStore({
    resumes: [{ id: 'resume-1', name: '第二版' }],
    deliveryRecords: [],
    settings: {}
  });

  await Promise.all([first, second]);
  assert.equal(maxActiveSaves, 1);
  assert.deepEqual(savedNames, ['第一版', '第二版']);
  assert.equal(sandbox.appStore.getStore().resumes[0].name, '第二版');
});

test('does not replace dirty editor state with an older save response', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/store.js'), 'utf8');
  const sandbox = {
    console,
    Promise,
    setTimeout,
    clearTimeout,
    localStorage: { setItem() {}, getItem() { return null; } },
    apiClient: {
      async fetchStore() {
        return { resumes: [], deliveryRecords: [], settings: {} };
      },
      async saveStore(data) {
        await new Promise(resolve => setTimeout(resolve, 10));
        return data;
      }
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'src/store.js' });
  sandbox.appStore.editState = {
    resume: { id: 'resume-1', name: '请求期间的新输入' },
    dirty: true
  };

  await sandbox.appStore.saveStore({
    resumes: [{ id: 'resume-1', name: '较早的保存快照' }],
    deliveryRecords: [],
    settings: {}
  });

  assert.equal(sandbox.appStore.editState.resume.name, '请求期间的新输入');
});
