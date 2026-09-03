// Vercel Serverless Function for /api/study

// Study parameters
const STUDY_PARAMS = {
  TOTAL_SAMPLE_SIZE: 32,
  STRATA_QUOTA: 16,
  BLOCK_SIZE: 4,
  BLOCKS_PER_STRATUM: 4,
  TARGET_PER_STRATUM_ARM: 8,
};

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
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

// Check Vercel KV or Upstash credentials
function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function kvGet(key) {
  const kv = getKvConfig();
  if (!kv) return null;
  const res = await fetch(`${kv.url}/get/${key}`, {
    headers: { Authorization: `Bearer ${kv.token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json && json.result) {
    return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
  }
  return null;
}

async function kvSet(key, value) {
  const kv = getKvConfig();
  if (!kv) return false;
  const res = await fetch(`${kv.url}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kv.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const kv = getKvConfig();

    if (req.method === 'GET') {
      if (kv) {
        let study = await kvGet('rct_study_data');
        if (!study) {
          study = generateDefaultScheme();
          await kvSet('rct_study_data', study);
        }
        return res.status(200).json({ success: true, data: study, source: 'vercel_kv' });
      }

      // If KV not connected yet, signal client to use secure local persistence
      return res.status(200).json({
        success: true,
        mode: 'client_local',
        message: 'Vercel deployment active. Using secure client-side persistence.',
      });
    }

    if (req.method === 'POST') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (kv) {
        await kvSet('rct_study_data', payload);
        return res.status(200).json({ success: true, data: payload, source: 'vercel_kv' });
      }
      return res.status(200).json({ success: true, data: payload, mode: 'client_local' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /study error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
