const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStorage } = require('../lib/storage');

test('writes normalized data atomically and rotates backups', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-storage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let clock = Date.parse('2026-08-23T10:00:00.000Z');
  const storage = createStorage({
    root,
    backupIntervalMs: 0,
    maxBackups: 2,
    now: () => clock
  });

  storage.ensureStorage();
  for (let index = 0; index < 3; index++) {
    clock += 1000;
    storage.writeStore({
      resumes: [{
        id: 'resume-1',
        name: `版本 ${index}`,
        template_id: 'legacy-template',
        modules: { basic_info: { data: { name: '测试用户' } } }
      }],
      deliveryRecords: [],
      settings: {}
    });
  }

  const saved = storage.readStore();
  assert.equal(saved.resumes[0].name, '版本 2');
  assert.equal(saved.resumes[0].template_id, 'T01_classic_dense');

  const backups = fs.readdirSync(storage.paths.backupDir).filter(name => name.endsWith('.json'));
  assert.equal(backups.length, 2);
  const temporaryFiles = fs.readdirSync(storage.paths.dataDir).filter(name => name.endsWith('.tmp'));
  assert.deepEqual(temporaryFiles, []);
});

test('extracts inline photos before persisting JSON', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-photo-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const storage = createStorage({ root, backupIntervalMs: 0 });
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=';

  const saved = storage.writeStore({
    resumes: [{
      id: 'photo-resume',
      modules: { basic_info: { data: { name: '测试用户', photo: png } } }
    }],
    deliveryRecords: [],
    settings: {}
  }, { backup: false });

  const photoPath = saved.resumes[0].modules.basic_info.data.photo;
  assert.match(photoPath, /^\/data\/images\/photo-resume_[a-f0-9]{16}\.png$/);
  assert.equal(fs.existsSync(path.join(root, photoPath)), true);
});
