// Vercel Serverless Function for /api/study (Central Multi-User Cloud Sync)

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

// Dynamically discover Vercel KV / Upstash Redis credentials under any custom database name
export function getKvConfig() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN, name: 'KV_REST_API' };
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN, name: 'UPSTASH_REDIS' };
  }

  // Scan all environment variables for Vercel Storage integration
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('_REST_API_URL') && value) {
      const prefix = key.replace(/_REST_API_URL$/, '');
      const token = process.env[`${prefix}_REST_API_TOKEN`];
      if (token) {
        return { url: value, token, name: prefix };
      }
    }
  }

  return null;
}

export async function kvCommand(args) {
  const kv = getKvConfig();
  if (!kv) return null;
  try {
    const res = await fetch(`${kv.url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json ? json.result : null;
  } catch (e) {
    console.error('Cloud KV request error:', e);
    return null;
  }
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

    if (!kv) {
      // Diagnostic: Help investigator identify what database was created
      const availableEnvKeys = Object.keys(process.env).filter(k => 
        k.includes('KV') || k.includes('REDIS') || k.includes('URL') || k.includes('POSTGRES') || k.includes('BLOB')
      );

      return res.status(503).json({
        success: false,
        error: 'DATABASE_NOT_CONNECTED',
        message: 'No cloud KV database connected in Vercel. Please create a Vercel KV or Upstash Redis database in Vercel Storage.',
        detectedKeys: availableEnvKeys,
      });
    }

    if (req.method === 'GET') {
      const raw = await kvCommand(['GET', 'rct_study_data']);
      let study = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

      if (!study || !Array.isArray(study.slots)) {
        study = generateDefaultScheme();
        await kvCommand(['SET', 'rct_study_data', JSON.stringify(study)]);
      }

      return res.status(200).json({
        success: true,
        data: study,
        source: 'vercel_kv',
        dbName: kv.name,
      });
    }

    if (req.method === 'POST') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!payload || !Array.isArray(payload.slots) || payload.slots.length !== STUDY_PARAMS.TOTAL_SAMPLE_SIZE) {
        return res.status(400).json({ success: false, error: 'Invalid study payload' });
      }

      await kvCommand(['SET', 'rct_study_data', JSON.stringify(payload)]);
      return res.status(200).json({ success: true, data: payload, source: 'vercel_kv' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /study error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
