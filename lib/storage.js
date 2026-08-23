const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizeStore, assertValidStore } = require('../src/schema');

const DEFAULT_BACKUP_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_BACKUPS = 20;

function readJsonIfExists(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn(`Cannot read ${file}:`, error.message);
    return null;
  }
}

function atomicWriteFile(file, contents) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const tempFile = path.join(
    directory,
    `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );

  try {
    fs.writeFileSync(tempFile, contents, 'utf8');
    fs.renameSync(tempFile, file);
  } catch (error) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (_) {}
    throw error;
  }
}

function createStorage(options) {
  const root = options.root;
  const dataDir = options.dataDir || path.join(root, 'data');
  const imageDir = options.imageDir || path.join(dataDir, 'images');
  const backupDir = options.backupDir || path.join(dataDir, 'backups');
  const storeFile = options.storeFile || path.join(dataDir, 'resumes.json');
  const legacyDataFile = options.legacyDataFile || path.join(root, 'resume_local_data.json');
  const backupIntervalMs = options.backupIntervalMs ?? DEFAULT_BACKUP_INTERVAL_MS;
  const maxBackups = options.maxBackups ?? DEFAULT_MAX_BACKUPS;
  const now = options.now || (() => Date.now());
  let lastBackupAt = 0;

  function ensureDirectories() {
    fs.mkdirSync(imageDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });
  }

  function extractImage(dataUrl, resumeId) {
    const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
    if (!match) return dataUrl;

    const ext = match[1].replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const buffer = Buffer.from(match[2], 'base64');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const safeResumeId = String(resumeId || 'resume').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeResumeId}_${hash}.${ext}`;
    fs.writeFileSync(path.join(imageDir, filename), buffer);
    return `/data/images/${filename}`;
  }

  function extractInlinePhotos(input) {
    const store = normalizeStore(input);
    store.resumes = store.resumes.map(resume => {
      const photo = resume?.modules?.basic_info?.data?.photo;
      if (typeof photo === 'string' && photo.startsWith('data:image/')) {
        resume.modules.basic_info.data.photo = extractImage(photo, resume.id);
      }
      return resume;
    });
    return store;
  }

  function pruneBackups() {
    const backups = fs.readdirSync(backupDir)
      .filter(name => /^resumes_\d{8}T\d{6}_\d{3}Z\.json$/.test(name))
      .sort()
      .reverse();

    backups.slice(maxBackups).forEach(name => {
      fs.unlinkSync(path.join(backupDir, name));
    });
  }

  function backupCurrentStore(force = false) {
    const timestamp = now();
    if (!fs.existsSync(storeFile)) return null;
    if (!force && timestamp - lastBackupAt < backupIntervalMs) return null;

    const iso = new Date(timestamp).toISOString().replace(/[-:]/g, '').replace('.', '_');
    const backupFile = path.join(backupDir, `resumes_${iso}.json`);
    atomicWriteFile(backupFile, fs.readFileSync(storeFile, 'utf8'));
    lastBackupAt = timestamp;
    pruneBackups();
    return backupFile;
  }

  function writeStore(input, writeOptions = {}) {
    ensureDirectories();
    if (writeOptions.backup !== false) backupCurrentStore(Boolean(writeOptions.forceBackup));

    const normalized = extractInlinePhotos(input);
    normalized.source = 'node_local_file_store';
    normalized.updatedAt = new Date(now()).toISOString();
    assertValidStore(normalized);
    atomicWriteFile(storeFile, `${JSON.stringify(normalized, null, 2)}\n`);
    return normalized;
  }

  function ensureStorage() {
    ensureDirectories();
    if (!fs.existsSync(storeFile)) {
      const legacy = readJsonIfExists(legacyDataFile) || {};
      writeStore(legacy, { backup: false });
    }
  }

  function readStore() {
    ensureStorage();
    const normalized = normalizeStore(readJsonIfExists(storeFile) || {});
    normalized.source = 'node_local_file_store';
    return assertValidStore(normalized);
  }

  return {
    backupCurrentStore,
    ensureStorage,
    readStore,
    writeStore,
    paths: { dataDir, imageDir, backupDir, storeFile, legacyDataFile }
  };
}

module.exports = {
  atomicWriteFile,
  createStorage,
  readJsonIfExists
};
