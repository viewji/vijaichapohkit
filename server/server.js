import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DATA_FILE = path.join(DATA_DIR, 'study_data.json');

// Study parameters
const STUDY_PARAMS = {
  TOTAL_SAMPLE_SIZE: 32,
  STRATA_QUOTA: 16,
  BLOCK_SIZE: 4,
  BLOCKS_PER_STRATUM: 4,
  TARGET_PER_STRATUM_ARM: 8,
};

// Seed hashing / Mulberry32 PRNG for reproducible server-side scheme generation
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  if (seed && String(seed).trim().length > 0) {
    const seedInt = cyrb128(String(seed).trim())[0];
    return mulberry32(seedInt);
  }
  return Math.random;
}

function shuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateDefaultScheme(seed) {
  const rng = createRng(seed);
  const slots = [];
  const strata = [
    { sex: 'Male', prefix: 'M' },
    { sex: 'Female', prefix: 'F' },
  ];

  for (const stratum of strata) {
    let subjectSeq = 1;
    for (let blockNum = 1; blockNum <= STUDY_PARAMS.BLOCKS_PER_STRATUM; blockNum++) {
      const blockTemplate = ['Walking Bike', 'Walking Bike', 'Control', 'Control'];
      const permuted = shuffle(blockTemplate, rng);
      for (let pos = 1; pos <= STUDY_PARAMS.BLOCK_SIZE; pos++) {
        slots.push({
          id: `${stratum.prefix}${String(subjectSeq).padStart(2, '0')}`,
          stratum: stratum.sex,
          blockNumber: blockNum,
          blockPosition: pos,
          arm: permuted[pos - 1],
          status: 'Pending',
        });
        subjectSeq++;
      }
    }
  }

  return {
    schemeId: `SCHEME-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    seed: seed ? String(seed).trim() : undefined,
    createdAt: new Date().toISOString(),
    slots,
  };
}

// Atomic file writing to guarantee no corrupted states
async function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
}

// Create a timestamped backup before critical mutations
async function createBackup(data, reason = 'auto') {
  try {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUPS_DIR, `study_backup_${timestamp}_${reason}.json`);
    await fs.writeFile(backupFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to create backup:', err);
  }
}

// Load or initialize study state
async function getOrInitStudyData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    // If file doesn't exist, create and save initial default scheme
    const initialScheme = generateDefaultScheme();
    await atomicWriteJson(DATA_FILE, initialScheme);
    await createBackup(initialScheme, 'initial');
    return initialScheme;
  }
}

// Helper for parsing JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// HTTP Response helpers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// Server router
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // Health check
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { status: 'ok', serverTime: new Date().toISOString() });
    }

    // GET /api/study - Retrieve current authoritative study data
    if (url.pathname === '/api/study' && req.method === 'GET') {
      const studyData = await getOrInitStudyData();
      return sendJson(res, 200, { success: true, data: studyData });
    }

    // POST /api/study/enroll - Server-authoritative enrollment to prevent race conditions
    if (url.pathname === '/api/study/enroll' && req.method === 'POST') {
      const { stratum, participantCode, notes } = await parseJsonBody(req);
      if (!stratum || (stratum !== 'Male' && stratum !== 'Female')) {
        return sendJson(res, 400, { success: false, error: 'Invalid or missing stratum (Must be "Male" or "Female")' });
      }

      const studyData = await getOrInitStudyData();

      // Check remaining quota for stratum
      const enrolledCount = studyData.slots.filter(s => s.stratum === stratum && s.status === 'Enrolled').length;
      if (enrolledCount >= STUDY_PARAMS.STRATA_QUOTA) {
        return sendJson(res, 400, {
          success: false,
          error: `Stratum ${stratum} quota full (${STUDY_PARAMS.STRATA_QUOTA}/${STUDY_PARAMS.STRATA_QUOTA})`,
        });
      }

      // Find next pending slot in stratum
      const targetIndex = studyData.slots.findIndex(s => s.stratum === stratum && s.status === 'Pending');
      if (targetIndex === -1) {
        return sendJson(res, 400, { success: false, error: `No unassigned slot found for ${stratum}` });
      }

      const assignedSlot = {
        ...studyData.slots[targetIndex],
        status: 'Enrolled',
        participantCode: participantCode ? String(participantCode).trim() : undefined,
        notes: notes ? String(notes).trim() : undefined,
        enrolledAt: new Date().toISOString(),
      };

      studyData.slots[targetIndex] = assignedSlot;

      // Persist atomically to disk & create backup
      await atomicWriteJson(DATA_FILE, studyData);
      await createBackup(studyData, `enroll_${assignedSlot.id}`);

      return sendJson(res, 200, { success: true, slot: assignedSlot, data: studyData });
    }

    // POST /api/study/save - Sync complete study scheme (e.g. new seed or generated scheme)
    if (url.pathname === '/api/study/save' && req.method === 'POST') {
      const newScheme = await parseJsonBody(req);
      if (!newScheme || !Array.isArray(newScheme.slots) || newScheme.slots.length !== STUDY_PARAMS.TOTAL_SAMPLE_SIZE) {
        return sendJson(res, 400, { success: false, error: 'Invalid study scheme payload (Expected 32 slots)' });
      }

      await atomicWriteJson(DATA_FILE, newScheme);
      await createBackup(newScheme, 'save_scheme');
      return sendJson(res, 200, { success: true, data: newScheme });
    }

    // POST /api/study/reset - Reset enrollment data or execute full re-randomization
    if (url.pathname === '/api/study/reset' && req.method === 'POST') {
      const { resetType, seed } = await parseJsonBody(req);
      const current = await getOrInitStudyData();

      // Always create backup before resetting
      await createBackup(current, 'pre_reset');

      let updated;
      if (resetType === 'full') {
        updated = generateDefaultScheme(seed);
      } else {
        // Reset enrollments only, preserve sequence
        updated = {
          ...current,
          slots: current.slots.map(s => ({
            ...s,
            status: 'Pending',
            participantCode: undefined,
            notes: undefined,
            enrolledAt: undefined,
          })),
        };
      }

      await atomicWriteJson(DATA_FILE, updated);
      return sendJson(res, 200, { success: true, data: updated });
    }

    // Route not found
    return sendJson(res, 404, { error: 'Endpoint not found' });
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[RCT Server] Authoritative persistence server listening on http://localhost:${PORT}`);
  console.log(`[RCT Server] Storage path: ${DATA_FILE}`);
  console.log(`[RCT Server] Backups path: ${BACKUPS_DIR}`);
});
