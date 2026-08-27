require('dotenv').config();

const fs = require('fs');
const path = require('path');
const Admin = require('../models/Admin');
const Event = require('../models/Event');
const Upload = require('../models/Upload');
const { connectDB, closeDB } = require('./db');

const uploadsRoot = path.join(__dirname, '..', 'uploads');

function normalizeUrlPath(input) {
  if (!input) return '';
  let value = String(input).trim();
  value = value.replace(/^https?:\/\/[^/]+/i, '');
  const qIndex = value.indexOf('?');
  if (qIndex >= 0) value = value.slice(0, qIndex);
  const hIndex = value.indexOf('#');
  if (hIndex >= 0) value = value.slice(0, hIndex);
  return value;
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.bmp') return 'image/bmp';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function extractOriginalName(storedName) {
  if (!storedName) return '';
  const idx = storedName.indexOf('_');
  if (idx > 0 && /^\d+$/.test(storedName.slice(0, idx))) {
    return storedName.slice(idx + 1);
  }
  return storedName;
}

function parseTimestamp(storedName) {
  if (!storedName) return null;
  const idx = storedName.indexOf('_');
  const maybeTs = idx > 0 ? storedName.slice(0, idx) : '';
  if (!/^\d+$/.test(maybeTs)) return null;
  const num = Number(maybeTs);
  return Number.isFinite(num) ? num : null;
}

async function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFiles(fullPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function buildFileIndex(allFiles) {
  const byRelative = new Map();
  const byBaseName = new Map();
  const byOriginalName = new Map();

  for (const absFile of allFiles) {
    const relative = path.relative(uploadsRoot, absFile).replace(/\\/g, '/');
    const baseName = path.basename(absFile);
    const originalName = extractOriginalName(baseName);

    byRelative.set(relative, absFile);

    if (!byBaseName.has(baseName)) byBaseName.set(baseName, []);
    byBaseName.get(baseName).push(absFile);

    if (!byOriginalName.has(originalName)) byOriginalName.set(originalName, []);
    byOriginalName.get(originalName).push(absFile);
  }

  return { byRelative, byBaseName, byOriginalName };
}

function pickBestTimestampMatch(candidates, targetTimestamp) {
  if (!candidates || candidates.length === 0) return null;
  if (!Number.isFinite(targetTimestamp)) return candidates[0];

  let best = candidates[0];
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const ts = parseTimestamp(path.basename(candidate));
    const diff = Number.isFinite(ts)
      ? Math.abs(ts - targetTimestamp)
      : Number.POSITIVE_INFINITY;
    if (diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  }

  return best;
}

function resolveLegacyUploadPath(legacyUrl, fileIndex) {
  const normalized = normalizeUrlPath(legacyUrl);
  if (!normalized.startsWith('/uploads/')) return null;

  const relative = normalized.replace(/^\/uploads\//, '');
  if (fileIndex.byRelative.has(relative)) {
    return fileIndex.byRelative.get(relative);
  }

  const relativeParts = relative.split('/').filter(Boolean);
  const baseName = relativeParts.length ? relativeParts[relativeParts.length - 1] : '';
  const originalName = extractOriginalName(baseName);
  const targetTimestamp = parseTimestamp(baseName);
  const adminSegment = relativeParts.length > 1 ? relativeParts[0] : null;

  const candidates = [
    ...(fileIndex.byBaseName.get(baseName) || []),
    ...(fileIndex.byOriginalName.get(originalName) || [])
  ];

  if (candidates.length === 0) return null;

  const normalizedAdminSegment = adminSegment ? `/${adminSegment}/` : null;
  const adminCandidates = normalizedAdminSegment
    ? candidates.filter(p => p.replace(/\\/g, '/').includes(normalizedAdminSegment))
    : [];

  if (adminCandidates.length > 0) {
    return pickBestTimestampMatch(adminCandidates, targetTimestamp);
  }

  return pickBestTimestampMatch(candidates, targetTimestamp);
}

async function importFileToUpload(absFilePath, category) {
  const buffer = await fs.promises.readFile(absFilePath);
  const stat = await fs.promises.stat(absFilePath);
  const fileName = path.basename(absFilePath);

  const upload = await Upload.create({
    data: buffer,
    mimeType: getMimeType(fileName),
    originalName: extractOriginalName(fileName) || fileName,
    size: stat.size,
    category
  });

  return upload;
}

async function migrate() {
  await connectDB();

  const report = {
    diskFilesDiscovered: 0,
    adminRefsMigrated: 0,
    eventRefsMigrated: 0,
    missingAdminFiles: 0,
    missingEventFiles: 0,
    orphanFilesImported: 0,
    uploadsCreated: 0
  };

  const importedByPath = new Map();

  try {
    const allFiles = await walkFiles(uploadsRoot);
    report.diskFilesDiscovered = allFiles.length;
    const fileIndex = buildFileIndex(allFiles);

    const pendingAdmins = await Admin.find({
      identificationUrl: { $regex: '^/uploads/' }
    });

    for (const admin of pendingAdmins) {
      const legacyPath = resolveLegacyUploadPath(admin.identificationUrl, fileIndex);
      if (!legacyPath) {
        report.missingAdminFiles += 1;
        continue;
      }

      let upload = importedByPath.get(legacyPath);
      if (!upload) {
        upload = await importFileToUpload(legacyPath, 'identification');
        importedByPath.set(legacyPath, upload);
        report.uploadsCreated += 1;
      }

      admin.identificationUploadId = upload._id;
      admin.identificationUrl = `/api/uploads/identification/${upload._id}`;
      await admin.save();
      report.adminRefsMigrated += 1;
    }

    const legacyEvents = await Event.find({
      flyerUrl: { $regex: '^/uploads/' }
    });

    for (const event of legacyEvents) {
      const legacyPath = resolveLegacyUploadPath(event.flyerUrl, fileIndex);
      if (!legacyPath) {
        report.missingEventFiles += 1;
        continue;
      }

      let upload = importedByPath.get(legacyPath);
      if (!upload) {
        upload = await importFileToUpload(legacyPath, 'flyer');
        importedByPath.set(legacyPath, upload);
        report.uploadsCreated += 1;
      }

      event.flyerUploadId = upload._id;
      event.flyerUrl = `/api/uploads/flyer/${upload._id}`;
      await event.save();
      report.eventRefsMigrated += 1;
    }

    for (const absFile of allFiles) {
      if (importedByPath.has(absFile)) continue;

      const relative = path.relative(uploadsRoot, absFile).replace(/\\/g, '/');
      const category = relative.startsWith('identification/') ? 'identification' : 'flyer';
      const upload = await importFileToUpload(absFile, category);
      importedByPath.set(absFile, upload);
      report.uploadsCreated += 1;
      report.orphanFilesImported += 1;
    }

    console.log('--- Upload Migration Complete ---');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await closeDB();
  }
}

migrate().catch((err) => {
  console.error('[Migration Error]', err);
  process.exitCode = 1;
});
